/**
 * POS Import API Routes
 *
 * Endpoints for importing POS_Notatie.csv and POS_Songs.csv files
 */

import { Router, Request, Response } from "express";
import multer from "multer";
import { insertLessonSchema, insertSongSchema, insertStudentSchema } from "@shared/schema";
import { sanitizeContentBlocksForStorage } from "@shared/content-blocks";
import { requireAuth } from "../auth";
import { loadSchoolContext, requireTeacherOrOwner } from "../middleware/authz";
import { storage } from "../storage-wrapper";
import {
  decodeLatin1,
  importNotationsFromCSV,
  importSongsFromCSV,
  parseCSV,
  previewCSV,
  validateCSV,
} from "../services/pos-csv-import";
import { createStudentAccount, getDefaultStudentPassword } from "../services/student-accounts";
import { parseNotation, validateNotation, notationToText } from "../services/notation-parser";
import {
  generateRandomPattern,
  generatePatternFromBlocks,
  generateProgressivePattern,
  analyzePattern,
  getSuggestedBlocks,
} from "../services/block-generator";

const router = Router();

function safeJsonParse<T = any>(value: unknown): T | null {
  if (value == null) return null;
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as T;
    } catch {
      return null;
    }
  }
  if (typeof value === "object") {
    return value as T;
  }
  return null;
}

function sendPosRouteError(
  res: Response,
  message: string,
  code: string,
  endpoint: string,
  error: unknown,
  context?: Record<string, unknown>,
) {
  return res.status(500).json({
    message,
    code,
    context: {
      endpoint,
      ...(context || {}),
    },
    error: error instanceof Error ? error.message : String(error),
  });
}

function enrichPosSongForResponse(song: any, includeRaw: boolean = false) {
  const embeds = safeJsonParse<Record<string, any>>(song.embeds) ?? {};
  const embedsJsonb = safeJsonParse<Record<string, any>>(song.embedsJsonb) ?? {};
  const rawJsonb = safeJsonParse<Record<string, any>>(song.rawJsonb) ?? null;

  const notationSlots = Array.isArray(embedsJsonb.notationSlots) ? embedsJsonb.notationSlots : [];
  const attachments = Array.isArray(embedsJsonb.attachments) ? embedsJsonb.attachments : [];
  const mediaModules =
    embedsJsonb.mediaModules && typeof embedsJsonb.mediaModules === "object"
      ? embedsJsonb.mediaModules
      : {};

  return {
    ...song,
    embeds,
    embedsJsonb,
    ...(includeRaw ? { rawJsonb } : {}),
    notationSlots,
    attachments,
    mediaModules,
    displaySummary: {
      notationCount: notationSlots.filter((slot: any) => slot?.hasNotation).length,
      attachmentCount: attachments.length,
      mediaCount: Object.keys(mediaModules).length,
      hasLyrics: !!song.posLyrics,
    },
  };
}

function enrichNotationForResponse(
  notation: any,
  options: { includeRaw?: boolean; includeParsed?: boolean } = {}
) {
  const { includeRaw = false, includeParsed = true } = options;

  let parsedNotation = null;
  if (includeParsed) {
    parsedNotation = safeJsonParse<Record<string, any>>(notation.parsedNotation);
    if (!parsedNotation && notation.posNotatie) {
      try {
        parsedNotation = parseNotation(notation.posNotatie);
      } catch {
        parsedNotation = null;
      }
    }
  }

  const mediaJsonb = safeJsonParse<Record<string, any>>(notation.mediaJsonb) ?? {};
  const rawJsonb = safeJsonParse<Record<string, any>>(notation.rawJsonb) ?? null;
  const notationModule =
    mediaJsonb.notationModule && typeof mediaJsonb.notationModule === "object"
      ? mediaJsonb.notationModule
      : null;
  const mediaModules =
    mediaJsonb.mediaModules && typeof mediaJsonb.mediaModules === "object"
      ? mediaJsonb.mediaModules
      : {};
  const attachments = Array.isArray(mediaJsonb.attachments) ? mediaJsonb.attachments : [];

  return {
    ...notation,
    ...(includeParsed
      ? {
          parsedNotation,
          textRepresentation: parsedNotation ? notationToText(parsedNotation as any) : null,
        }
      : {}),
    mediaJsonb,
    ...(includeRaw ? { rawJsonb } : {}),
    notationModule,
    mediaModules,
    attachments,
    displaySummary: {
      hasNotationModule: !!notationModule,
      mediaCount: Object.keys(mediaModules).length,
      attachmentCount: attachments.length,
      parserStatus: notation.parserStatus || (parsedNotation as any)?.status || null,
      hasRemarks: !!notation.posOpmerkingen,
    },
  };
}

function normalizeMatchText(value: unknown): string {
  if (typeof value !== "string") return "";
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function enrichMappingForResponse(mapping: any, songsById: Map<number, any>, notationsById: Map<number, any>) {
  const song = mapping.songId ? songsById.get(mapping.songId) : null;
  const notation = mapping.notationId ? notationsById.get(mapping.notationId) : null;

  return {
    ...mapping,
    songSummary: song
      ? {
          id: song.id,
          title: song.posTitel || null,
          artist: song.posArtiest || null,
          bpm: song.posBpm || null,
        }
      : null,
    notationSummary: notation
      ? {
          id: notation.id,
          title: notation.title || null,
          category: notation.category || notation.posCategorie || null,
          parserStatus: notation.parserStatus || null,
        }
      : null,
  };
}

function extractSpotifyTrackIdFromUrl(url: unknown): string | null {
  if (typeof url !== "string") return null;
  const match = url.match(/spotify\.com\/(?:embed\/)?track\/([A-Za-z0-9]+)/i);
  return match?.[1] || null;
}

function extractAppleMusicId(url: unknown): string | null {
  if (typeof url !== "string") return null;
  const match = url.match(/\/album\/[^/]+\/(\d+)/i) || url.match(/\/song\/[^/]+\/(\d+)/i);
  return match?.[1] || null;
}

function makeBlockId(prefix: string, ...parts: Array<string | number | null | undefined>) {
  const safeParts = parts
    .filter((part) => part !== null && part !== undefined && `${part}`.trim() !== "")
    .map((part) =>
      String(part)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 40)
    )
    .filter(Boolean);

  return [prefix, ...safeParts].join("-") || `${prefix}-${Date.now()}`;
}

function pushTextBlock(blocks: any[], title: string, text: string | null | undefined, sourceMeta: Record<string, any>) {
  if (!text || !String(text).trim()) return;
  const content = String(text).trim();
  blocks.push({
    id: makeBlockId("text", title),
    type: "text",
    title,
    content,
    data: {
      text: content,
      ...sourceMeta,
    },
  });
}

function pushExternalLinkBlock(
  blocks: any[],
  title: string,
  url: string | null | undefined,
  sourceMeta: Record<string, any>,
  opts: { embedInViewer?: boolean } = {}
) {
  if (!url || !String(url).trim()) return;
  const cleanUrl = String(url).trim();
  blocks.push({
    id: makeBlockId("link", title),
    type: "external_link",
    title,
    url: cleanUrl,
    data: {
      external_link: {
        url: cleanUrl,
        title,
        embedInViewer: !!opts.embedInViewer,
      },
      ...sourceMeta,
    },
  });
}

