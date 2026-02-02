import fs from "fs/promises";
import path from "path";
import iconv from "iconv-lite";
import { Client } from "pg";
import { randomUUID } from "crypto";
import normalizeEmbedModule from "../shared/utils/normalizeEmbedModule";
import type { EmbedModule } from "../shared/utils/embedTypes";

const DEFAULT_SCHOOL_SLUG = "drumschoolstefanvandebrug";
const DEFAULT_MSID = 18;

const NOTATIE_MEDIA_FIELDS = [
  "noPDFlesson",
  "noMusescore",
  "musicxml",
  "noMP3",
  "noVideo"
] as const;

const SONGS_MEDIA_FIELDS = [
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
] as const;

function decodeLatin1(buffer: Buffer): string {
  return iconv.decode(buffer, "latin1");
}

function detectDelimiter(content: string): string {
  const firstLine = content.split("\n")[0] ?? "";
  const semicolons = (firstLine.match(/;/g) || []).length;
  const commas = (firstLine.match(/,/g) || []).length;
  return semicolons > commas ? ";" : ",";
}

function parseCSVLine(line: string, delimiter: string): string[] {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;
  let i = 0;

  while (i < line.length) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 2;
        continue;
      }
      inQuotes = !inQuotes;
    } else if (char === delimiter && !inQuotes) {
      values.push(current);
      current = "";
    } else {
      current += char;
    }
    i += 1;
  }

  values.push(current);
  return values;
}

function parseCSV(content: string): Record<string, string>[] {
  const delimiter = detectDelimiter(content);
  const lines = content.split("\n").filter((line) => line.trim());

  if (lines.length === 0) return [];

  const headers = parseCSVLine(lines[0], delimiter).map((header) => header.trim());
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i += 1) {
    const line = lines[i];
    if (!line.trim()) continue;

    const values = parseCSVLine(line, delimiter);
    const row: Record<string, string> = {};

    headers.forEach((header, index) => {
      row[header] = values[index]?.trim() ?? "";
    });

    rows.push(row);
  }

  return rows;
}

function parseIntOrNull(value: string | undefined): number | null {
  if (!value) return null;
  const parsed = parseInt(value, 10);
  return Number.isNaN(parsed) ? null : parsed;
}

