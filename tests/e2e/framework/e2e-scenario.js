/**
 * MusicDott 2.0 E2E Testing Framework
 * Base scenario class for end-to-end workflow testing
 */

import { storage } from '../../../server/storage-wrapper.js';
import { setupTestEnvironment, cleanupTestData } from '../../utils/test-helpers.js';

export class E2EScenario {
  constructor(name, description) {
    this.name = name;
    this.description = description;
    this.testData = {};
    this.startTime = null;
    this.endTime = null;
    this.steps = [];
    this.results = {
      passed: 0,
      failed: 0,
      errors: []
    };
  }

  /**
   * Setup test environment and data for scenario
   */
  async setup() {
    console.log(`🧪 Setting up E2E scenario: ${this.name}`);
    this.startTime = Date.now();
    
    try {
      await setupTestEnvironment();
      await this.createTestData();
      console.log(`✅ Setup completed for: ${this.name}`);
    } catch (error) {
      console.error(`❌ Setup failed for ${this.name}:`, error);
      throw error;
    }
  }

  /**
   * Execute the complete scenario workflow
   */
  async execute() {
    console.log(`🚀 Executing E2E scenario: ${this.name}`);
    
    try {
      await this.runScenarioSteps();
      console.log(`✅ Execution completed for: ${this.name}`);
    } catch (error) {
      console.error(`❌ Execution failed for ${this.name}:`, error);
      this.results.errors.push(error);
      throw error;
    }
  }

  /**
   * Validate final state after scenario execution
   */
  async validate() {
    console.log(`🔍 Validating E2E scenario: ${this.name}`);
    
    try {
      await this.validateEndState();
      console.log(`✅ Validation passed for: ${this.name}`);
    } catch (error) {
      console.error(`❌ Validation failed for ${this.name}:`, error);
      this.results.errors.push(error);
      throw error;
    }
  }

  /**
   * Cleanup test data and environment
   */
  async cleanup() {
    console.log(`🧹 Cleaning up E2E scenario: ${this.name}`);
    
    try {
      await this.cleanupTestData();
      await cleanupTestData();
      this.endTime = Date.now();
      console.log(`✅ Cleanup completed for: ${this.name}`);
    } catch (error) {
      console.error(`⚠️ Cleanup warning for ${this.name}:`, error);
      // Don't throw cleanup errors
    }
  }

  /**
   * Add a step to the scenario execution
   */
  addStep(name, action) {
    this.steps.push({ name, action });
  }

  /**
   * Execute all scenario steps in sequence
   */
  async runScenarioSteps() {
    for (const step of this.steps) {
      console.log(`📋 Executing step: ${step.name}`);
      try {
        await step.action();
        this.results.passed++;
        console.log(`  ✅ Step passed: ${step.name}`);
      } catch (error) {
        this.results.failed++;
        this.results.errors.push({ step: step.name, error });
        console.error(`  ❌ Step failed: ${step.name}`, error);
        throw error;
      }
    }
  }

  /**
   * Assert condition with descriptive error message
   */
  assert(condition, message) {
    if (!condition) {
      throw new Error(`Assertion failed: ${message}`);
    }
  }

  /**
   * Assert response has expected status code
   */
  assertStatusCode(response, expectedCode, context = '') {
    if (response.status !== expectedCode) {
      throw new Error(
        `${context} Expected status ${expectedCode}, got ${response.status}. ` +
        `Response: ${JSON.stringify(response.body)}`
      );
    }
  }

  /**
   * Assert response contains expected data
   */
  assertResponseContains(response, expectedData, context = '') {
    const body = response.body;
    
    for (const [key, value] of Object.entries(expectedData)) {
      if (body[key] !== value) {
        throw new Error(
          `${context} Expected ${key} to be ${value}, got ${body[key]}. ` +
          `Full response: ${JSON.stringify(body)}`
        );
      }
    }
  }

  /**
   * Get scenario execution report
   */
  getReport() {
    const duration = this.endTime ? this.endTime - this.startTime : null;
    
    return {
      name: this.name,
      description: this.description,
      duration,
      steps: this.steps.length,
      results: this.results,
      success: this.results.failed === 0,
      errors: this.results.errors
    };
  }

  /**
   * Override in subclasses to create scenario-specific test data
   */
  async createTestData() {
    // Default implementation - override in subclasses
  }

  /**
   * Override in subclasses to implement scenario workflow
   */
  async runScenarioSteps() {
    throw new Error('runScenarioSteps must be implemented by subclass');
  }

  /**
   * Override in subclasses to validate scenario end state
   */
  async validateEndState() {
    // Default implementation - override in subclasses
  }

  /**
   * Override in subclasses to cleanup scenario-specific data
   */
  async cleanupTestData() {
    // Default implementation - override in subclasses
  }
}

export default E2EScenario;