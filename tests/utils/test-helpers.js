/**
 * MusicDott 2.0 Integration Test Helpers
 * Lightweight utilities for testing critical functionality
 */

import { storage } from '../../server/storage-wrapper.js';
import request from 'supertest';

/**
 * Test user accounts for different roles
 */
export const TEST_USERS = {
  TEACHER: {
    username: 'test_teacher_001',
    password: 'TestPass123!',
    name: 'Test Teacher',
    email: 'test.teacher@musicdott.test',
    role: 'teacher',
    schoolId: 1
  },
  STUDENT: {
    username: 'test_student_001', 
    password: 'TestPass123!',
    name: 'Test Student',
    email: 'test.student@musicdott.test',
    role: 'student',
    schoolId: 1
  },
  SCHOOL_OWNER: {
    username: 'test_school_owner_001',
    password: 'TestPass123!',
    name: 'Test School Owner',
    email: 'test.owner@musicdott.test',
    role: 'school_owner',
    schoolId: 1
  },
  OTHER_SCHOOL_TEACHER: {
    username: 'test_teacher_other_school',
    password: 'TestPass123!',
    name: 'Other School Teacher',
    email: 'other.teacher@musicdott.test',
    role: 'teacher',
    schoolId: 2
  }
};

/**
 * Create test user if it doesn't exist
 */
export async function createTestUser(userConfig) {
  try {
    // Check if user already exists
    const existingUser = await storage.getUserByUsername(userConfig.username);
    if (existingUser) {
      console.log(`Test user ${userConfig.username} already exists`);
      return existingUser;
    }

    // Create new test user
    const hashedPassword = await hashPassword(userConfig.password);
    const user = await storage.createUser({
      ...userConfig,
      password: hashedPassword
    });
    
    console.log(`Created test user: ${userConfig.username} (${userConfig.role})`);
    return user;
  } catch (error) {
    console.error(`Failed to create test user ${userConfig.username}:`, error);
    throw error;
  }
}

/**
 * Helper to hash passwords for test users (duplicated from auth.ts)
 */
async function hashPassword(password) {
  const { scrypt, randomBytes } = await import('crypto');
  const { promisify } = await import('util');
  const scryptAsync = promisify(scrypt);
  
  const salt = randomBytes(16).toString("hex");
  const buf = await scryptAsync(password, salt, 64);
  return `${buf.toString("hex")}.${salt}`;
}

/**
 * Login user and return session cookie
 */
export async function loginUser(app, userConfig) {
  const response = await request(app)
    .post('/api/login')
    .send({
      username: userConfig.username,
      password: userConfig.password
    });

  if (response.status !== 200) {
    throw new Error(`Login failed for ${userConfig.username}: ${response.status} ${JSON.stringify(response.body)}`);
  }

  // Extract session cookie
  const cookies = response.headers['set-cookie'];
  if (!cookies) {
    throw new Error('No session cookie received after login');
  }

  const sessionCookie = cookies.find(cookie => cookie.startsWith('md.sid='));
  if (!sessionCookie) {
    throw new Error('Session cookie not found in response');
  }

  return {
    cookie: sessionCookie.split(';')[0], // Get just the cookie value part
    user: response.body
  };
}

/**
 * Make authenticated request with session cookie
 */
export async function makeAuthenticatedRequest(app, method, endpoint, sessionCookie, data = null) {
  let req = request(app)[method.toLowerCase()](endpoint);
  
  if (sessionCookie) {
    req = req.set('Cookie', sessionCookie);
  }
  
  if (data) {
    req = req.send(data);
  }
  
  return req;
}

/**
 * Create test school for multi-tenant testing
 */
export async function createTestSchool(schoolData) {
  try {
    const school = await storage.createSchool({
      name: schoolData.name || 'Test School',
      address: schoolData.address || '123 Test Street',
      city: schoolData.city || 'Test City',
      phone: schoolData.phone || '+1234567890',
      ...schoolData
    });
    
    console.log(`Created test school: ${school.name} (ID: ${school.id})`);
    return school;
  } catch (error) {
    console.error('Failed to create test school:', error);
    throw error;
  }
}

/**
 * Create test student with proper relationships
 */
export async function createTestStudent(studentData, schoolId = 1) {
  try {
    const student = await storage.createStudent({
      firstName: studentData.firstName || 'Test',
      lastName: studentData.lastName || 'Student',
      name: `${studentData.firstName || 'Test'} ${studentData.lastName || 'Student'}`,
      username: studentData.username || `test_student_${Date.now()}`,
      password: await hashPassword(studentData.password || 'TestPass123!'),
      email: studentData.email || `test.student.${Date.now()}@musicdott.test`,
      phone: studentData.phone || '+1234567890',
      level: studentData.level || 'beginner',
      instrument: studentData.instrument || 'drums',
      schoolId,
      assignedTeacherId: studentData.teacherId,
      ...studentData
    });
    
    console.log(`Created test student: ${student.name} (ID: ${student.id})`);
    return student;
  } catch (error) {
    console.error('Failed to create test student:', error);
    throw error;
  }
}

