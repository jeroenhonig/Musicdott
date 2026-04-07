import { z } from "zod";

export const CANONICAL_STORAGE_CONTENT_BLOCK_TYPES = [
  "groovescribe",
  "youtube",
  "text",
  "spotify",
  "apple_music",
  "external_link",
  "pdf",
  "sync-embed",
  "sheet_music",
  "tablature",
  "abc_notation",
  "flat_embed",
  "speech_to_note",
  "image",
  "audio",
  "chord_chart",
  "lyrics",
  "rich_link",
  "image_gallery",
] as const;

export const LEGACY_CONTENT_BLOCK_TYPE_MAP = {
  groove: "groovescribe",
  video: "youtube",
  external_embed: "external_link",
} as const;

export const KNOWN_CONTENT_BLOCK_TYPES = [
  ...CANONICAL_STORAGE_CONTENT_BLOCK_TYPES,
  ...Object.keys(LEGACY_CONTENT_BLOCK_TYPE_MAP),
] as const;

const canonicalContentBlockTypeSchema = z.enum(CANONICAL_STORAGE_CONTENT_BLOCK_TYPES);
const contentBlockTypeSchema = z.union([
  canonicalContentBlockTypeSchema,
  z.string().min(1),
]);

export const contentBlockSchema = z
  .object({
    id: z.string().optional(),
    type: contentBlockTypeSchema,
    title: z.string().optional(),
    description: z.string().optional(),
    pattern: z.string().optional(),
    content: z.string().optional(),
    url: z.string().optional(),
    videoId: z.string().optional(),
    data: z.record(z.unknown()).optional(),
  })
  .passthrough();

export const contentBlocksSchema = z.array(contentBlockSchema);

export type ContentBlockContract = z.infer<typeof contentBlockSchema>;
export type ContentBlocksContract = z.infer<typeof contentBlocksSchema>;

type ContentBlockRecord = Record<string, unknown>;

const knownContentBlockTypes = new Set<string>(KNOWN_CONTENT_BLOCK_TYPES as readonly string[]);

