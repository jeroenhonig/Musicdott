/**
 * Content Block Parser Utility
 * Converts stored content blocks into render-friendly shapes for the client.
 */

import {
  asContentBlockData,
  buildSpotifyTrackUrl,
  buildYouTubeWatchUrl,
  extractIframeSrc,
  firstString,
  isContentBlockSupported as isContentBlockSupportedShared,
  normalizeContentBlockForStorage,
  parsePdfData as parsePdfDataShared,
  parseSpotifyTrackId as parseSpotifyTrackIdShared,
  parseYouTubeVideoId as parseYouTubeVideoIdShared,
} from "@shared/content-blocks";

export interface NormalizedContentBlock {
  id: string;
  type: string;
  title?: string;
  description?: string;
  pattern?: string;
  content?: string;
  scoreId?: string;
  videoId?: string;
  data: any;
}

function fallbackBlock(block: any, index: number): NormalizedContentBlock {
  return {
    id: block?.id || `block-${index}`,
    type: block?.type || "unknown",
    title: block?.title || "Unknown Content",
    description: block?.description,
    pattern: typeof block?.pattern === "string" ? block.pattern : undefined,
    content: typeof block?.content === "string" ? block.content : undefined,
    videoId: typeof block?.videoId === "string" ? block.videoId : undefined,
    data: asContentBlockData(block?.data ?? block),
  };
}

