import type { EmbedModule, EmbedStatus } from "./embedTypes";

function extractIframeSrc(html: string): string | null {
  const match = html.match(/src=["']([^"']+)["']/i);
  return match ? match[1] : null;
}

function ensureProtocol(url: string): string {
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith("//")) return `https:${url}`;
  if (/^[A-Za-z0-9-]+\.[A-Za-z0-9.-]+/.test(url)) return `https://${url}`;
  return url;
}

function extractSpotifyTypeAndId(url: string): { type: string; id: string } | null {
  const match = url.match(/spotify\.com\/(embed\/)?(track|album|playlist)\/([A-Za-z0-9]+)/i);
  if (!match) return null;
  return { type: match[2], id: match[3] };
}

function buildFallback(raw: string): EmbedModule {
  return {
    type: "video",
    provider: "spotify",
    status: "fallback",
    embed: {
      embed_url: null,
      raw
    },
    fallback: {
      label: "Open Spotify",
      url: raw
    }
  };
}

export default function normalizeSpotifyEmbed(rawInput: string): EmbedModule {
  const raw = rawInput ?? "";
  const trimmed = String(raw).trim();

  if (!trimmed || /^javascript:/i.test(trimmed)) {
    return buildFallback(raw);
  }

  let candidate = trimmed;

  if (/<iframe/i.test(trimmed)) {
    const src = extractIframeSrc(trimmed);
    if (src) candidate = src;
  }

  const candidateWithProtocol = ensureProtocol(candidate);
  const parsed = extractSpotifyTypeAndId(candidateWithProtocol);

  if (!parsed) {
    return buildFallback(raw);
  }

  const embedUrl = `https://open.spotify.com/embed/${parsed.type}/${parsed.id}`;
  const status: EmbedStatus = "embedded";

  return {
    type: "video",
    provider: "spotify",
    status,
    embed: {
      embed_url: embedUrl,
      raw
    },
    fallback: {
      label: "Open Spotify",
      url: raw
    }
  };
}