function buildSongContentBlocksFromPosSong(song: any): any[] {
  const blocks: any[] = [];
  const sourceMeta = {
    source: "pos_song",
    sourcePosSoid: song.posSoid ?? null,
    sourcePosSongId: song.id,
  };

  const embeds = safeJsonParse<Record<string, any>>(song.embeds) ?? {};
  const embedsJsonb = safeJsonParse<Record<string, any>>(song.embedsJsonb) ?? {};
  const notationSlots = Array.isArray(embedsJsonb.notationSlots) ? embedsJsonb.notationSlots : [];
  const attachments = Array.isArray(embedsJsonb.attachments) ? embedsJsonb.attachments : [];

  if (embeds.youtube?.video_id) {
    blocks.push({
      id: makeBlockId("yt", song.posSoid, song.posTitel),
      type: "youtube",
      title: "YouTube",
      data: {
        youtube: embeds.youtube.video_id,
        videoId: embeds.youtube.video_id,
        raw: embeds.youtube.raw || null,
        ...sourceMeta,
      },
    });
  } else if (song.posYoutube) {
    // Fallback to generic video/url block if we couldn't extract a YouTube ID
    pushExternalLinkBlock(blocks, "Video", song.posYoutube, sourceMeta, { embedInViewer: true });
  }

  const spotifyTrackId = extractSpotifyTrackIdFromUrl(embeds.spotify?.embed_url || song.posSpotify);
  if (spotifyTrackId) {
    blocks.push({
      id: makeBlockId("spotify", song.posSoid, spotifyTrackId),
      type: "spotify",
      title: "Spotify",
      data: {
        spotify: spotifyTrackId,
        raw: song.posSpotify || null,
        ...sourceMeta,
      },
    });
  } else if (song.posSpotify) {
    pushExternalLinkBlock(blocks, "Spotify", song.posSpotify, sourceMeta, { embedInViewer: true });
  }

  const appleMusicId = extractAppleMusicId(embeds.apple_music?.embed_url || song.posAppleMusic);
  if (appleMusicId) {
    blocks.push({
      id: makeBlockId("apple", song.posSoid, appleMusicId),
      type: "apple_music",
      title: "Apple Music",
      data: {
        apple_music: appleMusicId,
        raw: song.posAppleMusic || null,
        ...sourceMeta,
      },
    });
  } else if (song.posAppleMusic) {
    pushExternalLinkBlock(blocks, "Apple Music", song.posAppleMusic, sourceMeta, { embedInViewer: true });
  }

  for (const slot of notationSlots) {
    if (!slot?.notation) continue;
    const slotLabel = slot.opmerkingen || `Pattern ${slot.index ?? "?"}`;
    blocks.push({
      id: makeBlockId("groove", song.posSoid, slot.index),
      type: "groovescribe",
      title: slotLabel,
      pattern: slot.notation,
      content: slot.notation,
      data: {
        pattern: slot.notation,
        groovescribe: slot.notation,
        slotIndex: slot.index ?? null,
        parserStatus: slot.parsedStatus ?? null,
        ...sourceMeta,
      },
    });
  }

  for (const item of attachments) {
    const raw = item?.raw ? String(item.raw).trim() : "";
    const label = item?.label || item?.key || "Attachment";
    if (!raw) continue;

    if (/\.pdf(?:$|[?#])/i.test(raw)) {
      blocks.push({
        id: makeBlockId("pdf", song.posSoid, item.key),
        type: "pdf",
        title: label,
        url: raw,
        data: {
          pdf: raw,
          ...sourceMeta,
        },
      });
      continue;
    }

    const isExplanationVideo = String(item.key || "").toLowerCase().includes("uitlegvideo");
    pushExternalLinkBlock(blocks, label, raw, sourceMeta, { embedInViewer: isExplanationVideo });
  }

  pushTextBlock(blocks, "Uitleg", song.posUitlegtekst, sourceMeta);
  pushTextBlock(blocks, "Lyrics", song.posLyrics, sourceMeta);

  return blocks;
}

function buildLessonContentBlocksFromPosNotation(notation: any): any[] {
  const blocks: any[] = [];
  const sourceMeta = {
    source: "pos_notation",
    sourcePosNoid: notation.posNoid ?? null,
    sourceNotationId: notation.id,
  };

  if (notation.posNotatie) {
    blocks.push({
      id: makeBlockId("groove", notation.posNoid, notation.title),
      type: "groovescribe",
      title: "Exercise",
      pattern: notation.posNotatie,
      content: notation.posNotatie,
      data: {
        pattern: notation.posNotatie,
        groovescribe: notation.posNotatie,
        parserStatus: notation.parserStatus || null,
        ...sourceMeta,
      },
    });
  }

  const mediaJsonb = safeJsonParse<Record<string, any>>(notation.mediaJsonb) ?? {};
  const mediaModules = mediaJsonb.mediaModules && typeof mediaJsonb.mediaModules === "object"
    ? mediaJsonb.mediaModules
    : {};
  const attachments = Array.isArray(mediaJsonb.attachments) ? mediaJsonb.attachments : [];

  const videoRaw = (mediaModules as any)?.noVideo?.embed?.raw || null;
  if (videoRaw && /youtube|youtu\.be/i.test(String(videoRaw))) {
    const yt = String(videoRaw).match(/(?:v=|embed\/|youtu\.be\/)([A-Za-z0-9_-]{6,})/i)?.[1];
    if (yt) {
      blocks.push({
        id: makeBlockId("yt", notation.posNoid, yt),
        type: "youtube",
        title: "Video Tutorial",
        videoId: yt,
        data: {
          youtube: yt,
          videoId: yt,
          raw: String(videoRaw),
          ...sourceMeta,
        },
      });
    } else {
      pushExternalLinkBlock(blocks, "Video Tutorial", String(videoRaw), sourceMeta, { embedInViewer: true });
    }
  } else if (videoRaw) {
    pushExternalLinkBlock(blocks, "Video Tutorial", String(videoRaw), sourceMeta, { embedInViewer: true });
  }

  const mp3Raw = (mediaModules as any)?.noMP3?.embed?.raw || null;
  if (mp3Raw) {
    pushExternalLinkBlock(blocks, "Audio / MP3", String(mp3Raw), sourceMeta);
  }

  for (const item of attachments) {
    const raw = item?.raw ? String(item.raw).trim() : "";
    const label = item?.label || item?.key || "Attachment";
    if (!raw) continue;

    if (/\.pdf(?:$|[?#])/i.test(raw)) {
      blocks.push({
        id: makeBlockId("pdf", notation.posNoid, item.key),
        type: "pdf",
        title: label,
        url: raw,
        data: {
          pdf: raw,
          ...sourceMeta,
        },
      });
    } else {
      pushExternalLinkBlock(blocks, label, raw, sourceMeta, { embedInViewer: /musescore|flat|musicxml/i.test(raw) });
    }
  }

  pushTextBlock(blocks, "Opmerkingen", notation.posOpmerkingen, sourceMeta);

  return blocks;
}

function inferLessonLevelFromCategory(category: string | null | undefined): string {
  const c = normalizeMatchText(category);
  if (c.includes("beginner") || c.includes("basis")) return "beginner";
  if (c.includes("advanced") || c.includes("gevorderd")) return "advanced";
  return "intermediate";
}

function hasSourceMarker(contentBlocks: unknown, markerKey: string, markerValue: number | null | undefined): boolean {
  if (!markerValue) return false;
  if (typeof contentBlocks !== "string") return false;
  return contentBlocks.includes(`"${markerKey}":${markerValue}`);
}

function isDryRunRequest(req: Request): boolean {
  const raw = req.query.dryRun ?? req.body?.dryRun;
  if (typeof raw === "boolean") return raw;
  if (typeof raw !== "string") return false;
  return ["1", "true", "yes", "on"].includes(raw.toLowerCase());
}

function summarizeContentBlocksValue(value: unknown) {
  try {
    const parsed =
      typeof value === "string" ? JSON.parse(value) : Array.isArray(value) ? value : null;

    if (!Array.isArray(parsed)) {
      return { count: 0, types: [] as string[] };
    }

    const types = Array.from(
      new Set(
        parsed
          .map((block) => (block && typeof block === "object" ? String((block as any).type || "unknown") : "unknown"))
          .filter(Boolean)
      )
    );

    return {
      count: parsed.length,
      types: types.slice(0, 12),
    };
  } catch {
    return { count: 0, types: [] as string[] };
  }
}

function previewValue(value: unknown): unknown {
  if (value == null) return value;
  if (typeof value === "string") {
    if (value.trim().startsWith("[{") || value.trim().startsWith("[")) {
      const summary = summarizeContentBlocksValue(value);
      if (summary.count > 0) {
        return { contentBlocks: summary };
      }
    }
    return value.length > 140 ? `${value.slice(0, 140)}…` : value;
  }
  if (Array.isArray(value)) {
    return { arrayLength: value.length };
  }
  if (typeof value === "object") {
    return { objectKeys: Object.keys(value as Record<string, unknown>).slice(0, 12) };
  }
  return value;
}

function buildFieldDiff(
  existing: Record<string, any>,
  nextData: Record<string, any>,
  fields: string[]
): Array<{ field: string; from: unknown; to: unknown }> {
  const diffs: Array<{ field: string; from: unknown; to: unknown }> = [];

  for (const field of fields) {
    const before = existing[field] ?? null;
    const after = nextData[field] ?? null;

    if (field === "contentBlocks") {
      if (String(before || "") !== String(after || "")) {
        diffs.push({
          field,
          from: previewValue(before),
          to: previewValue(after),
        });
      }
      continue;
    }

    if (before !== after) {
      diffs.push({
        field,
        from: previewValue(before),
        to: previewValue(after),
      });
    }
  }

  return diffs;
}

function pushPreviewItem<T extends Record<string, any>>(preview: T[], item: T, max: number = 100) {
  if (preview.length < max) {
    preview.push(item);
  }
}

function pickStudentCsvValue(row: Record<string, string>, ...keys: string[]) {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return "";
}

function normalizeEmail(value: string | null | undefined): string {
  return (value || "").trim().toLowerCase();
}

function isLikelyEmail(value: string | null | undefined): boolean {
  if (!value) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value).trim());
}

function scoreStudentCsvRows(rows: Record<string, string>[]): number {
  if (!rows.length) return 0;
  const headers = new Set(Object.keys(rows[0]));
  let score = 0;
  if (headers.has("stVoornaam")) score += 3;
  if (headers.has("stNaam")) score += 3;
  if (headers.has("stEmail")) score += 3;
  if (headers.has("stid")) score += 1;
  if (headers.has("stContact")) score += 1;
  return score;
}

function parseStudentCsvFromBuffer(buffer: Buffer) {
  const utf8Content = buffer.toString("utf8");
  const latin1Content = decodeLatin1(buffer);

  const utf8Rows = parseCSV(utf8Content);
  const latin1Rows = parseCSV(latin1Content);

  const utf8Score = scoreStudentCsvRows(utf8Rows);
  const latin1Score = scoreStudentCsvRows(latin1Rows);

  if (latin1Score > utf8Score) {
    return { content: latin1Content, rows: latin1Rows, encoding: "latin1" as const };
  }

  return { content: utf8Content, rows: utf8Rows, encoding: "utf8" as const };
}

function normalizeBirthdate(value: string | null | undefined): string | null {
  const raw = (value || "").trim();
  if (!raw) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString().slice(0, 10);
}

function buildStudentDisplayName(firstName: string, lastName: string) {
  return [firstName.trim(), lastName.trim()].filter(Boolean).join(" ").trim();
}

function buildStudentNotesFromCsv(row: Record<string, string>): string | null {
  const notes: string[] = [];
  const remark = pickStudentCsvValue(row, "stOpmerkingen");
  if (remark) notes.push(remark);

  const addressParts = [
    pickStudentCsvValue(row, "stAdres"),
    pickStudentCsvValue(row, "stHuisnummer"),
    pickStudentCsvValue(row, "stPostcode"),
    pickStudentCsvValue(row, "stWoonplaats"),
  ].filter(Boolean);
  if (addressParts.length) {
    notes.push(`Adres: ${addressParts.join(" ")}`);
  }

  const contact = pickStudentCsvValue(row, "stContact");
  if (contact) {
    notes.push(`Contact: ${contact}`);
  }

  const language = pickStudentCsvValue(row, "stLanguage");
  if (language) {
    notes.push(`Taal: ${language}`);
  }

  const lessonSlots = [
    ["1", pickStudentCsvValue(row, "stLesdag1"), pickStudentCsvValue(row, "stLestijd1"), pickStudentCsvValue(row, "stLesduur1")],
    ["2", pickStudentCsvValue(row, "stLesdag2"), pickStudentCsvValue(row, "stLestijd2"), pickStudentCsvValue(row, "stLesduur2")],
  ]
    .filter(([, day, time, duration]) => day || time || duration)
    .map(([slot, day, time, duration]) => `Les ${slot}: ${[day, time, duration].filter(Boolean).join(" / ")}`);
  notes.push(...lessonSlots);

  const sourceId = pickStudentCsvValue(row, "stid");
  if (sourceId) {
    notes.push(`POS student id: ${sourceId}`);
  }

  const compact = notes.map((line) => line.trim()).filter(Boolean);
  return compact.length ? compact.join("\n") : null;
}

function normalizeStudentUsernamePart(value: string | null | undefined): string {
  if (!value) return "";
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[^a-z0-9]/g, "");
}

function buildStudentUsernameBase(firstName: string, lastName: string): string {
  return `${normalizeStudentUsernamePart(firstName)}${normalizeStudentUsernamePart(lastName)}`;
}

async function generateStudentUsernamePreviewCandidate(
  firstName: string,
  lastName: string,
  reservedUsernames: Set<string>,
  existsCache: Map<string, boolean>
): Promise<string | null> {
  const base = buildStudentUsernameBase(firstName, lastName);
  if (!base) return null;

  const usernameExists = async (candidate: string) => {
    if (reservedUsernames.has(candidate)) return true;
    if (existsCache.has(candidate)) return existsCache.get(candidate)!;
    const exists = !!(await storage.getUserByUsername(candidate));
    existsCache.set(candidate, exists);
    return exists;
  };

  if (!(await usernameExists(base))) {
    reservedUsernames.add(base);
    return base;
  }

  for (let i = 2; i <= 9999; i++) {
    const candidate = `${base}${i}`;
    if (!(await usernameExists(candidate))) {
      reservedUsernames.add(candidate);
      return candidate;
    }
  }

  return null;
}

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept CSV files
    if (
      file.mimetype === "text/csv" ||
      file.mimetype === "application/vnd.ms-excel" ||
      file.originalname.endsWith(".csv")
    ) {
      cb(null, true);
    } else {
      cb(new Error("Only CSV files are allowed"));
    }
  },
});

