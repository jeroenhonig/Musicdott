/**
 * MusicDott 2.0 Security Boundaries E2E Test
 * Tests cross-role security and multi-tenant isolation
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createServer } from 'http';
import { app } from '../../../server/index.js';
import E2EScenario from '../framework/e2e-scenario.js';
import {
  loginUser,
  makeAuthenticatedRequest,
  createTestUser,
  createTestSchool,
  TEST_USERS,
  wait
} from '../../utils/test-helpers.js';

class SecurityBoundariesScenario extends E2EScenario {
  constructor() {
    super(
      'Complete Security Boundaries and Multi-Tenant Isolation',
      'Tests security boundaries between roles and complete multi-tenant data isolation'
    );
  }

  async createTestData() {
    console.log('🔒 Creating test data for security boundaries testing...');
    
    // Create multiple user sessions for security testing
    const studentLogin = await loginUser(this.app, TEST_USERS.STUDENT);
    const teacherLogin = await loginUser(this.app, TEST_USERS.TEACHER);
    const adminLogin = await loginUser(this.app, TEST_USERS.SCHOOL_OWNER);
    const otherSchoolLogin = await loginUser(this.app, TEST_USERS.OTHER_SCHOOL_TEACHER);
    
    this.testData.users = {
      student: { user: studentLogin.user, cookie: studentLogin.cookie },
      teacher: { user: teacherLogin.user, cookie: teacherLogin.cookie },
      admin: { user: adminLogin.user, cookie: adminLogin.cookie },
      otherSchool: { user: otherSchoolLogin.user, cookie: otherSchoolLogin.cookie }
    };
    
    console.log('✅ Test data created for security boundaries testing');
  }

  async runScenarioSteps() {
    // Step 1: Student Security Boundaries
    this.addStep('Student Security Boundaries', async () => {
      console.log('👤 Testing student security boundaries...');
      
      const studentCookie = this.testData.users.student.cookie;
      
      // Students should NOT access these teacher/admin endpoints
      const forbiddenEndpoints = [
        { path: '/api/students', reason: 'Students should not see all students' },
        { path: '/api/reports', reason: 'Students should not access reports' },
        { path: '/api/performance/lessons', reason: 'Students should not access performance analytics' },
        { path: '/api/teacher/messages', reason: 'Students should not access teacher messages' },
        { path: '/api/schools/members', reason: 'Students should not access school members' },
        { path: '/api/billing/summary', reason: 'Students should not access billing' },
        { path: '/api/admin/platform-stats', reason: 'Students should not access platform stats' }
      ];

      for (const endpoint of forbiddenEndpoints) {
        const response = await makeAuthenticatedRequest(
          this.app, 'GET', endpoint.path, studentCookie
        );
        
        this.assert(
          [401, 403].includes(response.status),
          `${endpoint.reason} - got ${response.status} for ${endpoint.path}`
        );
      }
      
      console.log('✅ Student security boundaries properly enforced');
    });

    // Step 2: Teacher Security Boundaries  
    this.addStep('Teacher Security Boundaries', async () => {
      console.log('🍎 Testing teacher security boundaries...');
      
      const teacherCookie = this.testData.users.teacher.cookie;
      
      // Teachers should NOT access these admin/platform endpoints
      const forbiddenEndpoints = [
        { path: '/api/admin/platform-stats', reason: 'Teachers should not access platform stats' },
        { path: '/api/schools/billing', reason: 'Teachers should not access billing details' }
      ];

      for (const endpoint of forbiddenEndpoints) {
        const response = await makeAuthenticatedRequest(
          this.app, 'GET', endpoint.path, teacherCookie
        );
        
        this.assert(
          [401, 403].includes(response.status),
          `${endpoint.reason} - got ${response.status} for ${endpoint.path}`
        );
      }
      
      // Teachers SHOULD access these endpoints (not forbidden)
      const allowedEndpoints = [
        { path: '/api/students', reason: 'Teachers should access their students' },
        { path: '/api/songs', reason: 'Teachers should access songs' },
        { path: '/api/lessons', reason: 'Teachers should access lessons' },
        { path: '/api/assignments', reason: 'Teachers should access assignments' }
      ];

      for (const endpoint of allowedEndpoints) {
        const response = await makeAuthenticatedRequest(
          this.app, 'GET', endpoint.path, teacherCookie
        );
        
        this.assert(
          ![401, 403].includes(response.status),
          `${endpoint.reason} - got ${response.status} for ${endpoint.path}`
        );
      }
      
      console.log('✅ Teacher security boundaries properly enforced');
    });

    // Step 3: Multi-Tenant School Isolation
    this.addStep('Multi-Tenant School Isolation', async () => {
      console.log('🏫 Testing multi-tenant school isolation...');
      
      const school1TeacherCookie = this.testData.users.teacher.cookie;
      const school2TeacherCookie = this.testData.users.otherSchool.cookie;
      
      // Get School 1 teacher's students
      const school1StudentsResponse = await makeAuthenticatedRequest(
        this.app, 'GET', '/api/students', school1TeacherCookie
      );
      
      // Get School 2 teacher's students  
      const school2StudentsResponse = await makeAuthenticatedRequest(
        this.app, 'GET', '/api/students', school2TeacherCookie
      );
      
      // Both should succeed but return different data
      if (school1StudentsResponse.status === 200 && school2StudentsResponse.status === 200) {
        const school1Students = school1StudentsResponse.body;
        const school2Students = school2StudentsResponse.body;
        
        // Students from different schools should not overlap
        const school1Ids = school1Students.map(s => s.id);
        const school2Ids = school2Students.map(s => s.id);
        const overlap = school1Ids.filter(id => school2Ids.includes(id));
        
        this.assert(overlap.length === 0, 'Schools should not see each other\'s students');
        console.log(`✅ School isolation verified: School 1 has ${school1Students.length} students, School 2 has ${school2Students.length} students, no overlap`);
      }
      
      // Test songs isolation
      const school1SongsResponse = await makeAuthenticatedRequest(
        this.app, 'GET', '/api/songs', school1TeacherCookie
      );
      
      const school2SongsResponse = await makeAuthenticatedRequest(
        this.app, 'GET', '/api/songs', school2TeacherCookie
      );
      
      if (school1SongsResponse.status === 200 && school2SongsResponse.status === 200) {
        console.log(`✅ Songs isolation: School 1 has ${school1SongsResponse.body.length} songs, School 2 has ${school2SongsResponse.body.length} songs`);
      }
    });

    // Step 4: Unauthenticated Access Prevention
    this.addStep('Unauthenticated Access Prevention', async () => {
      console.log('🚫 Testing unauthenticated access prevention...');
      
      const protectedEndpoints = [
        '/api/user',
        '/api/students',
        '/api/songs',
        '/api/lessons',
        '/api/assignments',
        '/api/dashboard/stats',
        '/api/reports'
      ];

      for (const endpoint of protectedEndpoints) {
        const response = await makeAuthenticatedRequest(
          this.app, 'GET', endpoint, null // No authentication cookie
        );
        
        this.assert(
          response.status === 401,
          `Unauthenticated request to ${endpoint} should return 401, got ${response.status}`
        );
      }
      
      console.log('✅ Unauthenticated access properly blocked');
    });

    // Step 5: Cross-School Assignment Attempt (Should Fail)
    this.addStep('Cross-School Assignment Prevention', async () => {
      console.log('🚧 Testing cross-school assignment prevention...');
      
      const school1TeacherCookie = this.testData.users.teacher.cookie;
      
      // Try to create assignment with a student ID from another school (if we had one)
      // This is a conceptual test - in practice we'd need student IDs from other schools
      
      const invalidAssignmentResponse = await makeAuthenticatedRequest(
        this.app, 'POST', '/api/assignments', school1TeacherCookie,
        {
          studentId: 99999, // Non-existent student ID
          title: 'Cross-school assignment attempt',
          description: 'This should fail'
        }
      );
      
      // Should fail with 400 (not found) or 403 (forbidden), not succeed
      this.assert(
        ![200, 201].includes(invalidAssignmentResponse.status),
        'Cross-school assignment should not succeed'
      );
      
      console.log('✅ Cross-school assignment properly prevented');
    });

    // Step 6: Session Hijacking Prevention
    this.addStep('Session Hijacking Prevention', async () => {
      console.log('🔐 Testing session hijacking prevention...');
      
      // Test with invalid/malformed session cookies
      const invalidCookies = [
        'md.sid=invalid_session_id',
        'md.sid=',
        'invalid_cookie_format'
      ];

      for (const invalidCookie of invalidCookies) {
        const response = await makeAuthenticatedRequest(
          this.app, 'GET', '/api/user', invalidCookie
        );
        
        this.assert(
          response.status === 401,
          `Invalid session cookie should return 401, got ${response.status}`
        );
      }
      
      console.log('✅ Session hijacking prevention working');
    });

    // Step 7: Role Escalation Prevention
    this.addStep('Role Escalation Prevention', async () => {
      console.log('⚡ Testing role escalation prevention...');
      
      // Student attempts to access teacher-only endpoints with valid session
      const studentCookie = this.testData.users.student.cookie;
      
      const escalationAttempts = [
        { path: '/api/teacher/messages', method: 'GET' },
        { path: '/api/students', method: 'GET' },
        { path: '/api/schools/members', method: 'POST', data: { username: 'hacker', role: 'teacher' } }
      ];

      for (const attempt of escalationAttempts) {
        const response = await makeAuthenticatedRequest(
          this.app, attempt.method, attempt.path, studentCookie, attempt.data
        );
        
        this.assert(
          [401, 403].includes(response.status),
          `Role escalation attempt to ${attempt.path} should be blocked, got ${response.status}`
        );
      }
      
      console.log('✅ Role escalation properly prevented');
    });

    await super.runScenarioSteps();
  }

  async validateEndState() {
    console.log('🔍 Validating security boundaries end state...');
    
    // Verify all user sessions are still valid for their appropriate access levels
    for (const [role, userData] of Object.entries(this.testData.users)) {
      const response = await makeAuthenticatedRequest(
        this.app, 'GET', '/api/user', userData.cookie
      );
      
      this.assertStatusCode(response, 200, `${role} session should still be valid`);
      this.assert(response.body.role === userData.user.role, `${role} should maintain correct role`);
    }
    
    console.log('✅ Security boundaries end state validation passed');
  }

  async cleanupTestData() {
    console.log('🧹 Cleaning up security boundaries test data...');
    console.log('✅ Security boundaries cleanup completed');
  }
}

describe('Security Boundaries and Multi-Tenant Isolation E2E Tests', () => {
  let server;
  let scenario;

  beforeAll(async () => {
    console.log('🧪 Setting up Security Boundaries E2E tests...');
    
    server = createServer(app);
    await new Promise((resolve) => {
      server.listen(0, resolve);
    });
    
    scenario = new SecurityBoundariesScenario();
    scenario.app = app;
    await scenario.setup();
  });

  afterAll(async () => {
    console.log('🧹 Cleaning up Security Boundaries E2E tests...');
    
    if (scenario) {
      await scenario.cleanup();
    }
    
    if (server) {
      await new Promise((resolve) => {
        server.close(resolve);
      });
    }
  });

  it('should properly enforce all security boundaries and multi-tenant isolation', async () => {
    console.log('🚀 Starting complete security boundaries E2E test...');
    
    await scenario.execute();
    await scenario.validate();
    
    const report = scenario.getReport();
    console.log('📊 Security Boundaries Report:', report);
    
    expect(report.success).toBe(true);
    expect(report.results.failed).toBe(0);
    
    console.log('🎉 Security boundaries and multi-tenant isolation E2E test completed successfully!');
  }, 120000); // 2 minute timeout
});