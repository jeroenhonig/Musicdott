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
  const firstLine = content.split("\n")[0];
  const semicolonCount = (firstLine.match(/;/g) || []).length;
  const commaCount = (firstLine.match(/,/g) || []).length;
  return semicolonCount > commaCount ? ";" : ",";
}

/**
 * Parse CSV content with delimiter detection
 * Custom parser to handle semicolon-delimited Dutch CSV files
 */
export function parseCSV(content: string): Record<string, string>[] {
  const delimiter = detectDelimiter(content);
  const lines = content.split("\n").filter((line) => line.trim());

  if (lines.length === 0) return [];

  // Parse headers
  const headers = parseCSVLine(lines[0], delimiter);
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
    "â€"": "—",
    "â€"": "–",
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
  noOpmerkingen?: string;
  noAangemaakt?: string;
  noGewijzigd?: string;
  noMSID?: string;
  noGewijzigddoor?: string;
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

  return {
    schoolId,
    // Original POS fields (lossless)
    posNoid: row.noID ? parseInt(row.noID, 10) : null,
    posCategorie: row.noCategorie || null,
    posHoofdstuk: row.noHoofdstuk || null,
    posVolgnummer: row.noVolgnummer ? parseInt(row.noVolgnummer, 10) : null,
    posNotatie: row.noNotatie || null, // ALWAYS preserved
    posOpmerkingen: cleanText(row.noOpmerkingen),
    posAangemaakt: parseDate(row.noAangemaakt),
    posGewijzigd: parseDate(row.noGewijzigd),
    posMsid: row.noMSID ? parseInt(row.noMSID, 10) : null,
    posGewijzigddoor: row.noGewijzigddoor || null,

    // Normalized fields
    title: cleanText(title) || "Untitled Notation",
    category: cleanText(row.noCategorie),
    orderNumber: row.noVolgnummer ? parseInt(row.noVolgnummer, 10) : null,

    // Parsed notation
    parsedNotation: parsedNotation ? JSON.stringify(parsedNotation) : null,
    parserStatus: parsedNotation?.status || null,

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
  soAangemaakt?: string;
  soGewijzigd?: string;
  soMSID?: string;
  soGewijzigddoor?: string;
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
    posUitlegtekst: cleanText(row.soUitlegtekst),
    posUitlegvideo: row.soUitlegvideo || null,
    posAangemaakt: parseDate(row.soAangemaakt),
    posGewijzigd: parseDate(row.soGewijzigd),
    posMsid: row.soMSID ? parseInt(row.soMSID, 10) : null,
    posGewijzigddoor: row.soGewijzigddoor || null,

    // Normalized embeds
    embeds: Object.keys(embeds).length > 0 ? JSON.stringify(embeds) : null,
    lyricsClean: cleanText(row.soLyrics),

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
