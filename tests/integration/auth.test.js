/**
 * MusicDott 2.0 Authentication & Authorization Integration Tests
 * Tests critical auth flows and role-based access control
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { app } from '../../server/index.ts';
import {
  setupIntegrationApp,
  teardownIntegrationApp,
  setupTestEnvironment,
  cleanupTestData,
  loginUser,
  makeAuthenticatedRequest,
  assertResponseCode,
  TEST_USERS
} from '../utils/test-helpers.js';

function getResponseMessage(response) {
  if (typeof response.body?.message === 'string') {
    return response.body.message;
  }

  if (typeof response.text === 'string') {
    return response.text;
  }

  return '';
}

describe('Authentication & Authorization Tests', () => {
  beforeAll(async () => {
    console.log('🧪 Setting up authentication tests...');

    await setupIntegrationApp();

    // Setup test environment
    await setupTestEnvironment();
  });

  afterAll(async () => {
    console.log('🧹 Cleaning up authentication tests...');

    await cleanupTestData();
    await teardownIntegrationApp();
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

       const sessionCookie = response.headers['set-cookie']?.find((cookie) =>
        cookie.startsWith('musicdott.sid=')
      );
      expect(sessionCookie).toBeTruthy();
      expect(sessionCookie).toMatch(/HttpOnly/i);
      expect(sessionCookie).toMatch(/SameSite=Lax/i);
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

    it('should allow platform owner login through the dedicated owner endpoint', async () => {
      const response = await makeAuthenticatedRequest(
        app,
        'POST',
        '/api/owner/login',
        null,
        {
          username: TEST_USERS.PLATFORM_OWNER.username,
          password: TEST_USERS.PLATFORM_OWNER.password,
        },
      );

      expect(response.status).toBe(200);
      expect(response.body.message).toMatch(/administrator authentication successful/i);

      const sessionCookie = response.headers['set-cookie']?.find((cookie) =>
        cookie.startsWith('musicdott.sid=')
      );
      expect(sessionCookie).toBeTruthy();

      const platformStatsResponse = await makeAuthenticatedRequest(
        app,
        'GET',
        '/api/owners/platform-stats',
        sessionCookie.split(';')[0],
      );

      expect([200, 500]).toContain(platformStatsResponse.status);
      expect(platformStatsResponse.status).not.toBe(401);
      expect(platformStatsResponse.status).not.toBe(403);
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

    it("should set session cookie over HTTP when COOKIE_SECURE is not set", async () => {
      const response = await makeAuthenticatedRequest(
        app, 'POST', '/api/login', null,
        {
          username: TEST_USERS.TEACHER.username,
          password: TEST_USERS.TEACHER.password
        }
      );

      assertResponseCode(response, 200, 'Login with no COOKIE_SECURE set');
      expect(response.headers["set-cookie"]).toBeDefined();
      const sessionCookie = response.headers["set-cookie"].find((cookie) =>
        cookie.startsWith('musicdott.sid=')
      );
      expect(sessionCookie).toBeTruthy();
      expect(sessionCookie).toMatch(/HttpOnly/i);
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

    it('should block school owners from platform-only billing and debug endpoints', async () => {
      const { cookie } = await loginUser(app, TEST_USERS.SCHOOL_OWNER);

      const billingResponse = await makeAuthenticatedRequest(
        app, 'GET', '/api/admin/billing/status', cookie
      );

      const debugResponse = await makeAuthenticatedRequest(
        app, 'GET', '/api/admin/debug/stats', cookie
      );

      const invoicesResponse = await makeAuthenticatedRequest(
        app, 'GET', '/api/admin/billing/invoices', cookie
      );

      const platformStatsResponse = await makeAuthenticatedRequest(
        app, 'GET', '/api/admin/platform-stats', cookie
      );

      expect(billingResponse.status).toBe(403);
      expect(debugResponse.status).toBe(403);
      expect(invoicesResponse.status).toBe(403);
      expect(platformStatsResponse.status).toBe(403);
    });

    it('should allow platform owners to access platform-only billing and debug endpoints', async () => {
      const { cookie } = await loginUser(app, TEST_USERS.PLATFORM_OWNER);

      const billingResponse = await makeAuthenticatedRequest(
        app, 'GET', '/api/admin/billing/status', cookie
      );

      const debugResponse = await makeAuthenticatedRequest(
        app, 'GET', '/api/admin/debug/stats', cookie
      );

      const invoicesResponse = await makeAuthenticatedRequest(
        app, 'GET', '/api/admin/billing/invoices', cookie
      );

      const platformStatsResponse = await makeAuthenticatedRequest(
        app, 'GET', '/api/admin/platform-stats', cookie
      );

      expect([200, 500]).toContain(billingResponse.status);
      expect([200, 500]).toContain(debugResponse.status);
      expect([200, 500]).toContain(invoicesResponse.status);
      expect([200, 500]).toContain(platformStatsResponse.status);

      expect(billingResponse.status).not.toBe(401);
      expect(billingResponse.status).not.toBe(403);
      expect(debugResponse.status).not.toBe(401);
      expect(debugResponse.status).not.toBe(403);
      expect(invoicesResponse.status).not.toBe(401);
      expect(invoicesResponse.status).not.toBe(403);
      expect(platformStatsResponse.status).not.toBe(401);
      expect(platformStatsResponse.status).not.toBe(403);
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

    it('should block authenticated cross-site logout requests', async () => {
      const { cookie } = await loginUser(app, TEST_USERS.TEACHER);

      const response = await makeAuthenticatedRequest(
        app,
        'POST',
        '/api/logout',
        cookie,
        null,
        {
          Origin: 'https://evil.example',
          Referer: 'https://evil.example/logout',
        }
      );

      expect(response.status).toBe(403);
      expect(response.body.message).toMatch(/cross-site|origin/i);
    });
  });

  describe('Authentication abuse protection', () => {
    it('should rate limit repeated invalid login attempts', async () => {
      let response;

      for (let attempt = 0; attempt < 6; attempt += 1) {
        response = await makeAuthenticatedRequest(
          app,
          'POST',
          '/api/login',
          null,
          {
            username: TEST_USERS.TEACHER.username,
            password: 'wrong_password',
          },
          {
            'X-Forwarded-For': '203.0.113.40',
          },
        );
      }

      expect(response.status).toBe(429);
      expect(getResponseMessage(response)).toMatch(/too many/i);
    });

    it('should rate limit repeated invalid owner login attempts more aggressively', async () => {
      let response;

      for (let attempt = 0; attempt < 4; attempt += 1) {
        response = await makeAuthenticatedRequest(
          app,
          'POST',
          '/api/owner/login',
          null,
          {
            username: TEST_USERS.PLATFORM_OWNER.username,
            password: 'wrong_password',
          },
          {
            'X-Forwarded-For': '203.0.113.41',
          },
        );
      }

      expect(response.status).toBe(429);
      expect(getResponseMessage(response)).toMatch(/too many/i);
    });

    it('should rate limit repeated failed password change attempts', async () => {
      const { cookie } = await loginUser(app, TEST_USERS.SCHOOL_OWNER);
      let response;

      for (let attempt = 0; attempt < 6; attempt += 1) {
        response = await makeAuthenticatedRequest(
          app,
          'PATCH',
          '/api/user/password',
          cookie,
          {
            currentPassword: 'WrongPassword123!',
            newPassword: 'DifferentPass123!',
          },
          {
            'X-Forwarded-For': '203.0.113.42',
          },
        );
      }

      expect(response.status).toBe(429);
      expect(getResponseMessage(response)).toMatch(/too many/i);
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
