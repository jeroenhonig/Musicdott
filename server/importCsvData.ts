import fs from "node:fs/promises";
import { storage } from './storage-wrapper';
import { insertStudentSchema, insertSongSchema, insertLessonSchema, type InsertStudent, type InsertSong, type InsertLesson } from '@shared/schema';
import { z } from 'zod';
import bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { logger } from './utils/logger';

// CSV parsing helper
function parseCSV(csvText: string): any[] {
  const lines = csvText.split('\n').filter(line => line.trim());
  if (lines.length === 0) return [];
  
  const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
  const rows = [];
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;
    
    // Parse CSV line with proper quote handling
    const values = [];
    let currentValue = '';
    let inQuotes = false;
    
    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(currentValue.trim());
        currentValue = '';
      } else {
        currentValue += char;
      }
    }
    values.push(currentValue.trim()); // Add the last value
    
    // Create object from headers and values
    const row: any = {};
    headers.forEach((header, index) => {
      row[header] = values[index] || null;
    });
    rows.push(row);
  }
  
  return rows;
}

// Helper function to generate secure random password
function generateSecurePassword(length: number = 16): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  const randomBytesArray = randomBytes(length);
  let password = '';

  for (let i = 0; i < length; i++) {
    password += chars[randomBytesArray[i] % chars.length];
  }

  return password;
}

// Helper function to hash password
async function hashPassword(plainPassword: string): Promise<string> {
  return await bcrypt.hash(plainPassword, 10);
}

// Helper function to generate username from name and email
function generateUsername(firstName?: string | null, lastName?: string | null, email?: string | null): string {
  if (firstName && lastName) {
    return `${firstName.toLowerCase()}.${lastName.toLowerCase()}`.replace(/[^a-z0-9.]/g, '');
  }
  if (email) {
    return email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
  }
  return `student_${Date.now()}`;
}

// Convert day abbreviations to full names
function convertDay(day: string): string {
  const dayMap: { [key: string]: string } = {
    'Mon': 'monday',
    'Tue': 'tuesday', 
    'Wed': 'wednesday',
    'Thu': 'thursday',
    'Fri': 'friday',
    'Sat': 'saturday',
    'Sun': 'sunday'
  };
  return dayMap[day] || day.toLowerCase();
}