/**
 * Create test song for assignment testing
 */
export async function createTestSong(songData, userId, schoolId = 1) {
  try {
    const song = await storage.createSong({
      title: songData.title || 'Test Song',
      artist: songData.artist || 'Test Artist',
      genre: songData.genre || 'Rock',
      instrument: songData.instrument || 'drums',
      level: songData.level || 'beginner',
      bpm: songData.bpm || 120,
      duration: songData.duration || '3:30',
      contentBlocks: songData.contentBlocks || '[]',
      groovePatterns: songData.groovePatterns || [],
      userId,
      schoolId,
      ...songData
    });
    
    console.log(`Created test song: ${song.title} (ID: ${song.id})`);
    return song;
  } catch (error) {
    console.error('Failed to create test song:', error);
    throw error;
  }
}

/**
 * Create test lesson for assignment testing
 */
export async function createTestLesson(lessonData, userId, schoolId = 1) {
  try {
    const lesson = await storage.createLesson({
      title: lessonData.title || 'Test Lesson',
      description: lessonData.description || 'Test lesson description',
      contentType: lessonData.contentType || 'standard',
      instrument: lessonData.instrument || 'drums',
      level: lessonData.level || 'beginner',
      contentBlocks: lessonData.contentBlocks || '[]',
      userId,
      schoolId,
      ...lessonData
    });
    
    console.log(`Created test lesson: ${lesson.title} (ID: ${lesson.id})`);
    return lesson;
  } catch (error) {
    console.error('Failed to create test lesson:', error);
    throw error;
  }
}

/**
 * Clean up test data created during tests
 */
export async function cleanupTestData() {
  console.log('Starting test data cleanup...');
  
  try {
    // Note: In a real implementation, we would have more sophisticated cleanup
    // For now, we'll rely on test users being created with predictable usernames
    
    const testUsernames = Object.values(TEST_USERS).map(user => user.username);
    
    for (const username of testUsernames) {
      try {
        const user = await storage.getUserByUsername(username);
        if (user) {
          // Clean up user's data (songs, lessons, students)
          // Note: This would need to be implemented in storage layer
          console.log(`Would clean up data for test user: ${username}`);
        }
      } catch (error) {
        console.warn(`Cleanup warning for ${username}:`, error.message);
      }
    }
    
    console.log('Test data cleanup completed');
  } catch (error) {
    console.error('Test data cleanup failed:', error);
  }
}

/**
 * Assert response has expected status code
 */
export function assertResponseCode(response, expectedCode, context = '') {
  if (response.status !== expectedCode) {
    const error = new Error(
      `${context} Expected status ${expectedCode}, got ${response.status}. ` +
      `Response: ${JSON.stringify(response.body)}`
    );
    throw error;
  }
}

/**
 * Assert response contains expected data
 */
export function assertResponseContains(response, expectedData, context = '') {
  const body = response.body;
  
  for (const [key, value] of Object.entries(expectedData)) {
    if (body[key] !== value) {
      throw new Error(
        `${context} Expected ${key} to be ${value}, got ${body[key]}. ` +
        `Full response: ${JSON.stringify(body)}`
      );
    }
  }
}

/**
 * Wait for a short time (useful for async operations)
 */
export function wait(ms = 100) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Setup test environment
 */
export async function setupTestEnvironment() {
  console.log('Setting up test environment...');
  
  try {
    // Create test schools if they don't exist
    const testSchools = [
      { id: 1, name: 'Test Music School Primary' },
      { id: 2, name: 'Test Music School Secondary' }
    ];
    
    for (const schoolData of testSchools) {
      try {
        // Try to get existing school first
        const existingSchool = await storage.getSchool?.(schoolData.id);
        if (!existingSchool) {
          await createTestSchool(schoolData);
        }
      } catch (error) {
        console.warn(`Note: Could not verify/create test school ${schoolData.name}:`, error.message);
      }
    }
    
    // Create test users
    for (const [role, userConfig] of Object.entries(TEST_USERS)) {
      await createTestUser(userConfig);
    }
    
    console.log('Test environment setup completed');
  } catch (error) {
    console.error('Test environment setup failed:', error);
    throw error;
  }
}

export default {
  TEST_USERS,
  createTestUser,
  loginUser,
  makeAuthenticatedRequest,
  createTestSchool,
  createTestStudent,
  createTestSong,
  createTestLesson,
  cleanupTestData,
  assertResponseCode,
  assertResponseContains,
  wait,
  setupTestEnvironment
};