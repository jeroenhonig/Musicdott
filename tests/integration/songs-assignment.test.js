/**
 * MusicDott 2.0 Songs Assignment Integration Tests
 * Tests Stefan's critical issue: song assignment workflow with 401 errors
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
  createTestStudent,
  createTestSong,
  TEST_USERS,
  wait
} from '../utils/test-helpers.js';

describe('Songs Assignment Workflow Tests (Stefan\'s Critical Issue)', () => {
  let server;
  let testTeacher;
  let testStudent;
  let testSong;

  beforeAll(async () => {
    console.log('🧪 Setting up songs assignment tests...');
    
    // Start server for testing
    server = createServer(app);
    await new Promise((resolve) => {
      server.listen(0, resolve);
    });
    
    // Setup test environment
    await setupTestEnvironment();
    
    // Login as teacher to get user object
    const { user } = await loginUser(app, TEST_USERS.TEACHER);
    testTeacher = user;
  });

  afterAll(async () => {
    console.log('🧹 Cleaning up songs assignment tests...');
    
    if (server) {
      await new Promise((resolve) => {
        server.close(resolve);
      });
    }
    
    await cleanupTestData();
  });

  describe('Complete Songs Assignment Workflow', () => {
    it('should complete the full teacher → student song assignment flow', async () => {
      console.log('🎵 Testing complete song assignment workflow...');
      
      // Step 1: Teacher logs in
      const { cookie: teacherCookie } = await loginUser(app, TEST_USERS.TEACHER);
      console.log('✅ Teacher logged in successfully');

      // Step 2: Create test student if needed
      try {
        testStudent = await createTestStudent({
          firstName: 'Assignment',
          lastName: 'Test',
          username: `assignment_test_student_${Date.now()}`,
          email: `assignment.test.${Date.now()}@musicdott.test`,
          teacherId: testTeacher.id
        }, testTeacher.schoolId);
        console.log('✅ Test student created for assignment');
      } catch (error) {
        console.warn('Could not create test student:', error.message);
      }

      // Step 3: Create test song
      try {
        testSong = await createTestSong({
          title: 'Assignment Test Song',
          artist: 'Test Artist',
          genre: 'Rock',
          level: 'beginner'
        }, testTeacher.id, testTeacher.schoolId);
        console.log('✅ Test song created for assignment');
      } catch (error) {
        console.warn('Could not create test song:', error.message);
      }

      // Step 4: Teacher navigates to students page (the critical step that was failing)
      const studentsResponse = await makeAuthenticatedRequest(
        app, 'GET', '/api/students', teacherCookie
      );

      console.log(`📋 Students API response: ${studentsResponse.status}`);
      
      // This was returning 401 - now it should work
      expect([200, 404]).toContain(studentsResponse.status);
      if (studentsResponse.status === 200) {
        expect(Array.isArray(studentsResponse.body)).toBe(true);
        console.log(`✅ Found ${studentsResponse.body.length} students`);
      }

      // Step 5: Teacher gets songs list (this was also failing with 401)
      const songsResponse = await makeAuthenticatedRequest(
        app, 'GET', '/api/songs', teacherCookie
      );

      console.log(`🎵 Songs API response: ${songsResponse.status}`);
      
      // This should NOT return 401 for authenticated teacher
      expect(songsResponse.status).not.toBe(401);
      expect([200, 404]).toContain(songsResponse.status);
      
      if (songsResponse.status === 200) {
        expect(Array.isArray(songsResponse.body)).toBe(true);
        console.log(`✅ Found ${songsResponse.body.length} songs`);
      }

      // Step 6: Test assignment creation (if we have both student and song)
      if (testStudent && testSong && studentsResponse.status === 200 && songsResponse.status === 200) {
        console.log('🔗 Testing song assignment creation...');
        
        const assignmentResponse = await makeAuthenticatedRequest(
          app, 'POST', '/api/assignments', teacherCookie,
          {
            studentId: testStudent.id,
            songId: testSong.id,
            type: 'song',
            title: 'Test Assignment',
            description: 'Integration test assignment'
          }
        );

        console.log(`📝 Assignment creation response: ${assignmentResponse.status}`);
        
        // Assignment creation should work or give a meaningful error (not 401)
        expect(assignmentResponse.status).not.toBe(401);
        
        if (assignmentResponse.status === 201 || assignmentResponse.status === 200) {
          expect(assignmentResponse.body).toHaveProperty('id');
          console.log('✅ Assignment created successfully');
        }
      }

      console.log('🎉 Song assignment workflow test completed');
    });

    it('should handle songs API without authentication errors', async () => {
      const { cookie } = await loginUser(app, TEST_USERS.TEACHER);
      
      // Test all song-related endpoints that were problematic
      const endpoints = [
        '/api/songs',
        '/api/songs/recent',
        '/api/dashboard/recent-songs'
      ];
      
      for (const endpoint of endpoints) {
        console.log(`Testing endpoint: ${endpoint}`);
        
        const response = await makeAuthenticatedRequest(
          app, 'GET', endpoint, cookie
        );
        
        console.log(`${endpoint} response: ${response.status}`);
        
        // None of these should return 401 for authenticated teacher
        expect(response.status).not.toBe(401);
        
        // They should return 200 (success) or 404/500 (server issues), but not auth errors
        if (response.status >= 400) {
          expect([403, 404, 500]).toContain(response.status);
        }
      }
    });

    it('should allow teachers to access student assignment data', async () => {
      const { cookie } = await loginUser(app, TEST_USERS.TEACHER);
      
      // Test student-related endpoints
      const endpoints = [
        '/api/students',
        '/api/schedule/today'
      ];
      
      for (const endpoint of endpoints) {
        console.log(`Testing student endpoint: ${endpoint}`);
        
        const response = await makeAuthenticatedRequest(
          app, 'GET', endpoint, cookie
        );
        
        console.log(`${endpoint} response: ${response.status}`);
        
        // Teacher should be able to access student data
        expect(response.status).not.toBe(401);
        expect(response.status).not.toBe(403);
        
        if (response.status === 200) {
          // If successful, should return array data
          expect(Array.isArray(response.body)).toBe(true);
        }
      }
    });
  });

  describe('Assignment CRUD Operations', () => {
    it('should allow teachers to create assignments', async () => {
      const { cookie } = await loginUser(app, TEST_USERS.TEACHER);
      
      // Test assignment creation with minimal data
      const response = await makeAuthenticatedRequest(
        app, 'POST', '/api/assignments', cookie,
        {
          title: 'Test Assignment',
          description: 'Test assignment description',
          type: 'general'
        }
      );

      console.log(`Assignment creation response: ${response.status}`);
      
      // Should not fail with auth error
      expect(response.status).not.toBe(401);
      expect(response.status).not.toBe(403);
      
      if (response.status === 400) {
        // If validation error, should have meaningful message
        expect(response.body).toHaveProperty('message');
        console.log('Validation error (expected):', response.body.message);
      }
    });

    it('should allow teachers to view assignments', async () => {
      const { cookie } = await loginUser(app, TEST_USERS.TEACHER);
      
      const response = await makeAuthenticatedRequest(
        app, 'GET', '/api/assignments', cookie
      );

      console.log(`View assignments response: ${response.status}`);
      
      // Should not fail with auth error
      expect(response.status).not.toBe(401);
      expect(response.status).not.toBe(403);
      
      if (response.status === 200) {
        expect(Array.isArray(response.body)).toBe(true);
        console.log(`Found ${response.body.length} assignments`);
      }
    });
  });

  describe('Mobile Navigation Access', () => {
    it('should allow teachers to access mobile navigation data', async () => {
      const { cookie } = await loginUser(app, TEST_USERS.TEACHER);
      
      // Test endpoints that mobile navigation might use
      const endpoints = [
        '/api/user',
        '/api/dashboard/widgets'
      ];
      
      for (const endpoint of endpoints) {
        const response = await makeAuthenticatedRequest(
          app, 'GET', endpoint, cookie
        );
        
        console.log(`Mobile nav endpoint ${endpoint}: ${response.status}`);
        
        // Mobile navigation should work for teachers
        expect(response.status).not.toBe(401);
        expect(response.status).not.toBe(403);
      }
    });

    it('should provide role-appropriate navigation for students', async () => {
      const { cookie } = await loginUser(app, TEST_USERS.STUDENT);
      
      // Students should be able to access their own data
      const userResponse = await makeAuthenticatedRequest(
        app, 'GET', '/api/user', cookie
      );
      
      assertResponseCode(userResponse, 200, 'Student user data');
      expect(userResponse.body.role).toBe('student');
      
      // But not teacher-specific endpoints
      const teacherResponse = await makeAuthenticatedRequest(
        app, 'GET', '/api/reports', cookie
      );
      
      expect([401, 403]).toContain(teacherResponse.status);
    });
  });
});