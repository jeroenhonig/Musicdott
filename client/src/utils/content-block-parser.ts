/**
 * Content Block Parser Utility
 * Normalizes different content block formats into a consistent structure
 * Includes robust parsers for Spotify, YouTube, and other media types
 */

export interface NormalizedContentBlock {
  id: string;
  type: string;
  title?: string;
  description?: string;
  pattern?: string; // For GrooveScribe patterns
  content?: string; // For music notation content
  scoreId?: string; // For Flat.io embeds
  data: any;
}

export function parseContentBlocks(contentBlocks: any[]): NormalizedContentBlock[] {
  if (!contentBlocks || !Array.isArray(contentBlocks)) {
    return [];
  }

  return contentBlocks.map((block, index) => {
    // Handle GrooveScribe format: { type: 'groovescribe', pattern, title, description }
    if (block.type === 'groovescribe' || block.type === 'groove') {
      return {
        id: block.id || `groovescribe-${index}`,
        type: 'groovescribe',
        title: block.title || 'GrooveScribe Pattern',
        description: block.description,
        pattern: block.pattern, // Keep pattern at top level for easy access
        data: {
          ...block,
          groovescribe: block.pattern,
          pattern: block.pattern, // Also keep in data for compatibility
        }
      };
    }

    // Handle YouTube video blocks (including legacy videoId format)
    if (block.type === 'youtube' || block.type === 'video') {
      const videoId = parseYouTubeVideoId(block.videoId || block.id || block.data?.youtube);
      return {
        id: block.id || `youtube-${index}`,
        type: 'youtube',
        title: block.title || 'Video Content',
        description: block.description,
        pattern: undefined,
        data: {
          ...block,
          youtube: videoId,
          videoId: videoId
        }
      };
    }

    // Handle text content blocks
    if (block.type === 'text') {
      return {
        id: block.id || `text-${index}`,
        type: 'text',
        title: block.title || 'Text Content',
        description: block.description,
        pattern: undefined,
        data: {
          ...block,
          text: block.content || block.text
        }
      };
    }

    // Handle PDF blocks (support both legacy and structured formats)
    if (block.type === 'pdf') {
      const pdfData = parsePdfData(block);
      return {
        id: block.id || `pdf-${index}`,
        type: 'pdf',
        title: block.title || pdfData?.title || 'PDF Document',
        description: block.description,
        pattern: undefined,
        data: {
          ...block,
          pdf: pdfData // Store structured PDF data
        }
      };
    }

    // Handle Spotify blocks (robust URL/ID parsing)
    if (block.type === 'spotify') {
      const trackId = parseSpotifyTrackId(block.trackId || block.id || block.data?.spotify);
      return {
        id: block.id || `spotify-${index}`,
        type: 'spotify',
        title: block.title || 'Spotify Track',
        description: block.description,
        pattern: undefined,
        data: {
          ...block,
          spotify: trackId
        }
      };
    }

    // Handle Apple Music blocks
    if (block.type === 'apple_music') {
      return {
        id: block.id || `apple-${index}`,
        type: 'apple_music',
        title: block.title || 'Apple Music Track',
        description: block.description,
        pattern: undefined,
        data: {
          ...block,
          apple_music: block.trackId || block.id
        }
      };
    }

    // Handle music notation blocks
    if (['sheet_music', 'tablature', 'abc_notation', 'flat_embed', 'speech_to_note'].includes(block.type)) {
      const content = block.content || block.data?.content;
      const scoreId = block.scoreId || block.data?.scoreId;
      const fileUrl = block.fileUrl || block.data?.fileUrl;
      // Merge existing block.data to preserve any additional metadata
      const existingData = typeof block.data === 'object' && block.data !== null ? block.data : {};
      return {
        id: block.id || `${block.type}-${index}`,
        type: block.type,
        title: block.title || getMusicNotationTitle(block.type),
        description: block.description,
        pattern: undefined,
        content, // Add at top level for easy access
        scoreId, // Add at top level for easy access
        data: {
          ...existingData,
          content,
          fileUrl,
          scoreId
        }
      };
    }

    // Handle any other block format
    if (block.type && (block.id || block.pattern || block.content || block.videoId || block.url || block.filename)) {
      return {
        id: block.id || `block-${index}`,
        type: block.type,
        title: block.title || `${block.type} Content`,
        description: block.description,
        pattern: block.pattern, // Keep pattern at top level for easy access
        data: {
          ...block,
          // Normalize different data formats
          youtube: block.type === 'youtube' ? (block.videoId || block.id) : undefined,
          spotify: block.type === 'spotify' ? (block.trackId || block.id) : undefined,
          apple_music: block.type === 'apple_music' ? (block.trackId || block.id) : undefined,
          groovescribe: block.type === 'groovescribe' ? (block.pattern || block.data?.groovescribe) : undefined,
          pattern: block.pattern, // Also keep in data for compatibility
          text: block.type === 'text' ? (block.content || block.text) : undefined,
          pdf: block.type === 'pdf' ? (block.url || block.filename) : undefined,
        }
      };
    }

    // Handle legacy format: { type, data: { ... } }
    if (block.type && block.data) {
      return {
        id: block.id || `block-${index}`,
        type: block.type,
        title: block.title,
        description: block.description,
        pattern: block.pattern, // Preserve pattern if it exists
        data: block.data
      };
    }

    // Handle any block with a valid type (including groovescribe without pattern)
    if (block.type && isContentBlockSupported(block.type)) {
      return {
        id: block.id || `${block.type}-${index}`,
        type: block.type,
        title: block.title || `${block.type} Content`,
        description: block.description,
        pattern: block.pattern, // Preserve pattern if it exists
        data: block
      };
    }

    // Fallback for unknown formats
    return {
      id: `block-${index}`,
      type: 'unknown',
      title: 'Unknown Content',
      description: 'This content type is not supported',
      data: block
    };
  });
}

