/**
 * POS Import API Routes
 *
 * Endpoints for importing POS_Notatie.csv and POS_Songs.csv files
 */

import { Router, Request, Response } from "express";
import multer from "multer";
import { requireAuth } from "../auth";
import { loadSchoolContext, requireTeacherOrOwner } from "../middleware/authz";
import { storage } from "../storage-wrapper";
import {
  decodeLatin1,
  importNotationsFromCSV,
  importSongsFromCSV,
  previewCSV,
  validateCSV,
} from "../services/pos-csv-import";
import { parseNotation, validateNotation, notationToText } from "../services/notation-parser";

const router = Router();

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
      res.status(500).json({
        message: "Failed to fetch import history",
        error: error instanceof Error ? error.message : String(error),
      });
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
      res.json(notations);
    } catch (error) {
      console.error("Notations fetch error:", error);
      res.status(500).json({
        message: "Failed to fetch notations",
        error: error instanceof Error ? error.message : String(error),
      });
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

      // Parse notation on-the-fly if not already parsed
      let parsedNotation = notation.parsedNotation
        ? JSON.parse(notation.parsedNotation)
        : null;

      if (!parsedNotation && notation.posNotatie) {
        parsedNotation = parseNotation(notation.posNotatie);
      }

      res.json({
        ...notation,
        parsedNotation,
        textRepresentation: parsedNotation ? notationToText(parsedNotation) : null,
      });
    } catch (error) {
      console.error("Notation fetch error:", error);
      res.status(500).json({
        message: "Failed to fetch notation",
        error: error instanceof Error ? error.message : String(error),
      });
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
      res.status(500).json({
        message: "Failed to fetch drumblocks",
        error: error instanceof Error ? error.message : String(error),
      });
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

      res.json({
        ...updated,
        parsedNotation,
        textRepresentation: notationToText(parsedNotation),
      });
    } catch (error) {
      console.error("Notation reparse error:", error);
      res.status(500).json({
        message: "Failed to reparse notation",
        error: error instanceof Error ? error.message : String(error),
      });
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
      res.json(songs);
    } catch (error) {
      console.error("POS songs fetch error:", error);
      res.status(500).json({
        message: "Failed to fetch POS songs",
        error: error instanceof Error ? error.message : String(error),
      });
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

      // Parse embeds if stored as string
      const embeds = song.embeds ? JSON.parse(song.embeds) : {};

      res.json({
        ...song,
        embeds,
      });
    } catch (error) {
      console.error("POS song fetch error:", error);
      res.status(500).json({
        message: "Failed to fetch POS song",
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
      res.status(500).json({
        message: "Failed to create mapping",
        error: error instanceof Error ? error.message : String(error),
      });
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

      const mappings = await storage.getSongNotationMappings(schoolId);
      res.json(mappings);
    } catch (error) {
      console.error("Mappings fetch error:", error);
      res.status(500).json({
        message: "Failed to fetch mappings",
        error: error instanceof Error ? error.message : String(error),
      });
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
      res.status(500).json({
        message: "Failed to delete mapping",
        error: error instanceof Error ? error.message : String(error),
      });
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
      res.status(500).json({
        message: "Failed to fetch drumblocks",
        error: error instanceof Error ? error.message : String(error),
      });
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
      res.status(500).json({
        message: "Failed to fetch drumblock",
        error: error instanceof Error ? error.message : String(error),
      });
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
      res.status(500).json({
        message: "Failed to parse notation",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
);

export default router;
