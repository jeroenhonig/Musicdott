import { isTrustedEmbedUrl } from "@shared/utils/trusted-embed-origins";

function escapeHtmlAttribute(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function readAttribute(tag: string, attribute: string): string | null {
  const match = tag.match(new RegExp(`${attribute}\\s*=\\s*["']([^"']+)["']`, "i"));
  return match?.[1] ?? null;
}

function sanitizeIframeElement(iframeHtml: string): string {
  const src = readAttribute(iframeHtml, "src");
  if (!src || !isTrustedEmbedUrl(src, { allowLocalDevelopment: true })) {
    return "";
  }

  const title = readAttribute(iframeHtml, "title");
  const width = readAttribute(iframeHtml, "width");
  const height = readAttribute(iframeHtml, "height");
  const allow = readAttribute(iframeHtml, "allow");
  const loading = readAttribute(iframeHtml, "loading");
  const referrerPolicy = readAttribute(iframeHtml, "referrerpolicy");
  const frameBorder = readAttribute(iframeHtml, "frameborder");
  const allowFullScreen = /\ballowfullscreen\b/i.test(iframeHtml);

  const attributes = [`src="${escapeHtmlAttribute(src)}"`];

  if (title) attributes.push(`title="${escapeHtmlAttribute(title)}"`);
  if (width) attributes.push(`width="${escapeHtmlAttribute(width)}"`);
  if (height) attributes.push(`height="${escapeHtmlAttribute(height)}"`);
  if (allow) attributes.push(`allow="${escapeHtmlAttribute(allow)}"`);
  if (loading) attributes.push(`loading="${escapeHtmlAttribute(loading)}"`);
  if (referrerPolicy) {
    attributes.push(`referrerpolicy="${escapeHtmlAttribute(referrerPolicy)}"`);
  }
  if (frameBorder) {
    attributes.push(`frameborder="${escapeHtmlAttribute(frameBorder)}"`);
  }
  if (allowFullScreen) {
    attributes.push("allowfullscreen");
  }

  return `<iframe ${attributes.join(" ")}></iframe>`;
}

export function sanitizeRichHtml(input: string | null | undefined): string {
  if (!input) {
    return "";
  }

  let sanitized = String(input);

  sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gis, "");
  sanitized = sanitized.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gis, "");
  sanitized = sanitized.replace(/\son\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "");
  sanitized = sanitized.replace(/\s(href|src)\s*=\s*(["'])\s*(?:javascript|vbscript):.*?\2/gi, "");
  sanitized = sanitized.replace(
    /<iframe\b[^>]*>[\s\S]*?<\/iframe>/gi,
    (match) => sanitizeIframeElement(match),
  );
  sanitized = sanitized.replace(/<(object|embed)\b[^>]*>[\s\S]*?<\/\1>/gi, "");
  sanitized = sanitized.replace(/<(object|embed)\b[^>]*\/?>/gi, "");

  return sanitized;
}
