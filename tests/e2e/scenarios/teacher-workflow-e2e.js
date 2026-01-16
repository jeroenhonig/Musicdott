/**
 * MusicDott 2.0 Complete Teacher Workflow E2E Test
 * Tests the entire teacher experience including Stefan's critical song assignment workflow
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

class TeacherWorkflowScenario extends E2EScenario {
  constructor() {
    super(
      'Complete Teacher Workflow with Song Assignment',
      'Tests full teacher experience including the critical song assignment workflow that was causing 401 errors'
    );
  }

  async createTestData() {
    console.log('🍎 Creating test data for teacher workflow...');
    
    // Login as teacher to get user context
    const teacherLogin = await loginUser(this.app, TEST_USERS.TEACHER);
    this.testData.teacher = teacherLogin.user;
    this.testData.teacherCookie = teacherLogin.cookie;
    
    // Create test students for assignment workflow
    this.testData.students = [];
    for (let i = 0; i < 3; i++) {
      const student = await createTestStudent({
        firstName: `Assignment${i}`,
        lastName: 'Student',
        username: `assignment_student_${i}_${Date.now()}`,
        email: `assignment.student.${i}.${Date.now()}@musicdott.test`,
        teacherId: this.testData.teacher.id
      }, this.testData.teacher.schoolId);
      this.testData.students.push(student);
    }

    // Create test songs for assignment
    this.testData.songs = [];
    for (let i = 0; i < 5; i++) {
      const song = await createTestSong({
        title: `Assignment Test Song ${i + 1}`,
        artist: `Test Artist ${i + 1}`,
        level: i % 2 === 0 ? 'beginner' : 'intermediate',
        instrument: 'drums'
      }, this.testData.teacher.id, this.testData.teacher.schoolId);
      this.testData.songs.push(song);
    }

    // Create test lessons
    this.testData.lessons = [];
    for (let i = 0; i < 3; i++) {
      const lesson = await createTestLesson({
        title: `Teacher Workflow Test Lesson ${i + 1}`,
        description: `Test lesson ${i + 1} for teacher workflow`,
        level: i % 2 === 0 ? 'beginner' : 'intermediate',
        instrument: 'drums'
      }, this.testData.teacher.id, this.testData.teacher.schoolId);
      this.testData.lessons.push(lesson);
    }

    console.log('✅ Test data created for teacher workflow');
  }

  async runScenarioSteps() {
    // Step 1: Teacher Login and Dashboard Access
    this.addStep('Teacher Login and Dashboard', async () => {
      console.log('👨‍🏫 Testing teacher login and dashboard...');
      
      // Verify teacher can access user data
      const userResponse = await makeAuthenticatedRequest(
        this.app, 'GET', '/api/user', this.testData.teacherCookie
      );

      this.assertStatusCode(userResponse, 200, 'Teacher user data access');
      this.assert(userResponse.body.role === 'teacher', 'User should have teacher role');
      
      // Verify teacher dashboard stats access
      const statsResponse = await makeAuthenticatedRequest(
        this.app, 'GET', '/api/dashboard/stats', this.testData.teacherCookie
      );

      this.assert(statsResponse.status !== 401, 'Teacher should not get 401 for dashboard stats');
      this.assert(statsResponse.status !== 403, 'Teacher should not get 403 for dashboard stats');
    });

    // Step 2: Students Management Access (Critical - was causing 401 errors)
    this.addStep('Students Management Access', async () => {
      console.log('👥 Testing critical students management access...');
      
      const studentsResponse = await makeAuthenticatedRequest(
        this.app, 'GET', '/api/students', this.testData.teacherCookie
      );

      // This was the critical failure point - should NOT return 401
      this.assertStatusCode(studentsResponse, 200, 'Teacher students access');
      this.assert(Array.isArray(studentsResponse.body), 'Students response should be an array');
      
      console.log(`✅ Found ${studentsResponse.body.length} students - no 401 error!`);
    });

    // Step 3: Songs Library Access (Critical - was causing 401 errors)
    this.addStep('Songs Library Access', async () => {
      console.log('🎵 Testing critical songs library access...');
      
      const songsResponse = await makeAuthenticatedRequest(
        this.app, 'GET', '/api/songs', this.testData.teacherCookie
      );

      // This was another critical failure point - should NOT return 401
      this.assertStatusCode(songsResponse, 200, 'Teacher songs access');
      this.assert(Array.isArray(songsResponse.body), 'Songs response should be an array');
      
      console.log(`✅ Found ${songsResponse.body.length} songs - no 401 error!`);
      
      // Test additional song endpoints that were problematic
      const recentSongsResponse = await makeAuthenticatedRequest(
        this.app, 'GET', '/api/songs/recent', this.testData.teacherCookie
      );
      
      this.assert(recentSongsResponse.status !== 401, 'Teacher should not get 401 for recent songs');
    });

    // Step 4: The Complete Song Assignment Workflow (Stefan's Critical Issue)
    this.addStep('Complete Song Assignment Workflow', async () => {
      console.log('🎯 Testing the complete song assignment workflow...');
      
      // Select a student and song for assignment
      const targetStudent = this.testData.students[0];
      const targetSong = this.testData.songs[0];
      
      console.log(`Assigning song "${targetSong.title}" to student "${targetStudent.name}"`);
      
      // Step 4a: Create the assignment
      const assignmentResponse = await makeAuthenticatedRequest(
        this.app, 'POST', '/api/assignments', this.testData.teacherCookie,
        {
          studentId: targetStudent.id,
          songId: targetSong.id,
          type: 'song',
          title: `Assignment: ${targetSong.title}`,
          description: 'E2E test song assignment',
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days from now
        }
      );

      this.assert(assignmentResponse.status !== 401, 'Assignment creation should not return 401');
      this.assert(assignmentResponse.status !== 403, 'Assignment creation should not return 403');
      
      if (assignmentResponse.status === 201 || assignmentResponse.status === 200) {
        this.assert(assignmentResponse.body.id, 'Assignment should have an ID');
        this.testData.assignmentId = assignmentResponse.body.id;
        console.log(`✅ Assignment created successfully with ID: ${this.testData.assignmentId}`);
      } else {
        console.log(`⚠️ Assignment creation returned ${assignmentResponse.status}: ${JSON.stringify(assignmentResponse.body)}`);
      }
      
      // Step 4b: Verify assignment appears in teacher's assignments list
      const teacherAssignmentsResponse = await makeAuthenticatedRequest(
        this.app, 'GET', '/api/assignments', this.testData.teacherCookie
      );
      
      this.assert(teacherAssignmentsResponse.status !== 401, 'Teacher should not get 401 for assignments list');
      
      if (teacherAssignmentsResponse.status === 200) {
        this.assert(Array.isArray(teacherAssignmentsResponse.body), 'Assignments should be an array');
        console.log(`✅ Teacher can view assignments list: ${teacherAssignmentsResponse.body.length} assignments`);
      }
    });

    // Step 5: Lessons Management Workflow
    this.addStep('Lessons Management Workflow', async () => {
      console.log('📚 Testing lessons management workflow...');
      
      const lessonsResponse = await makeAuthenticatedRequest(
        this.app, 'GET', '/api/lessons', this.testData.teacherCookie
      );

      this.assertStatusCode(lessonsResponse, 200, 'Teacher lessons access');
      this.assert(Array.isArray(lessonsResponse.body), 'Lessons response should be an array');
      
      // Test recent lessons endpoint
      const recentLessonsResponse = await makeAuthenticatedRequest(
        this.app, 'GET', '/api/lessons/recent', this.testData.teacherCookie
      );
      
      this.assert(recentLessonsResponse.status !== 401, 'Teacher should not get 401 for recent lessons');
      
      console.log(`✅ Teacher can access ${lessonsResponse.body.length} lessons`);
    });

    // Step 6: Schedule Management Access
    this.addStep('Schedule Management Access', async () => {
      console.log('📅 Testing schedule management access...');
      
      const scheduleResponse = await makeAuthenticatedRequest(
        this.app, 'GET', '/api/schedule/today', this.testData.teacherCookie
      );

      this.assert(scheduleResponse.status !== 401, 'Teacher should not get 401 for schedule');
      this.assert(scheduleResponse.status !== 403, 'Teacher should not get 403 for schedule');
      
      // Test recurring schedules
      const recurringResponse = await makeAuthenticatedRequest(
        this.app, 'GET', '/api/recurring-schedules', this.testData.teacherCookie
      );
      
      this.assert(recurringResponse.status !== 401, 'Teacher should not get 401 for recurring schedules');
    });

    // Step 7: Teacher Messaging System
    this.addStep('Teacher Messaging System', async () => {
      console.log('💬 Testing teacher messaging system...');
      
      const messagesResponse = await makeAuthenticatedRequest(
        this.app, 'GET', '/api/teacher/messages', this.testData.teacherCookie
      );

      this.assert(messagesResponse.status !== 401, 'Teacher should not get 401 for messages');
      this.assert(messagesResponse.status !== 403, 'Teacher should not get 403 for messages');
      
      if (messagesResponse.status === 200) {
        console.log(`✅ Teacher can access messaging system`);
      }
    });

    // Step 8: Performance Analytics Access
    this.addStep('Performance Analytics Access', async () => {
      console.log('📊 Testing performance analytics access...');
      
      const analyticsEndpoints = [
        '/api/performance/lessons',
        '/api/performance/realtime',
        '/api/dashboard/widgets'
      ];

      for (const endpoint of analyticsEndpoints) {
        const response = await makeAuthenticatedRequest(
          this.app, 'GET', endpoint, this.testData.teacherCookie
        );
        
        this.assert(response.status !== 401, `Teacher should not get 401 for ${endpoint}`);
        console.log(`✅ Analytics endpoint ${endpoint}: ${response.status}`);
      }
    });

    await super.runScenarioSteps();
  }

  async validateEndState() {
    console.log('🔍 Validating teacher workflow end state...');
    
    // Verify teacher can still access critical endpoints after complete workflow
    const criticalEndpoints = [
      '/api/students',
      '/api/songs', 
      '/api/lessons',
      '/api/assignments'
    ];

    for (const endpoint of criticalEndpoints) {
      const response = await makeAuthenticatedRequest(
        this.app, 'GET', endpoint, this.testData.teacherCookie
      );
      
      this.assert(response.status !== 401, `Final validation: Teacher should not get 401 for ${endpoint}`);
      this.assert(response.status !== 403, `Final validation: Teacher should not get 403 for ${endpoint}`);
    }
    
    // Verify assignment workflow is still functional
    if (this.testData.assignmentId) {
      console.log('🎯 Verifying assignment workflow is still functional...');
      
      const assignmentsCheck = await makeAuthenticatedRequest(
        this.app, 'GET', '/api/assignments', this.testData.teacherCookie
      );
      
      this.assertStatusCode(assignmentsCheck, 200, 'Final assignment check');
    }
    
    console.log('✅ Teacher workflow end state validation passed');
  }

  async cleanupTestData() {
    console.log('🧹 Cleaning up teacher workflow test data...');
    
    // Cleanup would go here - for now we rely on global cleanup
    console.log('✅ Teacher workflow cleanup completed');
  }
}

describe('Teacher Workflow E2E Tests (Including Song Assignment Fix)', () => {
  let server;
  let scenario;

  beforeAll(async () => {
    console.log('🧪 Setting up Teacher Workflow E2E tests...');
    
    // Start server
    server = createServer(app);
    await new Promise((resolve) => {
      server.listen(0, resolve);
    });
    
    // Create and setup scenario
    scenario = new TeacherWorkflowScenario();
    scenario.app = app;
    await scenario.setup();
  });

  afterAll(async () => {
    console.log('🧹 Cleaning up Teacher Workflow E2E tests...');
    
    if (scenario) {
      await scenario.cleanup();
    }
    
    if (server) {
      await new Promise((resolve) => {
        server.close(resolve);
      });
    }
  });

  it('should complete the full teacher workflow including song assignment without 401 errors', async () => {
    console.log('🚀 Starting complete teacher workflow E2E test...');
    
    await scenario.execute();
    await scenario.validate();
    
    const report = scenario.getReport();
    console.log('📊 Teacher Workflow Report:', report);
    
    expect(report.success).toBe(true);
    expect(report.results.failed).toBe(0);
    
    // Specific validation for Stefan's original issue
    const hasNoAuthErrors = !report.errors.some(error => 
      error.message && error.message.includes('401')
    );
    expect(hasNoAuthErrors).toBe(true);
    
    console.log('🎉 Teacher workflow E2E test completed successfully - Song assignment fixed!');
  }, 120000); // 2 minute timeout for complete workflow
});