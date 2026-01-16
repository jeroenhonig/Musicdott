#!/usr/bin/env node
/**
 * Import lessons from JSON file efficiently
 * This script bypasses HTTP limits and imports directly to storage
 */

const fs = require('fs');
const path = require('path');

// Load the lessons data
const lessonsFile = path.join(__dirname, '..', 'data', 'import_lessons_new.json');

console.log('Starting lesson import...');
console.log('Reading lesson data from:', lessonsFile);

// Read and parse the JSON file
const lessonsData = JSON.parse(fs.readFileSync(lessonsFile, 'utf8'));
console.log(`Found ${lessonsData.length} lessons to import`);

// Prepare the import request
const importRequest = {
  lessons: lessonsData,
  schoolId: 1 // Stefan's school ID
};

// Make the import request
async function importLessons() {
  try {
    const response = await fetch('http://localhost:5000/api/json-import/json-content', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': 'connect.sid=your-session-cookie' // Will be replaced
      },
      body: JSON.stringify(importRequest)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Import failed:', response.status, errorText);
      return;
    }

    const result = await response.json();
    console.log('Import completed successfully:', result);
  } catch (error) {
    console.error('Import error:', error);
  }
}

console.log('Import request prepared. Will import via API...');