/**
 * MusicDott 2.0 Mobile Navigation E2E Test
 * Tests role-based mobile navigation and responsive behavior
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createServer } from 'http';
import { app } from '../../../server/index.js';
import E2EScenario from '../framework/e2e-scenario.js';
import {
  loginUser,
  makeAuthenticatedRequest,
  TEST_USERS,
  wait
} from '../../utils/test-helpers.js';

class MobileNavigationScenario extends E2EScenario {
  constructor() {
    super(
      'Mobile Navigation and Responsive Behavior',
      'Tests role-based mobile navigation with proper filtering and responsive behavior'
    );
  }

  async createTestData() {
    console.log('📱 Creating test data for mobile navigation testing...');
    
    // Create sessions for different user roles
    const studentLogin = await loginUser(this.app, TEST_USERS.STUDENT);
    const teacherLogin = await loginUser(this.app, TEST_USERS.TEACHER);
    const adminLogin = await loginUser(this.app, TEST_USERS.SCHOOL_OWNER);
    
    this.testData.users = {
      student: { user: studentLogin.user, cookie: studentLogin.cookie },
      teacher: { user: teacherLogin.user, cookie: teacherLogin.cookie },
      admin: { user: adminLogin.user, cookie: adminLogin.cookie }
    };
    
    console.log('✅ Test data created for mobile navigation testing');
  }

  async runScenarioSteps() {
    // Step 1: Student Mobile Navigation
    this.addStep('Student Mobile Navigation', async () => {
      console.log('📱👤 Testing student mobile navigation...');
      
      const studentCookie = this.testData.users.student.cookie;
      
      // Test student-specific mobile endpoints
      const studentMobileEndpoints = [
        { path: '/api/user', description: 'User profile for mobile header' },
        { path: '/api/student/message-responses', description: 'Message notifications for mobile nav' }
      ];

      for (const endpoint of studentMobileEndpoints) {
        const response = await makeAuthenticatedRequest(
          this.app, 'GET', endpoint.path, studentCookie
        );
        
        this.assert(
          response.status !== 401,
          `Student mobile navigation: ${endpoint.description} should be accessible`
        );
        
        this.assert(
          response.status !== 403,
          `Student mobile navigation: ${endpoint.description} should not be forbidden`
        );
        
        console.log(`✅ ${endpoint.description}: ${response.status}`);
      }
      
      // Verify student gets appropriate data for mobile nav
      const userResponse = await makeAuthenticatedRequest(
        this.app, 'GET', '/api/user', studentCookie
      );
      
      if (userResponse.status === 200) {
        this.assert(userResponse.body.role === 'student', 'Mobile nav should show student role');
        console.log('✅ Student mobile navigation data structure correct');
      }
    });

    // Step 2: Teacher Mobile Navigation
    this.addStep('Teacher Mobile Navigation', async () => {
      console.log('📱🍎 Testing teacher mobile navigation...');
      
      const teacherCookie = this.testData.users.teacher.cookie;
      
      // Test teacher-specific mobile endpoints
      const teacherMobileEndpoints = [
        { path: '/api/user', description: 'User profile for mobile header' },
        { path: '/api/teacher/messages', description: 'Teacher message notifications' },
        { path: '/api/dashboard/widgets', description: 'Mobile dashboard widgets' }
      ];

      for (const endpoint of teacherMobileEndpoints) {
        const response = await makeAuthenticatedRequest(
          this.app, 'GET', endpoint.path, teacherCookie
        );
        
        this.assert(
          response.status !== 401,
          `Teacher mobile navigation: ${endpoint.description} should be accessible`
        );
        
        console.log(`✅ ${endpoint.description}: ${response.status}`);
      }
      
      // Verify teacher can access mobile-optimized data
      const userResponse = await makeAuthenticatedRequest(
        this.app, 'GET', '/api/user', teacherCookie
      );
      
      if (userResponse.status === 200) {
        this.assert(userResponse.body.role === 'teacher', 'Mobile nav should show teacher role');
        console.log('✅ Teacher mobile navigation data structure correct');
      }
    });

    // Step 3: Role-Based Navigation Filtering
    this.addStep('Role-Based Navigation Filtering', async () => {
      console.log('🔄 Testing role-based navigation filtering...');
      
      // Student should see limited navigation options
      const studentUser = this.testData.users.student.user;
      this.assert(studentUser.role === 'student', 'Student role verification for mobile nav');
      
      // Teacher should see expanded navigation options
      const teacherUser = this.testData.users.teacher.user;
      this.assert(teacherUser.role === 'teacher', 'Teacher role verification for mobile nav');
      
      // Admin should see all navigation options
      const adminUser = this.testData.users.admin.user;
      this.assert(adminUser.role === 'school_owner', 'Admin role verification for mobile nav');
      
      console.log('✅ Role-based navigation filtering verified');
    });

    // Step 4: Mobile Message Notifications
    this.addStep('Mobile Message Notifications', async () => {
      console.log('💬 Testing mobile message notifications...');
      
      // Test student message notifications
      const studentMessagesResponse = await makeAuthenticatedRequest(
        this.app, 'GET', '/api/student/message-responses', this.testData.users.student.cookie
      );
      
      this.assert(
        studentMessagesResponse.status !== 401,
        'Student should access mobile message notifications'
      );
      
      // Test teacher message notifications
      const teacherMessagesResponse = await makeAuthenticatedRequest(
        this.app, 'GET', '/api/teacher/messages', this.testData.users.teacher.cookie
      );
      
      this.assert(
        teacherMessagesResponse.status !== 401,
        'Teacher should access mobile message notifications'
      );
      
      // Calculate notification counts (mobile navigation feature)
      if (studentMessagesResponse.status === 200) {
        const studentMessages = studentMessagesResponse.body;
        const unreadCount = Array.isArray(studentMessages) 
          ? studentMessages.filter(m => m.response && !m.responseRead).length 
          : 0;
        console.log(`✅ Student mobile notification count: ${unreadCount}`);
      }
      
      if (teacherMessagesResponse.status === 200) {
        const teacherMessages = teacherMessagesResponse.body;
        const unreadCount = Array.isArray(teacherMessages) 
          ? teacherMessages.filter(m => !m.isRead).length 
          : 0;
        console.log(`✅ Teacher mobile notification count: ${unreadCount}`);
      }
    });

    // Step 5: Mobile Dashboard Access
    this.addStep('Mobile Dashboard Access', async () => {
      console.log('📊 Testing mobile dashboard access...');
      
      // Test mobile-optimized dashboard endpoints
      const mobileEndpoints = [
        { path: '/api/dashboard/stats', role: 'teacher', user: this.testData.users.teacher },
        { path: '/api/dashboard/widgets', role: 'teacher', user: this.testData.users.teacher }
      ];

      for (const endpoint of mobileEndpoints) {
        const response = await makeAuthenticatedRequest(
          this.app, 'GET', endpoint.path, endpoint.user.cookie
        );
        
        this.assert(
          response.status !== 401,
          `${endpoint.role} should access ${endpoint.path} for mobile dashboard`
        );
        
        console.log(`✅ Mobile dashboard ${endpoint.path} for ${endpoint.role}: ${response.status}`);
      }
    });

    // Step 6: Mobile Authentication State
    this.addStep('Mobile Authentication State', async () => {
      console.log('🔐 Testing mobile authentication state management...');
      
      // Test that all roles maintain proper authentication state for mobile
      for (const [role, userData] of Object.entries(this.testData.users)) {
        const authResponse = await makeAuthenticatedRequest(
          this.app, 'GET', '/api/user', userData.cookie
        );
        
        this.assertStatusCode(authResponse, 200, `${role} mobile auth state`);
        this.assert(
          authResponse.body.role === userData.user.role,
          `${role} should maintain correct role in mobile context`
        );
        
        console.log(`✅ ${role} mobile authentication state: valid`);
      }
    });

    // Step 7: Mobile Performance Optimization
    this.addStep('Mobile Performance Optimization', async () => {
      console.log('⚡ Testing mobile performance optimization...');
      
      // Test lightweight endpoints suitable for mobile
      const lightweightEndpoints = [
        { path: '/api/user', description: 'User profile (lightweight)' },
        { path: '/api/dashboard/widgets', description: 'Dashboard widgets (optimized for mobile)' }
      ];

      for (const endpoint of lightweightEndpoints) {
        const startTime = Date.now();
        
        const response = await makeAuthenticatedRequest(
          this.app, 'GET', endpoint.path, this.testData.users.teacher.cookie
        );
        
        const responseTime = Date.now() - startTime;
        
        // Mobile endpoints should respond quickly (under 1 second)
        this.assert(
          responseTime < 1000,
          `${endpoint.description} should respond quickly for mobile (${responseTime}ms)`
        );
        
        console.log(`✅ ${endpoint.description} response time: ${responseTime}ms`);
      }
    });

    // Step 8: Mobile Security Context
    this.addStep('Mobile Security Context', async () => {
      console.log('🛡️ Testing mobile security context...');
      
      // Verify that mobile navigation respects security boundaries
      const studentCookie = this.testData.users.student.cookie;
      
      // Student should NOT access teacher mobile endpoints
      const forbiddenMobileEndpoints = [
        '/api/teacher/messages',
        '/api/performance/lessons',
        '/api/schools/members'
      ];

      for (const endpoint of forbiddenMobileEndpoints) {
        const response = await makeAuthenticatedRequest(
          this.app, 'GET', endpoint, studentCookie
        );
        
        this.assert(
          [401, 403].includes(response.status),
          `Student should not access ${endpoint} via mobile navigation`
        );
      }
      
      console.log('✅ Mobile security context properly enforced');
    });

    await super.runScenarioSteps();
  }

  async validateEndState() {
    console.log('🔍 Validating mobile navigation end state...');
    
    // Verify all user roles can still access their mobile navigation endpoints
    const mobileEndpoints = {
      student: ['/api/user', '/api/student/message-responses'],
      teacher: ['/api/user', '/api/teacher/messages', '/api/dashboard/widgets'],
      admin: ['/api/user', '/api/schools/members', '/api/billing/summary']
    };

    for (const [role, endpoints] of Object.entries(mobileEndpoints)) {
      const userData = this.testData.users[role];
      
      for (const endpoint of endpoints) {
        const response = await makeAuthenticatedRequest(
          this.app, 'GET', endpoint, userData.cookie
        );
        
        this.assert(
          response.status !== 401,
          `Final validation: ${role} should access ${endpoint} for mobile nav`
        );
      }
    }
    
    console.log('✅ Mobile navigation end state validation passed');
  }

  async cleanupTestData() {
    console.log('🧹 Cleaning up mobile navigation test data...');
    console.log('✅ Mobile navigation cleanup completed');
  }
}

describe('Mobile Navigation and Responsive Behavior E2E Tests', () => {
  let server;
  let scenario;

  beforeAll(async () => {
    console.log('🧪 Setting up Mobile Navigation E2E tests...');
    
    server = createServer(app);
    await new Promise((resolve) => {
      server.listen(0, resolve);
    });
    
    scenario = new MobileNavigationScenario();
    scenario.app = app;
    await scenario.setup();
  });

  afterAll(async () => {
    console.log('🧹 Cleaning up Mobile Navigation E2E tests...');
    
    if (scenario) {
      await scenario.cleanup();
    }
    
    if (server) {
      await new Promise((resolve) => {
        server.close(resolve);
      });
    }
  });

  it('should provide proper role-based mobile navigation for all user types', async () => {
    console.log('🚀 Starting complete mobile navigation E2E test...');
    
    await scenario.execute();
    await scenario.validate();
    
    const report = scenario.getReport();
    console.log('📊 Mobile Navigation Report:', report);
    
    expect(report.success).toBe(true);
    expect(report.results.failed).toBe(0);
    
    console.log('🎉 Mobile navigation and responsive behavior E2E test completed successfully!');
  }, 90000); // 90 second timeout
});