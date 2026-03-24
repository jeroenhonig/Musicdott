/**
 * POS CSV Import Service
 *
 * Lossless, embed-first import system for POS_Notatie.csv and POS_Songs.csv
 * Extends the existing import utility patterns.
 *
 * Key Features:
 * - Latin1 decoding for Dutch characters
 * - Delimiter detection (semicolon vs comma)
 * - Embed extraction from raw HTML
 * - Text encoding fix (latin1 → utf8) for text only
 * - Lossless storage of original data
 */

import iconv from "iconv-lite";
import { randomUUID } from "crypto";
import { storage } from "../storage-wrapper";
import { parseNotation, extractDrumblocks } from "./notation-parser";
import { normalizeEmbedModule } from "@shared/utils/index";
import type {
  InsertNotation,
  InsertPosSong,
  InsertDrumblock,
  InsertPosImportLog,
  Embed,
  SongEmbeds,
  BatchResult,
  ParsedNotation,
} from "@shared/pos-schema";
import type { EmbedModule } from "@shared/utils/embedTypes";

// ============================================
// CSV Parsing Utilities
// ============================================

/**
 * Decode Latin1 encoded buffer to string
 */
export function decodeLatin1(buffer: Buffer): string {
  return iconv.decode(buffer, "latin1");
}

/**
 * Detect delimiter (semicolon or comma)
 */
function detectDelimiter(content: string): string {
  const firstLine = content.split(/\r?\n/)[0];
  const semicolonCount = (firstLine.match(/;/g) || []).length;
  const commaCount = (firstLine.match(/,/g) || []).length;
  return semicolonCount > commaCount ? ";" : ",";
}

/**
 * Split CSV content into records while preserving newlines inside quoted fields.
 */
function splitCSVRecords(content: string): string[] {
  const records: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < content.length; i++) {
    const char = content[i];

    if (char === '"') {
      if (inQuotes && content[i + 1] === '"') {
        current += '""';
        i++;
        continue;
      }

      inQuotes = !inQuotes;
      current += char;
      continue;
    }

    if (!inQuotes && (char === "\n" || char === "\r")) {
      if (char === "\r" && content[i + 1] === "\n") {
        i++;
      }

      if (current.trim()) {
        records.push(current);
      }
      current = "";
      continue;
    }

    current += char;
  }

  if (current.trim()) {
    records.push(current);
  }

  return records;
}

/**
 * Normalize known POS export header variants to the canonical field names used internally.
 */
function normalizeHeader(header: string): string {
  const trimmed = header.trim().replace(/^\uFEFF/, "");
  const normalized = trimmed.toLowerCase();

  const headerMap: Record<string, string> = {
    noid: "noID",
    nomsid: "noMSID",
    msid: "msid",
    soid: "soID",
    somsid: "soMSID",
    souitlegtekst: "soUitlegtekst",
    souitlegvideo: "soUitlegVideo",
  };

  return headerMap[normalized] || trimmed;
}

/**
 * Parse CSV content with delimiter detection
 * Custom parser to handle semicolon-delimited Dutch CSV files
 */
export function parseCSV(content: string): Record<string, string>[] {
  const delimiter = detectDelimiter(content);
  const lines = splitCSVRecords(content);

  if (lines.length === 0) return [];

  // Parse headers
  const headers = parseCSVLine(lines[0], delimiter).map(normalizeHeader);
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;

    const values = parseCSVLine(line, delimiter);

    // Create object from headers and values
    const row: Record<string, string> = {};
    headers.forEach((header, index) => {
      row[header.trim()] = values[index]?.trim() || "";
    });
    rows.push(row);
  }

  return rows;
}

/**
 * Parse a single CSV line handling quotes and escaped characters
 */
function parseCSVLine(line: string, delimiter: string): string[] {
  const values: string[] = [];
  let currentValue = "";
  let inQuotes = false;
  let i = 0;

  while (i < line.length) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // Escaped quote
        currentValue += '"';
        i += 2;
        continue;
      }
      inQuotes = !inQuotes;
    } else if (char === delimiter && !inQuotes) {
      values.push(currentValue);
      currentValue = "";
    } else {
      currentValue += char;
    }
    i++;
  }

  values.push(currentValue); // Add the last value
  return values;
}

