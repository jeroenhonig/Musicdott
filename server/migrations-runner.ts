import { pool } from './db';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface Migration {
  id: number;
  name: string;
  executed_at: Date;
}

/**
 * Migration runner for PostgreSQL
 * Runs SQL migrations in order and tracks execution in migrations table
 */
export class MigrationRunner {
  private migrationsDir: string;

  constructor() {
    // Migrations are stored in server/migrations/sql
    this.migrationsDir = path.join(__dirname, 'migrations', 'sql');
  }

  /**
   * Ensure migrations tracking table exists
   */
  private async ensureMigrationsTable(): Promise<void> {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }

  /**
   * Get list of executed migrations
   */
  private async getExecutedMigrations(): Promise<Set<string>> {
    const result = await pool.query<Migration>(
      'SELECT name FROM schema_migrations ORDER BY id'
    );
    return new Set(result.rows.map(row => row.name));
  }

  /**
   * Get list of migration files from filesystem
   */
  private getMigrationFiles(): string[] {
    if (!fs.existsSync(this.migrationsDir)) {
      console.log(`Migrations directory not found: ${this.migrationsDir}`);
      return [];
    }

    return fs.readdirSync(this.migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort(); // Sort to ensure migrations run in order
  }

  /**
   * Execute a single migration file
   */
  private async executeMigration(filename: string): Promise<void> {
    const filepath = path.join(this.migrationsDir, filename);
    const sql = fs.readFileSync(filepath, 'utf-8');

    console.log(`📝 Executing migration: ${filename}`);

    // Execute migration in a transaction
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Execute the migration SQL
      await client.query(sql);

      // Record migration as executed
      await client.query(
        'INSERT INTO schema_migrations (name) VALUES ($1)',
        [filename]
      );

      await client.query('COMMIT');
      console.log(`✅ Migration completed: ${filename}`);
    } catch (error) {
      await client.query('ROLLBACK');
      console.error(`❌ Migration failed: ${filename}`, error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Run all pending migrations
   */
  async runMigrations(): Promise<void> {
    console.log('🔄 Starting database migration process...');

    try {
      // Ensure migrations tracking table exists
      await this.ensureMigrationsTable();

      // Get executed migrations
      const executedMigrations = await this.getExecutedMigrations();
      console.log(`📊 Found ${executedMigrations.size} executed migrations`);

      // Get migration files
      const migrationFiles = this.getMigrationFiles();
      console.log(`📁 Found ${migrationFiles.length} migration files`);

      // Filter pending migrations
      const pendingMigrations = migrationFiles.filter(
        file => !executedMigrations.has(file)
      );

      if (pendingMigrations.length === 0) {
        console.log('✅ No pending migrations');
        return;
      }

      console.log(`🚀 Running ${pendingMigrations.length} pending migrations...`);

      // Execute pending migrations in order
      for (const migration of pendingMigrations) {
        await this.executeMigration(migration);
      }

      console.log('✅ All migrations completed successfully');
    } catch (error) {
      console.error('❌ Migration process failed:', error);
      throw error;
    }
  }

  /**
   * Get migration status
   */
  async getStatus(): Promise<{
    executed: string[];
    pending: string[];
  }> {
    await this.ensureMigrationsTable();

    const executedMigrations = await this.getExecutedMigrations();
    const migrationFiles = this.getMigrationFiles();

    const pending = migrationFiles.filter(
      file => !executedMigrations.has(file)
    );

    return {
      executed: Array.from(executedMigrations),
      pending
    };
  }
}

// Export singleton instance
export const migrationRunner = new MigrationRunner();
