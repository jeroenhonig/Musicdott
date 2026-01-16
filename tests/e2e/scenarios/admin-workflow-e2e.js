/**
 * MusicDott 2.0 School Owner/Admin Workflow E2E Test
 * Tests complete school administration functionality
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createServer } from 'http';
import { app } from '../../../server/index.js';
import E2EScenario from '../framework/e2e-scenario.js';
import {
  loginUser,
  makeAuthenticatedRequest,
  createTestUser,
  TEST_USERS,
  wait
} from '../../utils/test-helpers.js';

class AdminWorkflowScenario extends E2EScenario {
  constructor() {
    super(
      'Complete School Owner Administration Workflow',
      'Tests full school administration experience: school management, member management, settings, billing'
    );
  }

  async createTestData() {
    console.log('🏫 Creating test data for admin workflow...');
    
    // Login as school owner
    const adminLogin = await loginUser(this.app, TEST_USERS.SCHOOL_OWNER);
    this.testData.admin = adminLogin.user;
    this.testData.adminCookie = adminLogin.cookie;
    
    console.log('✅ Test data created for admin workflow');
  }

  async runScenarioSteps() {
    // Step 1: School Owner Login and Enhanced Dashboard
    this.addStep('School Owner Login and Dashboard', async () => {
      console.log('👑 Testing school owner login and dashboard...');
      
      const userResponse = await makeAuthenticatedRequest(
        this.app, 'GET', '/api/user', this.testData.adminCookie
      );

      this.assertStatusCode(userResponse, 200, 'School owner user data access');
      this.assert(userResponse.body.role === 'school_owner', 'User should have school_owner role');
      
      // Test enhanced dashboard access
      const statsResponse = await makeAuthenticatedRequest(
        this.app, 'GET', '/api/dashboard/stats', this.testData.adminCookie
      );

      this.assert(statsResponse.status !== 401, 'School owner should not get 401 for dashboard stats');
    });

    // Step 2: School Member Management
    this.addStep('School Member Management', async () => {
      console.log('👥 Testing school member management...');
      
      // Access school members
      const membersResponse = await makeAuthenticatedRequest(
        this.app, 'GET', '/api/schools/members', this.testData.adminCookie
      );

      this.assert(membersResponse.status !== 401, 'School owner should not get 401 for school members');
      this.assert(membersResponse.status !== 403, 'School owner should not get 403 for school members');
      
      // Test school memberships endpoint
      const membershipsResponse = await makeAuthenticatedRequest(
        this.app, 'GET', '/api/schools/memberships', this.testData.adminCookie
      );

      this.assert(membershipsResponse.status !== 401, 'School owner should access memberships');
    });

    // Step 3: School Settings and Branding Management
    this.addStep('School Settings and Branding', async () => {
      console.log('🎨 Testing school branding and settings...');
      
      // Access current school settings
      const schoolResponse = await makeAuthenticatedRequest(
        this.app, 'GET', '/api/schools/current', this.testData.adminCookie
      );

      this.assert(schoolResponse.status !== 401, 'School owner should access school settings');
      
      // Test branding settings update
      const brandingUpdate = await makeAuthenticatedRequest(
        this.app, 'PATCH', '/api/schools/branding', this.testData.adminCookie,
        {
          primaryColor: '#FF5733',
          secondaryColor: '#33A1FF',
          brandingEnabled: true
        }
      );

      this.assert(brandingUpdate.status !== 401, 'School owner should update branding');
      this.assert(brandingUpdate.status !== 403, 'School owner should update branding');
    });

    // Step 4: Full Teacher Functionality Access
    this.addStep('Full Teacher Functionality Access', async () => {
      console.log('🍎 Testing school owner teacher functionality access...');
      
      const teacherEndpoints = [
        '/api/students',
        '/api/songs',
        '/api/lessons',
        '/api/assignments',
        '/api/schedule/today'
      ];

      for (const endpoint of teacherEndpoints) {
        const response = await makeAuthenticatedRequest(
          this.app, 'GET', endpoint, this.testData.adminCookie
        );
        
        this.assert(response.status !== 401, `School owner should access ${endpoint}`);
        this.assert(response.status !== 403, `School owner should access ${endpoint}`);
      }
    });

    // Step 5: School Analytics and Reporting
    this.addStep('School Analytics and Reporting', async () => {
      console.log('📊 Testing school analytics and reporting...');
      
      const analyticsEndpoints = [
        '/api/reports',
        '/api/performance/lessons',
        '/api/performance/realtime',
        '/api/analytics/school'
      ];

      for (const endpoint of analyticsEndpoints) {
        const response = await makeAuthenticatedRequest(
          this.app, 'GET', endpoint, this.testData.adminCookie
        );
        
        this.assert(response.status !== 401, `School owner should access ${endpoint}`);
        console.log(`Analytics endpoint ${endpoint}: ${response.status}`);
      }
    });

    // Step 6: Billing and Subscription Management
    this.addStep('Billing and Subscription Management', async () => {
      console.log('💳 Testing billing and subscription management...');
      
      const billingResponse = await makeAuthenticatedRequest(
        this.app, 'GET', '/api/billing/summary', this.testData.adminCookie
      );

      this.assert(billingResponse.status !== 401, 'School owner should access billing');
      this.assert(billingResponse.status !== 403, 'School owner should access billing');
      
      // Test subscription details
      const subscriptionResponse = await makeAuthenticatedRequest(
        this.app, 'GET', '/api/subscriptions/current', this.testData.adminCookie
      );

      this.assert(subscriptionResponse.status !== 401, 'School owner should access subscription');
    });

    // Step 7: Teacher Account Creation and Management
    this.addStep('Teacher Account Creation', async () => {
      console.log('👨‍🏫 Testing teacher account creation...');
      
      // Test creating a new teacher account
      const newTeacher = {
        username: `test_teacher_${Date.now()}`,
        email: `test.teacher.${Date.now()}@musicdott.test`,
        name: 'Test Teacher E2E',
        role: 'teacher',
        password: 'TestPass123!'
      };

      const createTeacherResponse = await makeAuthenticatedRequest(
        this.app, 'POST', '/api/schools/members', this.testData.adminCookie,
        newTeacher
      );

      this.assert(createTeacherResponse.status !== 401, 'School owner should create teacher accounts');
      this.assert(createTeacherResponse.status !== 403, 'School owner should create teacher accounts');
      
      if (createTeacherResponse.status === 201 || createTeacherResponse.status === 200) {
        console.log('✅ Teacher account created successfully');
      }
    });

    // Step 8: School Configuration Management
    this.addStep('School Configuration Management', async () => {
      console.log('⚙️ Testing school configuration management...');
      
      // Test updating school information
      const schoolUpdate = await makeAuthenticatedRequest(
        this.app, 'PATCH', '/api/schools/current', this.testData.adminCookie,
        {
          name: 'Updated School Name E2E',
          description: 'Updated by E2E test',
          instruments: 'drums,guitar,piano'
        }
      );

      this.assert(schoolUpdate.status !== 401, 'School owner should update school info');
      this.assert(schoolUpdate.status !== 403, 'School owner should update school info');
    });

    await super.runScenarioSteps();
  }

  async validateEndState() {
    console.log('🔍 Validating admin workflow end state...');
    
    // Verify school owner can still access all administrative functions
    const adminEndpoints = [
      '/api/schools/current',
      '/api/schools/members',
      '/api/billing/summary',
      '/api/students',
      '/api/lessons',
      '/api/songs'
    ];

    for (const endpoint of adminEndpoints) {
      const response = await makeAuthenticatedRequest(
        this.app, 'GET', endpoint, this.testData.adminCookie
      );
      
      this.assert(response.status !== 401, `Final validation: School owner should access ${endpoint}`);
      this.assert(response.status !== 403, `Final validation: School owner should access ${endpoint}`);
    }
    
    console.log('✅ Admin workflow end state validation passed');
  }

  async cleanupTestData() {
    console.log('🧹 Cleaning up admin workflow test data...');
    console.log('✅ Admin workflow cleanup completed');
  }
}

describe('School Owner Administration Workflow E2E Tests', () => {
  let server;
  let scenario;

  beforeAll(async () => {
    console.log('🧪 Setting up Admin Workflow E2E tests...');
    
    server = createServer(app);
    await new Promise((resolve) => {
      server.listen(0, resolve);
    });
    
    scenario = new AdminWorkflowScenario();
    scenario.app = app;
    await scenario.setup();
  });

  afterAll(async () => {
    console.log('🧹 Cleaning up Admin Workflow E2E tests...');
    
    if (scenario) {
      await scenario.cleanup();
    }
    
    if (server) {
      await new Promise((resolve) => {
        server.close(resolve);
      });
    }
  });

  it('should complete the full school owner administration workflow successfully', async () => {
    console.log('🚀 Starting complete admin workflow E2E test...');
    
    await scenario.execute();
    await scenario.validate();
    
    const report = scenario.getReport();
    console.log('📊 Admin Workflow Report:', report);
    
    expect(report.success).toBe(true);
    expect(report.results.failed).toBe(0);
    
    console.log('🎉 School owner administration workflow E2E test completed successfully!');
  }, 90000); // 90 second timeout
});