import { eq } from "drizzle-orm";
import { db, isDatabaseAvailable, pool, performHealthCheck } from "../server/db";
import { lessons, songs } from "../shared/schema";
import { sanitizeContentBlocksForStorage } from "../shared/content-blocks";
import { parseContentBlocks } from "../client/src/utils/content-block-parser";

type Entity = "songs" | "lessons" | "all";

interface CliOptions {
  apply: boolean;
  dryRun: boolean;
  entity: Entity;
  schoolId?: number;
  limit?: number;
}

interface CleanupStats {
  scanned: number;
  changed: number;
  invalidJson: number;
  emptyNormalized: number;
}

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    apply: argv.includes("--apply"),
    dryRun: !argv.includes("--apply"),
    entity: "all",
  };

  for (const arg of argv) {
    if (arg.startsWith("--entity=")) {
      const value = arg.split("=")[1] as Entity;
      if (value === "songs" || value === "lessons" || value === "all") {
        options.entity = value;
      }
    }
    if (arg.startsWith("--schoolId=")) {
      const value = Number(arg.split("=")[1]);
      if (!Number.isNaN(value) && value > 0) options.schoolId = value;
    }
    if (arg.startsWith("--limit=")) {
      const value = Number(arg.split("=")[1]);
      if (!Number.isNaN(value) && value > 0) options.limit = value;
    }
  }

  return options;
}

function safeParseBlocks(value: string | null): { parsed: unknown[]; invalidJson: boolean } {
  if (!value || !value.trim()) return { parsed: [], invalidJson: false };

  try {
    const raw = JSON.parse(value);
    return { parsed: Array.isArray(raw) ? raw : [], invalidJson: false };
  } catch {
    return { parsed: [], invalidJson: true };
  }
}

function normalizeBlocksJson(value: string | null) {
  const { parsed, invalidJson } = safeParseBlocks(value);
  const normalized = sanitizeContentBlocksForStorage(parseContentBlocks(parsed));
  return {
    invalidJson,
    normalized,
    normalizedJson: JSON.stringify(normalized),
  };
}

async function ensureDbReady() {
  await performHealthCheck();
  if (!isDatabaseAvailable || !db) {
    throw new Error("Database is unavailable. Set DATABASE_URL and try again.");
  }
}

async function cleanupSongs(options: CliOptions): Promise<CleanupStats> {
  let query = db
    .select({
      id: songs.id,
      schoolId: songs.schoolId,
      title: songs.title,
      contentBlocks: songs.contentBlocks,
    })
    .from(songs);

  if (options.schoolId) {
    query = query.where(eq(songs.schoolId, options.schoolId)) as typeof query;
  }

  if (options.limit) {
    query = query.limit(options.limit) as typeof query;
  }

  const rows = await query;
  const stats: CleanupStats = { scanned: 0, changed: 0, invalidJson: 0, emptyNormalized: 0 };

  for (const row of rows) {
    stats.scanned++;
    const before = row.contentBlocks ?? "[]";
    const { invalidJson, normalized, normalizedJson } = normalizeBlocksJson(row.contentBlocks);

    if (invalidJson) stats.invalidJson++;
    if (normalized.length === 0 && before.trim() !== "[]") stats.emptyNormalized++;

    if (before !== normalizedJson) {
      stats.changed++;
      if (options.apply) {
        await db
          .update(songs)
          .set({ contentBlocks: normalizedJson, updatedAt: new Date() })
          .where(eq(songs.id, row.id));
      }
    }
  }

  return stats;
}

async function cleanupLessons(options: CliOptions): Promise<CleanupStats> {
  let query = db
    .select({
      id: lessons.id,
      schoolId: lessons.schoolId,
      title: lessons.title,
      contentBlocks: lessons.contentBlocks,
    })
    .from(lessons);

  if (options.schoolId) {
    query = query.where(eq(lessons.schoolId, options.schoolId)) as typeof query;
  }

  if (options.limit) {
    query = query.limit(options.limit) as typeof query;
  }

  const rows = await query;
  const stats: CleanupStats = { scanned: 0, changed: 0, invalidJson: 0, emptyNormalized: 0 };

  for (const row of rows) {
    stats.scanned++;
    const before = row.contentBlocks ?? "[]";
    const { invalidJson, normalized, normalizedJson } = normalizeBlocksJson(row.contentBlocks);

    if (invalidJson) stats.invalidJson++;
    if (normalized.length === 0 && before.trim() !== "[]") stats.emptyNormalized++;

    if (before !== normalizedJson) {
      stats.changed++;
      if (options.apply) {
        await db
          .update(lessons)
          .set({ contentBlocks: normalizedJson, updatedAt: new Date() })
          .where(eq(lessons.id, row.id));
      }
    }
  }

  return stats;
}

function printStats(label: string, stats: CleanupStats) {
  console.log(`\n${label}`);
  console.log(`- scanned: ${stats.scanned}`);
  console.log(`- changed: ${stats.changed}`);
  console.log(`- invalidJson: ${stats.invalidJson}`);
  console.log(`- emptyNormalized: ${stats.emptyNormalized}`);
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  console.log("Normalize contentBlocks script");
  console.log(
    JSON.stringify(
      {
        mode: options.apply ? "apply" : "dry-run",
        entity: options.entity,
        schoolId: options.schoolId ?? null,
        limit: options.limit ?? null,
      },
      null,
      2,
    ),
  );

  await ensureDbReady();

  if (options.entity === "songs" || options.entity === "all") {
    const stats = await cleanupSongs(options);
    printStats("Songs", stats);
  }

  if (options.entity === "lessons" || options.entity === "all") {
    const stats = await cleanupLessons(options);
    printStats("Lessons", stats);
  }

  console.log(`\nDone (${options.apply ? "changes applied" : "dry-run only"}).`);
}

main()
  .catch((error) => {
    console.error("Content block cleanup failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      await pool?.end();
    } catch {
      // no-op
    }
  });
