/**
 * JSON Import Routes
 * 
 * Handles importing lessons and songs from JSON files exported from MusicDott v1.
 * Only accessible by teachers and school owners.
 */

import { Router, type Request, type Response } from "express";
import { storage } from "../storage-wrapper";
import { requireAuth } from "../auth";
import { loadSchoolContext, requireTeacherOrOwner } from "../middleware/authz";
import { z } from "zod";
import { insertLessonSchema, insertSongSchema, USER_ROLES } from "@shared/schema";
import { transformJsonContent, normalizeDescription, normalizeLevel } from "../utils/json-content-transformer";
import { optimizedSongImport, fixExistingCorruptedSongs } from "../utils/optimized-import";

const router = Router();

// Validation schema for import request
const importRequestSchema = z.object({
  lessons: z.array(z.object({
    title: z.string(),
    description: z.string().optional(),
    contentType: z.string().optional(),
    instrument: z.string().optional(),
    level: z.string().optional(),
    content: z.string().optional(),
  })).optional(),
  songs: z.array(z.object({
    title: z.string(),
    artist: z.string().optional(),
    instrument: z.string().optional(),
    level: z.string().optional(),
    description: z.string().optional(),
    content: z.string().optional(),
  })).optional(),
  schoolId: z.number().int().positive()
});

/**
 * POST /api/import/json-content
 * 
 * Import lessons and songs from JSON format.
 * Requires teacher or school owner role.
 */
router.post("/json-content", requireAuth, loadSchoolContext, requireTeacherOrOwner, async (req: Request, res: Response) => {
  try {
    console.log("Starting JSON import process...");
    
    // Validate request body
    const validatedData = importRequestSchema.parse(req.body);
    const { lessons, songs, schoolId } = validatedData;
    
    // Verify user has access to this school
    const user = req.user!;
    if (user.role !== USER_ROLES.PLATFORM_OWNER && user.schoolId !== schoolId) {
      return res.status(403).json({ 
        success: false, 
        message: "Access denied: You can only import to your own school" 
      });
    }
    
    let importStats = {
      lessons: {
        total: 0,
        imported: 0,
        skipped: 0,
        errors: 0
      },
      songs: {
        total: 0,
        imported: 0,
        skipped: 0,
        errors: 0
      }
    };
    
    // Import lessons
    if (lessons && lessons.length > 0) {
      console.log(`Processing ${lessons.length} lessons...`);
      importStats.lessons.total = lessons.length;
      
      for (const lessonData of lessons) {
        try {
          // Skip lessons with no title or empty titles
          if (!lessonData.title || lessonData.title.trim() === '' || lessonData.title === 'nan') {
            importStats.lessons.skipped++;
            continue;
          }
          
          // Check if lesson already exists
          const existingLessons = await storage.getLessonsBySchool(schoolId);
          const exists = existingLessons.some(lesson => lesson.title === lessonData.title);
          
          if (exists) {
            console.log(`Lesson "${lessonData.title}" already exists, skipping...`);
            importStats.lessons.skipped++;
            continue;
          }
          
          // Transform content to contentBlocks
          const contentBlocks = transformJsonContent(lessonData.content || '');
          
          // Prepare lesson data for database
          const lessonToCreate = {
            schoolId: schoolId,
            title: lessonData.title.trim(),
            description: normalizeDescription(lessonData.description),
            contentType: lessonData.contentType === 'nan' ? 'standard' : (lessonData.contentType || 'standard'),
            instrument: lessonData.instrument === 'nan' ? 'drums' : (lessonData.instrument || 'drums'),
            level: normalizeLevel(lessonData.level),
            userId: user.id,
            contentBlocks: JSON.stringify(contentBlocks),
            categoryId: null, // Will be handled separately if needed
            orderNumber: null
          };
          
          // Validate with schema
          const validatedLessonData = insertLessonSchema.parse(lessonToCreate);
          
          // Create lesson
          await storage.createLesson(validatedLessonData);
          importStats.lessons.imported++;
          
          console.log(`Successfully imported lesson: "${lessonData.title}"`);
        } catch (error) {
          console.error(`Error importing lesson "${lessonData.title}":`, error);
          importStats.lessons.errors++;
        }
      }
    }
    
    // Import songs using optimized import
    if (songs && songs.length > 0) {
      console.log(`Using optimized import for ${songs.length} songs...`);
      
      const songImportStats = await optimizedSongImport(songs, schoolId, user.id);
      
      importStats.songs = {
        total: songImportStats.total,
        imported: songImportStats.imported,
        skipped: songImportStats.skipped + songImportStats.duplicates,
        errors: songImportStats.errors
      };
      
      console.log(`Optimized song import completed. Duplicates found: ${songImportStats.duplicates}`);
    }
    
    console.log("JSON import completed:", importStats);
    
    res.json({
      success: true,
      message: "Import completed successfully",
      stats: importStats
    });
    
  } catch (error) {
    console.error("JSON import error:", error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: "Invalid request data",
        errors: error.errors
      });
    }
    
    res.status(500).json({
      success: false,
      message: "Import failed due to server error",
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * POST /api/import/fix-corrupted
 * 
 * Fix existing corrupted songs in the database.
 * Requires teacher or school owner role.
 */
router.post("/fix-corrupted", requireAuth, loadSchoolContext, requireTeacherOrOwner, async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const schoolId = user.schoolId!;
    
    console.log(`Starting corruption fix for school ${schoolId}...`);
    
    const fixedCount = await fixExistingCorruptedSongs(schoolId);
    
    res.json({
      success: true,
      message: "Corruption fix completed successfully",
      fixedCount: fixedCount
    });
    
  } catch (error) {
    console.error("Error fixing corrupted songs:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fix corrupted songs",
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * GET /api/import/status
 * 
 * Get import status and recent import history.
 * Requires teacher or school owner role.
 */
router.get("/status", requireAuth, loadSchoolContext, requireTeacherOrOwner, async (req: Request, res: Response) => {
  try {
    // For now, return basic status - in a full implementation this would track import jobs
    const importStatus = {
      isImporting: false,
      lastImportDate: null,
      totalImports: 0,
      recentImports: [],
      supportedFormats: ['JSON'],
      maxFileSize: '10MB'
    };
    
    res.json({
      success: true,
      status: importStatus
    });
  } catch (error) {
    console.error("Error getting import status:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get import status",
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

export default router;