/**
 * Parse date string, handling empty and invalid dates
 */
export function parseDate(dateStr: string | null | undefined): Date | null {
  if (!dateStr || dateStr === "0000-00-00" || dateStr === "0000-00-00 00:00:00") {
    return null;
  }

  const date = new Date(dateStr);
  return isNaN(date.getTime()) ? null : date;
}

/**
 * Fix encoding artifacts from Latin1 → UTF-8 conversion
 * Common patterns: SueÃ±o → Sueño, cafÃ© → café
 */
export function cleanText(text: string | null | undefined): string | null {
  if (!text) return null;

  // Common Latin1 → UTF-8 encoding fix patterns
  const fixes: Record<string, string> = {
    "Ã¡": "á",
    "Ã©": "é",
    "Ã­": "í",
    "Ã³": "ó",
    "Ãº": "ú",
    "Ã±": "ñ",
    "Ã ": "à",
    "Ã¨": "è",
    "Ã¬": "ì",
    "Ã²": "ò",
    "Ã¹": "ù",
    "Ã¤": "ä",
    "Ã«": "ë",
    "Ã¯": "ï",
    "Ã¶": "ö",
    "Ã¼": "ü",
    "Ã¿": "ÿ",
    "Ã‰": "É",
    "â€™": "'",
    "â€œ": '"',
    "â€": '"',
    "â€”": "—",
    "â€“": "–",
    "Â": "",
  };

  let result = text;
  for (const [pattern, replacement] of Object.entries(fixes)) {
    result = result.replace(new RegExp(pattern, "g"), replacement);
  }

  return result.trim();
}

// ============================================
// Embed Extraction
// ============================================

/**
 * Extract YouTube embed information from raw HTML
 */
export function extractYouTubeEmbed(html: string | null | undefined): Embed | null {
  if (!html) return null;

  try {
    // Extract src from iframe
    const srcMatch = html.match(/src=["']([^"']+)["']/);
    if (!srcMatch) return null;

    const src = srcMatch[1];

    // Extract video ID from various YouTube URL formats
    let videoId: string | undefined;

    // Format: youtube.com/embed/VIDEO_ID
    const embedMatch = src.match(/youtube\.com\/embed\/([^?&]+)/);
    if (embedMatch) {
      videoId = embedMatch[1];
    }

    // Format: youtube.com/v/VIDEO_ID
    const vMatch = src.match(/youtube\.com\/v\/([^?&]+)/);
    if (!videoId && vMatch) {
      videoId = vMatch[1];
    }

    // Format: youtu.be/VIDEO_ID
    const shortMatch = src.match(/youtu\.be\/([^?&]+)/);
    if (!videoId && shortMatch) {
      videoId = shortMatch[1];
    }

    if (!videoId) return null;

    return {
      type: "video",
      provider: "youtube",
      embed_url: `https://www.youtube.com/embed/${videoId}`,
      video_id: videoId,
      raw: html,
    };
  } catch (error) {
    console.warn("Failed to extract YouTube embed:", error);
    return {
      type: "video",
      provider: "youtube",
      embed_url: null,
      raw: html,
      fallback: "YouTube embed preserved but could not be parsed",
    };
  }
}

/**
 * Extract Spotify embed information
 */
export function extractSpotifyEmbed(url: string | null | undefined): Embed | null {
  if (!url) return null;

  try {
    // Handle both iframe and direct URLs
    let spotifyUrl = url;

    // Extract from iframe if present
    const srcMatch = url.match(/src=["']([^"']+)["']/);
    if (srcMatch) {
      spotifyUrl = srcMatch[1];
    }

    // Extract track/album/playlist ID
    const match = spotifyUrl.match(/spotify\.com\/(embed\/)?(track|album|playlist)\/([a-zA-Z0-9]+)/);
    if (!match) {
      return {
        type: "audio",
        provider: "spotify",
        embed_url: null,
        raw: url,
        fallback: "Spotify link preserved but could not be parsed",
      };
    }

    const [, , type, id] = match;

    return {
      type: "audio",
      provider: "spotify",
      embed_url: `https://open.spotify.com/embed/${type}/${id}`,
      raw: url,
    };
  } catch (error) {
    console.warn("Failed to extract Spotify embed:", error);
    return {
      type: "audio",
      provider: "spotify",
      embed_url: null,
      raw: url,
      fallback: "Spotify link preserved but could not be parsed",
    };
  }
}

