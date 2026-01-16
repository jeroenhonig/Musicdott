#!/usr/bin/env node
/**
 * Direct lesson import script
 * Imports lessons directly using the storage system
 */

const fs = require('fs');
const path = require('path');

// Import the required modules (using Node.js compatible approach)
async function importLessons() {
  try {
    console.log('Starting direct lesson import...');
    
    // Dynamically import the ES modules
    const { storage } = await import('./storage-wrapper.js');
    const { insertLessonSchema } = await import('../shared/schema.js');
    
    // Read the lesson data
    const lessonsFile = path.join(__dirname, '..', 'data', 'import_lessons_new.json');
    const lessonsData = JSON.parse(fs.readFileSync(lessonsFile, 'utf8'));
    
    console.log(`Found ${lessonsData.length} lessons to import`);
    
    const schoolId = 1; // Stefan's school
    const userId = 2;   // Stefan's user ID
    
    let imported = 0;
    let skipped = 0;
    let errors = 0;
    
    // Get existing lessons to avoid duplicates
    console.log('Checking existing lessons...');
    const existingLessons = await storage.getLessonsBySchool(schoolId);
    const existingTitles = new Set(existingLessons.map(l => l.title.toLowerCase()));
    console.log(`Found ${existingLessons.length} existing lessons`);
    
    // Process each lesson
    for (let i = 0; i < lessonsData.length; i++) {
      const lessonData = lessonsData[i];
      
      try {
        // Skip if no title or invalid title
        if (!lessonData.title || lessonData.title.trim() === '' || lessonData.title === 'nan') {
          skipped++;
          continue;
        }
        
        // Check for duplicates
        if (existingTitles.has(lessonData.title.toLowerCase())) {
          skipped++;
          continue;
        }
        
        // Normalize data
        const description = lessonData.description === 'nan' ? null : lessonData.description;
        const contentType = lessonData.contentType === 'nan' ? 'standard' : (lessonData.contentType || 'standard');
        const instrument = lessonData.instrument === 'nan' ? 'drums' : (lessonData.instrument || 'drums');
        const level = lessonData.level === 'nan' || lessonData.level === 'all' ? null : lessonData.level;
        
        // Transform content to content blocks (simplified)
        let contentBlocks = [];
        if (lessonData.content && lessonData.content !== 'nan') {
          // Simple content block creation
          contentBlocks = [{
            type: 'text',
            content: lessonData.content
          }];
        }
        
        // Prepare lesson data
        const lessonToCreate = {
          schoolId: schoolId,
          title: lessonData.title.trim(),
          description: description,
          contentType: contentType,
          instrument: instrument,
          level: level,
          userId: userId,
          contentBlocks: JSON.stringify(contentBlocks),
          categoryId: null,
          orderNumber: null
        };
        
        // Create the lesson
        await storage.createLesson(lessonToCreate);
        imported++;
        
        // Add to existing set to prevent duplicates in this run
        existingTitles.add(lessonData.title.toLowerCase());
        
        // Log progress every 10 lessons
        if (imported % 10 === 0) {
          console.log(`Imported ${imported} lessons so far...`);
        }
        
      } catch (error) {
        console.error(`Error importing lesson "${lessonData.title}":`, error.message);
        errors++;
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