function parseDateTime(dateStr: string | undefined, timeStr: string | undefined): Date | null {
  if (!dateStr) return null;
  const date = dateStr.trim();
  if (!date || date === "0000-00-00") return null;
  const time = timeStr && timeStr.trim() ? timeStr.trim() : "00:00:00";
  const combined = `${date} ${time}`;
  const parsed = new Date(combined);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function cleanText(text: string | undefined): string | null {
  if (!text) return null;
  const fixes: Record<string, string> = {
    "Ã¡": "á",
    "Ã©": "é",
    "Ã­": "í",
    "Ã³": "ó",
    "Ãº": "ú",
    "Ã±": "ñ",
    "Ã ": "à",
    "Ã¨": "è",
    "Ã¬": "ì",
    "Ã²": "ò",
    "Ã¹": "ù",
    "Ã¤": "ä",
    "Ã«": "ë",
    "Ã¯": "ï",
    "Ã¶": "ö",
    "Ã¼": "ü",
    "Ã¿": "ÿ",
    "Ã‰": "É",
    "â€™": "'",
    "â€œ": '"',
    "â€": '"',
    "â€\"": "—",
    "â€“": "–",
    "Â": ""
  };

  let result = text;
  for (const [pattern, replacement] of Object.entries(fixes)) {
    result = result.replace(new RegExp(pattern, "g"), replacement);
  }

  return result.trim();
}

function buildEmbedModules(row: Record<string, string>, fields: readonly string[]) {
  const modules: Record<string, EmbedModule> = {};
  let embedded = 0;
  let fallback = 0;

  for (const field of fields) {
    const raw = row[field] ?? "";
    if (!raw || !raw.trim()) continue;

    const module = normalizeEmbedModule(raw);
    modules[field] = module;

    if (module.status === "embedded") {
      embedded += 1;
    } else {
      fallback += 1;
    }
  }

  return { modules, embedded, fallback };
}

function extractYouTubeId(embedUrl: string | null): string | null {
  if (!embedUrl) return null;
  const match = embedUrl.match(/youtube\.com\/embed\/([^?&/]+)/i);
  return match ? match[1] : null;
}

function toLegacyEmbed(module: EmbedModule, type: "video" | "audio", provider: string) {
  return {
    type,
    provider,
    embed_url: module.embed.embed_url,
    video_id: provider === "youtube" ? extractYouTubeId(module.embed.embed_url) : undefined,
    raw: module.embed.raw,
    fallback: module.status === "fallback" ? "Embed preserved but could not be parsed" : undefined
  };
}

async function resolveSchoolId(client: Client, slug: string): Promise<number> {
  const columnCheck = await client.query(
    "SELECT 1 FROM information_schema.columns WHERE table_name = 'schools' AND column_name = 'slug'"
  );

  if (columnCheck.rowCount && columnCheck.rowCount > 0) {
    const result = await client.query("SELECT id FROM schools WHERE slug = $1 LIMIT 1", [slug]);
    if (!result.rowCount) {
      throw new Error(`School slug not found: ${slug}`);
    }
    return result.rows[0].id as number;
  }

  const result = await client.query("SELECT id FROM schools WHERE LOWER(name) = LOWER($1) LIMIT 1", [slug]);
  if (!result.rowCount) {
    throw new Error(`School name not found for slug '${slug}'. Add a slug column or provide school_id.`);
  }
  return result.rows[0].id as number;
}

async function ensureSchema(client: Client) {
  await client.query("ALTER TABLE notations ADD COLUMN IF NOT EXISTS embed_modules jsonb");
  await client.query("ALTER TABLE pos_songs ADD COLUMN IF NOT EXISTS embed_modules jsonb");
  await client.query(
    "CREATE UNIQUE INDEX IF NOT EXISTS notations_pos_msid_noid_uidx ON notations (pos_msid, pos_noid) WHERE pos_msid IS NOT NULL AND pos_noid IS NOT NULL"
  );
  await client.query(
    "CREATE UNIQUE INDEX IF NOT EXISTS pos_songs_pos_msid_soid_uidx ON pos_songs (pos_msid, pos_soid) WHERE pos_msid IS NOT NULL AND pos_soid IS NOT NULL"
  );
}

async function importNotations(
  client: Client,
  csvPath: string,
  schoolId: number,
  msidFilter: number,
  batchId: string
) {
  const buffer = await fs.readFile(csvPath);
  const content = decodeLatin1(buffer);
  const rows = parseCSV(content);

  let inserted = 0;
  let updated = 0;
  let skipped = 0;
  let embedded = 0;
  let fallback = 0;

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
      embed_modules,
      import_batch_id,
      is_active,
      updated_at
    ) VALUES (
      $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,NOW()
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
      embed_modules = EXCLUDED.embed_modules,
      import_batch_id = EXCLUDED.import_batch_id,
      is_active = EXCLUDED.is_active,
      updated_at = NOW()
    RETURNING (xmax = 0) AS inserted;
  `;

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

    const { modules, embedded: emb, fallback: fb } = buildEmbedModules(row, NOTATIE_MEDIA_FIELDS);
    embedded += emb;
    fallback += fb;

    const title = [row.noCategorie, row.noHoofdstuk].filter(Boolean).join(" - ") || "Untitled Notation";

    const parsedNotation = null;
    const parserStatus = null;

    const params = [
      schoolId,
      posNoid,
      row.noCategorie || null,
      row.noHoofdstuk || null,
      parseIntOrNull(row.noVolgnummer),
      row.noNotatie || null,
      cleanText(row.noOpmerkingen),
      msid,
      parseDateTime(row.noDatumGemaakt, row.noTijdGemaakt),
      parseDateTime(row.noDatumGewijzigd, row.noTijdGewijzigd),
      row.noGewijzigddoor || null,
      cleanText(title) || "Untitled Notation",
      cleanText(row.noCategorie),
      parseIntOrNull(row.noVolgnummer),
      parsedNotation,
      parserStatus,
      Object.keys(modules).length ? JSON.stringify(modules) : null,
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
  csvPath: string,
  schoolId: number,
  msidFilter: number,
  batchId: string
) {
  const buffer = await fs.readFile(csvPath);
  const content = decodeLatin1(buffer);
  const rows = parseCSV(content);

  let inserted = 0;
  let updated = 0;
  let skipped = 0;
  let embedded = 0;
  let fallback = 0;

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
      embeds,
      lyrics_clean,
      embed_modules,
      import_batch_id,
      updated_at
    ) VALUES (
      $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,NOW()
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
      embeds = EXCLUDED.embeds,
      lyrics_clean = EXCLUDED.lyrics_clean,
      embed_modules = EXCLUDED.embed_modules,
      import_batch_id = EXCLUDED.import_batch_id,
      updated_at = NOW()
    RETURNING (xmax = 0) AS inserted;
  `;

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

    const { modules, embedded: emb, fallback: fb } = buildEmbedModules(row, SONGS_MEDIA_FIELDS);
    embedded += emb;
    fallback += fb;

    const youtubeModule = row.soYouTube ? normalizeEmbedModule(row.soYouTube) : null;
    const spotifyModule = row.soSpotify ? normalizeEmbedModule(row.soSpotify) : null;
    const appleModule = row.soAppleMusic ? normalizeEmbedModule(row.soAppleMusic) : null;

    const embeds: Record<string, any> = {};
    if (youtubeModule) embeds.youtube = toLegacyEmbed(youtubeModule, "video", "youtube");
    if (spotifyModule) embeds.spotify = toLegacyEmbed(spotifyModule, "audio", "spotify");
    if (appleModule) embeds.apple_music = toLegacyEmbed(appleModule, "audio", "apple_music");

    const params = [
      schoolId,
      posSoid,
      row.soArtiest || null,
      row.soTitel || null,
      parseIntOrNull(row.soBPM),
      row.soLengte || null,
      row.soGenre || null,
      row.soYouTube || null,
      row.soSpotify || null,
      row.soAppleMusic || null,
      row.soLyrics || null,
      cleanText(row.soUitlegTekst),
      row.soUitlegVideo || null,
      msid,
      parseDateTime(row.soDatumGemaakt, row.soTijdGemaakt),
      parseDateTime(row.soDatumGewijzigd, row.soTijdGewijzigd),
      row.soGewijzigddoor || null,
      Object.keys(embeds).length ? JSON.stringify(embeds) : null,
      cleanText(row.soLyrics),
      Object.keys(modules).length ? JSON.stringify(modules) : null,
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
  const notatiePath = args[0];
  const songsPath = args[1];
  const schoolSlug = args[2] || process.env.SCHOOL_SLUG || DEFAULT_SCHOOL_SLUG;
  const msidFilter = parseInt(args[3] || process.env.MSID || String(DEFAULT_MSID), 10);

  if (!notatiePath || !songsPath) {
    console.error("Usage: tsx scripts/import_pos_embed.ts <POS_Notatie.csv> <POS_Songs.csv> [school_slug] [msid]");
    process.exit(1);
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required");
  }

  const client = new Client({ connectionString: databaseUrl });
  await client.connect();

  const batchId = randomUUID();

  try {
    await client.query("BEGIN");
    await ensureSchema(client);

    const schoolId = await resolveSchoolId(client, schoolSlug);

    const notatieResult = await importNotations(
      client,
      path.resolve(notatiePath),
      schoolId,
      msidFilter,
      batchId
    );

    const songsResult = await importSongs(
      client,
      path.resolve(songsPath),
      schoolId,
      msidFilter,
      batchId
    );

    await client.query("COMMIT");

    console.log("Import completed.");
    console.log("Notatie:", notatieResult);
    console.log("Songs:", songsResult);
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Import failed:", error);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

run().catch((error) => {
  console.error("Fatal import error:", error);
  process.exit(1);
});
