/**
 * Test script for clean song import with corruption fixes
 */

const fs = require('fs');
const path = require('path');

async function testCleanImport() {
  try {
    console.log('🧹 Testing clean song import with corruption fixes...\n');

    // Read the latest songs JSON file
    const songsFilePath = path.join(__dirname, '../attached_assets/musicdott2_songs_1757698310215.json');
    
    if (!fs.existsSync(songsFilePath)) {
      console.error('❌ Songs JSON file not found!');
      return;
    }

    const songsData = JSON.parse(fs.readFileSync(songsFilePath, 'utf8'));
    console.log(`📊 Found ${songsData.length} songs in JSON file`);

    // Show sample of corrupted data before import
    console.log('\n🔍 Sample of raw data (before cleaning):');
    const sampleSong = songsData[0];
    console.log('Title:', sampleSong.title);
    console.log('Artist:', sampleSong.artist);
    console.log('Description:', sampleSong.description);
    console.log('Level:', sampleSong.level);
    console.log('Content preview:', sampleSong.content ? sampleSong.content.substring(0, 100) + '...' : 'No content');

    // Test import via API
    const importPayload = {
      songs: songsData,
      schoolId: 1 // Test school ID
    };

    console.log('\n🚀 Starting optimized import via API...');
    
    const response = await fetch('http://localhost:5000/api/import/json-content', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Note: In a real test, you'd need proper authentication headers
      },
      body: JSON.stringify(importPayload)
    });

    if (response.ok) {
      const result = await response.json();
      console.log('✅ Import completed successfully!');
      console.log('📊 Import Statistics:');
      console.log(`   - Total songs: ${result.stats.songs.total}`);
      console.log(`   - Successfully imported: ${result.stats.songs.imported}`);
      console.log(`   - Skipped: ${result.stats.songs.skipped}`);
      console.log(`   - Errors: ${result.stats.songs.errors}`);
    } else {
      const error = await response.text();
      console.error('❌ Import failed:', error);
    }

  } catch (error) {
    console.error('💥 Test failed:', error.message);
  }
}

// Alternative: Direct database test without API
async function testDirectImport() {
  try {
    // This would require setting up the database connection
    console.log('🔧 Direct database import test not implemented in this script');
    console.log('💡 Use the API endpoint instead or run via the app interface');
  } catch (error) {
    console.error('💥 Direct test failed:', error.message);
  }
}

if (require.main === module) {
  console.log('🧪 Starting song import corruption fix tests...\n');
  
  // For now, just analyze the data structure
  const songsFilePath = path.join(__dirname, '../attached_assets/musicdott2_songs_1757698310215.json');
  
  if (fs.existsSync(songsFilePath)) {
    const songsData = JSON.parse(fs.readFileSync(songsFilePath, 'utf8'));
    
    console.log(`📊 Analysis of ${songsData.length} songs:`);
    
    // Analyze corruption patterns
    let corruptionStats = {
      nanTitles: 0,
      nanArtists: 0,
      nanDescriptions: 0,
      nanContent: 0,
      emptyTitles: 0,
      htmlInTitles: 0,
      escapedContent: 0
    };

    songsData.slice(0, 100).forEach(song => { // Analyze first 100 songs
      if (!song.title || song.title === 'nan') corruptionStats.nanTitles++;
      if (!song.artist || song.artist === 'nan') corruptionStats.nanArtists++;
      if (!song.description || song.description === 'nan') corruptionStats.nanDescriptions++;
      if (!song.content || song.content === 'nan') corruptionStats.nanContent++;
      if (!song.title || song.title.trim() === '') corruptionStats.emptyTitles++;
      if (song.title && song.title.includes('<')) corruptionStats.htmlInTitles++;
      if (song.content && song.content.includes('\\n')) corruptionStats.escapedContent++;
    });

    console.log('\n🐛 Corruption patterns found (first 100 songs):');
    console.log(`   - NaN titles: ${corruptionStats.nanTitles}`);
    console.log(`   - NaN artists: ${corruptionStats.nanArtists}`);
    console.log(`   - NaN descriptions: ${corruptionStats.nanDescriptions}`);
    console.log(`   - NaN content: ${corruptionStats.nanContent}`);
    console.log(`   - Empty titles: ${corruptionStats.emptyTitles}`);
    console.log(`   - HTML in titles: ${corruptionStats.htmlInTitles}`);
    console.log(`   - Escaped content: ${corruptionStats.escapedContent}`);

    // Show some sample problematic records
    console.log('\n📋 Sample problematic records:');
    songsData.slice(0, 5).forEach((song, i) => {
      console.log(`${i + 1}. "${song.title}" by ${song.artist || 'Unknown'}`);
      console.log(`   Description: ${song.description}`);
      console.log(`   Level: ${song.level}`);
      console.log('   ---');
    });

    console.log('\n✅ Analysis complete. The optimized import should fix these issues.');
    console.log('💡 To run the actual import, use the web interface or API endpoint.');
  }
}