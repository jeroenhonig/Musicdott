/**
 * Student Account Creation Service
 * Handles secure account generation for imported students
 */

import bcrypt from 'bcrypt';
import { storage } from '../storage-wrapper';
import { generateFallbackUsername } from '@shared/utils';
import type { Student, User, StudentAccountCreate } from '@shared/schema';

/**
 * Returns the default password for new student accounts.
 * Reads STUDENT_DEFAULT_PASSWORD env var lazily (at call time, not import time)
 * so the server can start without it — only student import operations require it.
 */
export function getDefaultStudentPassword(): string {
  const pwd = process.env.STUDENT_DEFAULT_PASSWORD;
  if (!pwd) {
    throw new Error(
      '❌ STUDENT_DEFAULT_PASSWORD environment variable is not set.\n' +
      'Set it in your .env file to enable student account creation.'
    );
  }
  return pwd;
}

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

function normalizeUsernamePart(value: string | null | undefined): string {
  if (!value) return '';
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[^a-z0-9]/g, '');
}

function splitName(name: string | null | undefined): { firstName: string; lastName: string } {
  const trimmed = (name || '').trim();
  if (!trimmed) {
    return { firstName: '', lastName: '' };
  }

  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length === 1) {
    return { firstName: parts[0], lastName: '' };
  }

  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(' '),
  };
}

function resolveStudentNameParts(student: Student): { firstName: string; lastName: string } {
  const firstName = (student as any).firstName?.trim?.() || '';
  const lastName = (student as any).lastName?.trim?.() || '';

  if (firstName || lastName) {
    return { firstName, lastName };
  }

  return splitName((student as any).name || '');
}

/**
 * Generate unique username for student
 * Format: firstname+lastname (lowercase, no spaces), with numeric suffix on collision
 */
async function generateUniqueUsername(
  firstName: string, 
  lastName: string, 
  schoolId: number
): Promise<string> {
  try {
    const base = `${normalizeUsernamePart(firstName)}${normalizeUsernamePart(lastName)}` || '';

    if (!base) {
      return generateFallbackUsername(schoolId);
    }

    if (!(await checkUsernameExists(base))) {
      return base;
    }

    for (let i = 2; i <= 9999; i++) {
      const candidate = `${base}${i}`;
      if (!(await checkUsernameExists(candidate))) {
        return candidate;
      }
    }

    return generateFallbackUsername(schoolId);
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
  const { firstName, lastName } = resolveStudentNameParts(student);
  
  // Validate required fields
  if (!firstName || !lastName) {
    throw new Error('Student must have first name and last name for account creation');
  }
  
  if (!student.email?.trim()) {
    throw new Error('Student must have email for account creation');
  }
  
  // Check if account already exists (accountId is canonical; userId may be teacher/creator)
  const explicitAccountId = (student as any).accountId ?? null;
  if (explicitAccountId) {
    const existingUser = await storage.getUser(explicitAccountId);
    if (existingUser) {
      console.log(`Account already exists for student ${student.id}, skipping creation`);
      const { password, ...userWithoutPassword } = existingUser;
      return userWithoutPassword;
    }
  }

  if (!explicitAccountId && student.userId) {
    const maybeLegacyLinkedUser = await storage.getUser(student.userId);
    if (maybeLegacyLinkedUser?.role === 'student') {
      console.log(`Legacy student account link found for student ${student.id}, skipping creation`);
      const { password, ...userWithoutPassword } = maybeLegacyLinkedUser;
      return userWithoutPassword;
    }
  }
  
  try {
    // Generate unique username
    const username = await generateUniqueUsername(
      firstName, 
      lastName, 
      schoolId
    );
    
    // Hash default password
    const hashedPassword = await hashPassword(getDefaultStudentPassword());
    
    // Prepare user account data
    const userAccountData: StudentAccountCreate = {
      schoolId,
      username,
      password: hashedPassword,
      name: `${firstName} ${lastName}`.trim(),
      email: student.email,
      role: 'student',
      mustChangePassword: true, // Force password change on first login
      instruments: student.instrument,
      avatar: null,
      bio: null,
    };
    
    // Create user account
    console.log(`Creating account for student: ${firstName} ${lastName} (${username})`);
    const newUser = await storage.createUser(userAccountData);
    
    // Link student to user account (accountId is the student-login link in current platform)
    if (newUser.id && student.id) {
      await storage.updateStudent(student.id, { 
        accountId: newUser.id,
      });
      console.log(`Linked student ${student.id} to student account ${newUser.id} with username ${username}`);
    }
    
    // Return user without password
    const { password, ...userWithoutPassword } = newUser;
    return userWithoutPassword;
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`Failed to create account for student ${firstName} ${lastName}:`, errorMessage);
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
  const studentsNeedingAccounts = schoolStudents.filter(s => !(s as any).accountId);
  
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
  
  let accountId = (student as any).accountId ?? null;
  if (!accountId && student.userId) {
    const maybeLegacyLinkedUser = await storage.getUser(student.userId);
    if (maybeLegacyLinkedUser?.role === 'student') {
      accountId = maybeLegacyLinkedUser.id;
    }
  }
  if (!accountId) {
    throw new Error(`Student ${studentId} does not have a user account`);
  }
  
  // Hash new default password
  const hashedPassword = await hashPassword(getDefaultStudentPassword());
  
  // Update user account
  await storage.updateUser(accountId, {
    password: hashedPassword,
    mustChangePassword: true, // Force password change
    lastLoginAt: null // Clear last login
  });
  
  console.log(`Password reset for student ${studentId} (user ${accountId})`);
}
