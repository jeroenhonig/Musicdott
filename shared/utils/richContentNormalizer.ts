import normalizeGroovescribeEmbed from "./normalizeGroovescribeEmbed";
import normalizeYouTubeEmbed from "./normalizeYouTubeEmbed";

export const PREFER_HOST = "https://musicdott.app/groovescribe/GrooveEmbed.html";

function extractSrcFromIframe(html: string): string | null {
  const match = html.match(/src=["']([^"']+)["']/i);
  return match ? match[1] : null;
}

function extractGrooveQueryTail(input: string): string | null {
  if (!input) return null;

  if (input.includes("?")) {
    return input.split("?")[1] || null;
  }

  if (input.includes("TimeSig=")) {
    return `TimeSig=${input.split("TimeSig=")[1]}`;
  }

  return null;
}

export function normalizeYouTube(input: string): string {
  if (!input) return "";

  const raw = String(input).trim();
  const normalized = normalizeYouTubeEmbed(raw);
  const embedUrl = normalized.embed.embed_url;

  return embedUrl
    ? `<iframe width="560" height="315" src="${embedUrl}" allowfullscreen></iframe>`
    : raw;
}

export function normalizeGrooveSingle(raw: string, preferHost: string = PREFER_HOST): string {
  if (!raw) return "";

  const input = String(raw).trim();

  if (/^<iframe/i.test(input)) {
    const src = extractSrcFromIframe(input);
    if (!src) return "";
    const tail = extractGrooveQueryTail(src);
    const finalUrl = tail ? `${preferHost}?${tail}` : src;
    return `<iframe width="100%" height="240" src="${finalUrl}" frameborder="0"></iframe>`;
  }

  const normalized = normalizeGroovescribeEmbed(input, preferHost);
  const embedUrl = normalized.embed.embed_url;
  if (!embedUrl) return input;

  const tail = extractGrooveQueryTail(embedUrl) ?? extractGrooveQueryTail(input);
  const finalUrl = tail ? `${preferHost}?${tail}` : embedUrl;
  return `<iframe width="100%" height="240" src="${finalUrl}" frameborder="0"></iframe>`;
}

export function normalizeGrooveInText(content: string, preferHost: string = PREFER_HOST): string {
  if (!content) return "";

  let out = content;

  out = out.replace(
    /<iframe[^>]+?(?:groove|groovescribe)[^>]*>.*?<\/iframe>/gis,
    (match) => normalizeGrooveSingle(match, preferHost),
  );

  out = out.replace(
    /(https?:\/\/(?:www\.)?(?:(?:teacher\.)?musicdott\.(?:app|com)\/groovescribe|mikeslessons\.com\/groove)[^\s)"]+)/gi,
    (match) => normalizeGrooveSingle(match, preferHost),
  );

  out = out.replace(
    /(^|\n)(\??TimeSig=[^\n]+)/g,
    (_full, prefix, query) => `${prefix}${normalizeGrooveSingle(query, preferHost)}`,
  );

  return out;
}

export function normalizeRichContent(content: string): string {
  let normalized = normalizeGrooveInText(content);
  normalized = normalized.replace(
    /(^|\n)(https?:\/\/(?:www\.)?youtu(?:be\.com|\.be)\/[^\s)"]+)/gi,
    (_full, prefix, url) => `${prefix}${normalizeYouTube(url)}`,
  );
  return normalized;
}
