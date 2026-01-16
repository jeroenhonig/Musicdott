import * as schema from '@shared/schema';
import { pool } from './db';
import { sql } from 'drizzle-orm';

// Custom types for database queries
interface TableRow {
  table_name: string;
}

interface ColumnRow {
  column_name: string;
  data_type: string;
}

// Tables that should exist in our database
const REQUIRED_TABLES = [
  'users',
  'schools',
  'students',
  'songs',
  'lessons',
  'assignments',
  'sessions',
  'achievement_definitions',
  'student_achievements',
  'recurring_schedules',
  'practice_sessions'
];

/**
 * Function to verify and create missing tables and columns
 */
export async function verifyDatabaseSetup() {
  console.log('Verifying database setup...');
  
  try {
    // Test the database connection
    try {
      await pool.query('SELECT 1');
    } catch (error) {
      const connectionError = error as Error;
      console.error('Database connection failed:', connectionError.message);
      return {
        success: false,
        message: 'Database connection failed',
        error: connectionError
      };
    }
    
    // Get existing tables
    const tablesResult = await pool.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    
    const tableNames = tablesResult.rows.map(row => row.table_name);
    console.log('Existing tables:', tableNames);
    
    // Check for missing tables
    const missingTables = REQUIRED_TABLES.filter(table => 
      !tableNames.includes(table)
    );
    
    if (missingTables.length > 0) {
      console.log('Missing tables:', missingTables);
      console.log('Creating missing tables...');
      
      // Create missing tables
      for (const table of missingTables) {
        try {
          if (table === 'achievement_definitions') {
            await pool.query(`
              CREATE TABLE IF NOT EXISTS achievement_definitions (
                id SERIAL PRIMARY KEY,
                name TEXT NOT NULL,
                description TEXT NOT NULL,
                criteria TEXT NOT NULL,
                badge_image TEXT,
                points INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
              )
            `);
          } 
          else if (table === 'student_achievements') {
            await pool.query(`
              CREATE TABLE IF NOT EXISTS student_achievements (
                id SERIAL PRIMARY KEY,
                student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
                achievement_id INTEGER NOT NULL REFERENCES achievement_definitions(id) ON DELETE CASCADE,
                date_earned TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                seen BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
              )
            `);
          }
          else if (table === 'recurring_schedules') {
            await pool.query(`
              CREATE TABLE IF NOT EXISTS recurring_schedules (
                id SERIAL PRIMARY KEY,
                teacher_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
                day_of_week INTEGER NOT NULL,
                start_time TIME NOT NULL,
                end_time TIME NOT NULL,
                active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
              )
            `);
          }
          else if (table === 'practice_sessions') {
            await pool.query(`
              CREATE TABLE IF NOT EXISTS practice_sessions (
                id SERIAL PRIMARY KEY,
                student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
                start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                end_time TIMESTAMP,
                duration_minutes INTEGER,
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
              )
            `);
          }
          console.log(`Created table ${table}`);
        } catch (error) {
          console.error(`Failed to create table ${table}:`, error);
        }
      }
    } else {
      console.log('All required tables exist!');
    }
    
    // Verify columns for users table
    const columnsResult = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'users'
    `);
    
    const userColumnNames = columnsResult.rows.map(col => col.column_name);
    console.log('User table columns:', userColumnNames);
    
    // Check for required user columns
    const requiredUserColumns = [
      'id', 'username', 'password', 'name', 'email', 
      'role', 'avatar', 'school_id', 'instruments', 'bio'
    ];
    
    const missingUserColumns = requiredUserColumns.filter(col => 
      !userColumnNames.includes(col)
    );
    
    if (missingUserColumns.length > 0) {
      console.log('Missing user columns:', missingUserColumns);
      console.log('Adding missing columns...');
      
      // Add missing columns
      for (const column of missingUserColumns) {
        try {
          // Add column based on name
          if (column === 'school_id') {
            await pool.query(`
              ALTER TABLE users ADD COLUMN IF NOT EXISTS school_id integer REFERENCES schools(id)
            `);
          } else if (column === 'instruments') {
            await pool.query(`
              ALTER TABLE users ADD COLUMN IF NOT EXISTS instruments text
            `);
          } else if (column === 'bio') {
            await pool.query(`
              ALTER TABLE users ADD COLUMN IF NOT EXISTS bio text
            `);
          } else if (column === 'avatar') {
            await pool.query(`
              ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar text
            `);
          }
          console.log(`Added column ${column} to users table`);
        } catch (error) {
          console.error(`Failed to add column ${column}:`, error);
        }
      }
    } else {
      console.log('Users table has all required columns!');
    }
    
    console.log('Database verification complete!');
    return {
      success: true,
      message: 'Database verification completed successfully'
    };
  } catch (error) {
    console.error('Error during database verification:', error);
    return {
      success: false,
      message: 'Database verification failed',
      error
    };
  }
}

// This function can be called directly from the command line
// or imported and used within the application
export async function main() {
  try {
    const result = await verifyDatabaseSetup();
    if (result.success) {
      console.log('Database setup verification completed');
      return true;
    } else {
      console.warn('Database setup verification failed:', result.message);
      // Continue without database - the app will use in-memory storage
      return false;
    }
  } catch (error) {
    console.error('Error during database setup verification:', error);
    return false;
  }
}