#!/usr/bin/env tsx

/**
 * Backfill Script: Create User Accounts for Existing Students
 * 
 * This script creates user accounts for students imported from MusicDott 1.0
 * who don't yet have associated user accounts. It should be run after the
 * student import process is complete.
 * 
 * Usage:
 *   npx tsx scripts/backfill-student-accounts.ts [schoolId]
 *   npm run backfill-accounts [schoolId]
 * 
 * Arguments:
 *   schoolId - Optional school ID to backfill (defaults to 1)
 */

import { storage } from '../server/storage-wrapper';
import { backfillStudentAccounts } from '../server/services/student-accounts';

interface BackfillOptions {
  schoolId?: number;
  dryRun?: boolean;
  verbose?: boolean;
}

async function parseCommandLineArgs(): Promise<BackfillOptions> {
  const args = process.argv.slice(2);
  const options: BackfillOptions = {
    schoolId: 1, // Default school ID
    dryRun: false,
    verbose: false
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === '--dry-run') {
      options.dryRun = true;
    } else if (arg === '--verbose' || arg === '-v') {
      options.verbose = true;
    } else if (arg === '--help' || arg === '-h') {
      printUsage();
      process.exit(0);
    } else if (!isNaN(parseInt(arg))) {
      options.schoolId = parseInt(arg);
    }
  }

  return options;
}

function printUsage(): void {
  console.log(`
Backfill Student Accounts Script

Creates user accounts for students who don't have them yet.

Usage:
  npx tsx scripts/backfill-student-accounts.ts [options] [schoolId]

Arguments:
  schoolId        School ID to process (default: 1)

Options:
  --dry-run       Show what would be done without making changes
  --verbose, -v   Enable verbose logging
  --help, -h      Show this help message

Examples:
  npx tsx scripts/backfill-student-accounts.ts
  npx tsx scripts/backfill-student-accounts.ts 2
  npx tsx scripts/backfill-student-accounts.ts --dry-run --verbose 1
`);
}

async function validateSchool(schoolId: number): Promise<boolean> {
  try {
    const schools = await storage.getSchools();
    const school = schools.find(s => s.id === schoolId);
    
    if (!school) {
      console.error(`❌ School ${schoolId} not found`);
      console.log('Available schools:');
      schools.forEach(s => console.log(`  - ${s.id}: ${s.name}`));
      return false;
    }
    
    console.log(`✅ Processing school: ${school.name} (ID: ${schoolId})`);
    return true;
  } catch (error) {
    console.error('❌ Failed to validate school:', error);
    return false;
  }
}

async function runDryRun(schoolId: number): Promise<void> {
  console.log('🔍 DRY RUN MODE - No changes will be made\n');
  
  try {
    // Get all students in school
    const allStudents = await storage.getStudents();
    const schoolStudents = allStudents.filter(s => s.schoolId === schoolId);
    
    // Filter students without user accounts
    const studentsNeedingAccounts = schoolStudents.filter(s => !s.userId);
    
    console.log(`📊 Analysis Results:`);
    console.log(`  Total students in school: ${schoolStudents.length}`);
    console.log(`  Students with accounts: ${schoolStudents.length - studentsNeedingAccounts.length}`);
    console.log(`  Students needing accounts: ${studentsNeedingAccounts.length}`);
    
    if (studentsNeedingAccounts.length > 0) {
      console.log(`\n👥 Students that would get accounts:`);
      studentsNeedingAccounts.forEach((student, index) => {
        console.log(`  ${index + 1}. ${student.firstName} ${student.lastName} (${student.email})`);
      });
    } else {
      console.log(`\n✅ All students already have accounts!`);
    }
    
  } catch (error) {
    console.error('❌ Dry run failed:', error);
    throw error;
  }
}

async function runBackfill(schoolId: number, verbose: boolean): Promise<void> {
  console.log('🚀 Starting account backfill process...\n');
  
  try {
    const result = await backfillStudentAccounts(schoolId);
    
    console.log('📊 Backfill Results:');
    console.log(`  Total students processed: ${result.processed}`);
    console.log(`  Accounts created: ${result.created}`);
    console.log(`  Students skipped (already had accounts): ${result.skipped}`);
    console.log(`  Failed: ${result.failed}`);
    
    if (result.errors.length > 0) {
      console.log(`\n❌ Errors encountered:`);
      result.errors.forEach((error, index) => {
        console.log(`  ${index + 1}. Student ${error.studentId}: ${error.error}`);
      });
    }
    
    if (result.created > 0) {
      console.log(`\n✅ Successfully created ${result.created} student accounts!`);
      console.log(`🔑 Default password: "Drumles2025!" (students must change on first login)`);
    } else {
      console.log(`\n✅ No new accounts needed - all students already have accounts!`);
    }
    
  } catch (error) {
    console.error('❌ Backfill failed:', error);
    throw error;
  }
}

async function main(): Promise<void> {
  try {
    console.log('🎵 MusicDott 2.0 Student Account Backfill\n');
    
    const options = await parseCommandLineArgs();
    
    if (options.verbose) {
      console.log('🔧 Configuration:');
      console.log(`  School ID: ${options.schoolId}`);
      console.log(`  Dry Run: ${options.dryRun}`);
      console.log(`  Verbose: ${options.verbose}\n`);
    }
    
    // Initialize storage
    console.log('📚 Initializing storage...');
    await storage.initialize();
    console.log('✅ Storage initialized\n');
    
    // Validate school exists
    if (!await validateSchool(options.schoolId!)) {
      process.exit(1);
    }
    
    // Run process
    if (options.dryRun) {
      await runDryRun(options.schoolId!);
    } else {
      await runBackfill(options.schoolId!, options.verbose!);
    }
    
    console.log('\n🎉 Process completed successfully!');
    
  } catch (error) {
    console.error('\n💥 Process failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}