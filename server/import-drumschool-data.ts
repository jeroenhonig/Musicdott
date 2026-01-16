import fs from "node:fs/promises";
import csv from "csv-parser";
import { storage } from './storage-wrapper';
import { insertStudentSchema, insertUserSchema, type InsertStudent, type InsertUser } from '@shared/schema';
import { z } from 'zod';
import bcrypt from 'bcrypt';

// Types for the imported data
type ImportedStudent = {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  phone?: string | null;
  city?: string | null;
  notes?: string | null;
  instrument: string;
};

type StudentAccount = {
  studentId: string;
  fullName: string;
  email: string;
  username: string;
  tempPassword: string;
};

type ScheduleEntry = {
  studentId: string;
  studentName: string;
  email: string;
  dayOfWeek: string;
  startTime: string;
  durationMin: number;
  timezone: string;
  frequency: string;
  ical: {
    DTSTART: string;
    TZID: string;
    RRULE: string;
  };
  notes?: string | null;
};

// Validation schemas
const importStudentSchema = z.object({
  id: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  fullName: z.string(),
  email: z.string().email(),
  phone: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  instrument: z.string(),
});

const studentAccountSchema = z.object({
  studentId: z.string(),
  fullName: z.string(),
  email: z.string().email(),
  username: z.string(),
  tempPassword: z.string(),
});

const scheduleEntrySchema = z.object({
  studentId: z.string(),
  studentName: z.string(),
  email: z.string().email(),
  dayOfWeek: z.string().min(2).max(2),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  durationMin: z.number().min(1).max(480),
  timezone: z.string(),
  frequency: z.string(),
  ical: z.object({
    DTSTART: z.string(),
    TZID: z.string(),
    RRULE: z.string()
  }),
  notes: z.string().nullable().optional(),
});

// Helper functions
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

function calculateEndTime(startTime: string, durationMin: number): string {
  const [hours, minutes] = startTime.split(':').map(Number);
  const startMinutes = hours * 60 + minutes;
  const endMinutes = startMinutes + durationMin;
  const endHours = Math.floor(endMinutes / 60) % 24;
  const endMins = endMinutes % 60;
  return `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}`;
}

async function hashPassword(plainPassword: string): Promise<string> {
  return await bcrypt.hash(plainPassword, 10);
}

// Read CSV file with proper parsing
async function readCsvFile(filePath: string): Promise<StudentAccount[]> {
  return new Promise((resolve, reject) => {
    const results: StudentAccount[] = [];
    const stream = require('fs').createReadStream(filePath)
      .pipe(csv())
      .on('data', (data: any) => {
        results.push(studentAccountSchema.parse(data));
      })
      .on('end', () => {
        resolve(results);
      })
      .on('error', reject);
  });
}

