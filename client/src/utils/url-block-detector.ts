import { parseYouTubeVideoId, parseSpotifyTrackId } from '@shared/content-blocks';

export type DetectedBlockType =
  | 'youtube'
  | 'spotify'
  | 'apple_music'
  | 'groovescribe'
  | 'sync-embed'
  | 'flat_embed'
  | 'pdf'
  | 'image'
  | 'audio'
  | 'external_link';

export interface DetectionResult {
  type: DetectedBlockType;
  confidence: 'certain' | 'likely' | 'unknown';
  prefilledData: Record<string, unknown>;
  displayLabel: string;
}

function getPathname(url: URL): string {
  return url.pathname.toLowerCase();
}

export function detectBlockType(rawInput: string): DetectionResult | null {
  const trimmed = rawInput.trim();
  if (!trimmed) return null;

  let url: URL;
  try {
    url = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);
  } catch {
    return null;
  }

  const hostname = url.hostname.replace('www.', '').toLowerCase();
  const pathname = getPathname(url);

  // YouTube
  if (hostname === 'youtube.com' || hostname === 'youtu.be' || hostname === 'm.youtube.com') {
    const videoId = parseYouTubeVideoId(trimmed);
    return {
      type: 'youtube',
      confidence: 'certain',
      prefilledData: { video: trimmed, ...(videoId ? { youtube: videoId, videoId } : {}) },
      displayLabel: 'YouTube Video',
    };
  }

  // Spotify
  if (hostname === 'open.spotify.com' || hostname === 'spotify.com') {
    const trackId = parseSpotifyTrackId(trimmed);
    return {
      type: 'spotify',
      confidence: 'certain',
      prefilledData: { spotify: trimmed, ...(trackId ? { spotifyId: trackId } : {}) },
      displayLabel: 'Spotify Track',
    };
  }

  // Apple Music
  if (hostname === 'music.apple.com') {
    return {
      type: 'apple_music',
      confidence: 'certain',
      prefilledData: { apple_music: { url: trimmed } },
      displayLabel: 'Apple Music',
    };
  }

  // Groovescribe
  if (hostname.includes('groovescribe') || (hostname.includes('musicdott') && pathname.includes('groovescribe'))) {
    return {
      type: 'groovescribe',
      confidence: 'certain',
      prefilledData: { groove: trimmed, groovescribe: trimmed, pattern: trimmed },
      displayLabel: 'GrooveScribe Pattern',
    };
  }

  // Musicdott Sync
  if (hostname === 'sync.musicdott.app' || (hostname.includes('musicdott') && pathname.includes('/e/'))) {
    return {
      type: 'sync-embed',
      confidence: 'certain',
      prefilledData: { sync: trimmed },
      displayLabel: 'Musicdott Sync',
    };
  }

  // Flat.io
  if (hostname === 'flat.io') {
    const scoreMatch = pathname.match(/\/score\/([a-zA-Z0-9]+)/);
    const scoreId = scoreMatch?.[1];
    return {
      type: 'flat_embed',
      confidence: 'certain',
      prefilledData: { ...(scoreId ? { scoreId } : {}) },
      displayLabel: 'Flat.io Score',
    };
  }

  // PDF
  if (pathname.endsWith('.pdf') || url.search.includes('.pdf')) {
    const filename = pathname.split('/').pop() || 'document.pdf';
    return {
      type: 'pdf',
      confidence: 'certain',
      prefilledData: { pdf: { url: trimmed, filename: decodeURIComponent(filename) } },
      displayLabel: 'PDF Document',
    };
  }

  // Image files
  if (/\.(jpg|jpeg|png|gif|webp|svg|avif)(\?|$)/i.test(pathname)) {
    return {
      type: 'image',
      confidence: 'likely',
      prefilledData: { url: trimmed },
      displayLabel: 'Image',
    };
  }

  // Audio files
  if (/\.(mp3|wav|ogg|flac|aac|m4a)(\?|$)/i.test(pathname)) {
    return {
      type: 'audio',
      confidence: 'likely',
      prefilledData: { url: trimmed },
      displayLabel: 'Audio File',
    };
  }

  // Fallback: external link
  return {
    type: 'external_link',
    confidence: 'unknown',
    prefilledData: { external_link: { url: trimmed, title: hostname } },
    displayLabel: 'External Link',
  };
}
