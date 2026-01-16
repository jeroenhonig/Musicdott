/**
 * JSON Content Transformer
 * 
 * Transforms content from imported JSON files (lessons/songs) into proper contentBlocks format
 * for storage in the database. Handles various embed types including GrooveScribe, YouTube,
 * Spotify, Apple Music, and text content.
 */

interface ContentBlock {
  type: string;
  content?: string;
  url?: string;
  title?: string;
  description?: string;
  pattern?: string;
}

/**
 * Transform mixed HTML content into structured contentBlocks array
 */
export function transformJsonContent(content: string): ContentBlock[] {
  if (!content || content === 'nan' || content.trim() === '') {
    return [];
  }

  const contentBlocks: ContentBlock[] = [];
  
  // Clean up the content by handling escaped newlines and split by double newlines
  const cleanContent = content
    .replace(/\\n/g, '\n')
    .replace(/\n\n+/g, '\n\n');
  
  const sections = cleanContent.split('\n\n').filter(section => section.trim() && section.trim() !== 'nan');
  
  for (const section of sections) {
    const trimmedSection = section.trim();
    
    if (!trimmedSection || trimmedSection === 'nan') {
      continue;
    }
    
    // Handle GrooveScribe iframes
    if (trimmedSection.includes('groovescribe/GrooveEmbed.html')) {
      const grooveBlock = parseGrooveScribeEmbed(trimmedSection);
      if (grooveBlock) {
        contentBlocks.push(grooveBlock);
      }
    }
    // Handle YouTube iframes
    else if (trimmedSection.includes('youtube.com/embed') || trimmedSection.includes('youtube-nocookie.com/embed')) {
      const youtubeBlock = parseYouTubeEmbed(trimmedSection);
      if (youtubeBlock) {
        contentBlocks.push(youtubeBlock);
      }
    }
    // Handle Spotify iframes
    else if (trimmedSection.includes('open.spotify.com/embed')) {
      const spotifyBlock = parseSpotifyEmbed(trimmedSection);
      if (spotifyBlock) {
        contentBlocks.push(spotifyBlock);
      }
    }
    // Handle Apple Music iframes
    else if (trimmedSection.includes('embed.music.apple.com')) {
      const appleMusicBlock = parseAppleMusicEmbed(trimmedSection);
      if (appleMusicBlock) {
        contentBlocks.push(appleMusicBlock);
      }
    }
    // Handle PDF content (raw PDF data)
    else if (trimmedSection.startsWith('%PDF-')) {
      // Skip raw PDF content as it's too large and not useful as text
      continue;
    }
    // Handle text content (including notes)
    else if (trimmedSection.includes('<iframe')) {
      // Generic iframe that we couldn't categorize - treat as external embed
      const genericBlock = parseGenericEmbed(trimmedSection);
      if (genericBlock) {
        contentBlocks.push(genericBlock);
      }
    } else {
      // Handle text content, including "Note:" sections
      const textBlock = parseTextContent(trimmedSection);
      if (textBlock) {
        contentBlocks.push(textBlock);
      }
    }
  }
  
  return contentBlocks;
}

/**
 * Parse GrooveScribe embed iframe into contentBlock
 */
function parseGrooveScribeEmbed(iframe: string): ContentBlock | null {
  try {
    const srcMatch = iframe.match(/src=['"]([^'"]*)['"]/);
    if (!srcMatch) return null;
    
    const url = srcMatch[1];
    const urlParams = new URLSearchParams(url.split('?')[1] || '');
    
    // Extract GrooveScribe parameters
    const timeSig = urlParams.get('TimeSig') || '4/4';
    const tempo = urlParams.get('Tempo') || '120';
    const measures = urlParams.get('Measures') || '1';
    
    return {
      type: 'groovescribe',
      content: iframe,
      url: url,
      pattern: url, // Store the full URL as the pattern
      title: `${timeSig} at ${tempo}bpm (${measures} measures)`
    };
  } catch (error) {
    console.warn('Error parsing GrooveScribe embed:', error);
    return null;
  }
}

/**
 * Parse YouTube embed iframe into contentBlock
 */
function parseYouTubeEmbed(iframe: string): ContentBlock | null {
  try {
    const srcMatch = iframe.match(/src=['"]([^'"]*)['"]/);
    if (!srcMatch) return null;
    
    const url = srcMatch[1];
    const videoIdMatch = url.match(/\/embed\/([^?&]*)/);
    const videoId = videoIdMatch ? videoIdMatch[1] : null;
    
    return {
      type: 'video',
      content: iframe,
      url: url,
      title: videoId ? `YouTube Video: ${videoId}` : 'YouTube Video'
    };
  } catch (error) {
    console.warn('Error parsing YouTube embed:', error);
    return null;
  }
}

/**
 * Parse Spotify embed iframe into contentBlock
 */
