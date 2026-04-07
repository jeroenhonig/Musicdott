/**
 * CLI entry point for the drumschool JSON import.
 *
 * Usage:
 *   npx tsx server/run-import.ts [path-to-export.json]
 *
 * Defaults to: /Users/stefanvandebrug/Downloads/drumschool-export-2026-04-07.json
 */

import path from "path";
import { Pool } from "pg";
import { importDrumschoolJson } from "./import-drumschool-json";

const exportFile =
  process.argv[2] ??
  path.join(
    process.env.HOME ?? "/Users/stefanvandebrug",
    "Downloads",
    "drumschool-export-2026-04-07.json"
  );

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("❌ DATABASE_URL environment variable is not set.");
  process.exit(1);
}

const pool = new Pool({
  connectionString: databaseUrl,
  connectionTimeoutMillis: 10000,
  max: 5,
});

async function main() {
  try {
    await importDrumschoolJson(exportFile, pool);
  } catch (err) {
    console.error("\n❌ Import failed:", err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
