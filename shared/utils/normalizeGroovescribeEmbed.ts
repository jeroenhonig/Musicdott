import type { EmbedModule, EmbedStatus } from "./embedTypes";

const DEFAULT_PREFER_HOST = "https://teacher.musicdott.com/groovescribe/GrooveEmbed.html";
const GROOVESCRIBE_PARAM_KEYS = [
  "TimeSig",
  "Div",
  "Tempo",
  "H",
  "S",
  "K",
  "T",
  "C",
  "Measures"
];

function extractIframeSrc(html: string): string | null {
  const match = html.match(/src=["']([^"']+)["']/i);
  return match ? match[1] : null;
}

function hasGrooveParams(input: string): boolean {
  const pattern = new RegExp(`(?:^|[?&#])(?:${GROOVESCRIBE_PARAM_KEYS.join("|")})=`, "i");
  return pattern.test(input);
}

function isGroovescribeUrl(input: string): boolean {
  return /groovescribe/i.test(input) || /mikeslessons\.com\/groove/i.test(input);
}

function ensureProtocol(url: string): string {
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith("//")) return `https:${url}`;
  if (/^[A-Za-z0-9-]+\.[A-Za-z0-9.-]+/.test(url)) return `https://${url}`;
  return url;
}

function buildEmbedFromQuery(queryInput: string, preferHost: string): string {
  const trimmed = queryInput.trim();
  const query = trimmed.startsWith("?") ? trimmed.slice(1) : trimmed;
  return `${preferHost}?${query}`;
}

function buildGroovescribeModule(
  rawInput: string,
  preferHost: string = DEFAULT_PREFER_HOST
): EmbedModule {
  const raw = rawInput ?? "";
  const trimmed = String(raw).trim();
  let candidate = trimmed;

  if (/<iframe/i.test(trimmed)) {
    const src = extractIframeSrc(trimmed);
    if (src) candidate = src;
  }

  const candidateWithProtocol = ensureProtocol(candidate);
  const candidateHasParams = hasGrooveParams(candidate);
  const candidateIsGroove = isGroovescribeUrl(candidate);

  let embedUrl: string | null = null;

  if (candidateIsGroove || candidateHasParams) {
    if (candidateIsGroove) {
      embedUrl = ensureProtocol(candidateWithProtocol);
    } else if (candidateHasParams) {
      embedUrl = buildEmbedFromQuery(candidate, preferHost);
    }
  }

  const status: EmbedStatus = embedUrl ? "embedded" : "fallback";
  const provider: EmbedModule["provider"] =
    candidateIsGroove || candidateHasParams ? "groovescribe" : "external";

  return {
    type: "notation",
    provider,
    embed: {
      embed_url: embedUrl,
      raw: raw
    },
    status,
    fallback: {
      label: "Open Groovescribe",
      url: raw
    }
  };
}

export default function normalizeGroovescribeEmbed(
  rawInput: string,
  preferHost: string = DEFAULT_PREFER_HOST
): EmbedModule {
  return buildGroovescribeModule(rawInput, preferHost);
}