// Import students from MusicDott 1.0 CSV
export async function importStudentsFromCSV(csvPath: string, schoolId: number = 1, defaultUserId: number = 1) {
  console.log(`Starting CSV student import from: ${csvPath}`);
  
  try {
    const csvContent = await fs.readFile(csvPath, 'utf-8');
    const rows = parseCSV(csvContent);
    
    let imported = 0;
    let updated = 0;
    let failed = 0;
    const errors: Array<{ student: any; error: string }> = [];
    
    for (const row of rows) {
      try {
        // Skip rows without email
        if (!row.stEmail || row.stEmail.trim() === '') {
          console.warn("Skipping student (no email):", row);
          errors.push({ student: row, error: "No email provided" });
          failed++;
          continue;
        }
        
        const email = row.stEmail.trim();
        const firstName = row.stVoornaam || 'Student';
        const lastName = row.stNaam || '';
        const phone = row.stTelefoonmobiel || row.stTelefoonvast || null;
        const address = `${row.stAdres || ''} ${row.stHuisnummer || ''}`.trim();
        const city = row.stWoonplaats || null;
        const zipCode = row.stPostcode || null;
        const birthDate = row.stGebDatum || null;
        
        // Check if student exists by email
        const existingStudent = await storage.getStudentByEmail?.(email);
        
        if (existingStudent) {
          // Update existing student
          const updateData = {
            firstName,
            lastName,
            name: `${firstName} ${lastName}`.trim(),
            phone,
            address: address || null,
            city,
            zipCode,
            birthDate,
            instrument: "drums", // Default for drum school
            level: "intermediate"
          };
          
          await storage.updateStudent(existingStudent.id, updateData);
          updated++;
        } else {
          // Create new student
          const username = generateUsername(firstName, lastName, email);
          const plainPassword = generateSecurePassword();
          const hashedPassword = await hashPassword(plainPassword);

          // Log generated password for manual distribution
          logger.info('Generated password for imported student', {
            email,
            username,
            password: plainPassword
          });

          const studentData: InsertStudent = {
            firstName,
            lastName,
            name: `${firstName} ${lastName}`.trim(),
            username,
            password: hashedPassword,
            email,
            phone,
            address: address || null,
            city,
            zipCode,
            birthDate,
            level: "intermediate",
            instrument: "drums",
            schoolId,
            role: "student"
          };
          
          // Validate and create
          const validatedData = insertStudentSchema.parse(studentData);
          await storage.createStudent(validatedData);
          imported++;
          
          // Create recurring schedules if lesson times are provided
          if (row.stLesdag1 && row.stLestijd1) {
            try {
              const dayOfWeek = convertDay(row.stLesdag1);
              const startTime = row.stLestijd1;
              const durationStr = row.stLesduur1 || '00:45';
              const durationMin = parseInt(durationStr.split(':')[0]) * 60 + parseInt(durationStr.split(':')[1]);
              
              // Calculate end time
              const [hours, minutes] = startTime.split(':').map(Number);
              const endMinutes = (hours * 60 + minutes + durationMin) % (24 * 60);
              const endTime = `${Math.floor(endMinutes / 60).toString().padStart(2, '0')}:${(endMinutes % 60).toString().padStart(2, '0')}`;
              
              const scheduleData = {
                userId: defaultUserId,
                studentId: validatedData.id || imported, // Use created student ID
                dayOfWeek,
                startTime,
                endTime,
                location: 'Studio',
                durationMin,
                timezone: 'Europe/Amsterdam',
                frequency: 'WEEKLY',
                isActive: true
              };
              
              // Only create schedule if we have the method available
              if (storage.createRecurringSchedule) {
                await storage.createRecurringSchedule(scheduleData);
              }
            } catch (scheduleError) {
              console.warn("Failed to create schedule for student:", email, scheduleError);
            }
          }
        }
        
      } catch (error) {
        console.error("Failed to import student:", row, error);
        errors.push({ 
          student: row, 
          error: error instanceof Error ? error.message : String(error) 
        });
        failed++;
      }
    }
    
    console.log(`Student CSV import complete: ${imported} imported, ${updated} updated, ${failed} failed`);
    if (errors.length > 0) {
      console.log("Import errors:", errors.slice(0, 5)); // Show first 5 errors
    }
    
    return { imported, updated, failed, errors };
    
  } catch (error) {
    console.error("Critical CSV import error:", error);
    throw new Error(`CSV import failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// Import songs from MusicDott 1.0 CSV
export async function importSongsFromCSV(csvPath: string, defaultUserId: number = 1) {
  console.log(`Starting CSV song import from: ${csvPath}`);
  
  try {
    const csvContent = await fs.readFile(csvPath, 'utf-8');
    const rows = parseCSV(csvContent);
    
    let imported = 0;
    let updated = 0;
    let failed = 0;
    const errors: Array<{ song: any; error: string }> = [];
    
    for (const row of rows) {
      try {
        // Skip rows without title
        if (!row.soTitel || row.soTitel.trim() === '') {
          failed++;
          continue;
        }
        
        const title = row.soTitel.trim();
        const artist = row.soArtiest || 'Unknown Artist';
        const genre = row.soGenre || 'Rock';
        const bpm = parseInt(row.soBPM) || null;
        
        // Extract content blocks
        const contentBlocks = [];
        
        // Add YouTube embed if exists
        if (row.soYouTube && row.soYouTube.includes('iframe')) {
          contentBlocks.push({
            type: 'video',
            content: row.soYouTube
          });
        }
        
        // Add Spotify embed if exists
        if (row.soSpotify && row.soSpotify.includes('iframe')) {
          contentBlocks.push({
            type: 'spotify',
            content: row.soSpotify
          });
        }
        
        // Add GrooveScribe notation if exists
        if (row.soNotatie01 && row.soNotatie01.includes('TimeSig')) {
          contentBlocks.push({
            type: 'groovescribe',
            content: row.soNotatie01,
            title: row.soOpmerkingen01 || 'Main Pattern'
          });
        }
        
        // Add additional notations
        for (let i = 2; i <= 8; i++) {
          const notationField = `soNotatie0${i}`;
          const commentsField = `soOpmerkingen0${i}`;
          if (row[notationField] && row[notationField].includes('TimeSig')) {
            contentBlocks.push({
              type: 'groovescribe',
              content: row[notationField],
              title: row[commentsField] || `Pattern ${i}`
            });
          }
        }
        
        // Create song data
        const songData: InsertSong = {
          title,
          artist,
          genre,
          bpm,
          difficulty: 'intermediate', // Default
          userId: defaultUserId,
          contentBlocks: JSON.stringify(contentBlocks)
        };
        
        // Check if song exists by title and artist
        const existingSongs = await storage.getSongs(defaultUserId);
        const existingSong = existingSongs.find(s => 
          s.title?.toLowerCase() === title.toLowerCase() && 
          s.artist?.toLowerCase() === artist.toLowerCase()
        );
        
        if (existingSong) {
          // Update existing song
          await storage.updateSong(existingSong.id, {
            genre,
            bpm,
            contentBlocks: JSON.stringify(contentBlocks)
          });
          updated++;
        } else {
          // Create new song
          const validatedData = insertSongSchema.parse(songData);
          await storage.createSong(validatedData);
          imported++;
        }
        
      } catch (error) {
        console.error("Failed to import song:", row, error);
        errors.push({ 
          song: row, 
          error: error instanceof Error ? error.message : String(error) 
        });
        failed++;
      }
    }
    
    console.log(`Song CSV import complete: ${imported} imported, ${updated} updated, ${failed} failed`);
    if (errors.length > 0) {
      console.log("Import errors:", errors.slice(0, 5)); // Show first 5 errors
    }
    
    return { imported, updated, failed, errors };
    
  } catch (error) {
    console.error("Critical CSV song import error:", error);
    throw new Error(`CSV song import failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// Import lessons from notation CSV
export async function importLessonsFromCSV(csvPath: string, defaultUserId: number = 1) {
  console.log(`Starting CSV lesson import from: ${csvPath}`);
  
  try {
    const csvContent = await fs.readFile(csvPath, 'utf-8');
    const rows = parseCSV(csvContent);
    
    let imported = 0;
    let updated = 0;
    let failed = 0;
    const errors: Array<{ lesson: any; error: string }> = [];
    
    for (const row of rows) {
      try {
        // Skip rows without title
        if (!row.noHoofdstuk || row.noHoofdstuk.trim() === '') {
          failed++;
          continue;
        }
        
        const title = `${row.noCategorie || 'Lesson'} - ${row.noHoofdstuk}`.trim();
        const category = row.noCategorie || 'General';
        const sortOrder = parseInt(row.noVolgnummer) || 0;
        
        // Create content blocks
        const contentBlocks = [];
        
        // Add GrooveScribe notation if exists
        if (row.noNotatie && row.noNotatie.includes('TimeSig')) {
          contentBlocks.push({
            type: 'groovescribe',
            content: row.noNotatie,
            title: 'Exercise'
          });
        }
        
        // Add PDF if exists
        if (row.noPDFlesson) {
          contentBlocks.push({
            type: 'pdf',
            content: row.noPDFlesson,
            title: 'Sheet Music'
          });
        }
        
        // Add video if exists
        if (row.noVideo) {
          contentBlocks.push({
            type: 'video',
            content: row.noVideo,
            title: 'Video Tutorial'
          });
        }
        
        // Create lesson data
        const lessonData: InsertLesson = {
          title,
          category,
          difficulty: category.toLowerCase().includes('beginner') ? 'beginner' : 
                     category.toLowerCase().includes('advanced') ? 'advanced' : 'intermediate',
          userId: defaultUserId,
          contentBlocks: JSON.stringify(contentBlocks),
          sortOrder
        };
        
        // Check if lesson exists by title
        const existingLessons = await storage.getLessons(defaultUserId);
        const existingLesson = existingLessons.find(l => 
          l.title?.toLowerCase() === title.toLowerCase()
        );
        
        if (existingLesson) {
          // Update existing lesson
          await storage.updateLesson(existingLesson.id, {
            category,
            contentBlocks: JSON.stringify(contentBlocks),
            sortOrder
          });
          updated++;
        } else {
          // Create new lesson
          const validatedData = insertLessonSchema.parse(lessonData);
          await storage.createLesson(validatedData);
          imported++;
        }
        
      } catch (error) {
        console.error("Failed to import lesson:", row, error);
        errors.push({ 
          lesson: row, 
          error: error instanceof Error ? error.message : String(error) 
        });
        failed++;
      }
    }
    
    console.log(`Lesson CSV import complete: ${imported} imported, ${updated} updated, ${failed} failed`);
    if (errors.length > 0) {
      console.log("Import errors:", errors.slice(0, 5)); // Show first 5 errors
    }
    
    return { imported, updated, failed, errors };
    
  } catch (error) {
    console.error("Critical CSV lesson import error:", error);
    throw new Error(`CSV lesson import failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}