// ============================================
// Import Endpoints
// ============================================

/**
 * POST /api/pos-import/notations
 * Upload and import notations CSV file
 */
router.post(
  "/notations",
  requireAuth,
  loadSchoolContext,
  requireTeacherOrOwner(),
  upload.single("file"),
  async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const schoolId = req.school?.id || req.user!.schoolId;
      if (!schoolId) {
        return res.status(400).json({ message: "School ID required" });
      }

      // Decode file content (handle Latin1 encoding)
      const content = decodeLatin1(req.file.buffer);

      // Validate CSV
      const validation = validateCSV(content, "notations");
      if (!validation.valid) {
        return res.status(400).json({
          message: "CSV validation failed",
          errors: validation.errors,
          warnings: validation.warnings,
        });
      }

      // Import notations
      const result = await importNotationsFromCSV(
        content,
        schoolId,
        req.user!.id,
        req.file.originalname
      );

      res.json({
        success: true,
        batchId: result.batchId,
        imported: result.imported,
        skipped: result.skipped,
        drumblocks: result.drumblocks,
        errors: result.errors.length,
        errorDetails: result.errors.slice(0, 10),
        warnings: validation.warnings,
      });
    } catch (error) {
      console.error("Notation import error:", error);
      res.status(500).json({
        message: "Import failed",
        code: "POS_NOTATION_IMPORT_ERROR",
        context: { endpoint: "/api/pos-import/notations" },
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
);

/**
 * POST /api/pos-import/songs
 * Upload and import songs CSV file
 */
router.post(
  "/songs",
  requireAuth,
  loadSchoolContext,
  requireTeacherOrOwner(),
  upload.single("file"),
  async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const schoolId = req.school?.id || req.user!.schoolId;
      if (!schoolId) {
        return res.status(400).json({ message: "School ID required" });
      }

      // Decode file content (handle Latin1 encoding)
      const content = decodeLatin1(req.file.buffer);

      // Validate CSV
      const validation = validateCSV(content, "songs");
      if (!validation.valid) {
        return res.status(400).json({
          message: "CSV validation failed",
          errors: validation.errors,
          warnings: validation.warnings,
        });
      }

      // Import songs
      const result = await importSongsFromCSV(
        content,
        schoolId,
        req.user!.id,
        req.file.originalname
      );

      res.json({
        success: true,
        batchId: result.batchId,
        imported: result.imported,
        skipped: result.skipped,
        errors: result.errors.length,
        errorDetails: result.errors.slice(0, 10),
        warnings: validation.warnings,
      });
    } catch (error) {
      console.error("Song import error:", error);
      res.status(500).json({
        message: "Import failed",
        code: "POS_SONG_IMPORT_ERROR",
        context: { endpoint: "/api/pos-import/songs" },
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
);

/**
 * POST /api/pos-import/students
 * Upload and import Musicdott student export CSV and create student accounts
 */
router.post(
  "/students",
  requireAuth,
  loadSchoolContext,
  requireTeacherOrOwner(),
  upload.single("file"),
  async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const schoolId = req.school?.id || req.user!.schoolId;
      const dryRun = isDryRunRequest(req);
      if (!schoolId) {
        return res.status(400).json({ message: "School ID required" });
      }

      const { rows, encoding } = parseStudentCsvFromBuffer(req.file.buffer);
      if (!rows.length) {
        return res.status(400).json({ message: "CSV contains no rows" });
      }

      const headers = Object.keys(rows[0] || {});
      const hasExpectedHeaders =
        headers.includes("stVoornaam") &&
        headers.includes("stNaam") &&
        (headers.includes("stEmail") || headers.includes("stContact"));

      if (!hasExpectedHeaders) {
        return res.status(400).json({
          message: "CSV does not look like a Musicdott student export",
          headers,
        });
      }

      const existingStudents = await storage.getStudentsBySchool(schoolId);
      const studentsByEmail = new Map<string, any>();
      for (const student of existingStudents) {
        const key = normalizeEmail(student.email);
        if (key && !studentsByEmail.has(key)) {
          studentsByEmail.set(key, student);
        }
      }

      const seenEmails = new Set<string>();
      const errors: Array<{ row: number; error: string; email?: string | null }> = [];
      const accountSamples: Array<{ studentId: number; email: string; username: string }> = [];
      const preview: Array<Record<string, any>> = [];
      const previewReservedUsernames = new Set<string>();
      const usernameExistsCache = new Map<string, boolean>();
      const userByIdCache = new Map<number, any | null>();

      let imported = 0;
      let updated = 0;
      let skipped = 0;
      let failed = 0;
      let accountsCreatedOrLinked = 0;
      let accountFailures = 0;

      const getUserCached = async (userId: number | null | undefined) => {
        if (!userId) return null;
        if (userByIdCache.has(userId)) return userByIdCache.get(userId) ?? null;
        const user = await storage.getUser(userId);
        userByIdCache.set(userId, user ?? null);
        return user ?? null;
      };

      const getLinkedStudentAccountUser = async (student: any) => {
        if (!student) return null;
        if (student.accountId) {
          return getUserCached(student.accountId);
        }
        if (student.userId) {
          const maybeLegacy = await getUserCached(student.userId);
          if (maybeLegacy?.role === "student") {
            return maybeLegacy;
          }
        }
        return null;
      };

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const rowNumber = i + 2; // CSV header is row 1

        const firstName = pickStudentCsvValue(row, "stVoornaam");
        const lastName = pickStudentCsvValue(row, "stNaam");
        const emailCandidate = pickStudentCsvValue(row, "stEmail", "stContact");
        const email = normalizeEmail(emailCandidate);

        if (!email || !isLikelyEmail(email)) {
          skipped++;
          errors.push({ row: rowNumber, error: "Missing or invalid email (stEmail/stContact)", email: email || null });
          if (dryRun) {
            pushPreviewItem(preview, {
              action: "skip",
              reason: "invalid_email",
              row: rowNumber,
              email: email || null,
            });
          }
          continue;
        }

        if (seenEmails.has(email)) {
          skipped++;
          errors.push({ row: rowNumber, error: "Duplicate email in same CSV file", email });
          if (dryRun) {
            pushPreviewItem(preview, {
              action: "skip",
              reason: "duplicate_email_in_file",
              row: rowNumber,
              email,
            });
          }
          continue;
        }
        seenEmails.add(email);

        if (!firstName || !lastName) {
          skipped++;
          errors.push({ row: rowNumber, error: "Missing first name or last name", email });
          if (dryRun) {
            pushPreviewItem(preview, {
              action: "skip",
              reason: "missing_name",
              row: rowNumber,
              email,
              firstName: firstName || null,
              lastName: lastName || null,
            });
          }
          continue;
        }

        const displayName = buildStudentDisplayName(firstName, lastName);
        const phone = pickStudentCsvValue(row, "stTelefoonmobiel", "stTelefoonvast") || null;
        const notes = buildStudentNotesFromCsv(row);
        const birthdate = normalizeBirthdate(pickStudentCsvValue(row, "stGebDatum"));
        const existing = studentsByEmail.get(email) || null;

        try {
          let studentRecord: any;
          let usernameCandidate: string | null = null;

          if (existing) {
            const linkedAccountUser = await getLinkedStudentAccountUser(existing);
            const accountAction = linkedAccountUser
              ? existing.accountId
                ? "existing"
                : "link_legacy"
              : "create";

            const updatePayload = insertStudentSchema
              .partial()
              .parse({
                name: displayName || existing.name || null,
                email,
                phone,
                birthdate,
                instrument: existing.instrument || "drums",
                notes,
                isActive: true,
                ...(linkedAccountUser && !existing.accountId ? { accountId: linkedAccountUser.id } : {}),
              });

            const changedFields = buildFieldDiff(existing as Record<string, any>, updatePayload as Record<string, any>, [
              "name",
              "email",
              "phone",
              "birthdate",
              "instrument",
              "notes",
              "isActive",
              "accountId",
            ]);
            const recordNeedsUpdate = changedFields.length > 0;

            if (accountAction === "create") {
              usernameCandidate =
                (await generateStudentUsernamePreviewCandidate(
                  firstName,
                  lastName,
                  previewReservedUsernames,
                  usernameExistsCache
                )) || buildStudentUsernameBase(firstName, lastName) || null;
            }

            const previewAction = recordNeedsUpdate
              ? "update"
              : accountAction === "create"
                ? "account_only"
                : "skip";

            if (dryRun) {
              if (recordNeedsUpdate) {
                updated++;
              } else {
                skipped++;
              }
              if (accountAction === "create") {
                accountsCreatedOrLinked++;
              }
              pushPreviewItem(preview, {
                action: previewAction,
                row: rowNumber,
                studentId: existing.id,
                name: displayName,
                email,
                accountAction,
                usernameCandidate,
                changedFields,
                reason: !recordNeedsUpdate && accountAction !== "create" ? "no_changes" : undefined,
              });
              continue;
            }

            if (recordNeedsUpdate) {
              studentRecord = await storage.updateStudent(existing.id, updatePayload);
              studentsByEmail.set(email, studentRecord);
              updated++;
            } else {
              studentRecord = existing;
              skipped++;
            }

            if (accountAction === "create") {
              try {
                const user = await createStudentAccount(
                  { ...studentRecord, firstName, lastName } as any,
                  schoolId
                );
                accountsCreatedOrLinked++;
                if (accountSamples.length < 25) {
                  accountSamples.push({
                    studentId: studentRecord.id,
                    email,
                    username: user.username,
                  });
                }
              } catch (accountError) {
                accountFailures++;
                errors.push({
                  row: rowNumber,
                  email,
                  error: `Account creation failed: ${
                    accountError instanceof Error ? accountError.message : String(accountError)
                  }`,
                });
              }
            }
          } else {
            const createPayload = insertStudentSchema.parse({
              schoolId,
              name: displayName,
              email,
              phone,
              birthdate,
              instrument: "drums",
              level: null,
              notes,
              isActive: true,
            });

            usernameCandidate =
              (await generateStudentUsernamePreviewCandidate(
                firstName,
                lastName,
                previewReservedUsernames,
                usernameExistsCache
              )) || buildStudentUsernameBase(firstName, lastName) || null;

            if (dryRun) {
              imported++;
              accountsCreatedOrLinked++;
              pushPreviewItem(preview, {
                action: "create",
                row: rowNumber,
                name: displayName,
                email,
                accountAction: "create",
                usernameCandidate,
                payloadSummary: {
                  phone: createPayload.phone ?? null,
                  birthdate: createPayload.birthdate ?? null,
                  instrument: createPayload.instrument ?? null,
                  notes: previewValue(createPayload.notes),
                  schoolId: createPayload.schoolId,
                },
              });
              continue;
            }

            studentRecord = await storage.createStudent(createPayload);
            studentsByEmail.set(email, studentRecord);
            imported++;

            try {
              const user = await createStudentAccount(
                { ...studentRecord, firstName, lastName } as any,
                schoolId
              );
              accountsCreatedOrLinked++;
              if (accountSamples.length < 25) {
                accountSamples.push({
                  studentId: studentRecord.id,
                  email,
                  username: user.username,
                });
              }
            } catch (accountError) {
              accountFailures++;
              errors.push({
                row: rowNumber,
                email,
                error: `Account creation failed: ${
                  accountError instanceof Error ? accountError.message : String(accountError)
                }`,
              });
            }
          }
        } catch (error) {
          failed++;
          errors.push({
            row: rowNumber,
            email,
            error: error instanceof Error ? error.message : String(error),
          });
          if (dryRun) {
            pushPreviewItem(preview, {
              action: "skip",
              reason: "error",
              row: rowNumber,
              name: displayName,
              email,
              error: error instanceof Error ? error.message : String(error),
            });
          }
        }
      }

      res.json({
        success: true,
        dryRun,
        fileName: req.file.originalname,
        encodingDetected: encoding,
        processed: rows.length,
        imported,
        updated,
        skipped,
        failed,
        accountStats: {
          successful: accountsCreatedOrLinked,
          failed: accountFailures,
          defaultPassword: getDefaultStudentPassword(),
          mustChangePassword: true,
          usernameRule:
            "voornaam+achternaam lowercase zonder spaties (suffix 2,3,... bij conflict)",
        },
        accountSamples,
        preview: dryRun ? preview : undefined,
        previewTruncated: dryRun ? preview.length >= 100 && rows.length > 100 : false,
        errors: errors.slice(0, 100),
      });
    } catch (error) {
      console.error("Student CSV import error:", error);
      res.status(500).json({
        message: "Student import failed",
        code: "POS_STUDENT_IMPORT_ERROR",
        context: { endpoint: "/api/pos-import/students" },
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
);

/**
 * POST /api/pos-import/preview
 * Preview CSV file contents before import
 */
router.post(
  "/preview",
  requireAuth,
  loadSchoolContext,
  requireTeacherOrOwner(),
  upload.single("file"),
  async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const fileType = req.body.fileType as "notations" | "songs";
      if (!fileType || !["notations", "songs"].includes(fileType)) {
        return res.status(400).json({ message: "fileType must be 'notations' or 'songs'" });
      }

      // Decode file content
      const content = decodeLatin1(req.file.buffer);

      // Preview
      const preview = previewCSV(content, fileType, 10);

      // Validate
      const validation = validateCSV(content, fileType);

      res.json({
        ...preview,
        validation,
      });
    } catch (error) {
      console.error("Preview error:", error);
      res.status(500).json({
        message: "Preview failed",
        code: "POS_IMPORT_PREVIEW_ERROR",
        context: { endpoint: "/api/pos-import/preview" },
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
);

/**
 * GET /api/pos-import/history
 * Get import history for the school
 */
router.get(
  "/history",
  requireAuth,
  loadSchoolContext,
  requireTeacherOrOwner(),
  async (req: Request, res: Response) => {
    try {
      const schoolId = req.school?.id || req.user!.schoolId;
      if (!schoolId) {
        return res.status(400).json({ message: "School ID required" });
      }

      const limit = parseInt(req.query.limit as string) || 50;
      const logs = await storage.getImportLogs(schoolId, limit);

      res.json(logs);
    } catch (error) {
      console.error("Import history error:", error);
      return sendPosRouteError(
        res,
        "Failed to fetch import history",
        "POS_IMPORT_HISTORY_ERROR",
        "/api/pos-import/history",
        error,
      );
    }
  }
);

// ============================================
// Notation Endpoints
// ============================================

/**
 * GET /api/notations
 * List all notations for the school
 */
router.get(
  "/notations",
  requireAuth,
  loadSchoolContext,
  requireTeacherOrOwner(),
  async (req: Request, res: Response) => {
    try {
      const schoolId = req.school?.id || req.user!.schoolId;
      if (!schoolId) {
        return res.status(400).json({ message: "School ID required" });
      }

      const notations = await storage.getNotations(schoolId);
      res.json(notations.map((notation) => enrichNotationForResponse(notation, { includeParsed: false })));
    } catch (error) {
      console.error("Notations fetch error:", error);
      return sendPosRouteError(
        res,
        "Failed to fetch notations",
        "POS_NOTATIONS_FETCH_ERROR",
        "/api/pos-import/notations",
        error,
      );
    }
  }
);

/**
 * GET /api/notations/:id
 * Get a single notation with parsed data
 */
router.get(
  "/notations/:id",
  requireAuth,
  loadSchoolContext,
  requireTeacherOrOwner(),
  async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid notation ID" });
      }

      const notation = await storage.getNotation(id);
      if (!notation) {
        return res.status(404).json({ message: "Notation not found" });
      }

      // Verify school access
      const schoolId = req.school?.id || req.user!.schoolId;
      if (notation.schoolId !== schoolId) {
        return res.status(403).json({ message: "Access denied" });
      }

      res.json(enrichNotationForResponse(notation, { includeRaw: true, includeParsed: true }));
    } catch (error) {
      console.error("Notation fetch error:", error);
      return sendPosRouteError(
        res,
        "Failed to fetch notation",
        "POS_NOTATION_FETCH_ERROR",
        "/api/pos-import/notations/:id",
        error,
        { notationId: req.params.id },
      );
    }
  }
);

/**
 * GET /api/notations/:id/blocks
 * Get drumblocks extracted from a notation
 */
router.get(
  "/notations/:id/blocks",
  requireAuth,
  loadSchoolContext,
  requireTeacherOrOwner(),
  async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid notation ID" });
      }

      const notation = await storage.getNotation(id);
      if (!notation) {
        return res.status(404).json({ message: "Notation not found" });
      }

      // Verify school access
      const schoolId = req.school?.id || req.user!.schoolId;
      if (notation.schoolId !== schoolId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const blocks = await storage.getDrumblocksByNotation(id);
      res.json(blocks);
    } catch (error) {
      console.error("Drumblocks fetch error:", error);
      return sendPosRouteError(
        res,
        "Failed to fetch drumblocks",
        "POS_NOTATION_BLOCKS_FETCH_ERROR",
        "/api/pos-import/notations/:id/blocks",
        error,
        { notationId: req.params.id },
      );
    }
  }
);

/**
 * POST /api/notations/:id/reparse
 * Re-parse a notation string
 */
router.post(
  "/notations/:id/reparse",
  requireAuth,
  loadSchoolContext,
  requireTeacherOrOwner(),
  async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid notation ID" });
      }

      const notation = await storage.getNotation(id);
      if (!notation) {
        return res.status(404).json({ message: "Notation not found" });
      }

      // Verify school access
      const schoolId = req.school?.id || req.user!.schoolId;
      if (notation.schoolId !== schoolId) {
        return res.status(403).json({ message: "Access denied" });
      }

      if (!notation.posNotatie) {
        return res.status(400).json({ message: "No notation string to parse" });
      }

      // Re-parse the notation
      const parsedNotation = parseNotation(notation.posNotatie);

      // Update the notation record
      const updated = await storage.updateNotation(id, {
        parsedNotation: JSON.stringify(parsedNotation),
        parserStatus: parsedNotation.status,
      });

      res.json(enrichNotationForResponse(updated, { includeRaw: true, includeParsed: true }));
    } catch (error) {
      console.error("Notation reparse error:", error);
      return sendPosRouteError(
        res,
        "Failed to reparse notation",
        "POS_NOTATION_REPARSE_ERROR",
        "/api/pos-import/notations/:id/reparse",
        error,
        { notationId: req.params.id },
      );
    }
  }
);