/**
 * Extract Apple Music embed information
 */
export function extractAppleMusicEmbed(url: string | null | undefined): Embed | null {
  if (!url) return null;

  try {
    // Handle both iframe and direct URLs
    let appleMusicUrl = url;

    // Extract from iframe if present
    const srcMatch = url.match(/src=["']([^"']+)["']/);
    if (srcMatch) {
      appleMusicUrl = srcMatch[1];
    }

    // Check if it's a valid Apple Music URL
    if (!appleMusicUrl.includes("music.apple.com") && !appleMusicUrl.includes("embed.music.apple.com")) {
      return null;
    }

    return {
      type: "audio",
      provider: "apple_music",
      embed_url: appleMusicUrl.includes("embed.") ? appleMusicUrl : appleMusicUrl.replace("music.apple.com", "embed.music.apple.com"),
      raw: url,
    };
  } catch (error) {
    console.warn("Failed to extract Apple Music embed:", error);
    return {
      type: "audio",
      provider: "apple_music",
      embed_url: null,
      raw: url,
      fallback: "Apple Music link preserved but could not be parsed",
    };
  }
}

/**
 * Extract all embeds from a POS song row
 */
export function extractSongEmbeds(row: Record<string, string>): SongEmbeds {
  const embeds: SongEmbeds = {};

  // YouTube (field: soYouTube)
  const youtube = extractYouTubeEmbed(row.soYouTube);
  if (youtube) embeds.youtube = youtube;

  // Spotify (field: soSpotify)
  const spotify = extractSpotifyEmbed(row.soSpotify);
  if (spotify) embeds.spotify = spotify;

  // Apple Music (field: soAppleMusic)
  const appleMusic = extractAppleMusicEmbed(row.soAppleMusic);
  if (appleMusic) embeds.apple_music = appleMusic;

  return embeds;
}

// ============================================
// POS Notation Import
// ============================================

export interface NotationImportRow {
  noID?: string;
  noCategorie?: string;
  noHoofdstuk?: string;
  noVolgnummer?: string;
  noNotatie?: string;
  noPDFlesson?: string;
  noMusescore?: string;
  musicxml?: string;
  noMP3?: string;
  noOpmerkingen?: string;
  noVideo?: string;
  noAangemaakt?: string;
  noGewijzigd?: string;
  noMSID?: string;
  noGewijzigddoor?: string;
  msid?: string;
  noDatumGemaakt?: string;
  noTijdGemaakt?: string;
  noDatumGewijzigd?: string;
  noTijdGewijzigd?: string;
  [key: string]: string | undefined;
}

interface NotationAttachmentItem {
  key: string;
  label: string;
  raw: string;
  module: EmbedModule;
}

