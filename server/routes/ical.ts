import { Router, Request, Response } from "express";
import multer from "multer";
import { storage } from "../storage";
import { 
  parseICalFile, 
  generateICalFromSchedules, 
  convertICalToSchedules,
  validateICalFile,
  generateSampleICalendar,
  type ParsedCalendarEvent,
  type CalendarExportOptions
} from "../utils/ical-utils";
import { requireAuth } from "../auth";
import { insertRecurringScheduleSchema } from "@shared/schema";
import { z } from "zod";

const router = Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/calendar' || file.originalname.endsWith('.ics')) {
      cb(null, true);
    } else {
      cb(new Error('Only .ics files are allowed'));
    }
  },
});

// Export schedules as iCal
router.get("/export", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const {
      name = 'Music Lessons',
      description,
      timezone = 'Europe/Amsterdam',
      includeAlarms = 'false'
    } = req.query;

    // Fetch user's schedules, students, and teacher info
    const [schedules, students, teachers] = await Promise.all([
      storage.getRecurringSchedules(userId),
      storage.getStudents(userId),
      storage.getTeachers()
    ]);

    const options: CalendarExportOptions = {
      name: name as string,
      description: description as string,
      timezone: timezone as string,
      includeAlarms: includeAlarms === 'true',
    };

    const icalContent = generateICalFromSchedules(schedules, students, teachers, options);

    // Set appropriate headers for file download
    res.setHeader('Content-Type', 'text/calendar');
    res.setHeader('Content-Disposition', `attachment; filename="${name.toString().replace(/[^a-z0-9]/gi, '_')}.ics"`);
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    
    res.send(icalContent);
  } catch (error) {
    console.error('Error exporting iCal:', error);
    res.status(500).json({ 
      message: "Failed to export calendar",
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Import iCal file and preview events
router.post("/import/preview", requireAuth, upload.single('icsFile'), async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    if (!req.file) {
      return res.status(400).json({ message: "No .ics file provided" });
    }

    const icsContent = req.file.buffer.toString('utf-8');
    
    // Validate iCal format
    if (!validateICalFile(icsContent)) {
      return res.status(400).json({ message: "Invalid iCal file format" });
    }

    // Parse events
    const events = parseICalFile(icsContent);
    
    // Convert to potential schedules for preview
    const potentialSchedules = convertICalToSchedules(events, userId);

    // Add conflict detection
    const existingSchedules = await storage.getRecurringSchedules(userId);
    const conflicts = detectImportConflicts(potentialSchedules, existingSchedules);

    res.json({
      totalEvents: events.length,
      events: events.map(event => ({
        uid: event.uid,
        summary: event.summary,
        description: event.description,
        startTime: event.startTime,
        endTime: event.endTime,
        location: event.location,
        recurring: event.recurring,
        dayOfWeek: event.startTime.getDay(),
        duration: Math.ceil((event.endTime.getTime() - event.startTime.getTime()) / (1000 * 60)), // minutes
      })),
      potentialSchedules,
      conflicts,
      requiresStudentMapping: potentialSchedules.every(s => s.studentId === 0),
    });
  } catch (error) {
    console.error('Error previewing iCal import:', error);
    res.status(500).json({ 
      message: "Failed to preview calendar import",
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Import iCal file and create schedules
router.post("/import/confirm", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const { schedules, studentMappings = {} } = req.body;
    
    if (!schedules || !Array.isArray(schedules)) {
      return res.status(400).json({ message: "Invalid schedules data" });
    }

    const createdSchedules = [];
    const errors = [];

    for (let i = 0; i < schedules.length; i++) {
      try {
        const scheduleData = schedules[i];
        
        // Apply student mapping if provided
        if (studentMappings[i]) {
          scheduleData.studentId = studentMappings[i];
        }

        // Validate the schedule data
        const validatedData = insertRecurringScheduleSchema.parse({
          ...scheduleData,
          userId,
        });

        // Check for conflicts with existing schedules
        const existingSchedules = await storage.getRecurringSchedules(userId);
        const conflicts = detectScheduleConflicts(validatedData, existingSchedules);
        
        if (conflicts.length > 0) {
          errors.push({
            index: i,
            message: `Schedule conflict detected`,
            conflicts: conflicts.map(c => ({
              studentId: c.studentId,
              dayOfWeek: c.dayOfWeek,
              startTime: c.startTime,
              endTime: c.endTime,
            }))
          });
          continue;
        }

        const newSchedule = await storage.createRecurringSchedule(validatedData);
        createdSchedules.push(newSchedule);
      } catch (error) {
        errors.push({
          index: i,
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    res.json({
      success: true,
      created: createdSchedules.length,
      errors: errors.length,
      createdSchedules,
      errorDetails: errors,
    });
  } catch (error) {
    console.error('Error importing iCal:', error);
    res.status(500).json({ 
      message: "Failed to import calendar",
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get sample iCal for testing
router.get("/sample", requireAuth, (req: Request, res: Response) => {
  try {
    const sampleIcal = generateSampleICalendar();
    
    res.setHeader('Content-Type', 'text/calendar');
    res.setHeader('Content-Disposition', 'attachment; filename="sample-music-lessons.ics"');
    
    res.send(sampleIcal);
  } catch (error) {
    console.error('Error generating sample iCal:', error);
    res.status(500).json({ message: "Failed to generate sample calendar" });
  }
});

// Validate iCal file endpoint
router.post("/validate", requireAuth, upload.single('icsFile'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No .ics file provided" });
    }

    const icsContent = req.file.buffer.toString('utf-8');
    const isValid = validateICalFile(icsContent);
    
    if (isValid) {
      const events = parseICalFile(icsContent);
      res.json({
        valid: true,
        eventCount: events.length,
        message: `Valid iCal file with ${events.length} events`
      });
    } else {
      res.json({
        valid: false,
        message: "Invalid iCal file format"
      });
    }
  } catch (error) {
    res.json({
      valid: false,
      message: error instanceof Error ? error.message : "Invalid iCal file"
    });
  }
});

// Helper functions

function detectImportConflicts(potentialSchedules: any[], existingSchedules: any[]): any[] {
  const conflicts = [];
  
  for (const potential of potentialSchedules) {
    for (const existing of existingSchedules) {
      if (existing.dayOfWeek === potential.dayOfWeek) {
        const potentialStart = parseTime(potential.startTime);
        const potentialEnd = parseTime(potential.endTime);
        const existingStart = parseTime(existing.startTime);
        const existingEnd = parseTime(existing.endTime);

        // Check for overlap
        if (
          (potentialStart < existingEnd && potentialEnd > existingStart) ||
          (existingStart < potentialEnd && existingEnd > potentialStart)
        ) {
          conflicts.push({
            type: 'time_conflict',
            potential,
            existing,
            message: `Time conflict on ${['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][potential.dayOfWeek]}`
          });
        }
      }
    }
  }
  
  return conflicts;
}

function detectScheduleConflicts(newSchedule: any, existingSchedules: any[]): any[] {
  const conflicts = [];
  
  for (const existing of existingSchedules) {
    if (existing.dayOfWeek === newSchedule.dayOfWeek) {
      const newStart = parseTime(newSchedule.startTime);
      const newEnd = parseTime(newSchedule.endTime);
      const existingStart = parseTime(existing.startTime);
      const existingEnd = parseTime(existing.endTime);

      // Check for overlap
      if (
        (newStart < existingEnd && newEnd > existingStart) ||
        (existingStart < newEnd && existingEnd > newStart)
      ) {
        conflicts.push(existing);
      }
    }
  }
  
  return conflicts;
}

function parseTime(timeString: string): number {
  const [hours, minutes] = timeString.split(':').map(Number);
  return hours * 60 + minutes;
}

export default router;