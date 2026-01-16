/**
 * Vitest Configuration for MusicDott 2.0 Integration Tests
 */

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Test environment
    environment: 'node',
    
    // Test timeout
    testTimeout: 30000,
    
    // Global setup/teardown
    globalSetup: [],
    
    // Test files pattern
    include: ['tests/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    
    // Exclude patterns
    exclude: [
      'node_modules/**',
      'dist/**',
      'build/**'
    ],
    
    // Reporter options
    reporter: ['verbose', 'json'],
    
    // Coverage options (optional)
    coverage: {
      enabled: false, // Keep lightweight for now
      provider: 'v8',
      reporter: ['text', 'json', 'html']
    },
    
    // Test setup
    setupFiles: [],
    
    // Globals
    globals: false,
    
    // Concurrent test execution
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: true // Run tests sequentially to avoid conflicts
      }
    }
  },
  
  // ESM support
  esbuild: {
    target: 'node14'
  }
});