// ============================================
// POS Songs Endpoints
// ============================================

/**
 * GET /api/pos-songs
 * List all POS songs for the school
 */
router.get(
  "/pos-songs",
  requireAuth,
  loadSchoolContext,
  requireTeacherOrOwner(),
  async (req: Request, res: Response) => {
    try {
      const schoolId = req.school?.id || req.user!.schoolId;
      if (!schoolId) {
        return res.status(400).json({ message: "School ID required" });
      }

      const songs = await storage.getPosSongs(schoolId);
      res.json(songs.map((song) => enrichPosSongForResponse(song, false)));
    } catch (error) {
      console.error("POS songs fetch error:", error);
      return sendPosRouteError(
        res,
        "Failed to fetch POS songs",
        "POS_SONGS_FETCH_ERROR",
        "/api/pos-import/pos-songs",
        error,
      );
    }
  }
);

/**
 * GET /api/pos-songs/:id
 * Get a single POS song with embeds
 */
router.get(
  "/pos-songs/:id",
  requireAuth,
  loadSchoolContext,
  requireTeacherOrOwner(),
  async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid song ID" });
      }

      const song = await storage.getPosSong(id);
      if (!song) {
        return res.status(404).json({ message: "Song not found" });
      }

      // Verify school access
      const schoolId = req.school?.id || req.user!.schoolId;
      if (song.schoolId !== schoolId) {
        return res.status(403).json({ message: "Access denied" });
      }

      res.json(enrichPosSongForResponse(song, true));
    } catch (error) {
      console.error("POS song fetch error:", error);
      return sendPosRouteError(
        res,
        "Failed to fetch POS song",
        "POS_SONG_FETCH_ERROR",
        "/api/pos-import/pos-songs/:id",
        error,
        { posSongId: req.params.id },
      );
    }
  }
);

