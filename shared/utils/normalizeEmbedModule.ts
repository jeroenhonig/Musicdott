import type { EmbedModule } from "./embedTypes";
import normalizeGroovescribeEmbed from "./normalizeGroovescribeEmbed";
import normalizeYouTubeEmbed from "./normalizeYouTubeEmbed";
import normalizeSpotifyEmbed from "./normalizeSpotifyEmbed";

function extractIframeSrc(html: string): string | null {
  const match = html.match(/src=["']([^"']+)["']/i);
  return match ? match[1] : null;
}

function buildExternalFallback(raw: string): EmbedModule {
  return {
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
    }
  };
}

function isGroovescribeLike(input: string): boolean {
  return /groovescribe/i.test(input) || /mikeslessons\.com\/groove/i.test(input) || /(?:^|[?&#])(?:TimeSig|Div|Tempo|H|S|K|T|C|Measures)=/i.test(input);
}

function isYouTubeLike(input: string): boolean {
  return /youtu\.be/i.test(input) || /youtube\.com/i.test(input);
}

function isSpotifyLike(input: string): boolean {
  return /open\.spotify\.com/i.test(input) || /spotify\.com\/embed/i.test(input);
}

export default function normalizeEmbedModule(rawInput: string): EmbedModule {
  const raw = rawInput ?? "";
  const trimmed = String(raw).trim();

  if (!trimmed || /^javascript:/i.test(trimmed)) {
    return buildExternalFallback(raw);
  }

  if (/<iframe/i.test(trimmed)) {
    const src = extractIframeSrc(trimmed);
    if (src) {
      const normalized = normalizeEmbedModule(src);
      return {
        ...normalized,
        embed: {
          ...normalized.embed,
          raw
        },
        fallback: normalized.fallback
          ? {
              ...normalized.fallback,
              url: raw
            }
          : normalized.fallback
      };
    }
  }

  if (isGroovescribeLike(trimmed)) {
    return normalizeGroovescribeEmbed(raw);
  }

  if (isYouTubeLike(trimmed)) {
    return normalizeYouTubeEmbed(raw);
  }

  if (isSpotifyLike(trimmed)) {
    return normalizeSpotifyEmbed(raw);
  }

  return buildExternalFallback(raw);
}
