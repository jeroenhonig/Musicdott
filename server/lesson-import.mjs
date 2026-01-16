#!/usr/bin/env node
/**
 * ES Module lesson import script
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function importLessons() {
  try {
    console.log('Starting lesson import via API...');
    
    // Read the lesson data
    const lessonsFile = path.join(__dirname, '..', 'data', 'import_lessons_new.json');
    const lessonsData = JSON.parse(fs.readFileSync(lessonsFile, 'utf8'));
    
    console.log(`Found ${lessonsData.length} lessons to import`);
    
    let imported = 0;
    let skipped = 0;
    let errors = 0;
    
    // Import lessons in smaller batches
    const batchSize = 5;
    
    for (let i = 0; i < lessonsData.length; i += batchSize) {
      const batch = lessonsData.slice(i, i + batchSize);
      console.log(`Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(lessonsData.length/batchSize)} (${batch.length} lessons)...`);
      
      for (const lessonData of batch) {
        try {
          // Skip if no title or invalid title
          if (!lessonData.title || lessonData.title.trim() === '' || lessonData.title === 'nan') {
            skipped++;
            continue;
          }
          
          // Normalize data
          const description = lessonData.description === 'nan' ? '' : (lessonData.description || '');
          const contentType = lessonData.contentType === 'nan' ? 'standard' : (lessonData.contentType || 'standard');
          const instrument = lessonData.instrument === 'nan' ? 'drums' : (lessonData.instrument || 'drums');
          const level = lessonData.level === 'nan' || lessonData.level === 'all' ? '' : (lessonData.level || '');
          
          // Transform content to content blocks (simplified)
          let contentBlocks = [];
          if (lessonData.content && lessonData.content !== 'nan') {
            contentBlocks = [{
              type: 'text',
              content: lessonData.content
            }];
          }
          
          // Prepare lesson data for API
          const lessonToCreate = {
            title: lessonData.title.trim(),
            description: description,
            contentType: contentType,
            instrument: instrument,
            level: level || undefined,
            contentBlocks: JSON.stringify(contentBlocks)
          };
          
          // Make API call to create lesson
          const response = await fetch('http://localhost:5000/api/lessons', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Cookie': 'connect.sid=s%3AnyiKl7jk4y7d_R-7SzFgGJWrLVW0mF_6.MfgGqxJqBYYJA%2FejwGkpMnMk6DG9MrrhFpQIVBOKQzw'  // Will need to update this
            },
            body: JSON.stringify(lessonToCreate)
          });
          
          if (response.ok) {
            imported++;
            console.log(`✓ Imported: "${lessonData.title}"`);
          } else {
            const errorText = await response.text();
            if (errorText.includes('already exists') || response.status === 409) {
              skipped++;
              console.log(`- Skipped (duplicate): "${lessonData.title}"`);
            } else {
              errors++;
              console.error(`✗ Error importing "${lessonData.title}": ${response.status} ${errorText}`);
            }
          }
          
        } catch (error) {
          console.error(`✗ Error importing lesson "${lessonData.title}":`, error.message);
          errors++;
        }
      }
      
      // Small delay between batches
      if (i + batchSize < lessonsData.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    console.log('\\nImport completed!');
    console.log(`Total lessons: ${lessonsData.length}`);
    console.log(`Imported: ${imported}`);
    console.log(`Skipped: ${skipped}`);
    console.log(`Errors: ${errors}`);
    
  } catch (error) {
    console.error('Import script error:', error);
  }
}

// Run the import
importLessons().then(() => {
  console.log('Import script finished');
  process.exit(0);
}).catch(error => {
  console.error('Script failed:', error);
  process.exit(1);
});