function parseSpotifyEmbed(iframe: string): ContentBlock | null {
  try {
    const srcMatch = iframe.match(/src=['"]([^'"]*)['"]/);
    if (!srcMatch) return null;
    
    const url = srcMatch[1];
    const trackIdMatch = url.match(/\/track\/([^?&]*)/);
    const trackId = trackIdMatch ? trackIdMatch[1] : null;
    
    return {
      type: 'spotify',
      content: iframe,
      url: url,
      title: trackId ? `Spotify Track: ${trackId}` : 'Spotify Track'
    };
  } catch (error) {
    console.warn('Error parsing Spotify embed:', error);
    return null;
  }
}

/**
 * Parse Apple Music embed iframe into contentBlock
 */
function parseAppleMusicEmbed(iframe: string): ContentBlock | null {
  try {
    const srcMatch = iframe.match(/src=['"]([^'"]*)['"]/);
    if (!srcMatch) return null;
    
    const url = srcMatch[1];
    
    return {
      type: 'apple_music',
      content: iframe,
      url: url,
      title: 'Apple Music Track'
    };
  } catch (error) {
    console.warn('Error parsing Apple Music embed:', error);
    return null;
  }
}

/**
 * Parse generic iframe embed into contentBlock
 */
function parseGenericEmbed(iframe: string): ContentBlock | null {
  try {
    const srcMatch = iframe.match(/src=['"]([^'"]*)['"]/);
    if (!srcMatch) return null;
    
    const url = srcMatch[1];
    
    return {
      type: 'external_embed',
      content: iframe,
      url: url,
      title: 'External Embed'
    };
  } catch (error) {
    console.warn('Error parsing generic embed:', error);
    return null;
  }
}

/**
 * Parse text content into contentBlock
 */
function parseTextContent(text: string): ContentBlock | null {
  const cleanText = text.trim();
  if (!cleanText || cleanText === 'nan') {
    return null;
  }
  
  // Check if this is a note
  if (cleanText.toLowerCase().startsWith('note:')) {
    const noteContent = cleanText.substring(5).trim();
    // Skip empty or nan notes
    if (!noteContent || noteContent === 'nan') {
      return null;
    }
    return {
      type: 'text',
      content: `Note: ${noteContent}`,
      title: 'Note'
    };
  }
  
  // Check if this looks like a section header (Video:, Musescore:, etc.)
  if (cleanText.match(/^[A-Za-z]+:/)) {
    // Skip section headers that are just "Type: nan"
    if (cleanText.toLowerCase().includes(': nan')) {
      return null;
    }
    return {
      type: 'text',
      content: cleanText,
      title: 'Section'
    };
  }
  
  // Skip standalone "nan" text
  if (cleanText.toLowerCase() === 'nan') {
    return null;
  }
  
  // Regular text content
  return {
    type: 'text',
    content: cleanText
  };
}

/**
 * Clean and normalize description field
 */
export function normalizeDescription(description: string | undefined): string {
  if (!description || description === 'nan') {
    return '';
  }
  
  // Clean up genre/BPM/length descriptions
  let cleaned = description
    .replace(/Genre: nan/g, '')
    .replace(/BPM: 0/g, '')
    .replace(/Lengte: nan/g, '')
    .replace(/\s*\|\s*/g, ' | ')
    .replace(/^\s*\|\s*/, '')
    .replace(/\s*\|\s*$/, '')
    .replace(/\| \|/g, '|')
    .replace(/^\s*\|\s*$/, '')
    .trim();
    
  return cleaned === '|' || cleaned === '' ? '' : cleaned;
}

/**
 * Extract BPM from description field
 */
export function extractBpmFromDescription(description: string | undefined): number | null {
  if (!description || description === 'nan') {
    return null;
  }
  
  const bpmMatch = description.match(/BPM: (\d+)/);
  if (bpmMatch && parseInt(bpmMatch[1]) > 0) {
    return parseInt(bpmMatch[1]);
  }
  
  return null;
}

/**
 * Extract genre from description field
 */
export function extractGenreFromDescription(description: string | undefined): string | null {
  if (!description || description === 'nan') {
    return null;
  }
  
  const genreMatch = description.match(/Genre: ([^|]+)/);
  if (genreMatch && genreMatch[1].trim() !== 'nan') {
    return genreMatch[1].trim();
  }
  
  return null;
}

/**
 * Clean and normalize artist field
 */
export function normalizeArtist(artist: string | undefined): string | null {
  if (!artist || artist === 'nan' || artist.trim() === '') {
    return null;
  }
  
  return artist.trim();
}

/**
 * Clean and normalize title field - fix encoding and HTML issues
 */
export function normalizeTitle(title: string | undefined): string {
  if (!title || title === 'nan') {
    return 'Untitled';
  }
  
  // Fix common encoding issues and HTML entities
  return title
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/<[^>]*>/g, '') // Remove any HTML tags
    .trim();
}

/**
 * Normalize level field - convert "all" to more specific levels when possible
 */
export function normalizeLevel(level: string | undefined): string {
  if (!level || level === 'nan') {
    return 'intermediate';
  }
  
  if (level === 'all') {
    return 'intermediate';
  }
  
  return level.toLowerCase();
}