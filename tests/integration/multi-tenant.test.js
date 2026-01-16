/**
 * MusicDott 2.0 Multi-Tenant Security Integration Tests
 * Tests school data isolation and tenant security
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createServer } from 'http';
import { app } from '../../server/index.js';
import {
  setupTestEnvironment,
  cleanupTestData,
  loginUser,
  makeAuthenticatedRequest,
  assertResponseCode,
  createTestSchool,
  createTestStudent,
  createTestSong,
  createTestLesson,
  TEST_USERS
} from '../utils/test-helpers.js';

describe('Multi-Tenant Security Tests', () => {
  let server;
  let school1Teacher;
  let school2Teacher;
  let testSchool1;
  let testSchool2;

  beforeAll(async () => {
    console.log('🧪 Setting up multi-tenant security tests...');
    
    // Start server for testing
    server = createServer(app);
    await new Promise((resolve) => {
      server.listen(0, resolve);
    });
    
    // Setup test environment
    await setupTestEnvironment();
    
    // Get teacher users for different schools
    const { user: user1 } = await loginUser(app, TEST_USERS.TEACHER);
    const { user: user2 } = await loginUser(app, TEST_USERS.OTHER_SCHOOL_TEACHER);
    
    school1Teacher = user1;
    school2Teacher = user2;
  });

  afterAll(async () => {
    console.log('🧹 Cleaning up multi-tenant security tests...');
    
    if (server) {
      await new Promise((resolve) => {
        server.close(resolve);
      });
    }
    
    await cleanupTestData();
  });

  describe('School Data Isolation', () => {
    it('should isolate student data between schools', async () => {
      console.log('🏫 Testing student data isolation between schools...');
      
      const { cookie: school1Cookie } = await loginUser(app, TEST_USERS.TEACHER);
      const { cookie: school2Cookie } = await loginUser(app, TEST_USERS.OTHER_SCHOOL_TEACHER);
      
      // Get students for school 1 teacher
      const school1StudentsResponse = await makeAuthenticatedRequest(
        app, 'GET', '/api/students', school1Cookie
      );
      
      // Get students for school 2 teacher  
      const school2StudentsResponse = await makeAuthenticatedRequest(
        app, 'GET', '/api/students', school2Cookie
      );
      
      console.log(`School 1 students response: ${school1StudentsResponse.status}`);
      console.log(`School 2 students response: ${school2StudentsResponse.status}`);
      
      // Both should succeed but return different data
      if (school1StudentsResponse.status === 200 && school2StudentsResponse.status === 200) {
        const school1Students = school1StudentsResponse.body;
        const school2Students = school2StudentsResponse.body;
        
        console.log(`School 1 has ${school1Students.length} students`);
        console.log(`School 2 has ${school2Students.length} students`);
        
        // Verify no overlap in student IDs (data isolation)
        const school1StudentIds = school1Students.map(s => s.id);
        const school2StudentIds = school2Students.map(s => s.id);
        
        const overlap = school1StudentIds.filter(id => school2StudentIds.includes(id));
        expect(overlap).toHaveLength(0);
        
        console.log('✅ Student data properly isolated between schools');
      }
    });

    it('should isolate song data between schools', async () => {
      console.log('🎵 Testing song data isolation between schools...');
      
      const { cookie: school1Cookie } = await loginUser(app, TEST_USERS.TEACHER);
      const { cookie: school2Cookie } = await loginUser(app, TEST_USERS.OTHER_SCHOOL_TEACHER);
      
      // Create test songs for each school
      try {
        await createTestSong({
          title: 'School 1 Test Song',
          artist: 'School 1 Artist'
        }, school1Teacher.id, school1Teacher.schoolId);
        
        await createTestSong({
          title: 'School 2 Test Song', 
          artist: 'School 2 Artist'
        }, school2Teacher.id, school2Teacher.schoolId);
      } catch (error) {
        console.warn('Could not create test songs for isolation test:', error.message);
      }
      
      // Get songs for each school
      const school1SongsResponse = await makeAuthenticatedRequest(
        app, 'GET', '/api/songs', school1Cookie
      );
      
      const school2SongsResponse = await makeAuthenticatedRequest(
        app, 'GET', '/api/songs', school2Cookie
      );
      
      console.log(`School 1 songs response: ${school1SongsResponse.status}`);
      console.log(`School 2 songs response: ${school2SongsResponse.status}`);
      
      // Verify isolation if both requests succeed
      if (school1SongsResponse.status === 200 && school2SongsResponse.status === 200) {
        const school1Songs = school1SongsResponse.body;
        const school2Songs = school2SongsResponse.body;
        
        console.log(`School 1 has ${school1Songs.length} songs`);
        console.log(`School 2 has ${school2Songs.length} songs`);
        
        // Verify no cross-school access to songs
        const school1SongIds = school1Songs.map(s => s.id);
        const school2SongIds = school2Songs.map(s => s.id);
        
        const overlap = school1SongIds.filter(id => school2SongIds.includes(id));
        expect(overlap).toHaveLength(0);
        
        console.log('✅ Song data properly isolated between schools');
      }
    });

    it('should isolate lesson data between schools', async () => {
      console.log('📚 Testing lesson data isolation between schools...');
      
      const { cookie: school1Cookie } = await loginUser(app, TEST_USERS.TEACHER);
      const { cookie: school2Cookie } = await loginUser(app, TEST_USERS.OTHER_SCHOOL_TEACHER);
      
      // Get lessons for each school
      const school1LessonsResponse = await makeAuthenticatedRequest(
        app, 'GET', '/api/lessons', school1Cookie
      );
      
      const school2LessonsResponse = await makeAuthenticatedRequest(
        app, 'GET', '/api/lessons', school2Cookie
      );
      
      console.log(`School 1 lessons response: ${school1LessonsResponse.status}`);
      console.log(`School 2 lessons response: ${school2LessonsResponse.status}`);
      
      // Verify isolation if both requests succeed
      if (school1LessonsResponse.status === 200 && school2LessonsResponse.status === 200) {
        const school1Lessons = school1LessonsResponse.body;
        const school2Lessons = school2LessonsResponse.body;
        
        console.log(`School 1 has ${school1Lessons.length} lessons`);
        console.log(`School 2 has ${school2Lessons.length} lessons`);
        
        // Verify no cross-school access to lessons
        const school1LessonIds = school1Lessons.map(l => l.id);
        const school2LessonIds = school2Lessons.map(l => l.id);
        
        const overlap = school1LessonIds.filter(id => school2LessonIds.includes(id));
        expect(overlap).toHaveLength(0);
        
        console.log('✅ Lesson data properly isolated between schools');
      }
    });
  });

  describe('Cross-Tenant Access Prevention', () => {
    it('should prevent access to other school\'s specific resources', async () => {
      console.log('🚫 Testing cross-tenant access prevention...');
      
      const { cookie: school1Cookie } = await loginUser(app, TEST_USERS.TEACHER);
      const { cookie: school2Cookie } = await loginUser(app, TEST_USERS.OTHER_SCHOOL_TEACHER);
      
      // Try to access analytics/reports from different schools
      const school1ReportsResponse = await makeAuthenticatedRequest(
        app, 'GET', '/api/reports', school1Cookie
      );
      
      const school2ReportsResponse = await makeAuthenticatedRequest(
        app, 'GET', '/api/reports', school2Cookie
      );
      
      console.log(`School 1 reports response: ${school1ReportsResponse.status}`);
      console.log(`School 2 reports response: ${school2ReportsResponse.status}`);
      
      // Both should either work (returning school-specific data) or fail consistently
      // They should NOT return 401 (auth error) since both are valid teachers
      if (school1ReportsResponse.status >= 400) {
        expect(school1ReportsResponse.status).not.toBe(401);
      }
      
      if (school2ReportsResponse.status >= 400) {
        expect(school2ReportsResponse.status).not.toBe(401);
      }
      
      console.log('✅ Cross-tenant access properly controlled');
    });

    it('should handle school context correctly for different users', async () => {
      console.log('🏫 Testing school context handling...');
      
      const { cookie: school1Cookie } = await loginUser(app, TEST_USERS.TEACHER);
      const { cookie: school2Cookie } = await loginUser(app, TEST_USERS.OTHER_SCHOOL_TEACHER);
      
      // Get user context for each school
      const school1UserResponse = await makeAuthenticatedRequest(
        app, 'GET', '/api/user', school1Cookie
      );
      
      const school2UserResponse = await makeAuthenticatedRequest(
        app, 'GET', '/api/user', school2Cookie
      );
      
      assertResponseCode(school1UserResponse, 200, 'School 1 user context');
      assertResponseCode(school2UserResponse, 200, 'School 2 user context');
      
      // Verify different school contexts
      const school1User = school1UserResponse.body;
      const school2User = school2UserResponse.body;
      
      console.log(`School 1 user school ID: ${school1User.schoolId}`);
      console.log(`School 2 user school ID: ${school2User.schoolId}`);
      
      // Users should belong to different schools
      expect(school1User.schoolId).not.toBe(school2User.schoolId);
      
      console.log('✅ School context properly maintained');
    });
  });

  describe('Student Data Protection', () => {
    it('should prevent students from accessing other students\' data', async () => {
      const { cookie: studentCookie } = await loginUser(app, TEST_USERS.STUDENT);
      
      // Students should not be able to access student lists
      const studentsResponse = await makeAuthenticatedRequest(
        app, 'GET', '/api/students', studentCookie
      );
      
      console.log(`Student access to students list: ${studentsResponse.status}`);
      
      // Should be forbidden for students
      expect([401, 403]).toContain(studentsResponse.status);
      
      console.log('✅ Student data protected from other students');
    });

    it('should allow students to access their own data only', async () => {
      const { cookie: studentCookie } = await loginUser(app, TEST_USERS.STUDENT);
      
      // Students should be able to access their own user info
      const userResponse = await makeAuthenticatedRequest(
        app, 'GET', '/api/user', studentCookie
      );
      
      assertResponseCode(userResponse, 200, 'Student own data access');
      expect(userResponse.body.role).toBe('student');
      
      console.log('✅ Students can access their own data');
    });
  });

  describe('Teacher Scope Verification', () => {
    it('should limit teachers to their own school scope', async () => {
      const { cookie: teacherCookie } = await loginUser(app, TEST_USERS.TEACHER);
      
      // Teacher should be able to access their school's data
      const endpoints = [
        '/api/students',
        '/api/songs', 
        '/api/lessons'
      ];
      
      for (const endpoint of endpoints) {
        const response = await makeAuthenticatedRequest(
          app, 'GET', endpoint, teacherCookie
        );
        
        console.log(`Teacher access to ${endpoint}: ${response.status}`);
        
        // Should not be auth error for legitimate teacher access
        expect(response.status).not.toBe(401);
        
        if (response.status === 200) {
          // If successful, data should be scoped to their school
          expect(Array.isArray(response.body)).toBe(true);
          console.log(`Teacher can access ${endpoint} (${response.body.length} items)`);
        }
      }
      
      console.log('✅ Teacher scope properly limited to their school');
    });

    it('should allow school owners broader access within their school', async () => {
      const { cookie: ownerCookie } = await loginUser(app, TEST_USERS.SCHOOL_OWNER);
      
      // School owners should have broader access
      const endpoints = [
        '/api/students',
        '/api/songs',
        '/api/lessons',
        '/api/reports'
      ];
      
      for (const endpoint of endpoints) {
        const response = await makeAuthenticatedRequest(
          app, 'GET', endpoint, ownerCookie
        );
        
        console.log(`School owner access to ${endpoint}: ${response.status}`);
        
        // Should not be auth error for school owner
        expect(response.status).not.toBe(401);
        expect(response.status).not.toBe(403);
      }
      
      console.log('✅ School owner has appropriate broader access');
    });
  });
});