function isObjectRecord(value: unknown): value is ContentBlockRecord {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function readString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

export function asContentBlockData(value: unknown): ContentBlockRecord {
  return isObjectRecord(value) ? value : {};
}

export function firstString(...values: unknown[]): string | undefined {
  for (const value of values) {
    const stringValue = readString(value);
    if (stringValue) return stringValue;
  }
  return undefined;
}

export function extractIframeSrc(html: unknown): string | undefined {
  if (typeof html !== "string" || !/<iframe/i.test(html)) return undefined;
  const match = html.match(/src=['"]([^'"]+)['"]/i);
  return match?.[1];
}

export function normalizeContentBlockType(type: unknown): string {
  const rawType = readString(type);
  if (!rawType) return "";
  return LEGACY_CONTENT_BLOCK_TYPE_MAP[rawType as keyof typeof LEGACY_CONTENT_BLOCK_TYPE_MAP] ?? rawType;
}

export function isContentBlockSupported(type: string): boolean {
  if (!type) return false;
  return knownContentBlockTypes.has(type) || knownContentBlockTypes.has(normalizeContentBlockType(type));
}

export function parseSpotifyTrackId(urlOrId: string): string | null {
  if (!urlOrId) return null;

  try {
    if (/^[a-zA-Z0-9]{22}$/.test(urlOrId)) {
      return urlOrId;
    }

    if (urlOrId.includes("spotify.com")) {
      const url = new URL(urlOrId);
      const pathSegments = url.pathname.split("/").filter(Boolean);

      const trackIndex = pathSegments.findIndex((segment) => segment === "track");
      if (trackIndex !== -1 && pathSegments[trackIndex + 1]) {
        return pathSegments[trackIndex + 1].split("?")[0];
      }

      const embedIndex = pathSegments.findIndex((segment) => segment === "embed");
      if (embedIndex !== -1 && pathSegments[embedIndex + 1] === "track" && pathSegments[embedIndex + 2]) {
        return pathSegments[embedIndex + 2].split("?")[0];
      }
    }

    return null;
  } catch {
    return null;
  }
}

export function buildSpotifyTrackUrl(trackId: string | null | undefined): string | undefined {
  return trackId ? `https://open.spotify.com/track/${trackId}` : undefined;
}

export function parseYouTubeVideoId(urlOrId: string): string | null {
  if (!urlOrId) return null;

  try {
    if (/^[a-zA-Z0-9_-]{11}$/.test(urlOrId)) {
      return urlOrId;
    }

    if (urlOrId.includes("youtube.com") || urlOrId.includes("youtu.be")) {
      const url = new URL(urlOrId);

      if (url.hostname === "youtu.be") {
        return url.pathname.slice(1).split("?")[0];
      }

      if (url.searchParams.has("v")) {
        return url.searchParams.get("v");
      }

      const pathMatch = url.pathname.match(/\/embed\/([a-zA-Z0-9_-]{11})/);
      if (pathMatch) {
        return pathMatch[1];
      }
    }

    return null;
  } catch {
    return null;
  }
}

export function buildYouTubeWatchUrl(videoId: string | null | undefined): string | undefined {
  return videoId ? `https://www.youtube.com/watch?v=${videoId}` : undefined;
}

function inferFilenameFromUrl(url: string | undefined): string | undefined {
  if (!url) return undefined;

  try {
    const parsedUrl = new URL(url);
    const lastSegment = parsedUrl.pathname.split("/").filter(Boolean).pop();
    return lastSegment ? decodeURIComponent(lastSegment) : undefined;
  } catch {
    const lastSegment = url.split("/").filter(Boolean).pop();
    return lastSegment ? decodeURIComponent(lastSegment.split("?")[0]) : undefined;
  }
}

export function parsePdfData(
  block: unknown,
): { url: string; filename?: string; title?: string } | null {
  if (!isObjectRecord(block)) return null;

  const data = asContentBlockData(block.data);
  const rawPdf = data.pdf;

  if (isObjectRecord(rawPdf)) {
    const url = readString(rawPdf.url);
    if (!url) return null;
    return {
      url,
      filename: readString(rawPdf.filename) ?? inferFilenameFromUrl(url),
      title: readString(rawPdf.title) ?? readString(block.title),
    };
  }

  if (typeof rawPdf === "string" && rawPdf.trim()) {
    const url = rawPdf.trim();
    return {
      url,
      filename: inferFilenameFromUrl(url),
      title: readString(block.title),
    };
  }

  const fallbackUrl = firstString(block.url, (block as ContentBlockRecord).filename, block.content);
  if (!fallbackUrl) return null;

  return {
    url: fallbackUrl,
    filename: readString((block as ContentBlockRecord).filename) ?? inferFilenameFromUrl(fallbackUrl),
    title: readString(block.title),
  };
}

function withBaseBlock(block: ContentBlockRecord, type: string): ContentBlockRecord {
  return {
    ...block,
    type,
    id: readString(block.id),
    title: readString(block.title),
    description: readString(block.description),
    pattern: readString(block.pattern),
    content: readString(block.content),
    url: readString(block.url),
    videoId: readString(block.videoId),
    data: asContentBlockData(block.data),
  };
}

function normalizeGroovescribeBlock(baseBlock: ContentBlockRecord): ContentBlockRecord {
  const data = asContentBlockData(baseBlock.data);
  const { groove: _legacyGroove, ...restData } = data;
  const pattern = firstString(
    baseBlock.pattern,
    data.pattern,
    data.groovescribe,
    data.groove,
    extractIframeSrc(baseBlock.content),
    baseBlock.url,
    baseBlock.content,
  );

  return {
    ...baseBlock,
    pattern,
    data: {
      ...restData,
      ...(pattern ? { pattern, groovescribe: pattern } : {}),
    },
  };
}

function normalizeYouTubeBlock(baseBlock: ContentBlockRecord): ContentBlockRecord {
  const data = asContentBlockData(baseBlock.data);
  const { video: _legacyVideo, ...restData } = data;
  const source = firstString(
    data.youtube,
    data.video,
    data.videoId,
    baseBlock.videoId,
    baseBlock.url,
    extractIframeSrc(baseBlock.content),
    baseBlock.content,
  );
  const videoId = parseYouTubeVideoId(source ?? "");

  return {
    ...baseBlock,
    videoId: videoId ?? readString(baseBlock.videoId),
    data: {
      ...restData,
      ...(videoId ? { youtube: videoId, videoId } : {}),
    },
  };
}

function normalizeSpotifyBlock(baseBlock: ContentBlockRecord): ContentBlockRecord {
  const data = asContentBlockData(baseBlock.data);
  const source = firstString(
    data.spotify,
    (baseBlock as ContentBlockRecord).trackId,
    baseBlock.url,
    extractIframeSrc(baseBlock.content),
    baseBlock.content,
  );
  const trackId = parseSpotifyTrackId(source ?? "");

  return {
    ...baseBlock,
    data: {
      ...data,
      ...(trackId ? { spotify: trackId } : {}),
    },
  };
}

function normalizePdfBlock(baseBlock: ContentBlockRecord): ContentBlockRecord {
  const data = asContentBlockData(baseBlock.data);
  const pdf = parsePdfData(baseBlock);

  return {
    ...baseBlock,
    url: pdf?.url ?? readString(baseBlock.url),
    data: {
      ...data,
      ...(pdf ? { pdf } : {}),
    },
  };
}

function normalizeExternalLinkBlock(baseBlock: ContentBlockRecord): ContentBlockRecord {
  const data = asContentBlockData(baseBlock.data);
  const { external_embed: _legacyExternalEmbed, ...restData } = data;
  const external = isObjectRecord(data.external_link) ? data.external_link : {};
  const url = firstString(
    external.url,
    baseBlock.url,
    extractIframeSrc(baseBlock.content),
    baseBlock.content,
  );
  const title = firstString(external.title, baseBlock.title);
  const description = firstString(external.description, baseBlock.description);
  const embedInViewer =
    typeof external.embedInViewer === "boolean" ? external.embedInViewer : undefined;

  return {
    ...baseBlock,
    url,
    title,
    description,
    data: {
      ...restData,
      ...(url
        ? {
            external_link: {
              ...(title ? { title } : {}),
              ...(description ? { description } : {}),
              ...(typeof embedInViewer === "boolean" ? { embedInViewer } : {}),
              url,
            },
          }
        : {}),
    },
  };
}

function normalizeSyncEmbedBlock(baseBlock: ContentBlockRecord): ContentBlockRecord {
  const data = asContentBlockData(baseBlock.data);
  const sync = firstString(data.sync, baseBlock.url, baseBlock.content);

  return {
    ...baseBlock,
    url: sync ?? readString(baseBlock.url),
    data: {
      ...data,
      ...(sync ? { sync } : {}),
    },
  };
}

function normalizeTextBlock(baseBlock: ContentBlockRecord): ContentBlockRecord {
  const data = asContentBlockData(baseBlock.data);
  const text = firstString(data.text, baseBlock.content, (baseBlock as ContentBlockRecord).text);

  return {
    ...baseBlock,
    content: text,
    data: {
      ...data,
      ...(text ? { text } : {}),
    },
  };
}

function normalizeAppleMusicBlock(baseBlock: ContentBlockRecord): ContentBlockRecord {
  const data = asContentBlockData(baseBlock.data);
  const rawAppleMusic = data.apple_music;
  const url = firstString(
    typeof rawAppleMusic === "string" ? rawAppleMusic : undefined,
    isObjectRecord(rawAppleMusic) ? rawAppleMusic.url : undefined,
    baseBlock.url,
    extractIframeSrc(baseBlock.content),
    baseBlock.content,
  );

  return {
    ...baseBlock,
    url: url ?? readString(baseBlock.url),
    data: {
      ...data,
      ...(url
        ? {
            apple_music: isObjectRecord(rawAppleMusic)
              ? {
                  ...rawAppleMusic,
                  url,
                }
              : { url },
          }
        : {}),
    },
  };
}

function normalizeNotationBlock(baseBlock: ContentBlockRecord): ContentBlockRecord {
  const data = asContentBlockData(baseBlock.data);
  const content = firstString(baseBlock.content, data.content);
  const fileUrl = firstString((baseBlock as ContentBlockRecord).fileUrl, data.fileUrl);
  const scoreId = firstString((baseBlock as ContentBlockRecord).scoreId, data.scoreId);

  return {
    ...baseBlock,
    content,
    data: {
      ...data,
      ...(content ? { content } : {}),
      ...(fileUrl ? { fileUrl } : {}),
      ...(scoreId ? { scoreId } : {}),
    },
  };
}

function normalizeImageBlock(baseBlock: ContentBlockRecord): ContentBlockRecord {
  const data = asContentBlockData(baseBlock.data);
  const url = firstString(data.url, baseBlock.url, baseBlock.content);
  const alt = firstString(data.alt, baseBlock.title);
  return {
    ...baseBlock,
    url,
    data: { ...data, ...(url ? { url, alt } : {}) },
  };
}

function normalizeAudioBlock(baseBlock: ContentBlockRecord): ContentBlockRecord {
  const data = asContentBlockData(baseBlock.data);
  const url = firstString(data.url, baseBlock.url, baseBlock.content);
  const title = firstString(data.title, baseBlock.title);
  return {
    ...baseBlock,
    url,
    data: { ...data, ...(url ? { url } : {}), ...(title ? { title } : {}) },
  };
}

function normalizeChordChartBlock(baseBlock: ContentBlockRecord): ContentBlockRecord {
  const data = asContentBlockData(baseBlock.data);
  const content = firstString(data.content, baseBlock.content);
  const key = firstString(data.key);
  return {
    ...baseBlock,
    content,
    data: { ...data, ...(content ? { content } : {}), ...(key ? { key } : {}) },
  };
}

function normalizeLyricsBlock(baseBlock: ContentBlockRecord): ContentBlockRecord {
  const data = asContentBlockData(baseBlock.data);
  const content = firstString(data.content, baseBlock.content);
  return {
    ...baseBlock,
    content,
    data: { ...data, ...(content ? { content } : {}) },
  };
}

function normalizeRichLinkBlock(baseBlock: ContentBlockRecord): ContentBlockRecord {
  const data = asContentBlockData(baseBlock.data);
  const url = firstString(data.url, baseBlock.url, baseBlock.content);
  const title = firstString(data.title, baseBlock.title);
  const description = firstString(data.description, baseBlock.description);
  const image = firstString(data.image);
  return {
    ...baseBlock,
    url,
    data: {
      ...data,
      ...(url ? { url } : {}),
      ...(title ? { title } : {}),
      ...(description ? { description } : {}),
      ...(image ? { image } : {}),
    },
  };
}

function normalizeImageGalleryBlock(baseBlock: ContentBlockRecord): ContentBlockRecord {
  const data = asContentBlockData(baseBlock.data);
  const images = Array.isArray(data.images) ? data.images : [];
  return {
    ...baseBlock,
    data: { ...data, images },
  };
}

export function normalizeContentBlockForStorage(input: unknown): ContentBlockContract | null {
  if (!isObjectRecord(input)) return null;

  const type = normalizeContentBlockType(input.type);
  if (!type) return null;

  const baseBlock = withBaseBlock(input, type);

  const normalizedBlock = (() => {
    switch (type) {
      case "groovescribe":
        return normalizeGroovescribeBlock(baseBlock);
      case "youtube":
        return normalizeYouTubeBlock(baseBlock);
      case "spotify":
        return normalizeSpotifyBlock(baseBlock);
      case "pdf":
        return normalizePdfBlock(baseBlock);
      case "external_link":
        return normalizeExternalLinkBlock(baseBlock);
      case "sync-embed":
        return normalizeSyncEmbedBlock(baseBlock);
      case "text":
        return normalizeTextBlock(baseBlock);
      case "apple_music":
        return normalizeAppleMusicBlock(baseBlock);
      case "sheet_music":
      case "tablature":
      case "abc_notation":
      case "flat_embed":
      case "speech_to_note":
        return normalizeNotationBlock(baseBlock);
      case "image":
        return normalizeImageBlock(baseBlock);
      case "audio":
        return normalizeAudioBlock(baseBlock);
      case "chord_chart":
        return normalizeChordChartBlock(baseBlock);
      case "lyrics":
        return normalizeLyricsBlock(baseBlock);
      case "rich_link":
        return normalizeRichLinkBlock(baseBlock);
      case "image_gallery":
        return normalizeImageGalleryBlock(baseBlock);
      default:
        return baseBlock;
    }
  })();

  const parsed = contentBlockSchema.safeParse(normalizedBlock);
  return parsed.success ? parsed.data : null;
}

export function sanitizeContentBlocksForStorage(input: unknown): ContentBlocksContract {
  if (!Array.isArray(input)) return [];

  const sanitized = input
    .map((block) => normalizeContentBlockForStorage(block))
    .filter((block): block is ContentBlockContract => !!block);

  const parsed = contentBlocksSchema.safeParse(sanitized);
  if (parsed.success) return parsed.data;

  return sanitized;
}
