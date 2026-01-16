/**
 * MusicDott 2.0 Comprehensive E2E Validation Test
 * Validates the complete end-to-end testing workflow by running all scenarios
 */

// Using Node.js built-in test runner instead of Vitest
import assert from 'assert';
import { createServer } from 'http';
import { app } from '../../server/index.js';
import E2ETestRunner from './e2e-test-runner.js';
import {
  setupTestEnvironment,
  cleanupTestData,
  TEST_USERS
} from '../utils/test-helpers.js';

// Main validation function
export async function runComprehensiveValidation() {
  let server;
  let runner;
  
  console.log('🧪 Setting up Comprehensive E2E Validation...');
  try {
    console.log('🧪 Setting up Comprehensive E2E Validation...');
    
    // Start server for testing
    server = createServer(app);
    await new Promise((resolve) => {
      server.listen(0, resolve);
    });
    
    // Setup test environment
    await setupTestEnvironment();
    
    // Initialize E2E test runner
    runner = new E2ETestRunner();
    
    console.log('✅ Comprehensive E2E Validation setup completed');

    // Run all validation tests
    await validateE2EFramework(runner);
    await runSmokeTestValidation(runner);
    await validateSongAssignmentWorkflow(runner);
    await validateSecurityBoundaries(runner);
    await validateMobileNavigation(runner);
    
    console.log('🎉 All E2E validations completed successfully!');
    
  } catch (error) {
    console.error('❌ E2E validation failed:', error);
    throw error;
  } finally {
    console.log('🧹 Cleaning up Comprehensive E2E Validation...');
    
    if (server) {
      await new Promise((resolve) => {
        server.close(resolve);
      });
    }
    
    await cleanupTestData();
    console.log('✅ Comprehensive E2E Validation cleanup completed');
  }
}

async function validateE2EFramework(runner) {
    console.log('🎯 Validating E2E testing workflow framework...');
    
    // Verify test runner initialization
    assert(runner, 'Runner should be defined');
    assert(runner.scenarios, 'Scenarios should be defined');
    assert(runner.scenarios.length > 0, 'Should have scenarios');
    
    console.log(`✅ E2E Framework initialized with ${runner.scenarios.length} scenarios`);
    
    // Verify all critical scenarios are defined
    const criticalScenarios = runner.scenarios.filter(s => s.priority === 'critical');
    assert(criticalScenarios.length >= 2, 'Should have at least 2 critical scenarios');
    
    console.log(`✅ Found ${criticalScenarios.length} critical scenarios`);
    
    // Verify test data and users are available
    assert(TEST_USERS.STUDENT, 'Student test user should be defined');
    assert(TEST_USERS.TEACHER, 'Teacher test user should be defined');
    assert(TEST_USERS.SCHOOL_OWNER, 'School owner test user should be defined');
    
    console.log('✅ Test users and data properly configured');
    
    console.log('🎉 E2E testing workflow framework validation completed successfully!');
}

  it('should run smoke test (critical scenarios only) to validate core functionality', async () => {
    console.log('💨 Running E2E smoke test to validate core functionality...');
    
    // Run critical scenarios only to validate core system
    const smokeResults = await runner.runSmokeTest();
    
    // Verify smoke test results
    expect(smokeResults).toBeDefined();
    expect(smokeResults.totalScenarios).toBeGreaterThan(0);
    expect(smokeResults.passed).toBeGreaterThan(0);
    
    console.log(`📊 Smoke test results: ${smokeResults.passed}/${smokeResults.totalScenarios} passed`);
    
    // Critical scenarios should all pass
    expect(smokeResults.failed).toBe(0);
    
    console.log('🎉 E2E smoke test validation completed successfully!');
  }, 180000); // 3 minute timeout for smoke test

  it('should demonstrate Stefan\'s critical song assignment workflow is fixed', async () => {
    console.log('🎯 Demonstrating Stefan\'s critical song assignment workflow fix...');
    
    // Run specifically the teacher workflow that includes song assignment
    const songAssignmentResults = await runner.runScenario('Teacher Workflow');
    
    // Verify the workflow ran
    expect(songAssignmentResults).toBeDefined();
    expect(songAssignmentResults.totalScenarios).toBe(1);
    
    // Verify the critical workflow passed (no 401 errors)
    expect(songAssignmentResults.passed).toBe(1);
    expect(songAssignmentResults.failed).toBe(0);
    
    // Verify no authentication errors in the workflow
    const hasAuthErrors = songAssignmentResults.errors.some(error => 
      error.message && (error.message.includes('401') || error.message.includes('403'))
    );
    expect(hasAuthErrors).toBe(false);
    
    console.log('✅ Stefan\'s critical song assignment workflow is confirmed fixed!');
    console.log('🎉 Teachers can now assign songs to students without 401 errors!');
  }, 150000); // 2.5 minute timeout for teacher workflow

  it('should validate user role boundaries and security are properly enforced', async () => {
    console.log('🔒 Validating security boundaries and user role enforcement...');
    
    // Run security boundaries scenario
    const securityResults = await runner.runScenario('Security Boundaries');
    
    // Verify security testing ran
    expect(securityResults).toBeDefined();
    expect(securityResults.totalScenarios).toBe(1);
    
    // Security tests should pass (boundaries properly enforced)
    expect(securityResults.passed).toBe(1);
    expect(securityResults.failed).toBe(0);
    
    console.log('✅ Security boundaries and role enforcement validated!');
    console.log('🛡️ Multi-tenant isolation and cross-role security working correctly!');
  }, 150000); // 2.5 minute timeout for security tests

  it('should validate mobile navigation works for all user roles', async () => {
    console.log('📱 Validating mobile navigation for all user roles...');
    
    // Run mobile navigation scenario
    const mobileResults = await runner.runScenario('Mobile Navigation');
    
    // Verify mobile testing ran
    expect(mobileResults).toBeDefined();
    expect(mobileResults.totalScenarios).toBe(1);
    
    // Mobile navigation should work for all roles
    expect(mobileResults.passed).toBe(1);
    expect(mobileResults.failed).toBe(0);
    
    console.log('✅ Mobile navigation validated for all user roles!');
    console.log('📱 Role-based mobile experience working correctly!');
  }, 120000); // 2 minute timeout for mobile tests

  it('should provide comprehensive E2E workflow execution report', async () => {
    console.log('📊 Generating comprehensive E2E workflow execution report...');
    
    // Run a limited set for final validation report
    const fullResults = await runner.runAllScenarios({
      priorityFilter: 'high', // Run high priority scenarios for final validation
      failFast: false
    });
    
    // Verify comprehensive results
    expect(fullResults).toBeDefined();
    expect(fullResults.totalScenarios).toBeGreaterThan(0);
    expect(fullResults.startTime).toBeDefined();
    expect(fullResults.endTime).toBeDefined();
    
    // Calculate success metrics
    const passRate = (fullResults.passed / fullResults.totalScenarios * 100);
    console.log(`📈 E2E Workflow Pass Rate: ${passRate.toFixed(1)}%`);
    
    // For validation, we expect at least 80% pass rate
    expect(passRate).toBeGreaterThanOrEqual(80);
    
    // Verify scenario breakdown is available
    expect(fullResults.scenarioResults).toBeDefined();
    expect(fullResults.scenarioResults.length).toBeGreaterThan(0);
    
    console.log('✅ Comprehensive E2E workflow execution report generated!');
    console.log(`🎯 Executed ${fullResults.totalScenarios} scenarios in ${(fullResults.endTime - fullResults.startTime) / 1000}s`);
    
    return fullResults;
  }, 300000); // 5 minute timeout for comprehensive validation
});