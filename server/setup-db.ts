import { pool } from './db';
import { migrationRunner } from './migrations-runner';
import { bootstrapAdmin } from './bootstrap-admin';
import { seedAchievements } from './seed-achievements';

/**
 * Database setup and initialization
 * Runs migrations, bootstraps admin, and seeds data
 */
export async function setupDatabase() {
  console.log('🔧 Starting database setup...');

  try {
    // 1. Test database connection
    console.log('📡 Testing database connection...');
    try {
      await pool.query('SELECT 1');
      console.log('✅ Database connection successful');
    } catch (error) {
      console.error('❌ Database connection failed:', error);
      throw new Error('Cannot connect to database');
    }

    // 2. Set search_path to public schema for all connections
    console.log('🔧 Setting search_path to public schema...');
    await pool.query('SET search_path TO public');
    console.log('✅ Search path configured');

    // 3. Run migrations
    console.log('🔄 Running database migrations...');
    await migrationRunner.runMigrations();
    console.log('✅ Migrations completed');

    // 4. Bootstrap admin user and default school
    console.log('👤 Bootstrapping admin user...');
    await bootstrapAdmin();
    console.log('✅ Admin bootstrap completed');

    // 5. Seed achievement definitions
    console.log('🌱 Seeding achievement definitions...');
    await seedAchievements();
    console.log('✅ Achievement seeding completed');

    // 6. Verify setup
    const status = await getDatabaseStatus();
    console.log('📊 Database status:', status);

    console.log('✅ Database setup completed successfully!');
    return {
      success: true,
      message: 'Database setup completed successfully',
      status
    };
  } catch (error) {
    console.error('❌ Database setup failed:', error);
    return {
      success: false,
      message: 'Database setup failed',
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Get database status information
 */
export async function getDatabaseStatus() {
  try {
    // Get migration status
    const migrationStatus = await migrationRunner.getStatus();

    // Get table count
    const tablesResult = await pool.query(`
      SELECT COUNT(*) as count
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
    `);

    // Get admin user count
    const adminResult = await pool.query(`
      SELECT COUNT(*) as count
      FROM users
      WHERE role = 'admin'
    `);

    // Get achievement count
    const achievementResult = await pool.query(`
      SELECT COUNT(*) as count
      FROM achievement_definitions
    `);

    return {
      connected: true,
      schema: 'public',
      tablesCount: parseInt(tablesResult.rows[0].count),
      migrationsExecuted: migrationStatus.executed.length,
      migrationsPending: migrationStatus.pending.length,
      adminUsers: parseInt(adminResult.rows[0].count),
      achievementDefinitions: parseInt(achievementResult.rows[0].count),
    };
  } catch (error) {
    console.error('Failed to get database status:', error);
    return {
      connected: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Legacy compatibility function
 * @deprecated Use setupDatabase() instead
 */
export async function verifyDatabaseSetup() {
  console.warn('⚠️  verifyDatabaseSetup() is deprecated, use setupDatabase() instead');
  return setupDatabase();
}
