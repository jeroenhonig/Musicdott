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

function extractYouTubeId(url: string): string | null {
  const patterns = [
    /[?&]v=([A-Za-z0-9_-]{6,})/i,
    /youtu\.be\/([A-Za-z0-9_-]{6,})/i,
    /youtube\.com\/embed\/([A-Za-z0-9_-]{6,})/i,
    /youtube\.com\/shorts\/([A-Za-z0-9_-]{6,})/i
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }

  return null;
}

function buildFallback(raw: string): EmbedModule {
  return {
    type: "video",
    provider: "youtube",
    status: "fallback",
    embed: {
      embed_url: null,
      raw
    },
    fallback: {
      label: "Open YouTube",
      url: raw
    }
  };
}

export default function normalizeYouTubeEmbed(rawInput: string): EmbedModule {
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
  const videoId = extractYouTubeId(candidateWithProtocol);

  if (!videoId) {
    return buildFallback(raw);
  }

  const embedUrl = `https://www.youtube.com/embed/${videoId}`;
  const status: EmbedStatus = "embedded";

  return {
    type: "video",
    provider: "youtube",
    status,
    embed: {
      embed_url: embedUrl,
      raw
    },
    fallback: {
      label: "Open YouTube",
      url: raw
    }
  };
}
