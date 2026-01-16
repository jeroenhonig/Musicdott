/**
 * MusicDott 2.0 E2E Test Runner
 * Orchestrates execution of all end-to-end test scenarios
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class E2ETestRunner {
  constructor() {
    this.scenarios = [
      {
        name: 'Student Journey E2E',
        file: 'scenarios/student-journey-e2e.js',
        description: 'Complete student user experience',
        priority: 'high',
        estimatedDuration: 60000
      },
      {
        name: 'Teacher Workflow E2E',
        file: 'scenarios/teacher-workflow-e2e.js',
        description: 'Complete teacher workflow including song assignment',
        priority: 'critical',
        estimatedDuration: 120000
      },
      {
        name: 'Admin Workflow E2E',
        file: 'scenarios/admin-workflow-e2e.js',
        description: 'School owner administration functionality',
        priority: 'high',
        estimatedDuration: 90000
      },
      {
        name: 'Security Boundaries E2E',
        file: 'scenarios/security-boundaries-e2e.js',
        description: 'Cross-role security and multi-tenant isolation',
        priority: 'critical',
        estimatedDuration: 120000
      },
      {
        name: 'Mobile Navigation E2E',
        file: 'scenarios/mobile-navigation-e2e.js',
        description: 'Role-based mobile navigation',
        priority: 'medium',
        estimatedDuration: 90000
      }
    ];
    
    this.results = {
      startTime: null,
      endTime: null,
      totalScenarios: this.scenarios.length,
      passed: 0,
      failed: 0,
      errors: [],
      scenarioResults: []
    };
  }

  /**
   * Run all E2E test scenarios
   */
  async runAllScenarios(options = {}) {
    console.log('🚀 Starting MusicDott 2.0 E2E Test Suite');
    console.log('=' .repeat(80));
    
    this.results.startTime = Date.now();
    
    const {
      parallel = false,
      priorityFilter = null,
      scenarioFilter = null,
      failFast = false
    } = options;

    let scenariosToRun = this.scenarios;
    
    // Apply filters
    if (priorityFilter) {
      scenariosToRun = scenariosToRun.filter(s => s.priority === priorityFilter);
      console.log(`📌 Running ${priorityFilter} priority scenarios only`);
    }
    
    if (scenarioFilter) {
      scenariosToRun = scenariosToRun.filter(s => 
        s.name.toLowerCase().includes(scenarioFilter.toLowerCase())
      );
      console.log(`🔍 Running scenarios matching: ${scenarioFilter}`);
    }

    console.log(`📋 Total scenarios to run: ${scenariosToRun.length}`);
    console.log('');

    if (parallel) {
      await this.runScenariosInParallel(scenariosToRun, failFast);
    } else {
      await this.runScenariosSequentially(scenariosToRun, failFast);
    }

    this.results.endTime = Date.now();
    this.generateReport();
    
    return this.results;
  }

  /**
   * Run scenarios one by one (default)
   */
  async runScenariosSequentially(scenarios, failFast) {
    console.log('📅 Running scenarios sequentially...');
    
    for (const scenario of scenarios) {
      console.log(`\n🧪 Running: ${scenario.name}`);
      console.log(`📝 ${scenario.description}`);
      console.log(`⏱️ Estimated duration: ${scenario.estimatedDuration / 1000}s`);
      console.log('-'.repeat(60));
      
      const result = await this.runSingleScenario(scenario);
      this.results.scenarioResults.push(result);
      
      if (result.success) {
        this.results.passed++;
        console.log(`✅ ${scenario.name} PASSED`);
      } else {
        this.results.failed++;
        console.log(`❌ ${scenario.name} FAILED`);
        this.results.errors.push(...result.errors);
        
        if (failFast) {
          console.log('🛑 Fail-fast enabled, stopping execution');
          break;
        }
      }
    }
  }

  /**
   * Run scenarios in parallel (experimental)
   */
  async runScenariosInParallel(scenarios, failFast) {
    console.log('⚡ Running scenarios in parallel...');
    
    const promises = scenarios.map(scenario => this.runSingleScenario(scenario));
    const results = await Promise.allSettled(promises);
    
    results.forEach((result, index) => {
      const scenario = scenarios[index];
      
      if (result.status === 'fulfilled' && result.value.success) {
        this.results.passed++;
        console.log(`✅ ${scenario.name} PASSED`);
      } else {
        this.results.failed++;
        console.log(`❌ ${scenario.name} FAILED`);
        
        if (result.status === 'rejected') {
          this.results.errors.push({
            scenario: scenario.name,
            error: result.reason
          });
        } else {
          this.results.errors.push(...result.value.errors);
        }
      }
      
      this.results.scenarioResults.push(result.value || {
        scenario: scenario.name,
        success: false,
        error: result.reason
      });
    });
  }

  /**
   * Run a single E2E scenario
   */
  async runSingleScenario(scenario) {
    const startTime = Date.now();
    
    try {
      const scenarioPath = path.join(__dirname, scenario.file);
      
      // Run the scenario test file
      const command = `npx vitest run ${scenarioPath} --reporter=verbose`;
      const output = execSync(command, { 
        encoding: 'utf8',
        timeout: scenario.estimatedDuration + 30000 // Add 30s buffer
      });
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      return {
        scenario: scenario.name,
        success: true,
        duration,
        output,
        errors: []
      };
      
    } catch (error) {
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      return {
        scenario: scenario.name,
        success: false,
        duration,
        output: error.stdout || '',
        error: error.message,
        errors: [{
          scenario: scenario.name,
          error: error.message,
          stdout: error.stdout,
          stderr: error.stderr
        }]
      };
    }
  }

  /**
   * Generate comprehensive test report
   */
  generateReport() {
    const duration = this.results.endTime - this.results.startTime;
    const passRate = (this.results.passed / this.results.totalScenarios * 100).toFixed(1);
    
    console.log('\n' + '='.repeat(80));
    console.log('📊 MusicDott 2.0 E2E Test Results');
    console.log('='.repeat(80));
    
    console.log(`⏱️ Total Duration: ${(duration / 1000).toFixed(1)}s`);
    console.log(`📋 Total Scenarios: ${this.results.totalScenarios}`);
    console.log(`✅ Passed: ${this.results.passed}`);
    console.log(`❌ Failed: ${this.results.failed}`);
    console.log(`📈 Pass Rate: ${passRate}%`);
    
    console.log('\n📋 Scenario Breakdown:');
    console.log('-'.repeat(80));
    
    this.results.scenarioResults.forEach(result => {
      const status = result.success ? '✅ PASS' : '❌ FAIL';
      const duration = result.duration ? `${(result.duration / 1000).toFixed(1)}s` : 'N/A';
      
      console.log(`${status} | ${result.scenario.padEnd(35)} | ${duration}`);
    });
    
    if (this.results.errors.length > 0) {
      console.log('\n❌ Error Details:');
      console.log('-'.repeat(80));
      
      this.results.errors.forEach((error, index) => {
        console.log(`${index + 1}. ${error.scenario || 'Unknown'}: ${error.error || error.message}`);
        
        if (error.stdout) {
          console.log(`   Output: ${error.stdout.substring(0, 200)}...`);
        }
      });
    }
    
    console.log('\n' + '='.repeat(80));
    
    if (this.results.failed === 0) {
      console.log('🎉 All E2E scenarios passed! MusicDott 2.0 is working correctly.');
    } else {
      console.log(`⚠️ ${this.results.failed} scenario(s) failed. Check the errors above.`);
    }
    
    console.log('='.repeat(80));
    
    // Save detailed report to file
    this.saveReportToFile();
  }

  /**
   * Save detailed report to JSON file
   */
  saveReportToFile() {
    const reportDir = path.join(__dirname, 'reports');
    
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportFile = path.join(reportDir, `e2e-report-${timestamp}.json`);
    
    const report = {
      ...this.results,
      timestamp: new Date().toISOString(),
      environment: {
        node: process.version,
        platform: process.platform,
        cwd: process.cwd()
      }
    };
    
    fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
    console.log(`📄 Detailed report saved to: ${reportFile}`);
  }

  /**
   * Run quick smoke test (critical scenarios only)
   */
  async runSmokeTest() {
    console.log('💨 Running E2E Smoke Test (Critical Scenarios Only)');
    
    return await this.runAllScenarios({
      priorityFilter: 'critical',
      failFast: true
    });
  }

  /**
   * Run specific scenario by name
   */
  async runScenario(scenarioName) {
    console.log(`🎯 Running specific scenario: ${scenarioName}`);
    
    return await this.runAllScenarios({
      scenarioFilter: scenarioName
    });
  }
}

// CLI Interface
if (import.meta.url === `file://${process.argv[1]}`) {
  const runner = new E2ETestRunner();
  const args = process.argv.slice(2);
  
  if (args.includes('--smoke')) {
    runner.runSmokeTest();
  } else if (args.includes('--scenario')) {
    const scenarioIndex = args.indexOf('--scenario');
    const scenarioName = args[scenarioIndex + 1];
    runner.runScenario(scenarioName);
  } else if (args.includes('--parallel')) {
    runner.runAllScenarios({ parallel: true });
  } else {
    const options = {
      failFast: args.includes('--fail-fast'),
      parallel: args.includes('--parallel')
    };
    
    runner.runAllScenarios(options);
  }
}

export default E2ETestRunner;