function notationTrimToNull(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function buildNotationModule(raw: string, label: string): EmbedModule {
  const normalizedInput = raw.trim();

  if (/\.pdf(?:$|[?#])/i.test(normalizedInput)) {
    return {
      type: "pdf",
      provider: "external",
      status: "fallback",
      embed: {
        embed_url: null,
        raw: normalizedInput,
      },
      fallback: {
        label,
        url: normalizedInput,
      },
    };
  }

  const normalized = normalizeEmbedModule(normalizedInput);
  if (normalized.fallback) {
    return {
      ...normalized,
      fallback: {
        ...normalized.fallback,
        label,
      },
    };
  }

  return normalized;
}

function extractNotationAttachments(row: NotationImportRow): NotationAttachmentItem[] {
  const candidates: Array<{ key: keyof NotationImportRow; label: string }> = [
    { key: "noPDFlesson", label: "Lesson PDF" },
    { key: "noMusescore", label: "MuseScore" },
    { key: "musicxml", label: "MusicXML" },
  ];

  const items: NotationAttachmentItem[] = [];

  for (const candidate of candidates) {
    const raw = notationTrimToNull(row[candidate.key]);
    if (!raw) continue;

    items.push({
      key: String(candidate.key),
      label: candidate.label,
      raw,
      module: buildNotationModule(raw, candidate.label),
    });
  }

  return items;
}

function buildNotationMediaJson(
  row: NotationImportRow,
  parsedNotation: ParsedNotation | null,
  attachments: NotationAttachmentItem[]
) {
  const notationRaw = notationTrimToNull(row.noNotatie);
  const noVideoRaw = notationTrimToNull(row.noVideo);
  const noMp3Raw = notationTrimToNull(row.noMP3);

  const mediaModules: Record<string, EmbedModule> = {};
  if (noVideoRaw) {
    mediaModules.noVideo = buildNotationModule(noVideoRaw, "Lesson Video");
  }
  if (noMp3Raw) {
    const mp3Module = buildNotationModule(noMp3Raw, "Lesson MP3");
    mediaModules.noMP3 = mp3Module.type === "external"
      ? { ...mp3Module, type: "audio" }
      : mp3Module;
  }

  return {
    notationModule: notationRaw ? buildNotationModule(notationRaw, "Groove Notation") : null,
    mediaModules,
    attachments,
    parser: parsedNotation
      ? {
          status: parsedNotation.status,
          errors: parsedNotation.meta?.errors ?? [],
          warnings: parsedNotation.meta?.warnings ?? [],
          tempo: parsedNotation.tempo,
          measures: parsedNotation.measures,
          division: parsedNotation.division,
        }
      : null,
  };
}

function buildNotationRawJson(
  row: NotationImportRow,
  batchId: string,
  parsedNotation: ParsedNotation | null,
  attachments: NotationAttachmentItem[]
) {
  return {
    source: "POS_Notatie.csv",
    importBatchId: batchId,
    originalRow: row,
    attachments: attachments.map((item) => ({
      key: item.key,
      label: item.label,
      raw: item.raw,
    })),
    parserStatus: parsedNotation?.status ?? null,
  };
}

function buildDateTime(datePart?: string | null, timePart?: string | null): string | null {
  const date = datePart?.trim();
  const time = timePart?.trim();

  if (!date) return null;
  return time ? `${date} ${time}` : date;
}

/**
 * Transform a POS notation CSV row to InsertNotation format
 */
export function transformNotationRow(
  row: NotationImportRow,
  schoolId: number,
  batchId: string
): InsertNotation {
  // Parse the notation using our parser
  const parsedNotation = row.noNotatie ? parseNotation(row.noNotatie) : null;

  // Generate title from category + chapter
  const title = [row.noCategorie, row.noHoofdstuk]
    .filter(Boolean)
    .join(" - ") || "Untitled Notation";

  const createdAt = row.noAangemaakt || buildDateTime(row.noDatumGemaakt, row.noTijdGemaakt);
  const updatedAt = row.noGewijzigd || buildDateTime(row.noDatumGewijzigd, row.noTijdGewijzigd);
  const msid = row.noMSID || row.msid;
  const attachments = extractNotationAttachments(row);
  const mediaJsonb = buildNotationMediaJson(row, parsedNotation, attachments);
  const rawJsonb = buildNotationRawJson(row, batchId, parsedNotation, attachments);

  return {
    schoolId,
    // Original POS fields (lossless)
    posNoid: row.noID ? parseInt(row.noID, 10) : null,
    posCategorie: row.noCategorie || null,
    posHoofdstuk: row.noHoofdstuk || null,
    posVolgnummer: row.noVolgnummer ? parseInt(row.noVolgnummer, 10) : null,
    posNotatie: row.noNotatie || null, // ALWAYS preserved
    posOpmerkingen: cleanText(row.noOpmerkingen),
    posAangemaakt: parseDate(createdAt),
    posGewijzigd: parseDate(updatedAt),
    posMsid: msid ? parseInt(msid, 10) : null,
    posGewijzigddoor: row.noGewijzigddoor || null,

    // Normalized fields
    title: cleanText(title) || "Untitled Notation",
    category: cleanText(row.noCategorie),
    orderNumber: row.noVolgnummer ? parseInt(row.noVolgnummer, 10) : null,

    // Parsed notation
    parsedNotation: parsedNotation ? JSON.stringify(parsedNotation) : null,
    parserStatus: parsedNotation?.status || null,

    // Embed/media JSON storage
    mediaJsonb,
    rawJsonb,

    // Metadata
    importBatchId: batchId,
    isActive: true,
  };
}

/**
 * Import notations from CSV content
 */
export async function importNotationsFromCSV(
  csvContent: string,
  schoolId: number,
  userId: number,
  fileName: string
): Promise<{
  batchId: string;
  imported: number;
  skipped: number;
  errors: Array<{ row: number; error: string }>;
  drumblocks: number;
}> {
  const batchId = randomUUID();
  const errors: Array<{ row: number; error: string }> = [];
  let imported = 0;
  let skipped = 0;
  let drumblocksCreated = 0;

  // Create import log
  const importLog = await storage.createImportLog({
    schoolId,
    userId,
    batchId,
    fileType: "notations",
    fileName,
    status: "processing",
  });

  try {
    const rows = parseCSV(csvContent);
    const totalRows = rows.length;

    // Transform and validate rows
    const notationsToInsert: InsertNotation[] = [];

    for (let i = 0; i < rows.length; i++) {
      try {
        const row = rows[i] as NotationImportRow;

        // Skip rows without essential data
        if (!row.noNotatie && !row.noHoofdstuk) {
          skipped++;
          continue;
        }

        const notation = transformNotationRow(row, schoolId, batchId);
        notationsToInsert.push(notation);
      } catch (error) {
        errors.push({
          row: i + 1,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    // Batch insert notations
    if (notationsToInsert.length > 0) {
      const result = await storage.createNotationsBatch(notationsToInsert);
      imported = result.inserted;
      errors.push(...result.errors);
    }

    // Extract and create drumblocks from parsed notations
    const notations = await storage.getNotations(schoolId);
    const batchNotations = notations.filter((n) => n.importBatchId === batchId);

    for (const notation of batchNotations) {
      if (notation.parsedNotation && notation.parserStatus === "ok") {
        try {
          const parsed: ParsedNotation = JSON.parse(notation.parsedNotation);
          const blocks = extractDrumblocks(parsed);

          for (const block of blocks) {
            await storage.createDrumblock({
              schoolId,
              blockId: `${notation.id}-${block.blockId}`,
              lengthSteps: block.lengthSteps,
              events: JSON.stringify(block.events),
              tags: null,
              difficulty: null,
              sourceNotationId: notation.id,
            });
            drumblocksCreated++;
          }
        } catch (error) {
          console.warn(`Failed to extract drumblocks from notation ${notation.id}:`, error);
        }
      }
    }

    // Update import log
    await storage.updateImportLog(importLog.id, {
      totalRows,
      imported,
      skipped,
      errors: errors.length,
      errorDetails: errors.length > 0 ? JSON.stringify(errors.slice(0, 100)) : null,
      status: "completed",
      completedAt: new Date(),
    });

    return { batchId, imported, skipped, errors, drumblocks: drumblocksCreated };
  } catch (error) {
    // Update import log with failure
    await storage.updateImportLog(importLog.id, {
      status: "failed",
      errorDetails: JSON.stringify([{ error: error instanceof Error ? error.message : String(error) }]),
      completedAt: new Date(),
    });

    throw error;
  }
}

// ============================================
// POS Songs Import
// ============================================

export interface SongImportRow {
  soID?: string;
  soArtiest?: string;
  soTitel?: string;
  soBPM?: string;
  soLengte?: string;
  soGenre?: string;
  soYouTube?: string;
  soSpotify?: string;
  soAppleMusic?: string;
  soLyrics?: string;
  soUitlegtekst?: string;
  soUitlegvideo?: string;
  soUitlegVideo?: string;
  soAangemaakt?: string;
  soGewijzigd?: string;
  soMSID?: string;
  soGewijzigddoor?: string;
  msid?: string;
  soUitlegTekst?: string;
  soDatumGemaakt?: string;
  soTijdGemaakt?: string;
  soDatumGewijzigd?: string;
  soTijdGewijzigd?: string;
  soNotatie01?: string;
  soOpmerkingen01?: string;
  soNotatie02?: string;
  soOpmerkingen02?: string;
  soNotatie03?: string;
  soOpmerkingen03?: string;
  soNotatie04?: string;
  soOpmerkingen04?: string;
  soNotatie05?: string;
  soOpmerkingen05?: string;
  soNotatie06?: string;
  soOpmerkingen06?: string;
  soNotatie07?: string;
  soOpmerkingen07?: string;
  soNotatie08?: string;
  soOpmerkingen08?: string;
  soPDFsong?: string;
  soMusescore?: string;
  soFlatio?: string;
  soMusicXML?: string;
  [key: string]: string | undefined;
}

interface SongNotationSlot {
  index: number;
  notation: string | null;
  opmerkingen: string | null;
  hasNotation: boolean;
  parsedStatus: "ok" | "partial" | "failed" | null;
  notationModule: EmbedModule | null;
}

interface SongAttachmentItem {
  key: string;
  label: string;
  raw: string;
  module: EmbedModule;
}

function nonEmpty(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function buildPdfModule(raw: string): EmbedModule {
  return {
    type: "pdf",
    provider: "external",
    status: "fallback",
    embed: {
      embed_url: null,
      raw,
    },
    fallback: {
      label: "Open PDF",
      url: raw,
    },
  };
}

function buildAttachmentModule(raw: string, label: string): EmbedModule {
  const normalizedInput = raw.trim();

  if (/\.pdf(?:$|[?#])/i.test(normalizedInput)) {
    return buildPdfModule(normalizedInput);
  }

  const normalized = normalizeEmbedModule(normalizedInput);
  if (normalized.fallback) {
    return {
      ...normalized,
      fallback: {
        ...normalized.fallback,
        label,
      },
    };
  }

  return normalized;
}

function extractSongNotationSlots(row: SongImportRow): SongNotationSlot[] {
  const slots: SongNotationSlot[] = [];

  for (let i = 1; i <= 8; i++) {
    const suffix = String(i).padStart(2, "0");
    const notation = nonEmpty(row[`soNotatie${suffix}`]);
    const opmerkingen = nonEmpty(row[`soOpmerkingen${suffix}`]);

    if (!notation && !opmerkingen) continue;

    let parsedStatus: SongNotationSlot["parsedStatus"] = null;
    let notationModule: EmbedModule | null = null;

    if (notation) {
      notationModule = normalizeEmbedModule(notation);

      if (/(?:^|[?&#])(?:TimeSig|Div|Tempo|H|S|K|T|C|Measures)=/i.test(notation)) {
        parsedStatus = parseNotation(notation)?.status ?? null;
      }
    }

    slots.push({
      index: i,
      notation,
      opmerkingen,
      hasNotation: !!notation,
      parsedStatus,
      notationModule,
    });
  }

  return slots;
}

function extractSongAttachments(row: SongImportRow): SongAttachmentItem[] {
  const candidates: Array<{ key: keyof SongImportRow; label: string }> = [
    { key: "soPDFsong", label: "Song PDF" },
    { key: "soMusescore", label: "MuseScore" },
    { key: "soFlatio", label: "Flat.io" },
    { key: "soMusicXML", label: "MusicXML" },
    { key: "soUitlegVideo", label: "Explanation Video" },
  ];

  const items: SongAttachmentItem[] = [];

  for (const candidate of candidates) {
    const raw = nonEmpty(row[candidate.key]);
    if (!raw) continue;

    items.push({
      key: String(candidate.key),
      label: candidate.label,
      raw,
      module: buildAttachmentModule(raw, candidate.label),
    });
  }

  return items;
}

function buildSongEmbedsJson(
  row: SongImportRow,
  baseEmbeds: SongEmbeds,
  notationSlots: SongNotationSlot[],
  attachments: SongAttachmentItem[]
) {
  const directMediaFields: Array<{ key: keyof SongImportRow; label: string }> = [
    { key: "soYouTube", label: "YouTube" },
    { key: "soSpotify", label: "Spotify" },
    { key: "soAppleMusic", label: "Apple Music" },
  ];

  const mediaModules: Record<string, EmbedModule> = {};
  for (const field of directMediaFields) {
    const raw = nonEmpty(row[field.key]);
    if (!raw) continue;
    mediaModules[String(field.key)] = buildAttachmentModule(raw, field.label);
  }

  const explanationVideo = nonEmpty(row.soUitlegVideo || row.soUitlegvideo);
  if (explanationVideo) {
    mediaModules.soUitlegVideo = buildAttachmentModule(explanationVideo, "Explanation Video");
  }

  return {
    embeds: baseEmbeds,
    mediaModules,
    notationSlots,
    attachments,
  };
}

function buildSongRawJson(
  row: SongImportRow,
  batchId: string,
  notationSlots: SongNotationSlot[],
  attachments: SongAttachmentItem[]
) {
  return {
    source: "POS_Songs.csv",
    importBatchId: batchId,
    originalRow: row,
    notationSlots: notationSlots.map((slot) => ({
      index: slot.index,
      notation: slot.notation,
      opmerkingen: slot.opmerkingen,
      parsedStatus: slot.parsedStatus,
    })),
    attachments: attachments.map((item) => ({
      key: item.key,
      label: item.label,
      raw: item.raw,
    })),
  };
}

/**
 * Transform a POS song CSV row to InsertPosSong format
 */
export function transformSongRow(
  row: SongImportRow,
  schoolId: number,
  batchId: string
): InsertPosSong {
  // Extract embeds
  const embeds = extractSongEmbeds(row as Record<string, string>);
  const notationSlots = extractSongNotationSlots(row);
  const attachments = extractSongAttachments(row);
  const embedsJsonb = buildSongEmbedsJson(row, embeds, notationSlots, attachments);
  const rawJsonb = buildSongRawJson(row, batchId, notationSlots, attachments);
  const explanationText = row.soUitlegtekst || row.soUitlegTekst;
  const explanationVideo = row.soUitlegvideo || row.soUitlegVideo;
  const createdAt = row.soAangemaakt || buildDateTime(row.soDatumGemaakt, row.soTijdGemaakt);
  const updatedAt = row.soGewijzigd || buildDateTime(row.soDatumGewijzigd, row.soTijdGewijzigd);
  const msid = row.soMSID || row.msid;

  return {
    schoolId,
    // Original POS fields (lossless)
    posSoid: row.soID ? parseInt(row.soID, 10) : null,
    posArtiest: row.soArtiest || null,
    posTitel: row.soTitel || null,
    posBpm: row.soBPM ? parseInt(row.soBPM, 10) : null,
    posLengte: row.soLengte || null,
    posGenre: row.soGenre || null,
    posYoutube: row.soYouTube || null, // Raw HTML - DO NOT CLEAN
    posSpotify: row.soSpotify || null,
    posAppleMusic: row.soAppleMusic || null,
    posLyrics: row.soLyrics || null,
    posUitlegtekst: cleanText(explanationText),
    posUitlegvideo: explanationVideo || null,
    posAangemaakt: parseDate(createdAt),
    posGewijzigd: parseDate(updatedAt),
    posMsid: msid ? parseInt(msid, 10) : null,
    posGewijzigddoor: row.soGewijzigddoor || null,

    // Normalized embeds
    embeds: Object.keys(embeds).length > 0 ? JSON.stringify(embeds) : null,
    embedsJsonb,
    lyricsClean: cleanText(row.soLyrics),
    rawJsonb,

    // Link to main songs table (null initially)
    linkedSongId: null,

    // Metadata
    importBatchId: batchId,
  };
}

/**
 * Import songs from CSV content
 */
export async function importSongsFromCSV(
  csvContent: string,
  schoolId: number,
  userId: number,
  fileName: string
): Promise<{
  batchId: string;
  imported: number;
  skipped: number;
  errors: Array<{ row: number; error: string }>;
}> {
  const batchId = randomUUID();
  const errors: Array<{ row: number; error: string }> = [];
  let imported = 0;
  let skipped = 0;

  // Create import log
  const importLog = await storage.createImportLog({
    schoolId,
    userId,
    batchId,
    fileType: "songs",
    fileName,
    status: "processing",
  });

  try {
    const rows = parseCSV(csvContent);
    const totalRows = rows.length;

    // Transform and validate rows
    const songsToInsert: InsertPosSong[] = [];

    for (let i = 0; i < rows.length; i++) {
      try {
        const row = rows[i] as SongImportRow;

        // Skip rows without essential data
        if (!row.soTitel && !row.soArtiest) {
          skipped++;
          continue;
        }

        const song = transformSongRow(row, schoolId, batchId);
        songsToInsert.push(song);
      } catch (error) {
        errors.push({
          row: i + 1,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    // Batch insert songs
    if (songsToInsert.length > 0) {
      const result = await storage.createPosSongsBatch(songsToInsert);
      imported = result.inserted;
      errors.push(...result.errors);
    }

    // Update import log
    await storage.updateImportLog(importLog.id, {
      totalRows,
      imported,
      skipped,
      errors: errors.length,
      errorDetails: errors.length > 0 ? JSON.stringify(errors.slice(0, 100)) : null,
      status: "completed",
      completedAt: new Date(),
    });

    return { batchId, imported, skipped, errors };
  } catch (error) {
    // Update import log with failure
    await storage.updateImportLog(importLog.id, {
      status: "failed",
      errorDetails: JSON.stringify([{ error: error instanceof Error ? error.message : String(error) }]),
      completedAt: new Date(),
    });

    throw error;
  }
}

// ============================================
// Preview Functions
// ============================================

/**
 * Preview CSV import without actually importing
 */
export function previewCSV(
  csvContent: string,
  fileType: "notations" | "songs",
  limit: number = 10
): {
  totalRows: number;
  previewRows: Record<string, any>[];
  detectedDelimiter: string;
  columns: string[];
} {
  const delimiter = detectDelimiter(csvContent);
  const rows = parseCSV(csvContent);
  const columns = rows.length > 0 ? Object.keys(rows[0]) : [];

  return {
    totalRows: rows.length,
    previewRows: rows.slice(0, limit).map((row, index) => {
      if (fileType === "notations") {
        return {
          row: index + 1,
          id: row.noID,
          category: row.noCategorie,
          chapter: row.noHoofdstuk,
          hasNotation: !!row.noNotatie,
          notationPreview: row.noNotatie?.substring(0, 50) + (row.noNotatie?.length > 50 ? "..." : ""),
        };
      } else {
        return {
          row: index + 1,
          id: row.soID,
          artist: row.soArtiest,
          title: row.soTitel,
          bpm: row.soBPM,
          hasYouTube: !!row.soYouTube,
          hasSpotify: !!row.soSpotify,
        };
      }
    }),
    detectedDelimiter: delimiter,
    columns,
  };
}

/**
 * Validate CSV content
 */
export function validateCSV(
  csvContent: string,
  fileType: "notations" | "songs"
): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    const rows = parseCSV(csvContent);

    if (rows.length === 0) {
      errors.push("CSV file is empty");
      return { valid: false, errors, warnings };
    }

    const columns = Object.keys(rows[0]);

    // Check required columns based on file type
    if (fileType === "notations") {
      const requiredColumns = ["noID", "noNotatie"];
      const optionalColumns = ["noCategorie", "noHoofdstuk", "noVolgnummer"];

      for (const col of requiredColumns) {
        if (!columns.some((c) => c.toLowerCase() === col.toLowerCase())) {
          warnings.push(`Missing recommended column: ${col}`);
        }
      }

      // Check for notation data
      const rowsWithNotation = rows.filter((r) => r.noNotatie);
      if (rowsWithNotation.length === 0) {
        warnings.push("No rows contain notation data (noNotatie column)");
      }
    } else {
      const requiredColumns = ["soTitel"];
      const optionalColumns = ["soArtiest", "soBPM", "soYouTube", "soSpotify"];

      for (const col of requiredColumns) {
        if (!columns.some((c) => c.toLowerCase() === col.toLowerCase())) {
          warnings.push(`Missing recommended column: ${col}`);
        }
      }

      // Check for song data
      const rowsWithTitle = rows.filter((r) => r.soTitel);
      if (rowsWithTitle.length === 0) {
        errors.push("No rows contain song titles (soTitel column)");
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  } catch (error) {
    errors.push(`Failed to parse CSV: ${error instanceof Error ? error.message : String(error)}`);
    return { valid: false, errors, warnings };
  }
}

export default {
  decodeLatin1,
  parseCSV,
  parseDate,
  cleanText,
  extractYouTubeEmbed,
  extractSpotifyEmbed,
  extractAppleMusicEmbed,
  extractSongEmbeds,
  importNotationsFromCSV,
  importSongsFromCSV,
  previewCSV,
  validateCSV,
};
