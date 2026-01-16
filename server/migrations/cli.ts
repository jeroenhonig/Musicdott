#!/usr/bin/env tsx

/**
 * CLI wrapper for MusicDott legacy data migration
 * 
 * Usage:
 *   npm run migrate-legacy                    # Run migration
 *   npm run migrate-legacy -- --dry-run       # Dry run (no changes)
 *   npm run migrate-legacy -- --verbose       # Verbose output
 *   npm run migrate-legacy -- --force         # Force migration even if already done
 *   npm run migrate-legacy -- --data-dir=./custom-data  # Custom data directory
 */

import { LegacyDataMigrator } from './migrate-legacy-data';

function printHelp() {
  console.log(`
MusicDott Legacy Data Migration CLI

DESCRIPTION:
  Migrates imported MusicDott 1.0 data to proper multi-tenant structure
  with schoolId assignments for full multi-tenant isolation.

USAGE:
  npm run migrate-legacy [options]

OPTIONS:
  --dry-run         Preview changes without making them
  --force          Force migration even if data appears already migrated
  --verbose        Show detailed logging during migration
  --data-dir=PATH  Use custom data directory (default: ./data)
  --help           Show this help message

EXAMPLES:
  # Preview what would be migrated (recommended first step)
  npm run migrate-legacy -- --dry-run

  # Run full migration with detailed logging
  npm run migrate-legacy -- --verbose

  # Force re-migration with custom data directory
  npm run migrate-legacy -- --force --data-dir=./backup-data

WHAT IT DOES:
  ✓ Analyzes existing data structure and identifies items needing schoolId
  ✓ Creates default "MusicDott Legacy School" for orphaned data
  ✓ Creates individual teacher schools based on student assignments
  ✓ Assigns students, songs, lessons, schedules to appropriate schools
  ✓ Ensures multi-tenant access control works with migrated data
  ✓ Creates backups before making changes (unless --dry-run)
  ✓ Provides detailed progress reporting and verification

SAFETY:
  - Always creates backups before making changes
  - Dry-run mode available for testing
  - Idempotent - safe to run multiple times
  - Atomic - either completes fully or rolls back
`);
}

async function main() {
  const args = process.argv.slice(2);
  
  // Handle help flag
  if (args.includes('--help') || args.includes('-h')) {
    printHelp();
    process.exit(0);
  }

  const options = {
    dryRun: args.includes('--dry-run'),
    force: args.includes('--force'),
    verbose: args.includes('--verbose'),
    dataDir: args.find(arg => arg.startsWith('--data-dir='))?.split('=')[1]
  };

  console.log('🚀 MusicDott Legacy Data Migration');
  console.log('=====================================');
  
  if (options.dryRun) {
    console.log('📋 DRY RUN MODE - No changes will be made');
  }
  
  if (options.verbose) {
    console.log('🔍 VERBOSE MODE - Detailed logging enabled');
  }
  
  if (options.force) {
    console.log('💪 FORCE MODE - Will migrate even if already done');
  }

  if (options.dataDir) {
    console.log(`📁 Using custom data directory: ${options.dataDir}`);
  }

  console.log('');

  try {
    const migrator = new LegacyDataMigrator(options);
    await migrator.migrate();
    
    console.log('\n🎉 Migration completed successfully!');
    
    if (options.dryRun) {
      console.log('\n💡 To execute the actual migration, run without --dry-run:');
      console.log('   npm run migrate-legacy');
    } else {
      console.log('\n✅ Your MusicDott data is now properly configured for multi-tenant access!');
      console.log('   Teachers can access their assigned students through the platform.');
      console.log('   School owners have access to all school content.');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Migration failed:', error instanceof Error ? error.message : String(error));
    console.error('\n🔧 Troubleshooting:');
    console.error('   • Check that data files exist in the specified directory');
    console.error('   • Ensure you have write permissions to the data directory');
    console.error('   • Try running with --verbose for more detailed error information');
    console.error('   • Use --dry-run to preview changes without making them');
    process.exit(1);
  }
}

main();