// ============================================
// POS -> Platform Sync Endpoints
// ============================================

/**
 * POST /api/pos-import/sync/songs-to-platform
 * Sync imported POS songs into the main Songs module (school-scoped)
 */
router.post(
  "/sync/songs-to-platform",
  requireAuth,
  loadSchoolContext,
  requireTeacherOrOwner(),
  async (req: Request, res: Response) => {
    try {
      const schoolId = req.school?.id || req.user!.schoolId;
      const userId = req.user?.id;
      const dryRun = isDryRunRequest(req);
      if (!schoolId || !userId) {
        return res.status(400).json({ message: "School ID and user ID required" });
      }

      const posSongs = await storage.getPosSongs(schoolId);
      const existingSongs = await storage.getSongsBySchool(schoolId);

      let created = 0;
      let updated = 0;
      let skipped = 0;
      let failed = 0;
      const errors: Array<{ posSongId: number; posSoid: number | null; error: string }> = [];
      const preview: Array<Record<string, any>> = [];

      for (const posSong of posSongs) {
        try {
          const title = (posSong.posTitel || "").trim();
          if (!title) {
            skipped++;
            pushPreviewItem(preview, {
              action: "skip",
              reason: "missing_title",
              posSongId: posSong.id,
              posSoid: posSong.posSoid ?? null,
            });
            continue;
          }

          const contentBlocks = sanitizeContentBlocksForStorage(
            buildSongContentBlocksFromPosSong(posSong)
          );
          const contentBlocksJson = JSON.stringify(contentBlocks);

          const existingBySource = existingSongs.find((song) =>
            hasSourceMarker(song.contentBlocks, "sourcePosSongId", posSong.id) ||
            hasSourceMarker(song.contentBlocks, "sourcePosSoid", posSong.posSoid ?? null)
          );

          const existingByTitleArtist = existingSongs.find((song) =>
            normalizeMatchText(song.title) === normalizeMatchText(title) &&
            normalizeMatchText(song.artist || "") === normalizeMatchText(posSong.posArtiest || "")
          );

          const existing = existingBySource || existingByTitleArtist || null;
          const matchReason = existingBySource ? "source_marker" : existingByTitleArtist ? "title_artist" : "new";

          const baseSongData = {
            schoolId,
            userId,
            title,
            artist: posSong.posArtiest || null,
            genre: posSong.posGenre || null,
            bpm: posSong.posBpm || null,
            duration: posSong.posLengte || null,
            description: posSong.posUitlegtekst || null,
            difficulty: "intermediate",
            instrument: "drums",
            level: "intermediate",
            contentBlocks: contentBlocksJson,
            isActive: true,
          };

          if (existing) {
            const validatedUpdate = insertSongSchema.partial().parse(baseSongData);
            const changedFields = buildFieldDiff(existing as any, validatedUpdate as any, [
              "title",
              "artist",
              "genre",
              "bpm",
              "duration",
              "description",
              "difficulty",
              "instrument",
              "level",
              "isActive",
              "contentBlocks",
            ]);
            const linkNeedsUpdate = (posSong.linkedSongId ?? null) !== existing.id;

            if (changedFields.length === 0 && !linkNeedsUpdate) {
              skipped++;
              pushPreviewItem(preview, {
                action: "skip",
                reason: "no_changes",
                targetId: existing.id,
                posSongId: posSong.id,
                posSoid: posSong.posSoid ?? null,
                title,
                matchReason,
              });
              continue;
            }

            updated++;
            pushPreviewItem(preview, {
              action: "update",
              targetId: existing.id,
              posSongId: posSong.id,
              posSoid: posSong.posSoid ?? null,
              title,
              matchReason,
              changedFields: [
                ...changedFields,
                ...(linkNeedsUpdate
                  ? [{ field: "linkedPosSongId", from: posSong.linkedSongId ?? null, to: existing.id }]
                  : []),
              ],
            });

            if (dryRun) {
              continue;
            }

            const updatedSong = await storage.updateSong(existing.id, validatedUpdate);
            await storage.updatePosSong(posSong.id, { linkedSongId: updatedSong.id });
          } else {
            const validatedCreate = insertSongSchema.parse(baseSongData);
            created++;
            pushPreviewItem(preview, {
              action: "create",
              posSongId: posSong.id,
              posSoid: posSong.posSoid ?? null,
              title,
              matchReason,
              payloadSummary: {
                artist: validatedCreate.artist ?? null,
                genre: validatedCreate.genre ?? null,
                bpm: validatedCreate.bpm ?? null,
                duration: validatedCreate.duration ?? null,
                description: previewValue(validatedCreate.description),
                contentBlocks: summarizeContentBlocksValue(validatedCreate.contentBlocks),
              },
            });

            if (dryRun) {
              continue;
            }

            const createdSong = await storage.createSong(validatedCreate);
            existingSongs.push(createdSong);
            await storage.updatePosSong(posSong.id, { linkedSongId: createdSong.id });
          }
        } catch (error) {
          failed++;
          errors.push({
            posSongId: posSong.id,
            posSoid: posSong.posSoid ?? null,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }

      res.json({
        success: true,
        target: "songs",
        schoolId,
        dryRun,
        processed: posSongs.length,
        created,
        updated,
        skipped,
        failed,
        errors: errors.slice(0, 50),
        preview,
        previewTruncated: preview.length >= 100 && posSongs.length > 100,
      });
    } catch (error) {
      console.error("POS songs -> Songs sync error:", error);
      res.status(500).json({
        message: "Failed to sync POS songs to Songs",
        code: "POS_SONGS_SYNC_ERROR",
        context: { endpoint: "/api/pos-import/sync/songs-to-platform" },
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
);

/**
 * POST /api/pos-import/sync/notations-to-lessons
 * Sync imported POS notations into the main Lessons module (school-scoped)
 */
router.post(
  "/sync/notations-to-lessons",
  requireAuth,
  loadSchoolContext,
  requireTeacherOrOwner(),
  async (req: Request, res: Response) => {
    try {
      const schoolId = req.school?.id || req.user!.schoolId;
      const userId = req.user?.id;
      const dryRun = isDryRunRequest(req);
      if (!schoolId || !userId) {
        return res.status(400).json({ message: "School ID and user ID required" });
      }

      const posNotations = await storage.getNotations(schoolId);
      const existingLessons = await storage.getLessonsBySchool(schoolId);

      let created = 0;
      let updated = 0;
      let skipped = 0;
      let failed = 0;
      const errors: Array<{ notationId: number; posNoid: number | null; error: string }> = [];
      const preview: Array<Record<string, any>> = [];

      for (const notation of posNotations) {
        try {
          const title = (notation.title || "").trim();
          if (!title) {
            skipped++;
            pushPreviewItem(preview, {
              action: "skip",
              reason: "missing_title",
              notationId: notation.id,
              posNoid: notation.posNoid ?? null,
            });
            continue;
          }

          const contentBlocks = sanitizeContentBlocksForStorage(
            buildLessonContentBlocksFromPosNotation(notation)
          );
          const contentBlocksJson = JSON.stringify(contentBlocks);

          const existingBySource = existingLessons.find((lesson) =>
            hasSourceMarker(lesson.contentBlocks, "sourceNotationId", notation.id) ||
            hasSourceMarker(lesson.contentBlocks, "sourcePosNoid", notation.posNoid ?? null)
          );

          const existingByTitle = existingLessons.find(
            (lesson) => normalizeMatchText(lesson.title) === normalizeMatchText(title)
          );

          const existing = existingBySource || existingByTitle || null;
          const matchReason = existingBySource ? "source_marker" : existingByTitle ? "title" : "new";

          const lessonData = {
            schoolId,
            userId,
            title,
            description: notation.posOpmerkingen || null,
            contentType: "lesson",
            instrument: "drums",
            level: inferLessonLevelFromCategory(notation.category || notation.posCategorie),
            category: notation.category || notation.posCategorie || "Drums",
            contentBlocks: contentBlocksJson,
            orderNumber: notation.orderNumber ?? null,
            isActive: notation.isActive ?? true,
          };

          if (existing) {
            const validatedUpdate = insertLessonSchema.partial().parse(lessonData);
            const changedFields = buildFieldDiff(existing as any, validatedUpdate as any, [
              "title",
              "description",
              "contentType",
              "instrument",
              "level",
              "category",
              "orderNumber",
              "isActive",
              "contentBlocks",
            ]);

            if (changedFields.length === 0) {
              skipped++;
              pushPreviewItem(preview, {
                action: "skip",
                reason: "no_changes",
                targetId: existing.id,
                notationId: notation.id,
                posNoid: notation.posNoid ?? null,
                title,
                matchReason,
              });
            } else {
              updated++;
              pushPreviewItem(preview, {
                action: "update",
                targetId: existing.id,
                notationId: notation.id,
                posNoid: notation.posNoid ?? null,
                title,
                matchReason,
                changedFields,
              });

              if (!dryRun) {
                await storage.updateLesson(existing.id, validatedUpdate);
              }
            }
          } else {
            const validatedCreate = insertLessonSchema.parse(lessonData);
            created++;
            pushPreviewItem(preview, {
              action: "create",
              notationId: notation.id,
              posNoid: notation.posNoid ?? null,
              title,
              matchReason,
              payloadSummary: {
                category: validatedCreate.category ?? null,
                level: validatedCreate.level ?? null,
                orderNumber: validatedCreate.orderNumber ?? null,
                description: previewValue(validatedCreate.description),
                contentBlocks: summarizeContentBlocksValue(validatedCreate.contentBlocks),
              },
            });

            if (!dryRun) {
              const createdLesson = await storage.createLesson(validatedCreate);
              existingLessons.push(createdLesson);
            }
          }

          if (!dryRun) {
            const currentRaw = (safeJsonParse<Record<string, any>>(notation.rawJsonb) ?? {}) as Record<string, any>;
            await storage.updateNotation(notation.id, {
              rawJsonb: {
                ...currentRaw,
                syncToLessons: {
                  schoolId,
                  syncedAt: new Date().toISOString(),
                  syncedByUserId: userId,
                },
              },
            });
          }
        } catch (error) {
          failed++;
          errors.push({
            notationId: notation.id,
            posNoid: notation.posNoid ?? null,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }

      res.json({
        success: true,
        target: "lessons",
        schoolId,
        dryRun,
        processed: posNotations.length,
        created,
        updated,
        skipped,
        failed,
        errors: errors.slice(0, 50),
        preview,
        previewTruncated: preview.length >= 100 && posNotations.length > 100,
      });
    } catch (error) {
      console.error("POS notations -> Lessons sync error:", error);
      res.status(500).json({
        message: "Failed to sync POS notations to Lessons",
        code: "POS_NOTATIONS_SYNC_ERROR",
        context: { endpoint: "/api/pos-import/sync/notations-to-lessons" },
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
);

// ============================================
// Mapping Endpoints
// ============================================

/**
 * POST /api/mappings
 * Create a song ↔ notation mapping
 */
router.post(
  "/mappings",
  requireAuth,
  loadSchoolContext,
  requireTeacherOrOwner(),
  async (req: Request, res: Response) => {
    try {
      const schoolId = req.school?.id || req.user!.schoolId;
      if (!schoolId) {
        return res.status(400).json({ message: "School ID required" });
      }

      const { songId, notationId, feel, difficulty, section, isLoop, notes, mappingType } = req.body;

      if (!songId && !notationId) {
        return res.status(400).json({ message: "songId or notationId required" });
      }

      // Verify song and notation belong to the same school
      if (songId) {
        const song = await storage.getPosSong(songId);
        if (!song || song.schoolId !== schoolId) {
          return res.status(404).json({ message: "Song not found" });
        }
      }

      if (notationId) {
        const notation = await storage.getNotation(notationId);
        if (!notation || notation.schoolId !== schoolId) {
          return res.status(404).json({ message: "Notation not found" });
        }
      }

      const mapping = await storage.createSongNotationMapping({
        schoolId,
        songId: songId || null,
        notationId: notationId || null,
        feel: feel || null,
        difficulty: difficulty || null,
        section: section || null,
        isLoop: isLoop !== undefined ? isLoop : true,
        notes: notes || null,
        mappingType: mappingType || "manual",
      });

      res.json(mapping);
    } catch (error) {
      console.error("Mapping creation error:", error);
      return sendPosRouteError(
        res,
        "Failed to create mapping",
        "POS_MAPPING_CREATE_ERROR",
        "/api/pos-import/mappings",
        error,
      );
    }
  }
);

/**
 * GET /api/mappings
 * Get all mappings for the school
 */
router.get(
  "/mappings",
  requireAuth,
  loadSchoolContext,
  requireTeacherOrOwner(),
  async (req: Request, res: Response) => {
    try {
      const schoolId = req.school?.id || req.user!.schoolId;
      if (!schoolId) {
        return res.status(400).json({ message: "School ID required" });
      }

      const [mappings, songs, notations] = await Promise.all([
        storage.getSongNotationMappings(schoolId),
        storage.getPosSongs(schoolId),
        storage.getNotations(schoolId),
      ]);

      const songsById = new Map(songs.map((song) => [song.id, song]));
      const notationsById = new Map(notations.map((notation) => [notation.id, notation]));

      res.json(mappings.map((mapping) => enrichMappingForResponse(mapping, songsById, notationsById)));
    } catch (error) {
      console.error("Mappings fetch error:", error);
      return sendPosRouteError(
        res,
        "Failed to fetch mappings",
        "POS_MAPPINGS_FETCH_ERROR",
        "/api/pos-import/mappings",
        error,
      );
    }
  }
);

/**
 * DELETE /api/mappings/:id
 * Delete a mapping
 */
router.delete(
  "/mappings/:id",
  requireAuth,
  loadSchoolContext,
  requireTeacherOrOwner(),
  async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid mapping ID" });
      }

      const mapping = await storage.getSongNotationMapping(id);
      if (!mapping) {
        return res.status(404).json({ message: "Mapping not found" });
      }

      // Verify school access
      const schoolId = req.school?.id || req.user!.schoolId;
      if (mapping.schoolId !== schoolId) {
        return res.status(403).json({ message: "Access denied" });
      }

      await storage.deleteSongNotationMapping(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Mapping deletion error:", error);
      return sendPosRouteError(
        res,
        "Failed to delete mapping",
        "POS_MAPPING_DELETE_ERROR",
        "/api/pos-import/mappings/:id",
        error,
        { mappingId: req.params.id },
      );
    }
  }
);

// ============================================
// Drumblock Endpoints
// ============================================

/**
 * GET /api/drumblocks
 * Get all drumblocks for the school
 */
router.get(
  "/drumblocks",
  requireAuth,
  loadSchoolContext,
  requireTeacherOrOwner(),
  async (req: Request, res: Response) => {
    try {
      const schoolId = req.school?.id || req.user!.schoolId;
      if (!schoolId) {
        return res.status(400).json({ message: "School ID required" });
      }

      const blocks = await storage.getDrumblocks(schoolId);

      // Parse events from JSON string
      const blocksWithEvents = blocks.map((block) => ({
        ...block,
        events: block.events ? JSON.parse(block.events) : [],
        tags: block.tags ? JSON.parse(block.tags) : [],
      }));

      res.json(blocksWithEvents);
    } catch (error) {
      console.error("Drumblocks fetch error:", error);
      return sendPosRouteError(
        res,
        "Failed to fetch drumblocks",
        "POS_DRUMBLOCKS_FETCH_ERROR",
        "/api/pos-import/drumblocks",
        error,
      );
    }
  }
);

/**
 * GET /api/drumblocks/:id
 * Get a single drumblock
 */
router.get(
  "/drumblocks/:id",
  requireAuth,
  loadSchoolContext,
  requireTeacherOrOwner(),
  async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid drumblock ID" });
      }

      const block = await storage.getDrumblock(id);
      if (!block) {
        return res.status(404).json({ message: "Drumblock not found" });
      }

      // Verify school access
      const schoolId = req.school?.id || req.user!.schoolId;
      if (block.schoolId !== schoolId) {
        return res.status(403).json({ message: "Access denied" });
      }

      res.json({
        ...block,
        events: block.events ? JSON.parse(block.events) : [],
        tags: block.tags ? JSON.parse(block.tags) : [],
      });
    } catch (error) {
      console.error("Drumblock fetch error:", error);
      return sendPosRouteError(
        res,
        "Failed to fetch drumblock",
        "POS_DRUMBLOCK_FETCH_ERROR",
        "/api/pos-import/drumblocks/:id",
        error,
        { drumblockId: req.params.id },
      );
    }
  }
);

// ============================================
// Utility Endpoints
// ============================================

/**
 * POST /api/pos-import/parse-notation
 * Parse a notation string and return parsed result (for testing)
 */
router.post(
  "/parse-notation",
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const { notation } = req.body;

      if (!notation) {
        return res.status(400).json({ message: "Notation string required" });
      }

      // Validate first
      const validation = validateNotation(notation);

      // Full parse
      const parsed = parseNotation(notation);

      // Text representation
      const text = notationToText(parsed);

      res.json({
        validation,
        parsed,
        textRepresentation: text,
      });
    } catch (error) {
      console.error("Notation parse error:", error);
      return sendPosRouteError(
        res,
        "Failed to parse notation",
        "POS_PARSE_NOTATION_ERROR",
        "/api/pos-import/parse-notation",
        error,
      );
    }
  }
);

// ============================================
// Generator Endpoints
// ============================================

/**
 * POST /api/generator/random
 * Generate a random pattern from drumblocks
 */
router.post(
  "/generator/random",
  requireAuth,
  loadSchoolContext,
  requireTeacherOrOwner(),
  async (req: Request, res: Response) => {
    try {
      const schoolId = req.school?.id || req.user!.schoolId;
      if (!schoolId) {
        return res.status(400).json({ message: "School ID required" });
      }

      const {
        blockCount = 4,
        maxDifficulty,
        limbBalance,
        density,
        tempoRange,
        tags,
        excludeTags,
      } = req.body;

      const constraints = {
        maxDifficulty,
        limbBalance,
        density,
        tempoRange,
        tags,
        excludeTags,
      };

      const pattern = await generateRandomPattern(schoolId, blockCount, constraints);

      // Add analysis
      const analysis = pattern.playable ? analyzePattern(pattern) : null;

      res.json({
        ...pattern,
        analysis,
      });
    } catch (error) {
      console.error("Random pattern generation error:", error);
      res.status(500).json({
        message: "Failed to generate pattern",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
);

/**
 * POST /api/generator/constrained
 * Generate a pattern with specific constraints
 */
router.post(
  "/generator/constrained",
  requireAuth,
  loadSchoolContext,
  requireTeacherOrOwner(),
  async (req: Request, res: Response) => {
    try {
      const schoolId = req.school?.id || req.user!.schoolId;
      if (!schoolId) {
        return res.status(400).json({ message: "School ID required" });
      }

      const { constraints, blockCount = 4 } = req.body;

      if (!constraints) {
        return res.status(400).json({ message: "Constraints required" });
      }

      const pattern = await generateRandomPattern(schoolId, blockCount, constraints);
      const analysis = pattern.playable ? analyzePattern(pattern) : null;

      res.json({
        ...pattern,
        analysis,
      });
    } catch (error) {
      console.error("Constrained pattern generation error:", error);
      res.status(500).json({
        message: "Failed to generate pattern",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
);

/**
 * POST /api/generator/from-blocks
 * Generate a pattern from specific block IDs
 */
router.post(
  "/generator/from-blocks",
  requireAuth,
  loadSchoolContext,
  requireTeacherOrOwner(),
  async (req: Request, res: Response) => {
    try {
      const schoolId = req.school?.id || req.user!.schoolId;
      if (!schoolId) {
        return res.status(400).json({ message: "School ID required" });
      }

      const { blockIds, tempo = 120 } = req.body;

      if (!blockIds || !Array.isArray(blockIds) || blockIds.length === 0) {
        return res.status(400).json({ message: "blockIds array required" });
      }

      const pattern = await generatePatternFromBlocks(schoolId, blockIds, tempo);
      const analysis = pattern.playable ? analyzePattern(pattern) : null;

      res.json({
        ...pattern,
        analysis,
      });
    } catch (error) {
      console.error("Pattern from blocks error:", error);
      res.status(500).json({
        message: "Failed to generate pattern",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
);

/**
 * POST /api/generator/progressive
 * Generate progressive patterns for practice
 */
router.post(
  "/generator/progressive",
  requireAuth,
  loadSchoolContext,
  requireTeacherOrOwner(),
  async (req: Request, res: Response) => {
    try {
      const schoolId = req.school?.id || req.user!.schoolId;
      if (!schoolId) {
        return res.status(400).json({ message: "School ID required" });
      }

      const {
        startDifficulty = 1,
        endDifficulty = 3,
        blocksPerLevel = 2,
      } = req.body;

      const patterns = await generateProgressivePattern(
        schoolId,
        startDifficulty,
        endDifficulty,
        blocksPerLevel
      );

      // Add analysis to each pattern
      const patternsWithAnalysis = patterns.map((pattern) => ({
        ...pattern,
        analysis: pattern.playable ? analyzePattern(pattern) : null,
      }));

      res.json({
        patterns: patternsWithAnalysis,
        totalPatterns: patterns.length,
        difficultyRange: { start: startDifficulty, end: endDifficulty },
      });
    } catch (error) {
      console.error("Progressive pattern generation error:", error);
      res.status(500).json({
        message: "Failed to generate progressive patterns",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
);

/**
 * GET /api/generator/suggestions/:blockId
 * Get suggested blocks based on a seed block
 */
router.get(
  "/generator/suggestions/:blockId",
  requireAuth,
  loadSchoolContext,
  requireTeacherOrOwner(),
  async (req: Request, res: Response) => {
    try {
      const schoolId = req.school?.id || req.user!.schoolId;
      if (!schoolId) {
        return res.status(400).json({ message: "School ID required" });
      }

      const { blockId } = req.params;
      const count = parseInt(req.query.count as string) || 4;

      const suggestions = await getSuggestedBlocks(schoolId, blockId, count);

      // Parse JSON fields for response
      const suggestionsWithParsedFields = suggestions.map((block) => ({
        ...block,
        events: block.events ? JSON.parse(block.events) : [],
        tags: block.tags ? JSON.parse(block.tags) : [],
      }));

      res.json(suggestionsWithParsedFields);
    } catch (error) {
      console.error("Block suggestions error:", error);
      res.status(500).json({
        message: "Failed to get block suggestions",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
);

export default router;
