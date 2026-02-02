import fs from "fs/promises";
import path from "path";
import { Client } from "pg";

const DEFAULT_SCHOOL_SLUG = "drumschoolstefanvandebrug";
const DEFAULT_MSID = 18;

type EmbedModule = {
  type: string;
  provider: string;
  status: "embedded" | "fallback";
  embed: {
    embed_url: string | null;
    raw: string;
  };
  fallback?: {
    label: string;
    url: string;
  };
  meta?: Record<string, unknown>;
};

function parseIntOrNull(value: string | number | undefined): number | null {
  if (value === undefined || value === null || value === "") return null;
  const parsed = typeof value === "number" ? value : parseInt(String(value), 10);
  return Number.isNaN(parsed) ? null : parsed;
}

function parseDateTime(dateStr?: string, timeStr?: string): Date | null {
  if (!dateStr) return null;
  const date = dateStr.trim();
  if (!date || date === "0000-00-00") return null;
  const time = timeStr && timeStr.trim() ? timeStr.trim() : "00:00:00";
  const combined = `${date} ${time}`;
  const parsed = new Date(combined);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

async function resolveSchoolId(client: Client, slug: string): Promise<number> {
  const result = await client.query(
    "SELECT school_id FROM school_aliases WHERE slug = $1 LIMIT 1",
    [slug]
  );

  if (!result.rowCount) {
    const error = new Error(`school_aliases slug not found: ${slug}`);
    (error as any).code = 4;
    throw error;
  }

  return result.rows[0].school_id as number;
}

async function preflightChecks(
  client: Client,
  slug: string,
  notatieRows: Record<string, any>[],
  songsRows: Record<string, any>[],
  msidFilter: number,
  force: boolean
): Promise<{ schoolId: number; notatieFiltered: number; songsFiltered: number }> {
  try {
    await client.query("SELECT 1");
  } catch (error) {
    const err = new Error("Database connection failed");
    (err as any).code = 2;
    throw err;
  }

  const tableCheck = await client.query(
    "SELECT 1 FROM information_schema.tables WHERE table_name = 'school_aliases'"
  );
  if (!tableCheck.rowCount) {
    const err = new Error("Missing table: school_aliases");
    (err as any).code = 2;
    throw err;
  }

  const columnChecks = await client.query(
    `SELECT table_name, column_name
     FROM information_schema.columns
     WHERE (table_name = 'notations' AND column_name IN ('media_jsonb', 'raw_jsonb'))
        OR (table_name = 'pos_songs' AND column_name IN ('embeds_jsonb', 'raw_jsonb'))`
  );
  const requiredColumns = new Set([
    "notations.media_jsonb",
    "notations.raw_jsonb",
    "pos_songs.embeds_jsonb",
    "pos_songs.raw_jsonb"
  ]);
  for (const row of columnChecks.rows) {
    requiredColumns.delete(`${row.table_name}.${row.column_name}`);
  }
  if (requiredColumns.size > 0) {
    const err = new Error(`Missing columns: ${Array.from(requiredColumns).join(", ")}`);
    (err as any).code = 2;
    throw err;
  }

  const indexCheck = await client.query(
    `SELECT indexname, indexdef
     FROM pg_indexes
     WHERE tablename IN ('notations', 'pos_songs')`
  );

  const hasNotationsIndex = indexCheck.rows.some((row: any) =>
    row.indexdef.includes("notations") &&
    row.indexdef.includes("(pos_msid, pos_noid)")
  );
  const hasSongsIndex = indexCheck.rows.some((row: any) =>
    row.indexdef.includes("pos_songs") &&
    row.indexdef.includes("(pos_msid, pos_soid)")
  );

  if (!hasNotationsIndex || !hasSongsIndex) {
    const missing = [
      !hasNotationsIndex ? "notations(pos_msid, pos_noid)" : null,
      !hasSongsIndex ? "pos_songs(pos_msid, pos_soid)" : null
    ].filter(Boolean);
    const err = new Error(`Missing unique indexes: ${missing.join(", ")}`);
    (err as any).code = 2;
    throw err;
  }

  const schoolId = await resolveSchoolId(client, slug);

  const schoolCheck = await client.query("SELECT 1 FROM schools WHERE id = $1 LIMIT 1", [schoolId]);
  if (!schoolCheck.rowCount) {
    const err = new Error(`school_id ${schoolId} not found in schools table`);
    (err as any).code = 2;
    throw err;
  }

  const readOnlyCheck = await client.query("SHOW transaction_read_only");
  if (readOnlyCheck.rows?.[0]?.transaction_read_only === "on") {
    const err = new Error("Database is read-only (transaction_read_only = on)");
    (err as any).code = 2;
    throw err;
  }

  const notatieFiltered = notatieRows.filter((row) => parseIntOrNull(row.msid) === msidFilter).length;
  const songsFiltered = songsRows.filter((row) => parseIntOrNull(row.msid) === msidFilter).length;

  if ((!notatieFiltered || !songsFiltered) && !force) {
    const err = new Error(
      `msid filter ${msidFilter} returned 0 rows for ${!notatieFiltered ? "notations" : "songs"}`
    );
    (err as any).code = 2;
    throw err;
  }

  return { schoolId, notatieFiltered, songsFiltered };
}

async function countExistingNotations(
  client: Client,
  keys: Array<{ msid: number; noid: number }>
): Promise<number> {
  if (keys.length === 0) return 0;
  let count = 0;
  const batchSize = 500;
  for (let i = 0; i < keys.length; i += batchSize) {
    const batch = keys.slice(i, i + batchSize);
    const values = batch.map((_, idx) => `($${idx * 2 + 1}, $${idx * 2 + 2})`).join(", ");
    const params = batch.flatMap((k) => [k.msid, k.noid]);
    const result = await client.query(
      `SELECT COUNT(*)::int AS count FROM notations WHERE (pos_msid, pos_noid) IN (${values})`,
      params
    );
    count += result.rows[0]?.count ?? 0;
  }
  return count;
}

async function countExistingSongs(
  client: Client,
  keys: Array<{ msid: number; soid: number }>
): Promise<number> {
  if (keys.length === 0) return 0;
  let count = 0;
  const batchSize = 500;
  for (let i = 0; i < keys.length; i += batchSize) {
    const batch = keys.slice(i, i + batchSize);
    const values = batch.map((_, idx) => `($${idx * 2 + 1}, $${idx * 2 + 2})`).join(", ");
    const params = batch.flatMap((k) => [k.msid, k.soid]);
    const result = await client.query(
      `SELECT COUNT(*)::int AS count FROM pos_songs WHERE (pos_msid, pos_soid) IN (${values})`,
      params
    );
    count += result.rows[0]?.count ?? 0;
  }
  return count;
}

function extractEmbedModules(row: Record<string, any>, fields: string[]) {
  const modules: Record<string, EmbedModule> = {};
  let embedded = 0;
  let fallback = 0;

  for (const field of fields) {
    const value = row[field];
    if (!value) continue;

    modules[field] = value as EmbedModule;
    if (value.status === "embedded") {
      embedded += 1;
    } else {
      fallback += 1;
    }
  }

  return { modules, embedded, fallback };
}

function getRawFromModule(module: EmbedModule | undefined): string | null {
  if (!module) return null;
  return module.embed?.raw ?? null;
}

function normalizeRowString(value: any): string | null {
  if (value === undefined || value === null) return null;
  const str = String(value);
  return str.length ? str : null;
}

async function importNotations(
  client: Client,
  rows: Record<string, any>[],
  schoolId: number,
  msidFilter: number,
  batchId: string
) {
  const mediaFields = ["noPDFlesson", "noMusescore", "musicxml", "noMP3", "noVideo"];
  const sql = `
    INSERT INTO notations (
      school_id,
      pos_noid,
      pos_categorie,
      pos_hoofdstuk,
      pos_volgnummer,
      pos_notatie,
      pos_opmerkingen,
      pos_msid,
      pos_aangemaakt,
      pos_gewijzigd,
      pos_gewijzigddoor,
      title,
      category,
      order_number,
      parsed_notation,
      parser_status,
      media_jsonb,
      raw_jsonb,
      import_batch_id,
      is_active,
      updated_at
    ) VALUES (
      $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,NOW()
    )
    ON CONFLICT (pos_msid, pos_noid) DO UPDATE SET
      pos_categorie = EXCLUDED.pos_categorie,
      pos_hoofdstuk = EXCLUDED.pos_hoofdstuk,
      pos_volgnummer = EXCLUDED.pos_volgnummer,
      pos_notatie = EXCLUDED.pos_notatie,
      pos_opmerkingen = EXCLUDED.pos_opmerkingen,
      pos_aangemaakt = EXCLUDED.pos_aangemaakt,
      pos_gewijzigd = EXCLUDED.pos_gewijzigd,
      pos_gewijzigddoor = EXCLUDED.pos_gewijzigddoor,
      title = EXCLUDED.title,
      category = EXCLUDED.category,
      order_number = EXCLUDED.order_number,
      parsed_notation = EXCLUDED.parsed_notation,
      parser_status = EXCLUDED.parser_status,
      media_jsonb = EXCLUDED.media_jsonb,
      raw_jsonb = EXCLUDED.raw_jsonb,
      import_batch_id = EXCLUDED.import_batch_id,
      is_active = EXCLUDED.is_active,
      updated_at = NOW()
    RETURNING (xmax = 0) AS inserted;
  `;

  let inserted = 0;
  let updated = 0;
  let skipped = 0;
  let embedded = 0;
  let fallback = 0;

  for (const row of rows) {
    const msid = parseIntOrNull(row.msid);
    if (msid !== msidFilter) {
      skipped += 1;
      continue;
    }

    const posNoid = parseIntOrNull(row.noid);
    if (!posNoid) {
      skipped += 1;
      continue;
    }

    const { modules, embedded: emb, fallback: fb } = extractEmbedModules(row, mediaFields);
    embedded += emb;
    fallback += fb;

    const title = [row.noCategorie, row.noHoofdstuk].filter(Boolean).join(" - ") || "Untitled Notation";

    const params = [
      schoolId,
      posNoid,
      normalizeRowString(row.noCategorie),
      normalizeRowString(row.noHoofdstuk),
      parseIntOrNull(row.noVolgnummer),
      normalizeRowString(row.noNotatie),
      normalizeRowString(row.noOpmerkingen),
      msid,
      parseDateTime(row.noDatumGemaakt, row.noTijdGemaakt),
      parseDateTime(row.noDatumGewijzigd, row.noTijdGewijzigd),
      normalizeRowString(row.noGewijzigddoor),
      normalizeRowString(title) ?? "Untitled Notation",
      normalizeRowString(row.noCategorie),
      parseIntOrNull(row.noVolgnummer),
      null,
      null,
      Object.keys(modules).length ? JSON.stringify(modules) : null,
      JSON.stringify(row),
      batchId,
      true
    ];

    const result = await client.query(sql, params);
    if (result.rows[0]?.inserted) {
      inserted += 1;
    } else {
      updated += 1;
    }
  }

  return { total: rows.length, inserted, updated, skipped, embedded, fallback };
}

async function importSongs(
  client: Client,
  rows: Record<string, any>[],
  schoolId: number,
  msidFilter: number,
  batchId: string
) {
  const mediaFields = [
    "soYouTube",
    "soSpotify",
    "soAppleMusic",
    "soUitlegVideo",
    "soPDFsong",
    "soMusescore",
    "soFlatio",
    "soMusicXML",
    "soNotatie01",
    "soNotatie02",
    "soNotatie03",
    "soNotatie04",
    "soNotatie05",
    "soNotatie06",
    "soNotatie07",
    "soNotatie08"
  ];

  const sql = `
    INSERT INTO pos_songs (
      school_id,
      pos_soid,
      pos_artiest,
      pos_titel,
      pos_bpm,
      pos_lengte,
      pos_genre,
      pos_youtube,
      pos_spotify,
      pos_apple_music,
      pos_lyrics,
      pos_uitleg_tekst,
      pos_uitleg_video,
      pos_msid,
      pos_aangemaakt,
      pos_gewijzigd,
      pos_gewijzigddoor,
      embeds_jsonb,
      raw_jsonb,
      import_batch_id,
      updated_at
    ) VALUES (
      $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,NOW()
    )
    ON CONFLICT (pos_msid, pos_soid) DO UPDATE SET
      pos_artiest = EXCLUDED.pos_artiest,
      pos_titel = EXCLUDED.pos_titel,
      pos_bpm = EXCLUDED.pos_bpm,
      pos_lengte = EXCLUDED.pos_lengte,
      pos_genre = EXCLUDED.pos_genre,
      pos_youtube = EXCLUDED.pos_youtube,
      pos_spotify = EXCLUDED.pos_spotify,
      pos_apple_music = EXCLUDED.pos_apple_music,
      pos_lyrics = EXCLUDED.pos_lyrics,
      pos_uitleg_tekst = EXCLUDED.pos_uitleg_tekst,
      pos_uitleg_video = EXCLUDED.pos_uitleg_video,
      pos_aangemaakt = EXCLUDED.pos_aangemaakt,
      pos_gewijzigd = EXCLUDED.pos_gewijzigd,
      pos_gewijzigddoor = EXCLUDED.pos_gewijzigddoor,
      embeds_jsonb = EXCLUDED.embeds_jsonb,
      raw_jsonb = EXCLUDED.raw_jsonb,
      import_batch_id = EXCLUDED.import_batch_id,
      updated_at = NOW()
    RETURNING (xmax = 0) AS inserted;
  `;

  let inserted = 0;
  let updated = 0;
  let skipped = 0;
  let embedded = 0;
  let fallback = 0;

  for (const row of rows) {
    const msid = parseIntOrNull(row.msid);
    if (msid !== msidFilter) {
      skipped += 1;
      continue;
    }

    const posSoid = parseIntOrNull(row.soid);
    if (!posSoid) {
      skipped += 1;
      continue;
    }

    const { modules, embedded: emb, fallback: fb } = extractEmbedModules(row, mediaFields);
    embedded += emb;
    fallback += fb;

    const params = [
      schoolId,
      posSoid,
      normalizeRowString(row.soArtiest),
      normalizeRowString(row.soTitel),
      parseIntOrNull(row.soBPM),
      normalizeRowString(row.soLengte),
      normalizeRowString(row.soGenre),
      getRawFromModule(row.soYouTube),
      getRawFromModule(row.soSpotify),
      getRawFromModule(row.soAppleMusic),
      normalizeRowString(row.soLyrics),
      normalizeRowString(row.soUitlegTekst),
      getRawFromModule(row.soUitlegVideo),
      msid,
      parseDateTime(row.soDatumGemaakt, row.soTijdGemaakt),
      parseDateTime(row.soDatumGewijzigd, row.soTijdGewijzigd),
      normalizeRowString(row.soGewijzigddoor),
      Object.keys(modules).length ? JSON.stringify(modules) : null,
      JSON.stringify(row),
      batchId
    ];

    const result = await client.query(sql, params);
    if (result.rows[0]?.inserted) {
      inserted += 1;
    } else {
      updated += 1;
    }
  }

  return { total: rows.length, inserted, updated, skipped, embedded, fallback };
}

async function run() {
  const args = process.argv.slice(2);
  const flags = new Set(args.filter((arg) => arg.startsWith("--")));
  const positional = args.filter((arg) => !arg.startsWith("--"));

  const notatiePath = positional[0] || path.resolve("tmp", "import_preview", "notatie.json");
  const songsPath = positional[1] || path.resolve("tmp", "import_preview", "songs.json");
  const schoolSlug = positional[2] || process.env.SCHOOL_SLUG || DEFAULT_SCHOOL_SLUG;
  const msidFilter = parseInt(positional[3] || process.env.MSID || String(DEFAULT_MSID), 10);

  const dryRun = flags.has("--dry-run");
  const preflight = !flags.has("--no-preflight");
  const force = flags.has("--force");

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    const err = new Error("DATABASE_URL is required");
    (err as any).code = 3;
    throw err;
  }

  let notatieRows: Record<string, any>[];
  let songsRows: Record<string, any>[];

  try {
    const [notatieRaw, songsRaw] = await Promise.all([
      fs.readFile(notatiePath, "utf-8"),
      fs.readFile(songsPath, "utf-8")
    ]);
    notatieRows = JSON.parse(notatieRaw);
    songsRows = JSON.parse(songsRaw);
  } catch (error) {
    const err = new Error("Input files must be readable JSON arrays");
    (err as any).code = 3;
    throw err;
  }

  if (!Array.isArray(notatieRows) || !Array.isArray(songsRows)) {
    const err = new Error("Input files must contain JSON arrays");
    (err as any).code = 3;
    throw err;
  }

  const client = new Client({ connectionString: databaseUrl });
  await client.connect();

  let schoolId: number;
  let notatieFiltered = 0;
  let songsFiltered = 0;

  try {
    if (preflight) {
      const preflightResult = await preflightChecks(
        client,
        schoolSlug,
        notatieRows,
        songsRows,
        msidFilter,
        force
      );
      schoolId = preflightResult.schoolId;
      notatieFiltered = preflightResult.notatieFiltered;
      songsFiltered = preflightResult.songsFiltered;
    } else {
      schoolId = await resolveSchoolId(client, schoolSlug);
      notatieFiltered = notatieRows.filter((row) => parseIntOrNull(row.msid) === msidFilter).length;
      songsFiltered = songsRows.filter((row) => parseIntOrNull(row.msid) === msidFilter).length;
    }

    const notatieKeys = notatieRows
      .filter((row) => parseIntOrNull(row.msid) === msidFilter)
      .map((row) => ({ msid: msidFilter, noid: parseIntOrNull(row.noid) }))
      .filter((row) => row.noid !== null) as Array<{ msid: number; noid: number }>;

    const songsKeys = songsRows
      .filter((row) => parseIntOrNull(row.msid) === msidFilter)
      .map((row) => ({ msid: msidFilter, soid: parseIntOrNull(row.soid) }))
      .filter((row) => row.soid !== null) as Array<{ msid: number; soid: number }>;

    const existingNotations = await countExistingNotations(client, notatieKeys);
    const existingSongs = await countExistingSongs(client, songsKeys);

    const summary = {
      slug: schoolSlug,
      msid: msidFilter,
      school_id: schoolId,
      dryRun,
      notations: {
        total: notatieRows.length,
        filtered: notatieFiltered,
        existing: existingNotations,
        wouldInsert: Math.max(notatieFiltered - existingNotations, 0),
        wouldUpdate: existingNotations
      },
      songs: {
        total: songsRows.length,
        filtered: songsFiltered,
        existing: existingSongs,
        wouldInsert: Math.max(songsFiltered - existingSongs, 0),
        wouldUpdate: existingSongs
      }
    };

    if (dryRun) {
      const mediaFieldsNotatie = ["noPDFlesson", "noMusescore", "musicxml", "noMP3", "noVideo"];
      const mediaFieldsSongs = [
        "soYouTube",
        "soSpotify",
        "soAppleMusic",
        "soUitlegVideo",
        "soPDFsong",
        "soMusescore",
        "soFlatio",
        "soMusicXML",
        "soNotatie01",
        "soNotatie02",
        "soNotatie03",
        "soNotatie04",
        "soNotatie05",
        "soNotatie06",
        "soNotatie07",
        "soNotatie08"
      ];

      let notatieEmbedded = 0;
      let notatieFallback = 0;
      for (const row of notatieRows) {
        if (parseIntOrNull(row.msid) !== msidFilter) continue;
        const result = extractEmbedModules(row, mediaFieldsNotatie);
        notatieEmbedded += result.embedded;
        notatieFallback += result.fallback;
      }

      let songsEmbedded = 0;
      let songsFallback = 0;
      for (const row of songsRows) {
        if (parseIntOrNull(row.msid) !== msidFilter) continue;
        const result = extractEmbedModules(row, mediaFieldsSongs);
        songsEmbedded += result.embedded;
        songsFallback += result.fallback;
      }

      console.log("Dry-run summary:", {
        ...summary,
        notations: {
          ...summary.notations,
          embedded: notatieEmbedded,
          fallback: notatieFallback
        },
        songs: {
          ...summary.songs,
          embedded: songsEmbedded,
          fallback: songsFallback
        }
      });
      return;
    }

    await client.query("BEGIN");
    const batchId = `${schoolSlug}-${Date.now()}`;

    const notatieResult = await importNotations(
      client,
      notatieRows,
      schoolId,
      msidFilter,
      batchId
    );

    const songsResult = await importSongs(
      client,
      songsRows,
      schoolId,
      msidFilter,
      batchId
    );

    await client.query("COMMIT");

    console.log("Import completed.");
    console.log("Summary:", summary);
    console.log("Notatie:", notatieResult);
    console.log("Songs:", songsResult);
  } catch (error: any) {
    if (client) {
      try {
        await client.query("ROLLBACK");
      } catch {
        // ignore rollback errors
      }
    }

    const exitCode = error?.code ?? 1;
    console.error("Import failed:", error?.message || error);
    process.exitCode = exitCode;
  } finally {
    await client.end();
  }
}

run().catch((error: any) => {
  console.error("Fatal import error:", error?.message || error);
  process.exit(error?.code ?? 1);
});
