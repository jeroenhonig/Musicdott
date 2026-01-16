import fs from "node:fs/promises";
import { storage } from './storage-wrapper';
import { insertStudentSchema, type InsertStudent } from '@shared/schema';
import { z } from 'zod';
import { createStudentAccount } from './services/student-accounts';

// Input data structure from MusicDott 1.0 export
type ImportedStudent = {
  id?: string;
  firstName?: string | null;
  lastName?: string | null;
  fullName?: string | null;
  email?: string | null;
  phone?: string | null;
  city?: string | null;
  notes?: string | null;
  instrument?: string | null;
  address?: string | null;
  zipCode?: string | null;
  birthDate?: string | null;
  level?: string | null;
};

// Validation schema for import data
const importStudentSchema = z.object({
  id: z.string().optional(),
  firstName: z.string().nullable().optional(),
  lastName: z.string().nullable().optional(),
  fullName: z.string().nullable().optional(),
  email: z.string().email().nullable().optional(),
  phone: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  instrument: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  zipCode: z.string().nullable().optional(),
  birthDate: z.string().nullable().optional(),
  level: z.string().nullable().optional(),
});

// Note: Username generation is now handled by student-accounts service
// to ensure consistency with login credentials

// Helper function to generate display name
function generateDisplayName(firstName?: string | null, lastName?: string | null, fullName?: string | null): string {
  if (firstName && lastName) {
    return `${firstName} ${lastName}`;
  }
  if (fullName) {
    return fullName;
  }
  if (firstName) {
    return firstName;
  }
  return 'Student';
}

// Note: Both username and password are now handled by the student accounts service
// to ensure security and consistency with login credentials

export async function importStudents(path = "export/musicdott2_students.json", schoolId: number = 1) {
  
  try {
    const raw = await fs.readFile(path, "utf-8");
    const rawStudents = JSON.parse(raw);
    
    // Validate input data structure
    const students = rawStudents.map((s: any) => importStudentSchema.parse(s));
    
    let imported = 0;
    let updated = 0;
    let failed = 0;
    const errors: Array<{ student: any; error: string }> = [];
    
    for (const s of students) {
      try {
        // Skip students without email (required for identification)
        if (!s.email) {
          console.warn("Skipping student (no email):", s);
          errors.push({ student: s, error: "No email provided" });
          failed++;
          continue;
        }
        
        // Check if student exists by email
        const existingByEmail = await storage.getStudentByEmail(s.email);
        
        if (existingByEmail) {
          // Update existing student with available data
          const updateData: Partial<InsertStudent> = {};
          
          if (s.firstName) updateData.firstName = s.firstName;
          if (s.lastName) updateData.lastName = s.lastName;
          if (s.phone) updateData.phone = s.phone;
          if (s.city) updateData.city = s.city;
          if (s.address) updateData.address = s.address;
          if (s.zipCode) updateData.zipCode = s.zipCode;
          if (s.birthDate) updateData.birthDate = s.birthDate;
          if (s.level) updateData.level = s.level;
          if (s.instrument) updateData.instrument = s.instrument;
          
          // Update display name if we have name parts
          if (s.firstName || s.lastName || s.fullName) {
            updateData.name = generateDisplayName(s.firstName, s.lastName, s.fullName);
          }
          
          await storage.updateStudent(existingByEmail.id, updateData);
          updated++;
        } else {
          // Create new student with required fields
          const firstName = s.firstName || s.fullName?.split(' ')[0] || 'Student';
          const lastName = s.lastName || s.fullName?.split(' ').slice(1).join(' ') || '';
          const displayName = generateDisplayName(firstName, lastName, s.fullName);
          const newStudentData: InsertStudent = {
            firstName,
            lastName,
            name: displayName,
            username: '', // Will be set by student account service
            password: '', // Will be set by student account service
            email: s.email,
            phone: s.phone || null,
            address: s.address || null,
            city: s.city || null,
            zipCode: s.zipCode || null,
            birthDate: s.birthDate || null,
            level: s.level || "beginner",
            instrument: s.instrument || "drums",
            schoolId,
            role: "student"
          };
          
          // Validate against schema before creating
          const validatedData = insertStudentSchema.parse(newStudentData);
          const createdStudent = await storage.createStudent(validatedData);
          
          // Create user account for the student
          try {
            await createStudentAccount(createdStudent, schoolId);
            console.log(`Created account for student: ${firstName} ${lastName}`);
          } catch (accountError) {
            console.warn(`Failed to create account for student ${firstName} ${lastName}:`, accountError);
            // Continue import even if account creation fails
          }
          
          imported++;
        }
      } catch (error) {
        console.error("Failed to import student:", s, error);
        errors.push({ 
          student: s, 
          error: error instanceof Error ? error.message : String(error) 
        });
        failed++;
      }
    }
    
    console.log(`Student import complete: ${imported} imported, ${updated} updated, ${failed} failed`);
    if (errors.length > 0) {
      console.log("Import errors:", errors);
    }
    
    return { imported, updated, failed, errors };
    
  } catch (error) {
    console.error("Critical import error:", error);
    throw new Error(`Import failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}