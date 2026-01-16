import { DatabaseStorage } from './database-storage';
import { ContentBlock } from '../client/src/components/lessons/content-block-manager';
import { SongContentBlock } from '../client/src/components/songs/song-content-manager';
import { normalizeRichContent } from './utils/grooveEmbed';

export interface ImportedSong {
  title: string;
  artist: string;
  instrument: string;
  level: string;
  description?: string;
  contentBlocks: string; // JSON string of content blocks
}

export interface ImportedLesson {
  title: string;
  description: string;
  contentType: string;
  instrument: string;
  level: string;
  contentBlocks: string; // JSON string of content blocks
}

export class ImportUtility {
  private storage: DatabaseStorage;

  constructor() {
    this.storage = new DatabaseStorage();
  }

  /**
   * Parse a Groovescribe parameter string and convert it to content block format
   */
  parseGroovescribeParams(grooveParams: string): ContentBlock {
    // Ensure the parameter string starts with '?' for proper formatting
    const formattedParams = grooveParams.startsWith('?') ? grooveParams : `?${grooveParams}`;
    
    return {
      id: `groove-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: 'groove',
      data: {
        groove: formattedParams
      }
    };
  }

  /**
   * Parse YouTube embed iframe and convert to content block format
   */
  parseYouTubeEmbed(iframeHtml: string): ContentBlock | null {
    try {
      // Extract the src URL from the iframe
      const srcMatch = iframeHtml.match(/src="([^"]+)"/);
      if (!srcMatch) return null;

      const srcUrl = srcMatch[1];
      
      // Convert YouTube embed URL to watch URL for our VideoEmbed component
      const videoIdMatch = srcUrl.match(/\/embed\/([^?]+)/);
      if (!videoIdMatch) return null;

      const videoId = videoIdMatch[1];
      const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;

      return {
        id: `video-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: 'video',
        data: {
          video: watchUrl
        }
      };
    } catch (error) {
      console.error('Error parsing YouTube embed:', error);
      return null;
    }
  }

  /**
   * Parse Spotify embed iframe and convert to content block format
   */
  parseSpotifyEmbed(iframeHtml: string): ContentBlock | null {
    try {
      // Extract the src URL from the iframe
      const srcMatch = iframeHtml.match(/src="([^"]+)"/);
      if (!srcMatch) return null;

      const srcUrl = srcMatch[1];
      
      // Extract track/album ID from Spotify embed URL
      const spotifyMatch = srcUrl.match(/spotify\.com\/embed\/(track|album)\/([^?]+)/);
      if (!spotifyMatch) return null;

      const [, type, id] = spotifyMatch;
      const spotifyUrl = `https://open.spotify.com/${type}/${id}`;

      return {
        id: `spotify-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: 'spotify',
        data: {
          spotify: spotifyUrl
        }
      };
    } catch (error) {
      console.error('Error parsing Spotify embed:', error);
      return null;
    }
  }

  /**
   * Parse Apple Music embed iframe and convert to content block format
   */
  parseAppleMusicEmbed(iframeHtml: string): ContentBlock | null {
    try {
      // Extract the src URL from the iframe
      const srcMatch = iframeHtml.match(/src="([^"]+)"/);
      if (!srcMatch) return null;

      const srcUrl = srcMatch[1];
      
      // For Apple Music, we can use the embed URL directly
      // Our AppleMusicEmbed component should handle this
      return {
        id: `external_link-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: 'external_link',
        data: {
          external_link: {
            url: srcUrl,
            title: 'Apple Music Track',
            description: 'Apple Music embedded content'
          }
        }
      };
    } catch (error) {
      console.error('Error parsing Apple Music embed:', error);
      return null;
    }
  }

  /**
   * Process mixed content from old system and convert to content blocks
   * Now uses enhanced normalization for all Groovescribe and YouTube variants
   */
  processOldContent(contentString: string): ContentBlock[] {
    const contentBlocks: ContentBlock[] = [];
    
    // First normalize the content using the new utility
    const normalizedContent = normalizeRichContent(contentString);
    
    // Split content by iframe tags and other separators
    const parts = normalizedContent.split(/(<iframe[^>]*>.*?<\/iframe>)/gi);
    
    for (const part of parts) {
      const trimmedPart = part.trim();
      
      if (!trimmedPart) continue;
      
      // Check if it's an iframe
      if (trimmedPart.startsWith('<iframe')) {
        let block: ContentBlock | null = null;
        
        // Determine the type of embed
        if (trimmedPart.includes('youtube.com/embed')) {
          block = this.parseYouTubeEmbed(trimmedPart);
        } else if (trimmedPart.includes('spotify.com/embed')) {
          block = this.parseSpotifyEmbed(trimmedPart);
        } else if (trimmedPart.includes('music.apple.com')) {
          block = this.parseAppleMusicEmbed(trimmedPart);
        } else if (trimmedPart.includes('teacher.musicdott.com/groovescribe')) {
          // Handle normalized Groovescribe embeds
          const grooveBlock = this.parseGroovescribeEmbed(trimmedPart);
          if (grooveBlock) {
            contentBlocks.push(grooveBlock);
            continue;
          }
        }
        
        if (block) {
          contentBlocks.push(block);
        }
      } 
      // Check if it's a bare Groovescribe parameter string (shouldn't happen after normalization, but just in case)
      else if (trimmedPart.includes('TimeSig=') && trimmedPart.includes('Div=')) {
        const grooveBlock = this.parseGroovescribeParams(trimmedPart);
        contentBlocks.push(grooveBlock);
      }
      // Handle any remaining text as text content
      else if (trimmedPart.length > 10) { // Only add substantial text
        const textBlock: ContentBlock = {
          id: `text-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          type: 'text',
          data: {
            text: trimmedPart
          }
        };
        contentBlocks.push(textBlock);
      }
    }
    
    return contentBlocks;
  }

  /**
   * Parse normalized Groovescribe iframe and convert to content block format
   */
  parseGroovescribeEmbed(iframeHtml: string): ContentBlock | null {
    try {
      // Extract the src URL from the iframe
      const srcMatch = iframeHtml.match(/src="([^"]+)"/);
      if (!srcMatch) return null;

      const srcUrl = srcMatch[1];
      
      // Extract just the query parameters for the groove block
      const queryStart = srcUrl.indexOf('?');
      if (queryStart === -1) return null;
      
      const queryParams = srcUrl.substring(queryStart);

      return {
        id: `groove-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: 'groove',
        data: {
          groove: queryParams
        }
      };
    } catch (error) {
      console.error('Error parsing Groovescribe embed:', error);
      return null;
    }
  }

  /**
   * Import a single song from old system data
   */
  async importSong(userId: number, songData: {
    title: string;
    artist: string;
    instrument: string;
    level: string;
    description?: string;
    content?: string; // Mixed content from old system
  }): Promise<void> {
    try {
      // Normalize and process the content into content blocks
      const normalizedContent = songData.content ? normalizeRichContent(songData.content) : '';
      const contentBlocks = normalizedContent ? 
        this.processOldContent(normalizedContent) : [];
      
      // Create the song
      await this.storage.createSong({
        userId,
        title: songData.title,
        composer: songData.artist, // Map artist to composer field
        instrument: songData.instrument,
        difficulty: songData.level, // Map level to difficulty field
        description: songData.description || '',
        contentBlocks: JSON.stringify(contentBlocks)
      });
      
      console.log(`Successfully imported song: ${songData.title} by ${songData.artist}`);
    } catch (error) {
      console.error(`Failed to import song ${songData.title}:`, error);
      throw error;
    }
  }

  /**
   * Import a single lesson from old system data
   */
  async importLesson(userId: number, lessonData: {
    title: string;
    description: string;
    contentType: string;
    instrument: string;
    level: string;
    content?: string; // Mixed content from old system
  }): Promise<void> {
    try {
      // Normalize and process the content into content blocks
      const normalizedContent = lessonData.content ? normalizeRichContent(lessonData.content) : '';
      const contentBlocks = normalizedContent ? 
        this.processOldContent(normalizedContent) : [];
      
      // Create the lesson
      await this.storage.createLesson({
        userId,
        title: lessonData.title,
        description: lessonData.description,
        contentType: lessonData.contentType,
        instrument: lessonData.instrument,
        level: lessonData.level,
        contentBlocks: JSON.stringify(contentBlocks)
      });
      
      console.log(`Successfully imported lesson: ${lessonData.title}`);
    } catch (error) {
      console.error(`Failed to import lesson ${lessonData.title}:`, error);
      throw error;
    }
  }

  /**
   * Batch import songs from CSV or JSON data
   */
  async batchImportSongs(userId: number, songsData: any[]): Promise<{ success: number; failed: number }> {
    let success = 0;
    let failed = 0;
    
    for (const songData of songsData) {
      try {
        await this.importSong(userId, songData);
        success++;
      } catch (error) {
        console.error(`Failed to import song:`, error);
        failed++;
      }
    }
    
    return { success, failed };
  }

  /**
   * Batch import lessons from CSV or JSON data
   */
  async batchImportLessons(userId: number, lessonsData: any[]): Promise<{ success: number; failed: number }> {
    let success = 0;
    let failed = 0;
    
    for (const lessonData of lessonsData) {
      try {
        await this.importLesson(userId, lessonData);
        success++;
      } catch (error) {
        console.error(`Failed to import lesson:`, error);
        failed++;
      }
    }
    
    return { success, failed };
  }

  /**
   * Preview what content blocks would be generated from old content
   */
  previewContentConversion(contentString: string): {
    originalContent: string;
    detectedBlocks: Array<{
      type: string;
      preview: string;
    }>;
  } {
    const contentBlocks = this.processOldContent(contentString);
    
    return {
      originalContent: contentString,
      detectedBlocks: contentBlocks.map(block => ({
        type: block.type,
        preview: this.getBlockPreview(block)
      }))
    };
  }

  private getBlockPreview(block: ContentBlock): string {
    switch (block.type) {
      case 'groove':
        return `Groovescribe pattern: ${block.data.groove?.substring(0, 50)}...`;
      case 'video':
        return `Video: ${block.data.video}`;
      case 'spotify':
        return `Spotify: ${block.data.spotify}`;
      case 'text':
        return `Text: ${block.data.text?.substring(0, 100)}...`;
      case 'external_link':
        return `External Link: ${block.data.external_link?.title}`;
      default:
        return `${block.type} content block`;
    }
  }
}

export default ImportUtility;