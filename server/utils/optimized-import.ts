/**
 * Optimized Import Utility
 * 
 * Handles large-scale import of songs from JSON with performance optimizations
 * and data corruption fixes. Addresses O(n^2) performance issues and handles
 * malformed data from MusicDott v1 exports.
 */

import { storage } from "../storage-wrapper";
import { insertSongSchema } from "@shared/schema";
import { 
  transformJsonContent, 
  normalizeDescription, 
  normalizeLevel,
  normalizeArtist,
  normalizeTitle,
  extractBpmFromDescription,
  extractGenreFromDescription
} from "./json-content-transformer";

interface ImportSongData {
  title: string;
  artist?: string;
  instrument?: string;
  level?: string;
  description?: string;
  content?: string;
}

interface ImportStats {
  total: number;
  imported: number;
  skipped: number;
  errors: number;
  duplicates: number;
}

/**
 * Optimized import function that handles large datasets efficiently
 */
export async function optimizedSongImport(
  songs: ImportSongData[], 
  schoolId: number, 
  userId: number
): Promise<ImportStats> {
  const stats: ImportStats = {
    total: songs.length,
    imported: 0,
    skipped: 0,
    errors: 0,
    duplicates: 0
  };

  console.log(`Starting optimized import of ${songs.length} songs...`);

  // Step 1: Pre-fetch all existing songs for this school to avoid O(n^2) queries
  console.log("Pre-fetching existing songs for deduplication...");
  const existingSongs = await storage.getSongsBySchool(schoolId);
  const existingTitlesSet = new Set(
    existingSongs.map(song => `${song.title.toLowerCase()}|${(song.artist || '').toLowerCase()}`)
  );

  console.log(`Found ${existingSongs.length} existing songs in database`);

  // Step 2: Process songs in batches to avoid memory issues
  const batchSize = 50;
  const batches = [];
  
  for (let i = 0; i < songs.length; i += batchSize) {
    batches.push(songs.slice(i, i + batchSize));
  }

  console.log(`Processing ${batches.length} batches of ${batchSize} songs each...`);

  // Step 3: Process each batch
  for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
    const batch = batches[batchIndex];
    console.log(`Processing batch ${batchIndex + 1}/${batches.length}...`);

    for (const songData of batch) {
      try {
        // Clean and validate the title
        const cleanTitle = normalizeTitle(songData.title);
        if (!cleanTitle || cleanTitle === 'Untitled') {
          stats.skipped++;
          continue;
        }

        // Clean and validate the artist
        const cleanArtist = normalizeArtist(songData.artist);
        
        // Create deduplication key
        const dedupKey = `${cleanTitle.toLowerCase()}|${(cleanArtist || '').toLowerCase()}`;
        
        // Check for duplicates using the pre-fetched set (O(1) lookup)
        if (existingTitlesSet.has(dedupKey)) {
          stats.duplicates++;
          continue;
        }

        // Extract additional metadata from description
        const cleanDescription = normalizeDescription(songData.description);
        const extractedBpm = extractBpmFromDescription(songData.description);
        const extractedGenre = extractGenreFromDescription(songData.description);

        // Transform content to contentBlocks
        const contentBlocks = transformJsonContent(songData.content || '');

        // Prepare song data for database
        const songToCreate = {
          schoolId: schoolId,
          title: cleanTitle,
          artist: cleanArtist,
          composer: null, // Not provided in import data
          genre: extractedGenre,
          bpm: extractedBpm,
          duration: null, // Could be extracted from description if needed
          instrument: songData.instrument === 'nan' ? 'drums' : (songData.instrument || 'drums'),
          level: normalizeLevel(songData.level),
          userId: userId,
          contentBlocks: JSON.stringify(contentBlocks),
          groovePatterns: null // Will be handled separately if needed
        };

        // Validate with schema
        const validatedSongData = insertSongSchema.parse(songToCreate);

        // Create song
        await storage.createSong(validatedSongData);
        
        // Add to existing set to prevent duplicates within this import
        existingTitlesSet.add(dedupKey);
        
        stats.imported++;

        // Log progress every 10 songs
        if (stats.imported % 10 === 0) {
          console.log(`Imported ${stats.imported} songs so far...`);
        }

      } catch (error) {
        console.error(`Error importing song "${songData.title}":`, error);
        stats.errors++;
      }
    }

    // Small delay between batches to prevent overwhelming the database
    if (batchIndex < batches.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  console.log("Optimized import completed:", stats);
  return stats;
}

/**
 * Utility to fix existing corrupted songs in the database
 */
export async function fixExistingCorruptedSongs(schoolId: number): Promise<number> {
  console.log("Fixing existing corrupted songs...");
  
  const existingSongs = await storage.getSongsBySchool(schoolId);
  let fixedCount = 0;

  for (const song of existingSongs) {
    try {
      let needsUpdate = false;
      const updates: any = {};

      // Fix corrupted titles
      const cleanTitle = normalizeTitle(song.title);
      if (cleanTitle !== song.title) {
        updates.title = cleanTitle;
        needsUpdate = true;
      }

      // Fix corrupted artist field
      const cleanArtist = normalizeArtist(song.artist || undefined);
      if (cleanArtist !== song.artist) {
        updates.artist = cleanArtist;
        needsUpdate = true;
      }

      // Fix corrupted contentBlocks
      try {
        if (song.contentBlocks) {
          JSON.parse(song.contentBlocks);
        }
      } catch {
        // ContentBlocks is not valid JSON, try to fix
        updates.contentBlocks = '[]';
        needsUpdate = true;
      }

      if (needsUpdate) {
        // Update song with fixes
        await storage.updateSong(song.id, updates);
        fixedCount++;
      }

    } catch (error) {
      console.error(`Error fixing song ID ${song.id}:`, error);
    }
  }

  console.log(`Fixed ${fixedCount} corrupted songs`);
  return fixedCount;
}