import fs from "fs/promises";
import path from "path";
import { decodeLatin1, parseCSV } from "../server/services/pos-csv-import";
import normalizeEmbedModule from "../shared/utils/normalizeEmbedModule";
import type { EmbedModule } from "../shared/utils/embedTypes";

const NOTATIE_MEDIA_FIELDS = ["noNotatie", "noOpmerkingen"] as const;
const SONGS_MEDIA_FIELDS = ["soYouTube", "soSpotify", "soAppleMusic", "soUitlegvideo"] as const;

type PreviewResult = {
  rows: Record<string, any>[];
  totalRows: number;
  embeddedCount: number;
  fallbackCount: number;
};

async function processCsvFile(
  filePath: string,
  mediaFields: readonly string[]
): Promise<PreviewResult> {
  const buffer = await fs.readFile(filePath);
  const csvContent = decodeLatin1(buffer);
  const rows = parseCSV(csvContent);

  let embeddedCount = 0;
  let fallbackCount = 0;

  const outputRows = rows.map((row, index) => {
    const outputRow: Record<string, any> = { ...row };

    for (const field of mediaFields) {
      const raw = row[field] ?? "";
      let module: EmbedModule;

      try {
        module = normalizeEmbedModule(raw);
      } catch (error) {
        module = {
          type: "external",
          provider: "external",
          status: "fallback",
          embed: {
            embed_url: null,
            raw
          },
          fallback: {
            label: "Open Link",
            url: raw
          },
          meta: {
            error: error instanceof Error ? error.message : String(error)
          }
        };
      }

      if (module.status === "embedded") {
        embeddedCount += 1;
      } else {
        fallbackCount += 1;
      }

      outputRow[field] = module;
    }

    outputRow.__preview_row = index + 1;
    return outputRow;
  });

  return {
    rows: outputRows,
    totalRows: rows.length,
    embeddedCount,
    fallbackCount
  };
}

async function ensureOutputDir(dirPath: string) {
  await fs.mkdir(dirPath, { recursive: true });
}

async function writeJson(filePath: string, data: unknown) {
  const json = JSON.stringify(data, null, 2);
  await fs.writeFile(filePath, json, "utf-8");
}

async function run() {
  const [notatiePath, songsPath] = process.argv.slice(2);

  if (!notatiePath || !songsPath) {
    console.error("Usage: npx tsx scripts/import_preview.ts <POS_Notatie.csv> <POS_Songs.csv>");
    process.exit(1);
  }

  const outputDir = path.resolve(process.cwd(), "tmp", "import_preview");
  await ensureOutputDir(outputDir);

  const notatieResult = await processCsvFile(notatiePath, NOTATIE_MEDIA_FIELDS);
  const songsResult = await processCsvFile(songsPath, SONGS_MEDIA_FIELDS);

  await writeJson(path.join(outputDir, "notatie.json"), notatieResult.rows);
  await writeJson(path.join(outputDir, "songs.json"), songsResult.rows);

  console.log("Preview import completed.");
  console.log("Notatie:", {
    totalRows: notatieResult.totalRows,
    embeddedModules: notatieResult.embeddedCount,
    fallbackModules: notatieResult.fallbackCount,
    output: path.join(outputDir, "notatie.json")
  });
  console.log("Songs:", {
    totalRows: songsResult.totalRows,
    embeddedModules: songsResult.embeddedCount,
    fallbackModules: songsResult.fallbackCount,
    output: path.join(outputDir, "songs.json")
  });
}

run().catch((error) => {
  console.error("Preview import failed:", error);
  process.exit(1);
});
