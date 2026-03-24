import fs from "fs/promises";
import path from "path";
import { pool, isDatabaseAvailable } from "./db";

const MIGRATIONS_DIR = path.join(process.cwd(), "server", "migrations", "sql");

export interface MigrationStatus {
  available: boolean;
  migrationsExecuted: string[];
  migrationsPending: string[];
}

async function ensureMigrationTable() {
  if (!pool) {
    throw new Error("Database pool is unavailable.");
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id SERIAL PRIMARY KEY,
      file_name TEXT NOT NULL UNIQUE,
      applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
    )
  `);
}

async function listMigrationFiles(): Promise<string[]> {
  const entries = await fs.readdir(MIGRATIONS_DIR, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".sql"))
    .map((entry) => entry.name)
    .sort();
}

async function getExecutedMigrations(): Promise<Set<string>> {
  if (!pool) {
    throw new Error("Database pool is unavailable.");
  }

  const result = await pool.query<{ file_name: string }>(
    "SELECT file_name FROM schema_migrations ORDER BY file_name ASC",
  );
  return new Set(result.rows.map((row) => row.file_name));
}

export async function getMigrationStatus(): Promise<MigrationStatus> {
  if (!isDatabaseAvailable || !pool) {
    return {
      available: false,
      migrationsExecuted: [],
      migrationsPending: [],
    };
  }

  await ensureMigrationTable();
  const [files, executed] = await Promise.all([
    listMigrationFiles(),
    getExecutedMigrations(),
  ]);

  return {
    available: true,
    migrationsExecuted: files.filter((file) => executed.has(file)),
    migrationsPending: files.filter((file) => !executed.has(file)),
  };
}

export async function runPendingMigrations(): Promise<MigrationStatus> {
  if (!isDatabaseAvailable || !pool) {
    return {
      available: false,
      migrationsExecuted: [],
      migrationsPending: [],
    };
  }

  await ensureMigrationTable();
  const [files, executed] = await Promise.all([
    listMigrationFiles(),
    getExecutedMigrations(),
  ]);

  const pendingFiles = files.filter((file) => !executed.has(file));
  if (pendingFiles.length === 0) {
    return {
      available: true,
      migrationsExecuted: files,
      migrationsPending: [],
    };
  }

  const client = await pool.connect();
  try {
    for (const fileName of pendingFiles) {
      const filePath = path.join(MIGRATIONS_DIR, fileName);
      const sql = await fs.readFile(filePath, "utf8");

      await client.query("BEGIN");
      await client.query(sql);
      await client.query(
        "INSERT INTO schema_migrations (file_name) VALUES ($1) ON CONFLICT (file_name) DO NOTHING",
        [fileName],
      );
      await client.query("COMMIT");
    }
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }

  return getMigrationStatus();
}

export const migrationRunner = {
  getStatus: getMigrationStatus,
  runPendingMigrations,
};