/**
 * Parse Spotify track ID from various URL formats or direct IDs
 * Supports: open.spotify.com URLs, embed URLs, or direct track IDs
 */
export function parseSpotifyTrackId(urlOrId: string): string | null {
  if (!urlOrId) return null;
  
  try {
    // If it's already a track ID (alphanumeric string), return it
    if (/^[a-zA-Z0-9]{22}$/.test(urlOrId)) {
      return urlOrId;
    }
    
    // Handle Spotify URLs
    if (urlOrId.includes('spotify.com')) {
      const url = new URL(urlOrId);
      const pathSegments = url.pathname.split('/').filter(Boolean);
      
      // Find track ID in various URL formats
      const trackIndex = pathSegments.findIndex(segment => segment === 'track');
      if (trackIndex !== -1 && pathSegments[trackIndex + 1]) {
        return pathSegments[trackIndex + 1].split('?')[0]; // Remove query params
      }
      
      // Handle embed URLs: /embed/track/ID
      const embedIndex = pathSegments.findIndex(segment => segment === 'embed');
      if (embedIndex !== -1 && pathSegments[embedIndex + 1] === 'track' && pathSegments[embedIndex + 2]) {
        return pathSegments[embedIndex + 2].split('?')[0];
      }
    }
    
    return null;
  } catch (error) {
    console.warn('Failed to parse Spotify URL/ID:', urlOrId, error);
    return null;
  }
}

/**
 * Parse YouTube video ID from various URL formats or direct IDs
 */
export function parseYouTubeVideoId(urlOrId: string): string | null {
  if (!urlOrId) return null;
  
  try {
    // If it's already a video ID (11 chars alphanumeric), return it
    if (/^[a-zA-Z0-9_-]{11}$/.test(urlOrId)) {
      return urlOrId;
    }
    
    // Handle YouTube URLs
    if (urlOrId.includes('youtube.com') || urlOrId.includes('youtu.be')) {
      const url = new URL(urlOrId);
      
      // Handle youtu.be/VIDEO_ID format
      if (url.hostname === 'youtu.be') {
        return url.pathname.slice(1).split('?')[0];
      }
      
      // Handle youtube.com/watch?v=VIDEO_ID format
      if (url.searchParams.has('v')) {
        return url.searchParams.get('v');
      }
      
      // Handle youtube.com/embed/VIDEO_ID format
      const pathMatch = url.pathname.match(/\/embed\/([a-zA-Z0-9_-]{11})/);
      if (pathMatch) {
        return pathMatch[1];
      }
    }
    
    return null;
  } catch (error) {
    console.warn('Failed to parse YouTube URL/ID:', urlOrId, error);
    return null;
  }
}

/**
 * Parse PDF data from various formats
 */
export function parsePdfData(block: any): { url: string; filename?: string; title?: string } | null {
  if (!block) return null;
  
  // Handle structured PDF data: { url, filename, title }
  if (block.data?.pdf && typeof block.data.pdf === 'object') {
    return {
      url: block.data.pdf.url,
      filename: block.data.pdf.filename,
      title: block.data.pdf.title
    };
  }
  
  // Handle direct URL in data.pdf
  if (typeof block.data?.pdf === 'string') {
    return { url: block.data.pdf };
  }
  
  // Handle legacy formats
  if (block.url || block.filename) {
    return {
      url: block.url || block.filename,
      filename: block.filename,
      title: block.title
    };
  }
  
  return null;
}

export function isContentBlockSupported(type: string): boolean {
  const supportedTypes = [
    'youtube',
    'spotify', 
    'apple_music',
    'groovescribe',
    'groove',
    'video',
    'text',
    'pdf',
    'external_link',
    'sheet_music',
    'tablature',
    'abc_notation',
    'flat_embed',
    'speech_to_note'
  ];
  return supportedTypes.includes(type);
}

export interface MusicNotationBlockData {
  type: 'sheet_music' | 'tablature' | 'abc_notation' | 'flat_embed' | 'speech_to_note';
  content?: string;
  fileUrl?: string;
  scoreId?: string;
  title?: string;
}

export function getMusicNotationTitle(type: string): string {
  const titles: Record<string, string> = {
    'sheet_music': 'Sheet Music',
    'tablature': 'Tablature',
    'abc_notation': 'ABC Notation',
    'flat_embed': 'Interactive Score',
    'speech_to_note': 'Voice Transcription'
  };
  return titles[type] || 'Music Notation';
}