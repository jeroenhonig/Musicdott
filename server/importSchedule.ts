import fs from "node:fs/promises";
import { storage } from './storage-wrapper';
import { insertRecurringScheduleSchema, type InsertRecurringSchedule } from '@shared/schema';
import { z } from 'zod';

// Input data structure from MusicDott 1.0 export
type ScheduleEntry = {
  studentId?: string | null;
  studentName?: string | null;
  email?: string | null;
  dayOfWeek: string;    // MO..SU
  startTime: string;    // "HH:MM"
  durationMin: number;
  timezone: string;     // "Europe/Amsterdam"
  frequency: string;    // "WEEKLY"
  ical: {
    DTSTART: string;    // "YYYYMMDDTHHMMSS"
    TZID: string;
    RRULE: string;
  };
  notes?: string | null;
  location?: string | null;
};

// Validation schema for import data
const importScheduleSchema = z.object({
  studentId: z.string().nullable().optional(),
  studentName: z.string().nullable().optional(),
  email: z.string().email().nullable().optional(),
  dayOfWeek: z.string().min(2).max(2), // MO, TU, WE, etc.
  startTime: z.string().regex(/^\d{2}:\d{2}$/, "Start time must be in HH:MM format"),
  durationMin: z.number().min(1).max(480), // 1 minute to 8 hours max
  timezone: z.string().optional(),
  frequency: z.string().optional(),
  ical: z.object({
    DTSTART: z.string(),
    TZID: z.string(),
    RRULE: z.string()
  }).optional(),
  notes: z.string().nullable().optional(),
  location: z.string().nullable().optional()
});

// Helper function to convert day abbreviation to consistent format for database
function convertDayOfWeekToText(dayCode: string): string {
  const dayMapping: { [key: string]: string } = {
    'MO': 'monday',
    'TU': 'tuesday', 
    'WE': 'wednesday',
    'TH': 'thursday',
    'FR': 'friday',
    'SA': 'saturday',
    'SU': 'sunday'
  };
  return dayMapping[dayCode] || dayCode.toLowerCase();
}

// Helper function to convert day text to number for UI compatibility
function convertDayTextToNumber(dayText: string): number {
  const dayMapping: { [key: string]: number } = {
    'sunday': 0,
    'monday': 1,
    'tuesday': 2,
    'wednesday': 3,
    'thursday': 4,
    'friday': 5,
    'saturday': 6
  };
  return dayMapping[dayText.toLowerCase()] || 1; // Default to Monday
}

// Helper function to calculate end time from start time and duration
function calculateEndTime(startTime: string, durationMin: number): string {
  const [hours, minutes] = startTime.split(':').map(Number);
  const startMinutes = hours * 60 + minutes;
  const endMinutes = startMinutes + durationMin;
  const endHours = Math.floor(endMinutes / 60) % 24;
  const endMins = endMinutes % 60;
  return `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}`;
}

export async function importSchedule(path = "export/musicdott2_schedule.json", defaultUserId: number = 1) {
  
  try {
    const raw = await fs.readFile(path, "utf-8");
    const rawEntries = JSON.parse(raw);
    
    // Validate input data structure
    const entries = rawEntries.map((entry: any) => importScheduleSchema.parse(entry));
    
    let imported = 0;
    let updated = 0;
    let failed = 0;
    const errors: Array<{ entry: any; error: string }> = [];
    
    for (const entry of entries) {
      try {
        // Find student by email (required for schedule import)
        if (!entry.email) {
          console.warn("Skipping schedule entry (no email):", entry);
          errors.push({ entry, error: "No email provided for student lookup" });
          failed++;
          continue;
        }
        
        const student = await storage.getStudentByEmail(entry.email);
        if (!student) {
          console.warn("Student not found for schedule entry:", entry);
          errors.push({ entry, error: `Student not found with email: ${entry.email}` });
          failed++;
          continue;
        }
        
        // Check if a recurring schedule already exists for this student and time
        const existingSchedules = await storage.getStudentRecurringSchedules(student.id);
        const dayOfWeekText = convertDayOfWeekToText(entry.dayOfWeek);
        
        const existingSchedule = existingSchedules.find(
          s => s.dayOfWeek === dayOfWeekText && s.startTime === entry.startTime
        );
        
        // Calculate end time from start time and duration
        const endTime = calculateEndTime(entry.startTime, entry.durationMin);
        
        if (existingSchedule) {
          // Update existing schedule with full iCal data
          await storage.updateRecurringSchedule(existingSchedule.id, {
            endTime,
            location: entry.location || entry.notes || 'Studio',
            notes: entry.notes && entry.notes !== 'nan' ? entry.notes : null,
            durationMin: entry.durationMin,
            timezone: entry.timezone || 'Europe/Amsterdam',
            frequency: entry.frequency || 'WEEKLY',
            isActive: true,
            // iCal integration fields
            iCalDtStart: entry.ical?.DTSTART || null,
            iCalRrule: entry.ical?.RRULE || null,
            iCalTzid: entry.ical?.TZID || entry.timezone || 'Europe/Amsterdam'
          });
          updated++;
        } else {
          // Create new recurring schedule with complete iCal data
          const newScheduleData: InsertRecurringSchedule = {
            userId: defaultUserId, // Default teacher
            studentId: student.id,
            dayOfWeek: dayOfWeekText,
            startTime: entry.startTime,
            endTime,
            location: entry.location || entry.notes || 'Studio',
            notes: entry.notes && entry.notes !== 'nan' ? entry.notes : null,
            durationMin: entry.durationMin,
            timezone: entry.timezone || 'Europe/Amsterdam',
            frequency: entry.frequency || 'WEEKLY',
            isActive: true,
            // iCal integration fields
            iCalDtStart: entry.ical?.DTSTART || null,
            iCalRrule: entry.ical?.RRULE || null,
            iCalTzid: entry.ical?.TZID || entry.timezone || 'Europe/Amsterdam'
          };
          
          // Validate against schema before creating
          const validatedData = insertRecurringScheduleSchema.parse(newScheduleData);
          await storage.createRecurringSchedule(validatedData);
          imported++;
        }
        
      } catch (error) {
        console.error("Failed to import schedule entry:", entry, error);
        errors.push({ 
          entry, 
          error: error instanceof Error ? error.message : String(error) 
        });
        failed++;
      }
    }
    
    console.log(`Schedule import complete: ${imported} imported, ${updated} updated, ${failed} failed`);
    if (errors.length > 0) {
      console.log("Import errors:", errors);
    }
    
    return { imported, updated, failed, errors };
    
  } catch (error) {
    console.error("Critical schedule import error:", error);
    throw new Error(`Schedule import failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}