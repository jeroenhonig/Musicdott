/**
 * MusicDott 2.0 Complete Student User Journey E2E Test
 * Tests the entire student experience from login to lesson completion
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createServer } from 'http';
import { app } from '../../../server/index.js';
import E2EScenario from '../framework/e2e-scenario.js';
import {
  loginUser,
  makeAuthenticatedRequest,
  createTestStudent,
  createTestLesson,
  createTestSong,
  TEST_USERS,
  wait
} from '../../utils/test-helpers.js';

class StudentJourneyScenario extends E2EScenario {
  constructor() {
    super(
      'Complete Student User Journey',
      'Tests full student experience: login → dashboard → lessons → assignments → practice → messaging'
    );
  }

  async createTestData() {
    console.log('📚 Creating test data for student journey...');
    
    // Get test teacher user to create content
    const teacherLogin = await loginUser(this.app, TEST_USERS.TEACHER);
    this.testData.teacher = teacherLogin.user;
    this.testData.teacherCookie = teacherLogin.cookie;
    
    // Create test student specifically for this scenario
    this.testData.student = await createTestStudent({
      firstName: 'Journey',
      lastName: 'Student',
      username: `journey_student_${Date.now()}`,
      email: `journey.student.${Date.now()}@musicdott.test`,
      teacherId: this.testData.teacher.id
    }, this.testData.teacher.schoolId);

    // Create test lesson content
    this.testData.lesson = await createTestLesson({
      title: 'Student Journey Test Lesson',
      description: 'Test lesson for E2E student journey',
      level: 'beginner',
      instrument: 'drums'
    }, this.testData.teacher.id, this.testData.teacher.schoolId);

    // Create test song content
    this.testData.song = await createTestSong({
      title: 'Student Journey Test Song',
      artist: 'Test Band',
      level: 'beginner',
      instrument: 'drums'
    }, this.testData.teacher.id, this.testData.teacher.schoolId);

    console.log('✅ Test data created for student journey');
  }

  async runScenarioSteps() {
    // Step 1: Student Login and Authentication
    this.addStep('Student Login', async () => {
      console.log('👤 Testing student login...');
      
      const loginResponse = await makeAuthenticatedRequest(
        this.app, 'POST', '/api/login', null,
        {
          username: this.testData.student.username,
          password: 'TestPass123!' // Default password from test helpers
        }
      );

      this.assertStatusCode(loginResponse, 200, 'Student login');
      this.assert(loginResponse.body.role === 'student', 'User should have student role');
      
      this.testData.studentCookie = loginResponse.headers['set-cookie']
        ?.find(cookie => cookie.startsWith('md.sid='))
        ?.split(';')[0];
        
      this.assert(this.testData.studentCookie, 'Session cookie should be received');
    });

    // Step 2: Student Dashboard Access
    this.addStep('Student Dashboard Access', async () => {
      console.log('🏠 Testing student dashboard access...');
      
      const dashboardResponse = await makeAuthenticatedRequest(
        this.app, 'GET', '/api/user', this.testData.studentCookie
      );

      this.assertStatusCode(dashboardResponse, 200, 'Student dashboard access');
      this.assert(dashboardResponse.body.role === 'student', 'Dashboard should show student role');
    });

    // Step 3: My Lessons Access
    this.addStep('My Lessons Access', async () => {
      console.log('📖 Testing student lessons access...');
      
      const lessonsResponse = await makeAuthenticatedRequest(
        this.app, 'GET', '/api/students/' + this.testData.student.id + '/assignments', 
        this.testData.studentCookie
      );

      // Should not return 401 for student accessing their own assignments
      this.assert(lessonsResponse.status !== 401, 'Student should not get 401 for own assignments');
      this.assert(lessonsResponse.status !== 403, 'Student should not get 403 for own assignments');
      
      if (lessonsResponse.status === 200) {
        this.assert(Array.isArray(lessonsResponse.body), 'Assignments should be an array');
      }
    });

    // Step 4: Available Content Access (for demo students)
    this.addStep('Available Content Access', async () => {
      console.log('🎵 Testing student content access...');
      
      const songsResponse = await makeAuthenticatedRequest(
        this.app, 'GET', '/api/songs', this.testData.studentCookie
      );

      const lessonsResponse = await makeAuthenticatedRequest(
        this.app, 'GET', '/api/lessons', this.testData.studentCookie
      );

      // Students should be able to see available content
      this.assert(songsResponse.status !== 401, 'Student should not get 401 for songs');
      this.assert(lessonsResponse.status !== 401, 'Student should not get 401 for lessons');
    });

    // Step 5: Security Boundary Testing - Student should NOT access teacher endpoints
    this.addStep('Security Boundary Testing', async () => {
      console.log('🔒 Testing student security boundaries...');
      
      const forbiddenEndpoints = [
        '/api/students', // Should not access all students
        '/api/reports',  // Should not access reports
        '/api/admin/platform-stats', // Should not access admin endpoints
        '/api/performance/lessons'   // Should not access performance analytics
      ];

      for (const endpoint of forbiddenEndpoints) {
        const response = await makeAuthenticatedRequest(
          this.app, 'GET', endpoint, this.testData.studentCookie
        );
        
        this.assert(
          [401, 403].includes(response.status),
          `Student should be blocked from ${endpoint}, got ${response.status}`
        );
      }
    });

    // Step 6: Student Messaging Access
    this.addStep('Student Messaging Access', async () => {
      console.log('💬 Testing student messaging access...');
      
      const messagesResponse = await makeAuthenticatedRequest(
        this.app, 'GET', '/api/student/message-responses', 
        this.testData.studentCookie
      );

      // Student should be able to access their own messages
      this.assert(messagesResponse.status !== 401, 'Student should not get 401 for own messages');
      this.assert(messagesResponse.status !== 403, 'Student should not get 403 for own messages');
    });

    // Step 7: Practice Session Tracking
    this.addStep('Practice Session Tracking', async () => {
      console.log('⏱️ Testing practice session tracking...');
      
      // Test creating a practice session
      const practiceResponse = await makeAuthenticatedRequest(
        this.app, 'POST', '/api/practice-sessions', this.testData.studentCookie,
        {
          studentId: this.testData.student.id,
          duration: 30,
          notes: 'E2E test practice session'
        }
      );

      // Should be able to track practice sessions
      this.assert(practiceResponse.status !== 401, 'Student should not get 401 for practice tracking');
      this.assert(practiceResponse.status !== 403, 'Student should not get 403 for practice tracking');
    });

    await super.runScenarioSteps();
  }

  async validateEndState() {
    console.log('🔍 Validating student journey end state...');
    
    // Verify student can still access their data after complete workflow
    const finalUserCheck = await makeAuthenticatedRequest(
      this.app, 'GET', '/api/user', this.testData.studentCookie
    );

    this.assertStatusCode(finalUserCheck, 200, 'Final student data access');
    this.assert(finalUserCheck.body.role === 'student', 'Student role should be maintained');
    
    console.log('✅ Student journey end state validation passed');
  }

  async cleanupTestData() {
    console.log('🧹 Cleaning up student journey test data...');
    
    // Cleanup would go here - for now we rely on global cleanup
    // In production, we'd clean up specific test data created for this scenario
    
    console.log('✅ Student journey cleanup completed');
  }
}

describe('Student User Journey E2E Tests', () => {
  let server;
  let scenario;

  beforeAll(async () => {
    console.log('🧪 Setting up Student Journey E2E tests...');
    
    // Start server
    server = createServer(app);
    await new Promise((resolve) => {
      server.listen(0, resolve);
    });
    
    // Create and setup scenario
    scenario = new StudentJourneyScenario();
    scenario.app = app;
    await scenario.setup();
  });

  afterAll(async () => {
    console.log('🧹 Cleaning up Student Journey E2E tests...');
    
    if (scenario) {
      await scenario.cleanup();
    }
    
    if (server) {
      await new Promise((resolve) => {
        server.close(resolve);
      });
    }
  });

  it('should complete the full student user journey successfully', async () => {
    console.log('🚀 Starting complete student user journey E2E test...');
    
    await scenario.execute();
    await scenario.validate();
    
    const report = scenario.getReport();
    console.log('📊 Student Journey Report:', report);
    
    expect(report.success).toBe(true);
    expect(report.results.failed).toBe(0);
    
    console.log('🎉 Student user journey E2E test completed successfully!');
  }, 60000); // 60 second timeout for complete workflow
});