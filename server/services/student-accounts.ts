/**
 * Student Account Creation Service
 * Handles secure account generation for imported students
 */

import bcrypt from 'bcrypt';
import { storage } from '../storage-wrapper';
import { makeStudentUsername, generateFallbackUsername } from '@shared/utils';
import type { Student, User, StudentAccountCreate } from '@shared/schema';

/**
 * Default password for new student accounts
 * Must be changed on first login (mustChangePassword = true)
 */
const DEFAULT_STUDENT_PASSWORD = 'Drumles2025!';

/**
 * BCrypt salt rounds for password hashing
 * 10 rounds provides good security vs performance balance
 */
const SALT_ROUNDS = 10;

/**
 * Hash password using bcrypt with proper salt rounds
 */
async function hashPassword(plainPassword: string): Promise<string> {
  try {
    return await bcrypt.hash(plainPassword, SALT_ROUNDS);
  } catch (error) {
    throw new Error(`Password hashing failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Check if username exists in the system
 * Used by username generation utility for conflict resolution
 */
async function checkUsernameExists(username: string): Promise<boolean> {
  try {
    const existingUser = await storage.getUserByUsername(username);
    return !!existingUser;
  } catch (error) {
    // If there's an error checking, assume it exists to be safe
    console.warn(`Error checking username existence for "${username}":`, error);
    return true;
  }
}

/**
 * Generate unique username for student
 * Uses shared utility with storage integration
 */
async function generateUniqueUsername(
  firstName: string, 
  lastName: string, 
  schoolId: number
): Promise<string> {
  try {
    return await makeStudentUsername(firstName, lastName, schoolId, checkUsernameExists);
  } catch (error) {
    console.warn(`Username generation failed for ${firstName} ${lastName}:`, error);
    // Fallback to timestamp-based username
    return generateFallbackUsername(schoolId);
  }
}

/**
 * Create student account with secure defaults
 * 
 * @param student Student record to create account for
 * @param schoolId School ID for proper multi-tenant isolation
 * @returns Created user record (without password)
 */
export async function createStudentAccount(
  student: Student, 
  schoolId: number
): Promise<Omit<User, 'password'>> {
  
  // Validate required fields
  if (!student.firstName?.trim() || !student.lastName?.trim()) {
    throw new Error('Student must have first name and last name for account creation');
  }
  
  if (!student.email?.trim()) {
    throw new Error('Student must have email for account creation');
  }
  
  // Check if account already exists
  if (student.userId) {
    const existingUser = await storage.getUser(student.userId);
    if (existingUser) {
      console.log(`Account already exists for student ${student.id}, skipping creation`);
      const { password, ...userWithoutPassword } = existingUser;
      return userWithoutPassword;
    }
  }
  
  try {
    // Generate unique username
    const username = await generateUniqueUsername(
      student.firstName, 
      student.lastName, 
      schoolId
    );
    
    // Hash default password
    const hashedPassword = await hashPassword(DEFAULT_STUDENT_PASSWORD);
    
    // Prepare user account data
    const userAccountData: StudentAccountCreate = {
      schoolId,
      username,
      password: hashedPassword,
      name: `${student.firstName} ${student.lastName}`,
      email: student.email,
      role: 'student',
      mustChangePassword: true, // Force password change on first login
      instruments: student.instrument,
      avatar: null,
      bio: null,
    };
    
    // Create user account
    console.log(`Creating account for student: ${student.firstName} ${student.lastName} (${username})`);
    const newUser = await storage.createUser(userAccountData);
    
    // Link student to user account and sync username
    if (newUser.id && student.id) {
      await storage.updateStudent(student.id, { 
        userId: newUser.id,
        username: username, // Keep students.username in sync with users.username for admin clarity
        password: '' // Clear any placeholder password since auth uses users table
      });
      console.log(`Linked student ${student.id} to user account ${newUser.id} with username ${username}`);
    }
    
    // Return user without password
    const { password, ...userWithoutPassword } = newUser;
    return userWithoutPassword;
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`Failed to create account for student ${student.firstName} ${student.lastName}:`, errorMessage);
    throw new Error(`Account creation failed: ${errorMessage}`);
  }
}

/**
 * Create accounts for multiple students in batch
 * Includes error handling and progress tracking
 */
export async function createStudentAccountsBatch(
  students: Student[], 
  schoolId: number
): Promise<{
  successful: number;
  failed: number;
  errors: Array<{ studentId: number; error: string }>;
}> {
  
  let successful = 0;
  let failed = 0;
  const errors: Array<{ studentId: number; error: string }> = [];
  
  console.log(`Starting batch account creation for ${students.length} students in school ${schoolId}`);
  
  for (const student of students) {
    try {
      await createStudentAccount(student, schoolId);
      successful++;
    } catch (error) {
      failed++;
      const errorMessage = error instanceof Error ? error.message : String(error);
      errors.push({
        studentId: student.id!,
        error: errorMessage
      });
      console.error(`Batch creation failed for student ${student.id}:`, errorMessage);
    }
  }
  
  console.log(`Batch account creation complete: ${successful} successful, ${failed} failed`);
  
  return { successful, failed, errors };
}

/**
 * Backfill accounts for existing students without user accounts
 * Used for migrating legacy data
 */
export async function backfillStudentAccounts(schoolId: number): Promise<{
  processed: number;
  created: number;
  skipped: number;
  failed: number;
  errors: Array<{ studentId: number; error: string }>;
}> {
  
  console.log(`Starting student account backfill for school ${schoolId}`);
  
  // Get all students in school
  const allStudents = await storage.getStudents();
  const schoolStudents = allStudents.filter(s => s.schoolId === schoolId);
  
  // Filter students without user accounts
  const studentsNeedingAccounts = schoolStudents.filter(s => !s.userId);
  
  console.log(`Found ${studentsNeedingAccounts.length} students needing accounts out of ${schoolStudents.length} total`);
  
  if (studentsNeedingAccounts.length === 0) {
    return {
      processed: schoolStudents.length,
      created: 0,
      skipped: schoolStudents.length,
      failed: 0,
      errors: []
    };
  }
  
  // Create accounts in batch
  const batchResult = await createStudentAccountsBatch(studentsNeedingAccounts, schoolId);
  
  return {
    processed: schoolStudents.length,
    created: batchResult.successful,
    skipped: schoolStudents.length - studentsNeedingAccounts.length,
    failed: batchResult.failed,
    errors: batchResult.errors
  };
}

/**
 * Reset student password to default
 * Used by teachers/owners to reset forgotten passwords
 */
export async function resetStudentPassword(studentId: number): Promise<void> {
  
  // Get student record
  const student = await storage.getStudent(studentId);
  if (!student) {
    throw new Error(`Student ${studentId} not found`);
  }
  
  if (!student.userId) {
    throw new Error(`Student ${studentId} does not have a user account`);
  }
  
  // Hash new default password
  const hashedPassword = await hashPassword(DEFAULT_STUDENT_PASSWORD);
  
  // Update user account
  await storage.updateUser(student.userId, {
    password: hashedPassword,
    mustChangePassword: true, // Force password change
    lastLoginAt: null // Clear last login
  });
  
  console.log(`Password reset for student ${studentId} (user ${student.userId})`);
}