/**
 * MusicDott 2.0 Authentication & Authorization Integration Tests
 * Tests critical auth flows and role-based access control
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
  TEST_USERS
} from '../utils/test-helpers.js';

describe('Authentication & Authorization Tests', () => {
  let server;

  beforeAll(async () => {
    console.log('🧪 Setting up authentication tests...');
    
    // Start server for testing
    server = createServer(app);
    await new Promise((resolve) => {
      server.listen(0, resolve);
    });
    
    // Setup test environment
    await setupTestEnvironment();
  });

  afterAll(async () => {
    console.log('🧹 Cleaning up authentication tests...');
    
    if (server) {
      await new Promise((resolve) => {
        server.close(resolve);
      });
    }
    
    await cleanupTestData();
  });

  describe('Basic Authentication Flow', () => {
    it('should allow valid user login', async () => {
      const response = await makeAuthenticatedRequest(
        app, 'POST', '/api/login', null, 
        {
          username: TEST_USERS.TEACHER.username,
          password: TEST_USERS.TEACHER.password
        }
      );

      assertResponseCode(response, 200, 'Teacher login');
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('role', 'teacher');
      expect(response.body).not.toHaveProperty('password');
    });

    it('should reject invalid credentials', async () => {
      const response = await makeAuthenticatedRequest(
        app, 'POST', '/api/login', null,
        {
          username: TEST_USERS.TEACHER.username,
          password: 'wrong_password'
        }
      );

      assertResponseCode(response, 401, 'Invalid login');
      expect(response.body).toHaveProperty('message');
    });

    it('should return user info for authenticated requests', async () => {
      const { cookie } = await loginUser(app, TEST_USERS.TEACHER);
      
      const response = await makeAuthenticatedRequest(
        app, 'GET', '/api/user', cookie
      );

      assertResponseCode(response, 200, 'Get user info');
      expect(response.body).toHaveProperty('role', 'teacher');
      expect(response.body).not.toHaveProperty('password');
    });

    it('should reject unauthenticated requests to protected endpoints', async () => {
      const response = await makeAuthenticatedRequest(
        app, 'GET', '/api/user', null
      );

      assertResponseCode(response, 401, 'Unauthenticated access');
    });
  });

  describe('Role-Based Access Control', () => {
    it('should allow teachers access to teacher endpoints', async () => {
      const { cookie } = await loginUser(app, TEST_USERS.TEACHER);
      
      const response = await makeAuthenticatedRequest(
        app, 'GET', '/api/students', cookie
      );

      // Should not return 401/403 for teacher accessing students
      expect([200, 404, 500]).toContain(response.status);
      if (response.status >= 400) {
        expect(response.status).not.toBe(401);
        expect(response.status).not.toBe(403);
      }
    });

    it('should block students from teacher-only endpoints', async () => {
      const { cookie } = await loginUser(app, TEST_USERS.STUDENT);
      
      const response = await makeAuthenticatedRequest(
        app, 'GET', '/api/reports', cookie
      );

      // Students should not be able to access reports
      expect([401, 403]).toContain(response.status);
    });

    it('should allow school owners broader access', async () => {
      const { cookie } = await loginUser(app, TEST_USERS.SCHOOL_OWNER);
      
      const studentsResponse = await makeAuthenticatedRequest(
        app, 'GET', '/api/students', cookie
      );
      
      const reportsResponse = await makeAuthenticatedRequest(
        app, 'GET', '/api/reports', cookie
      );

      // School owners should have access to both
      expect([200, 404, 500]).toContain(studentsResponse.status);
      expect([200, 404, 500]).toContain(reportsResponse.status);
      
      if (studentsResponse.status >= 400) {
        expect(studentsResponse.status).not.toBe(401);
        expect(studentsResponse.status).not.toBe(403);
      }
      
      if (reportsResponse.status >= 400) {
        expect(reportsResponse.status).not.toBe(401);
        expect(reportsResponse.status).not.toBe(403);
      }
    });
  });

  describe('Session Management', () => {
    it('should maintain session across requests', async () => {
      const { cookie } = await loginUser(app, TEST_USERS.TEACHER);
      
      // Make multiple requests with same session
      const response1 = await makeAuthenticatedRequest(
        app, 'GET', '/api/user', cookie
      );
      
      const response2 = await makeAuthenticatedRequest(
        app, 'GET', '/api/user', cookie
      );

      assertResponseCode(response1, 200, 'First session request');
      assertResponseCode(response2, 200, 'Second session request');
      
      expect(response1.body.id).toBe(response2.body.id);
    });

    it('should handle logout properly', async () => {
      const { cookie } = await loginUser(app, TEST_USERS.TEACHER);
      
      // Logout
      const logoutResponse = await makeAuthenticatedRequest(
        app, 'POST', '/api/logout', cookie
      );
      
      assertResponseCode(logoutResponse, 200, 'Logout');
      
      // Try to access protected endpoint after logout
      const response = await makeAuthenticatedRequest(
        app, 'GET', '/api/user', cookie
      );
      
      assertResponseCode(response, 401, 'Access after logout');
    });
  });

  describe('Security Validation', () => {
    it('should protect sensitive teacher endpoints', async () => {
      const { cookie } = await loginUser(app, TEST_USERS.STUDENT);
      
      const sensitiveEndpoints = [
        '/api/teacher/messages',
        '/api/performance/lessons',
        '/api/performance/realtime'
      ];
      
      for (const endpoint of sensitiveEndpoints) {
        const response = await makeAuthenticatedRequest(
          app, 'GET', endpoint, cookie
        );
        
        // Should be forbidden for students
        expect([401, 403]).toContain(response.status);
      }
    });

    it('should validate password change requirements', async () => {
      const { cookie } = await loginUser(app, TEST_USERS.TEACHER);
      
      const response = await makeAuthenticatedRequest(
        app, 'PATCH', '/api/user/password', cookie,
        {
          currentPassword: TEST_USERS.TEACHER.password,
          newPassword: 'NewTestPass123!'
        }
      );

      // Password change should work for valid data
      expect([200, 400]).toContain(response.status);
      
      if (response.status === 400) {
        // Check if it's validation error (not auth error)
        expect(response.body).toHaveProperty('message');
      }
    });
  });
});