export function parseContentBlocks(contentBlocks: any[]): NormalizedContentBlock[] {
  if (!Array.isArray(contentBlocks)) {
    return [];
  }

  return contentBlocks.map((rawBlock, index) => {
    const storageBlock = normalizeContentBlockForStorage(rawBlock);
    if (!storageBlock) {
      return fallbackBlock(rawBlock, index);
    }

    const block = storageBlock as Record<string, any>;
    const blockData = asContentBlockData(block.data);
    const normalizedBase: NormalizedContentBlock = {
      id: typeof block.id === "string" && block.id ? block.id : `${block.type}-${index}`,
      type: block.type,
      title: block.title,
      description: block.description,
      pattern: typeof block.pattern === "string" ? block.pattern : undefined,
      content: typeof block.content === "string" ? block.content : undefined,
      videoId: typeof block.videoId === "string" ? block.videoId : undefined,
      scoreId: typeof blockData.scoreId === "string" ? blockData.scoreId : undefined,
      data: blockData,
    };

    if (block.type === "groovescribe") {
      const grooveSource = firstString(
        block.pattern,
        blockData.pattern,
        blockData.groovescribe,
        extractIframeSrc(block.content),
        block.url,
        block.content,
      );

      return {
        ...normalizedBase,
        type: "groovescribe",
        title: block.title || "GrooveScribe Pattern",
        pattern: grooveSource,
        data: {
          ...blockData,
          ...(grooveSource
            ? {
                groove: grooveSource,
                groovescribe: grooveSource,
                pattern: grooveSource,
              }
            : {}),
        },
      };
    }

    if (block.type === "youtube") {
      const videoSource = firstString(
        blockData.youtube,
        blockData.video,
        blockData.videoId,
        block.videoId,
        block.url,
        extractIframeSrc(block.content),
        block.content,
      );
      const videoId = parseYouTubeVideoIdShared(videoSource || "");
      const videoUrl =
        buildYouTubeWatchUrl(videoId) ??
        firstString(
          typeof blockData.video === "string" ? blockData.video : undefined,
          typeof blockData.youtube === "string" && blockData.youtube.includes("http")
            ? blockData.youtube
            : undefined,
          block.url,
          videoSource,
        );

      return {
        ...normalizedBase,
        type: "youtube",
        title: block.title || "Video Content",
        videoId: videoId || undefined,
        data: {
          ...blockData,
          ...(videoUrl ? { video: videoUrl } : {}),
          ...(videoId ? { youtube: videoId, videoId } : {}),
        },
      };
    }

    if (block.type === "spotify") {
      const spotifySource = firstString(
        blockData.spotify,
        block.url,
        extractIframeSrc(block.content),
        block.content,
        block.trackId,
      );
      const trackId = parseSpotifyTrackIdShared(spotifySource || "");
      const spotifyUrl =
        buildSpotifyTrackUrl(trackId) ??
        firstString(
          typeof blockData.spotify === "string" && blockData.spotify.includes("spotify.com")
            ? blockData.spotify
            : undefined,
          block.url,
        );

      return {
        ...normalizedBase,
        type: "spotify",
        title: block.title || "Spotify Track",
        data: {
          ...blockData,
          ...(spotifyUrl ? { spotify: spotifyUrl } : {}),
          ...(trackId ? { spotifyId: trackId } : {}),
        },
      };
    }

    if (block.type === "pdf") {
      const pdfData = parsePdfDataShared(block);
      return {
        ...normalizedBase,
        type: "pdf",
        title: block.title || pdfData?.title || "PDF Document",
        data: {
          ...blockData,
          ...(pdfData ? { pdf: pdfData } : {}),
        },
      };
    }

    if (block.type === "external_link") {
      const external =
        blockData.external_link && typeof blockData.external_link === "object"
          ? asContentBlockData(blockData.external_link)
          : undefined;

      return {
        ...normalizedBase,
        type: "external_link",
        title: block.title || external?.title || "External Resource",
        description: block.description || external?.description,
        data: {
          ...blockData,
          ...(external ? { external_link: external } : {}),
        },
      };
    }

    if (block.type === "sync-embed") {
      return {
        ...normalizedBase,
        type: "sync-embed",
        title: block.title || "Musicdott Sync",
        data: {
          ...blockData,
          ...(typeof blockData.sync === "string" ? { sync: blockData.sync } : {}),
        },
      };
    }

    if (block.type === "text") {
      const textContent = firstString(blockData.text, block.content);
      return {
        ...normalizedBase,
        type: "text",
        title: block.title || "Text Content",
        content: textContent,
        data: {
          ...blockData,
          ...(textContent ? { text: textContent } : {}),
        },
      };
    }

    if (block.type === "apple_music") {
      return {
        ...normalizedBase,
        type: "apple_music",
        title: block.title || "Apple Music Track",
        data: {
          ...blockData,
          ...(blockData.apple_music ? { apple_music: blockData.apple_music } : {}),
        },
      };
    }

    if (["sheet_music", "tablature", "abc_notation", "flat_embed", "speech_to_note"].includes(block.type)) {
      return {
        ...normalizedBase,
        content: typeof blockData.content === "string" ? blockData.content : normalizedBase.content,
        scoreId: typeof blockData.scoreId === "string" ? blockData.scoreId : normalizedBase.scoreId,
        data: {
          ...blockData,
        },
      };
    }

    if (block.type === "image") {
      return {
        ...normalizedBase,
        type: "image",
        title: block.title || "Image",
        data: {
          ...blockData,
          url: blockData.url || block.url,
          alt: blockData.alt || block.title,
        },
      };
    }

    if (block.type === "audio") {
      return {
        ...normalizedBase,
        type: "audio",
        title: block.title || "Audio",
        data: {
          ...blockData,
          url: blockData.url || block.url,
        },
      };
    }

    if (block.type === "chord_chart") {
      const chartContent = firstString(blockData.content, block.content);
      return {
        ...normalizedBase,
        type: "chord_chart",
        title: block.title || "Chord Chart",
        content: chartContent,
        data: {
          ...blockData,
          ...(chartContent ? { content: chartContent } : {}),
        },
      };
    }

    if (block.type === "lyrics") {
      const lyricsContent = firstString(blockData.content, block.content);
      return {
        ...normalizedBase,
        type: "lyrics",
        title: block.title || "Lyrics",
        content: lyricsContent,
        data: {
          ...blockData,
          ...(lyricsContent ? { content: lyricsContent } : {}),
        },
      };
    }

    if (block.type === "rich_link") {
      return {
        ...normalizedBase,
        type: "rich_link",
        title: block.title || blockData.title || "Link",
        data: {
          ...blockData,
          url: blockData.url || block.url,
        },
      };
    }

    if (block.type === "image_gallery") {
      return {
        ...normalizedBase,
        type: "image_gallery",
        title: block.title || "Image Gallery",
        data: {
          ...blockData,
          images: Array.isArray(blockData.images) ? blockData.images : [],
        },
      };
    }

    return normalizedBase;
  });
}

export const parseSpotifyTrackId = parseSpotifyTrackIdShared;
export const parseYouTubeVideoId = parseYouTubeVideoIdShared;
export const parsePdfData = parsePdfDataShared;
export const isContentBlockSupported = isContentBlockSupportedShared;

export interface MusicNotationBlockData {
  type: "sheet_music" | "tablature" | "abc_notation" | "flat_embed" | "speech_to_note";
  content?: string;
  fileUrl?: string;
  scoreId?: string;
  title?: string;
}

export function getMusicNotationTitle(type: string): string {
  const titles: Record<string, string> = {
    sheet_music: "Sheet Music",
    tablature: "Tablature",
    abc_notation: "ABC Notation",
    flat_embed: "Interactive Score",
    speech_to_note: "Voice Transcription",
  };
  return titles[type] || "Music Notation";
}