export async function importDrumschoolData(schoolId: number = 8) {
  console.log(`Starting complete drumschool data import for school ID ${schoolId}`);
  
  const results = {
    students: { imported: 0, updated: 0, failed: 0, errors: [] as any[] },
    accounts: { created: 0, failed: 0, errors: [] as any[] },
    schedules: { imported: 0, updated: 0, failed: 0, errors: [] as any[] }
  };

  try {
    // Step 1: Load all data files
    console.log("Loading data files...");
    const studentsRaw = await fs.readFile("export/musicdott2_students.json", "utf-8");
    const studentsData = JSON.parse(studentsRaw).map((s: any) => importStudentSchema.parse(s));
    
    const accountsData = await readCsvFile("export/student_accounts.csv");
    
    const schedulesRaw = await fs.readFile("export/musicdott2_schedule.json", "utf-8");
    const schedulesData = JSON.parse(schedulesRaw).map((s: any) => scheduleEntrySchema.parse(s));

    console.log(`Loaded ${studentsData.length} students, ${accountsData.length} accounts, ${schedulesData.length} schedule entries`);

    // Create lookup map for account credentials
    const accountMap = new Map<string, StudentAccount>();
    accountsData.forEach(account => {
      accountMap.set(account.studentId, account);
    });

    // Step 2: Import students with coordinated account creation
    console.log("Importing students and creating user accounts...");
    for (const studentData of studentsData) {
      try {
        const account = accountMap.get(studentData.id);
        if (!account) {
          console.warn(`No account credentials found for student ID ${studentData.id}, skipping`);
          results.students.failed++;
          results.students.errors.push({ studentId: studentData.id, error: "No account credentials found" });
          continue;
        }

        // Check if student already exists
        const existingStudent = await storage.getStudentByEmail(studentData.email);
        
        if (existingStudent) {
          // Update existing student
          const updateData: Partial<InsertStudent> = {
            firstName: studentData.firstName,
            lastName: studentData.lastName,
            name: studentData.fullName,
            phone: studentData.phone,
            city: studentData.city,
            instrument: studentData.instrument || "drums",
            schoolId
          };
          
          await storage.updateStudent(existingStudent.id, updateData);
          results.students.updated++;
          console.log(`Updated existing student: ${studentData.fullName}`);
          
        } else {
          // Create new student
          const newStudentData: InsertStudent = {
            firstName: studentData.firstName,
            lastName: studentData.lastName,
            name: studentData.fullName,
            username: account.username, // Use pre-generated username
            password: '', // Will be cleared after user account creation
            email: studentData.email,
            phone: studentData.phone || null,
            address: null,
            city: studentData.city || null,
            zipCode: null,
            birthDate: null,
            level: "beginner",
            instrument: studentData.instrument || "drums",
            assignedTeacherId: null,
            role: "student",
            schoolId,
            userId: null // Will be set after user creation
          };
          
          const createdStudent = await storage.createStudent(newStudentData);
          results.students.imported++;

          // Create user account with pre-generated credentials
          try {
            const hashedPassword = await hashPassword(account.tempPassword);
            const userAccountData: InsertUser = {
              schoolId,
              username: account.username,
              password: hashedPassword,
              name: studentData.fullName,
              email: studentData.email,
              role: 'student',
              mustChangePassword: true,
              instruments: studentData.instrument,
              avatar: null,
              bio: null,
              lastLoginAt: null,
            };
            
            const newUser = await storage.createUser(userAccountData);
            
            // Link student to user account
            await storage.updateStudent(createdStudent.id, { 
              userId: newUser.id,
              password: '' // Clear placeholder password
            });
            
            results.accounts.created++;
            console.log(`Created student and account: ${studentData.fullName} (${account.username})`);
            
          } catch (accountError) {
            results.accounts.failed++;
            results.accounts.errors.push({
              studentId: studentData.id,
              error: accountError instanceof Error ? accountError.message : String(accountError)
            });
            console.error(`Failed to create account for ${studentData.fullName}:`, accountError);
          }
        }
        
      } catch (error) {
        results.students.failed++;
        results.students.errors.push({
          studentId: studentData.id,
          error: error instanceof Error ? error.message : String(error)
        });
        console.error(`Failed to import student ${studentData.id}:`, error);
      }
    }

    // Step 3: Import schedules
    console.log("Importing recurring lesson schedules...");
    for (const scheduleEntry of schedulesData) {
      try {
        // Find student by email
        const student = await storage.getStudentByEmail(scheduleEntry.email);
        if (!student) {
          console.warn(`Student not found for schedule: ${scheduleEntry.email}`);
          results.schedules.failed++;
          results.schedules.errors.push({
            studentEmail: scheduleEntry.email,
            error: "Student not found"
          });
          continue;
        }

        // Check if schedule already exists
        const existingSchedules = await storage.getStudentRecurringSchedules(student.id);
        const dayOfWeekText = convertDayOfWeekToText(scheduleEntry.dayOfWeek);
        
        const existingSchedule = existingSchedules.find(
          s => s.dayOfWeek === dayOfWeekText && s.startTime === scheduleEntry.startTime
        );
        
        const endTime = calculateEndTime(scheduleEntry.startTime, scheduleEntry.durationMin);
        
        if (existingSchedule) {
          // Update existing schedule
          await storage.updateRecurringSchedule(existingSchedule.id, {
            endTime,
            location: 'Studio',
            notes: scheduleEntry.notes && scheduleEntry.notes !== 'nan' ? scheduleEntry.notes : null,
            durationMin: scheduleEntry.durationMin,
            timezone: scheduleEntry.timezone,
            frequency: scheduleEntry.frequency,
            isActive: true,
            iCalDtStart: scheduleEntry.ical.DTSTART,
            iCalRrule: scheduleEntry.ical.RRULE,
            iCalTzid: scheduleEntry.ical.TZID
          });
          results.schedules.updated++;
          
        } else {
          // Create new schedule
          const newScheduleData = {
            userId: 1, // Default teacher - you may want to adjust this
            studentId: student.id,
            dayOfWeek: dayOfWeekText,
            startTime: scheduleEntry.startTime,
            endTime,
            location: 'Studio',
            notes: scheduleEntry.notes && scheduleEntry.notes !== 'nan' ? scheduleEntry.notes : null,
            durationMin: scheduleEntry.durationMin,
            timezone: scheduleEntry.timezone,
            frequency: scheduleEntry.frequency,
            isActive: true,
            iCalDtStart: scheduleEntry.ical.DTSTART,
            iCalRrule: scheduleEntry.ical.RRULE,
            iCalTzid: scheduleEntry.ical.TZID
          };
          
          await storage.createRecurringSchedule(newScheduleData);
          results.schedules.imported++;
        }
        
        console.log(`Processed schedule for ${student.name}: ${dayOfWeekText} ${scheduleEntry.startTime}`);
        
      } catch (error) {
        results.schedules.failed++;
        results.schedules.errors.push({
          studentEmail: scheduleEntry.email,
          error: error instanceof Error ? error.message : String(error)
        });
        console.error(`Failed to import schedule for ${scheduleEntry.email}:`, error);
      }
    }

    // Generate summary report
    console.log("\n=== DRUMSCHOOL DATA IMPORT COMPLETE ===");
    console.log(`School ID: ${schoolId}`);
    console.log("\nStudents:");
    console.log(`  Imported: ${results.students.imported}`);
    console.log(`  Updated: ${results.students.updated}`);
    console.log(`  Failed: ${results.students.failed}`);
    
    console.log("\nUser Accounts:");
    console.log(`  Created: ${results.accounts.created}`);
    console.log(`  Failed: ${results.accounts.failed}`);
    
    console.log("\nSchedules:");
    console.log(`  Imported: ${results.schedules.imported}`);
    console.log(`  Updated: ${results.schedules.updated}`);
    console.log(`  Failed: ${results.schedules.failed}`);

    if (results.students.errors.length > 0 || results.accounts.errors.length > 0 || results.schedules.errors.length > 0) {
      console.log("\nErrors encountered during import:");
      if (results.students.errors.length > 0) {
        console.log("Student errors:", results.students.errors.slice(0, 5)); // Show first 5 errors
      }
      if (results.accounts.errors.length > 0) {
        console.log("Account errors:", results.accounts.errors.slice(0, 5));
      }
      if (results.schedules.errors.length > 0) {
        console.log("Schedule errors:", results.schedules.errors.slice(0, 5));
      }
    }

    return results;
    
  } catch (error) {
    console.error("Critical import error:", error);
    throw new Error(`Import failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}