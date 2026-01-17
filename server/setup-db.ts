import { pool, db, isDatabaseAvailable } from './db';
import { users, schools, students, lessons, songs, achievementDefinitions } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { scrypt, randomBytes } from 'crypto';
import { promisify } from 'util';

const scryptAsync = promisify(scrypt);

/**
 * Hash password using scrypt (matches auth.ts)
 */
async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

/**
 * Simple database setup - creates tables and seeds test data
 * No migrations, no complexity - just works
 */
export async function setupDatabase() {
  console.log('🔧 Starting database setup...');

  try {
    // 1. Wait for database connection
    console.log('📡 Waiting for database connection...');
    let attempts = 0;
    while (!isDatabaseAvailable && attempts < 10) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      attempts++;
    }

    if (!isDatabaseAvailable) {
      console.warn('⚠️ Database not available, skipping setup');
      return { success: false, message: 'Database not available' };
    }

    // 2. Create tables using drizzle push equivalent (direct SQL)
    console.log('🔄 Creating database tables...');
    await createTables();
    console.log('✅ Tables created');

    // 3. Seed admin user and school
    console.log('👤 Setting up admin user...');
    await seedAdminAndSchool();
    console.log('✅ Admin setup complete');

    // 4. Seed achievements
    console.log('🏆 Seeding achievements...');
    await seedAchievements();
    console.log('✅ Achievements seeded');

    // 5. Seed test data
    console.log('📚 Seeding test data...');
    await seedTestData();
    console.log('✅ Test data seeded');

    // 6. Get status
    const status = await getDatabaseStatus();

    console.log('✅ Database setup completed successfully!');
    return { success: true, message: 'Database setup completed', status };

  } catch (error) {
    console.error('❌ Database setup failed:', error);
    return {
      success: false,
      message: 'Database setup failed',
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Create all tables - simple approach using raw SQL
 */
async function createTables() {
  // Use CREATE TABLE IF NOT EXISTS for idempotency
  const createTablesSQL = `
    -- Set search_path
    SET search_path TO public;

    -- 1. Schools table (no dependencies)
    CREATE TABLE IF NOT EXISTS schools (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      owner_id INTEGER,
      address TEXT,
      city TEXT,
      phone TEXT,
      website TEXT,
      instruments TEXT,
      description TEXT,
      logo TEXT,
      primary_color TEXT DEFAULT '#3b82f6',
      secondary_color TEXT DEFAULT '#64748b',
      accent_color TEXT DEFAULT '#10b981',
      background_image TEXT,
      font_family TEXT DEFAULT 'Inter',
      custom_css TEXT,
      branding_enabled BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
    );

    -- 2. Users table
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      school_id INTEGER REFERENCES schools(id),
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      role TEXT NOT NULL,
      instruments TEXT,
      avatar TEXT,
      bio TEXT,
      must_change_password BOOLEAN DEFAULT FALSE,
      last_login_at TIMESTAMP
    );

    -- 3. Students table
    CREATE TABLE IF NOT EXISTS students (
      id SERIAL PRIMARY KEY,
      school_id INTEGER NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      user_id INTEGER REFERENCES users(id),
      account_id INTEGER,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT,
      birthdate DATE,
      instrument TEXT,
      level TEXT,
      assigned_teacher_id INTEGER REFERENCES users(id),
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      is_active BOOLEAN DEFAULT TRUE
    );

    -- 4. Lessons table
    CREATE TABLE IF NOT EXISTS lessons (
      id SERIAL PRIMARY KEY,
      school_id INTEGER REFERENCES schools(id),
      title TEXT NOT NULL,
      description TEXT,
      content_type TEXT,
      instrument TEXT,
      level TEXT,
      category TEXT,
      category_id INTEGER,
      user_id INTEGER REFERENCES users(id),
      content_blocks TEXT,
      order_number INTEGER,
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- 5. Songs table
    CREATE TABLE IF NOT EXISTS songs (
      id SERIAL PRIMARY KEY,
      school_id INTEGER REFERENCES schools(id),
      title TEXT NOT NULL,
      artist TEXT,
      composer TEXT,
      genre TEXT,
      bpm INTEGER,
      duration TEXT,
      description TEXT,
      difficulty TEXT,
      instrument TEXT,
      level TEXT,
      user_id INTEGER REFERENCES users(id),
      content_blocks TEXT,
      groove_patterns TEXT[],
      is_active BOOLEAN DEFAULT TRUE,
      key TEXT,
      tempo TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- 6. Assignments table
    CREATE TABLE IF NOT EXISTS assignments (
      id SERIAL PRIMARY KEY,
      school_id INTEGER REFERENCES schools(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id),
      student_id INTEGER NOT NULL REFERENCES students(id),
      lesson_id INTEGER REFERENCES lessons(id),
      song_id INTEGER REFERENCES songs(id),
      title TEXT NOT NULL,
      description TEXT,
      due_date TIMESTAMP,
      status TEXT DEFAULT 'pending'
    );

    -- 7. Sessions table
    CREATE TABLE IF NOT EXISTS sessions (
      id SERIAL PRIMARY KEY,
      school_id INTEGER NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id),
      student_id INTEGER NOT NULL REFERENCES students(id),
      title TEXT NOT NULL,
      start_time TIMESTAMP NOT NULL,
      end_time TIMESTAMP NOT NULL,
      duration_min INTEGER DEFAULT 30,
      notes TEXT
    );

    -- 8. Achievement definitions table
    CREATE TABLE IF NOT EXISTS achievement_definitions (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      criteria TEXT NOT NULL,
      badge_image TEXT,
      points INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      type TEXT NOT NULL DEFAULT 'general',
      icon_name TEXT NOT NULL DEFAULT 'award',
      badge_color TEXT NOT NULL DEFAULT 'blue',
      xp_value INTEGER NOT NULL DEFAULT 10
    );

    -- 9. Student achievements table
    CREATE TABLE IF NOT EXISTS student_achievements (
      id SERIAL PRIMARY KEY,
      student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      achievement_type TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      points_earned INTEGER DEFAULT 0,
      badge_icon TEXT,
      is_visible BOOLEAN DEFAULT TRUE,
      earned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
    );

    -- 10. Recurring schedules table
    CREATE TABLE IF NOT EXISTS recurring_schedules (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id),
      student_id INTEGER NOT NULL REFERENCES students(id),
      day_of_week TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      location TEXT,
      notes TEXT,
      timezone TEXT DEFAULT 'Europe/Amsterdam',
      frequency TEXT DEFAULT 'WEEKLY',
      is_active BOOLEAN DEFAULT TRUE,
      ical_dtstart TEXT,
      ical_rrule TEXT,
      ical_tzid TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
    );

    -- 11. Practice sessions table
    CREATE TABLE IF NOT EXISTS practice_sessions (
      id SERIAL PRIMARY KEY,
      student_id INTEGER NOT NULL REFERENCES students(id),
      lesson_id INTEGER REFERENCES lessons(id),
      song_id INTEGER REFERENCES songs(id),
      start_time TIMESTAMP NOT NULL,
      end_time TIMESTAMP,
      duration INTEGER,
      notes TEXT
    );

    -- 12. Lesson categories table
    CREATE TABLE IF NOT EXISTS lesson_categories (
      id SERIAL PRIMARY KEY,
      school_id INTEGER NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      description TEXT,
      color TEXT DEFAULT '#3B82F6',
      icon TEXT DEFAULT 'BookOpen',
      user_id INTEGER NOT NULL REFERENCES users(id)
    );

    -- 13. Groove patterns table
    CREATE TABLE IF NOT EXISTS groove_patterns (
      id TEXT PRIMARY KEY,
      school_id INTEGER NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      description TEXT,
      groove_data TEXT NOT NULL,
      bpm INTEGER DEFAULT 120,
      bars INTEGER DEFAULT 4,
      time_signature TEXT DEFAULT '4/4',
      difficulty TEXT DEFAULT 'beginner',
      tags TEXT[],
      category_id INTEGER,
      created_by INTEGER REFERENCES users(id),
      is_public BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
    );

    -- 14. Notifications table
    CREATE TABLE IF NOT EXISTS notifications (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      school_id INTEGER NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      link TEXT,
      metadata JSONB,
      is_read BOOLEAN DEFAULT FALSE NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
    );

    -- 15. User preferences tables
    CREATE TABLE IF NOT EXISTS user_notifications (
      user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      settings JSONB NOT NULL DEFAULT '{}',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
    );

    CREATE TABLE IF NOT EXISTS user_preferences (
      user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      settings JSONB NOT NULL DEFAULT '{}',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
    );

    -- 16. Messages tables
    CREATE TABLE IF NOT EXISTS messages (
      id SERIAL PRIMARY KEY,
      sender_id INTEGER NOT NULL REFERENCES users(id),
      recipient_id INTEGER NOT NULL REFERENCES users(id),
      sender_type TEXT NOT NULL,
      recipient_type TEXT NOT NULL,
      subject TEXT NOT NULL,
      content TEXT NOT NULL,
      is_read BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
    );

    CREATE TABLE IF NOT EXISTS message_replies (
      id SERIAL PRIMARY KEY,
      message_id INTEGER NOT NULL REFERENCES messages(id),
      sender_id INTEGER NOT NULL REFERENCES users(id),
      sender_type TEXT,
      reply TEXT NOT NULL,
      is_read BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
    );

    CREATE TABLE IF NOT EXISTS student_messages (
      id SERIAL PRIMARY KEY,
      student_id INTEGER NOT NULL REFERENCES students(id),
      teacher_id INTEGER NOT NULL REFERENCES users(id),
      subject TEXT NOT NULL,
      message TEXT NOT NULL,
      response TEXT,
      is_read BOOLEAN DEFAULT FALSE,
      response_read BOOLEAN DEFAULT FALSE,
      responded_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
    );

    -- 17. Billing tables
    CREATE TABLE IF NOT EXISTS payment_history (
      id SERIAL PRIMARY KEY,
      school_id INTEGER NOT NULL REFERENCES schools(id),
      amount INTEGER NOT NULL,
      currency TEXT DEFAULT 'EUR',
      status TEXT NOT NULL,
      stripe_payment_intent_id TEXT,
      description TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
    );

    CREATE TABLE IF NOT EXISTS subscriptions (
      id SERIAL PRIMARY KEY,
      school_id INTEGER NOT NULL REFERENCES schools(id),
      plan_type TEXT NOT NULL DEFAULT 'standard',
      status TEXT NOT NULL DEFAULT 'active',
      current_period_start TIMESTAMP,
      current_period_end TIMESTAMP,
      stripe_subscription_id TEXT,
      stripe_customer_id TEXT,
      cancel_at_period_end BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
    );

    CREATE TABLE IF NOT EXISTS school_billing_summary (
      id SERIAL PRIMARY KEY,
      school_id INTEGER NOT NULL REFERENCES schools(id),
      current_plan TEXT DEFAULT 'standard',
      teacher_count INTEGER DEFAULT 1,
      student_count INTEGER DEFAULT 0,
      last_billing_amount INTEGER DEFAULT 0,
      next_billing_amount INTEGER DEFAULT 0,
      last_billing_date TIMESTAMP,
      next_billing_date TIMESTAMP,
      payment_status TEXT DEFAULT 'current',
      stripe_customer_id TEXT,
      stripe_subscription_id TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
    );

    -- 18. School memberships
    CREATE TABLE IF NOT EXISTS school_memberships (
      id SERIAL PRIMARY KEY,
      school_id INTEGER NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      role TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
    );

    -- 19. Lesson progress
    CREATE TABLE IF NOT EXISTS lesson_progress (
      id SERIAL PRIMARY KEY,
      student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      lesson_id INTEGER NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
      status TEXT NOT NULL DEFAULT 'not_started',
      progress INTEGER DEFAULT 0,
      notes TEXT,
      time_spent INTEGER DEFAULT 0,
      last_practiced TIMESTAMP,
      teacher_notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
    );

    -- 20. Cron job health (for schedulers)
    CREATE TABLE IF NOT EXISTS cron_job_health (
      id SERIAL PRIMARY KEY,
      job_name TEXT NOT NULL UNIQUE,
      last_run_at TIMESTAMP,
      last_run_status TEXT,
      last_run_duration INTEGER,
      last_run_result JSONB,
      last_error TEXT,
      next_scheduled_run TIMESTAMP,
      success_count INTEGER DEFAULT 0,
      failure_count INTEGER DEFAULT 0,
      is_active BOOLEAN DEFAULT TRUE,
      cron_schedule TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
    );

    -- Create indexes
    CREATE INDEX IF NOT EXISTS idx_users_school_id ON users(school_id);
    CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
    CREATE INDEX IF NOT EXISTS idx_students_school_id ON students(school_id);
    CREATE INDEX IF NOT EXISTS idx_lessons_user_id ON lessons(user_id);
    CREATE INDEX IF NOT EXISTS idx_songs_user_id ON songs(user_id);
    CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
  `;

  await pool.query(createTablesSQL);
}

/**
 * Seed admin user and default school
 */
async function seedAdminAndSchool() {
  // Check if admin exists
  const existingAdmin = await db.select().from(users).where(eq(users.role, 'admin')).limit(1);

  if (existingAdmin.length > 0) {
    console.log('  Admin already exists, skipping');
    return;
  }

  // Create default school first
  const [school] = await db.insert(schools).values({
    name: process.env.DEFAULT_SCHOOL_NAME || 'MusicDott Demo School',
    address: process.env.DEFAULT_SCHOOL_ADDRESS || 'Music Street 1',
    city: process.env.DEFAULT_SCHOOL_CITY || 'Amsterdam',
    phone: process.env.DEFAULT_SCHOOL_PHONE || '+31 20 123 4567',
    description: 'Demo drumschool voor MusicDott',
    instruments: 'drums,percussion',
  }).returning();

  console.log(`  Created school: ${school.name} (ID: ${school.id})`);

  // Create admin user
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
  const hashedPassword = await hashPassword(adminPassword);

  const [admin] = await db.insert(users).values({
    username: process.env.ADMIN_USERNAME || 'admin',
    password: hashedPassword,
    name: process.env.ADMIN_NAME || 'Admin User',
    email: process.env.ADMIN_EMAIL || 'admin@musicdott.local',
    role: 'admin',
    schoolId: school.id,
    bio: 'System administrator',
  }).returning();

  console.log(`  Created admin: ${admin.username} (ID: ${admin.id})`);

  // Update school owner
  await db.update(schools).set({ ownerId: admin.id }).where(eq(schools.id, school.id));

  // Create a teacher account for testing
  const teacherPassword = await hashPassword('teacher123');
  const [teacher] = await db.insert(users).values({
    username: 'teacher',
    password: teacherPassword,
    name: 'Demo Teacher',
    email: 'teacher@musicdott.local',
    role: 'teacher',
    schoolId: school.id,
    instruments: 'drums',
    bio: 'Demo teacher account',
  }).returning();

  console.log(`  Created teacher: ${teacher.username} (ID: ${teacher.id})`);

  // Print login info
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║                    LOGIN CREDENTIALS                       ║');
  console.log('╠════════════════════════════════════════════════════════════╣');
  console.log('║ Admin:   admin / admin123                                  ║');
  console.log('║ Teacher: teacher / teacher123                              ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
}

/**
 * Seed achievement definitions
 */
async function seedAchievements() {
  const existing = await db.select().from(achievementDefinitions).limit(1);
  if (existing.length > 0) {
    console.log('  Achievements already exist, skipping');
    return;
  }

  const achievements = [
    { name: "First Steps", description: "Complete your first lesson", type: "lesson_completion", criteria: '{"lessonCount":1}', iconName: "music", badgeColor: "bronze", xpValue: 10 },
    { name: "Learning Stride", description: "Complete 5 lessons", type: "lesson_completion", criteria: '{"lessonCount":5}', iconName: "book", badgeColor: "silver", xpValue: 25 },
    { name: "Knowledge Seeker", description: "Complete 10 lessons", type: "lesson_completion", criteria: '{"lessonCount":10}', iconName: "trophy", badgeColor: "gold", xpValue: 50 },
    { name: "Daily Dedication", description: "Practice 3 days in a row", type: "practice_streak", criteria: '{"streakDays":3}', iconName: "zap", badgeColor: "green", xpValue: 15 },
    { name: "Weekly Warrior", description: "Practice 7 days in a row", type: "practice_streak", criteria: '{"streakDays":7}', iconName: "star", badgeColor: "blue", xpValue: 35 },
    { name: "Task Master", description: "Complete your first assignment", type: "assignment_completion", criteria: '{"assignmentCount":1}', iconName: "check", badgeColor: "green", xpValue: 20 },
  ];

  await db.insert(achievementDefinitions).values(achievements);
  console.log(`  Created ${achievements.length} achievement definitions`);
}

/**
 * Seed test data - students, lessons, songs
 */
async function seedTestData() {
  // Get school and teacher
  const [school] = await db.select().from(schools).limit(1);
  const [teacher] = await db.select().from(users).where(eq(users.role, 'teacher')).limit(1);

  if (!school || !teacher) {
    console.log('  No school or teacher found, skipping test data');
    return;
  }

  // Check if students exist
  const existingStudents = await db.select().from(students).limit(1);
  if (existingStudents.length > 0) {
    console.log('  Test data already exists, skipping');
    return;
  }

  // Create test students
  const studentData = [
    { name: 'Jan de Drummer', email: 'jan@test.nl', instrument: 'drums', level: 'beginner' },
    { name: 'Lisa Beats', email: 'lisa@test.nl', instrument: 'drums', level: 'intermediate' },
    { name: 'Pieter Rhythm', email: 'pieter@test.nl', instrument: 'drums', level: 'advanced' },
  ];

  for (const s of studentData) {
    await db.insert(students).values({
      schoolId: school.id,
      name: s.name,
      email: s.email,
      instrument: s.instrument,
      level: s.level,
      assignedTeacherId: teacher.id,
      isActive: true,
    });
  }
  console.log(`  Created ${studentData.length} test students`);

  // Create test lessons
  const lessonData = [
    { title: 'Basic Rock Beat', description: 'Learn the fundamental rock drum pattern', category: 'Basics', level: 'beginner' },
    { title: 'Hi-Hat Techniques', description: 'Master different hi-hat techniques', category: 'Technique', level: 'intermediate' },
    { title: 'Paradiddles', description: 'Essential rudiment for all drummers', category: 'Rudiments', level: 'beginner' },
    { title: 'Jazz Swing', description: 'Introduction to jazz drumming', category: 'Jazz', level: 'intermediate' },
    { title: 'Double Bass Basics', description: 'Getting started with double bass', category: 'Advanced', level: 'advanced' },
  ];

  for (const l of lessonData) {
    await db.insert(lessons).values({
      schoolId: school.id,
      userId: teacher.id,
      title: l.title,
      description: l.description,
      category: l.category,
      level: l.level,
      instrument: 'drums',
      isActive: true,
      contentBlocks: JSON.stringify([
        { type: 'text', content: l.description },
        { type: 'text', content: 'Practice this pattern slowly and gradually increase tempo.' }
      ]),
    });
  }
  console.log(`  Created ${lessonData.length} test lessons`);

  // Create test songs
  const songData = [
    { title: 'Back in Black', artist: 'AC/DC', genre: 'Rock', bpm: 92, difficulty: 'intermediate' },
    { title: 'Billie Jean', artist: 'Michael Jackson', genre: 'Pop', bpm: 117, difficulty: 'beginner' },
    { title: 'Enter Sandman', artist: 'Metallica', genre: 'Metal', bpm: 123, difficulty: 'intermediate' },
    { title: 'Take Five', artist: 'Dave Brubeck', genre: 'Jazz', bpm: 176, difficulty: 'advanced' },
    { title: 'Seven Nation Army', artist: 'The White Stripes', genre: 'Rock', bpm: 124, difficulty: 'beginner' },
  ];

  for (const s of songData) {
    await db.insert(songs).values({
      schoolId: school.id,
      userId: teacher.id,
      title: s.title,
      artist: s.artist,
      composer: s.artist,
      genre: s.genre,
      bpm: s.bpm,
      difficulty: s.difficulty,
      instrument: 'drums',
      isActive: true,
      contentBlocks: JSON.stringify([
        { type: 'text', content: `Practice notes for ${s.title}` }
      ]),
    });
  }
  console.log(`  Created ${songData.length} test songs`);
}

/**
 * Get database status
 */
async function getDatabaseStatus() {
  try {
    const [userCount] = await db.select({ count: eq(users.id, users.id) }).from(users);
    const [studentCount] = await db.select({ count: eq(students.id, students.id) }).from(students);
    const [lessonCount] = await db.select({ count: eq(lessons.id, lessons.id) }).from(lessons);
    const [songCount] = await db.select({ count: eq(songs.id, songs.id) }).from(songs);

    return {
      connected: true,
      users: userCount?.count || 0,
      students: studentCount?.count || 0,
      lessons: lessonCount?.count || 0,
      songs: songCount?.count || 0,
    };
  } catch (error) {
    return { connected: false, error: String(error) };
  }
}

// Legacy export for compatibility
export async function verifyDatabaseSetup() {
  return setupDatabase();
}
