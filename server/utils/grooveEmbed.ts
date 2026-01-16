// server/utils/grooveEmbed.ts
// Server-side versie van de Groovescribe normalisatie
// Normaliseert alle Groovescribe-varianten (iframe, URL, kale query) naar één nette embed.

export const PREFER_HOST = "https://teacher.musicdott.com/groovescribe/GrooveEmbed.html";

export function normalizeYouTube(input: string): string {
  if (!input) return "";
  const s = String(input).trim();
  const m = s.match(/(?:v=|youtu\.be\/|shorts\/)([A-Za-z0-9_-]{6,})/);
  return m
    ? `<iframe width="560" height="315" src="https://www.youtube.com/embed/${m[1]}" allowfullscreen></iframe>`
    : s;
}

function extractSrcFromIframe(html: string): string | null {
  const m = html.match(/src=["']([^"']+)["']/i);
  return m ? m[1] : null;
}

export function normalizeGrooveSingle(raw: string, preferHost: string = PREFER_HOST): string {
  if (!raw) return "";
  const s = String(raw).trim();

  // Case 1: al een iframe
  if (/^<iframe/i.test(s)) {
    const src = extractSrcFromIframe(s);
    if (!src) return "";
    const hasQ = src.includes("?");
    const tail = hasQ ? src.split("?")[1] : (src.includes("TimeSig=") ? "TimeSig=" + src.split("TimeSig=")[1] : "");
    return tail
      ? `<iframe width="100%" height="240" src="${preferHost}?${tail}" frameborder="0"></iframe>`
      : `<iframe width="100%" height="240" src="${src}" frameborder="0"></iframe>`;
  }

  // Case 2: volledige URL (teacher.musicdott.com|mikeslessons.com)
  if (/^https?:\/\//i.test(s)) {
    const hasQ = s.includes("?");
    const tail = hasQ ? s.split("?")[1] : (s.includes("TimeSig=") ? "TimeSig=" + s.split("TimeSig=")[1] : "");
    return tail
      ? `<iframe width="100%" height="240" src="${preferHost}?${tail}" frameborder="0"></iframe>`
      : "";
  }

  // Case 3: Kale query (?TimeSig=... of TimeSig=...)
  if (/^\??TimeSig=/.test(s)) {
    const q = s.replace(/^\?/, "");
    return `<iframe width="100%" height="240" src="${preferHost}?${q}" frameborder="0"></iframe>`;
  }

  return s;
}

/**
 * Normaliseert ALLE Groovescribe-snippets die in een groter content-blok verstopt kunnen zitten.
 */
export function normalizeGrooveInText(content: string, preferHost: string = PREFER_HOST): string {
  if (!content) return "";
  let out = content;

  // 1) Iframes
  out = out.replace(
    /<iframe[^>]+?(?:groove|groovescribe)[^>]*>.*?<\/iframe>/gis,
    (m) => normalizeGrooveSingle(m, preferHost)
  );

  // 2) Volledige URLs
  out = out.replace(
    /(https?:\/\/(?:www\.)?(?:teacher\.musicdott\.com\/groovescribe|mikeslessons\.com\/groove)[^\s)"]+)/gi,
    (m) => normalizeGrooveSingle(m, preferHost)
  );

  // 3) Kale queries op hun eigen regel
  out = out.replace(
    /(^|\n)(\??TimeSig=[^\n]+)/g,
    (_full, prefix, query) => `${prefix}${normalizeGrooveSingle(query, preferHost)}`
  );

  return out;
}

/** Combineert GS + YouTube normalisatie voor volledige rich contentvelden. */
export function normalizeRichContent(content: string): string {
  let c = normalizeGrooveInText(content);
  c = c.replace(
    /(^|\n)(https?:\/\/(?:www\.)?youtu(?:be\.com|\.be)\/[^\s)"]+)/gi,
    (_f, p, url) => `${p}${normalizeYouTube(url)}`
  );
  return c;
}