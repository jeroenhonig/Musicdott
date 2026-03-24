const TRUSTED_EMBED_HOST_PATTERNS = [
  /^(?:www\.)?youtube\.com$/i,
  /^(?:www\.)?youtube-nocookie\.com$/i,
  /^open\.spotify\.com$/i,
  /^embed\.music\.apple\.com$/i,
  /^music\.apple\.com$/i,
  /^(?:www\.)?musicdott\.app$/i,
  /^(?:www\.)?musicdott\.honig-it\.com$/i,
  /^(?:[a-z0-9-]+\.)?sync\.musicdott\.app$/i,
  /^(?:[a-z0-9-]+\.)*flat\.io$/i,
] as const;

export const TRUSTED_EMBED_FRAME_SOURCES = [
  "https://www.youtube.com",
  "https://www.youtube-nocookie.com",
  "https://open.spotify.com",
  "https://embed.music.apple.com",
  "https://music.apple.com",
  "https://musicdott.app",
  "https://musicdott.honig-it.com",
  "https://sync.musicdott.app",
  "https://flat.io",
  "https://*.flat.io",
] as const;

export function isTrustedEmbedUrl(
  value: string,
  options: { allowLocalDevelopment?: boolean } = {},
): boolean {
  const input = value?.trim();
  if (!input) {
    return false;
  }

  if (input.startsWith("blob:")) {
    return true;
  }

  if (/^data:application\/pdf/i.test(input)) {
    return true;
  }

  try {
    const url = new URL(input);
    const hostname = url.hostname.toLowerCase();

    if (options.allowLocalDevelopment && /^(localhost|127\.0\.0\.1)$/i.test(hostname)) {
      return url.protocol === "http:" || url.protocol === "https:";
    }

    if (url.protocol !== "https:") {
      return false;
    }

    return TRUSTED_EMBED_HOST_PATTERNS.some((pattern) => pattern.test(hostname));
  } catch {
    return false;
  }
}
