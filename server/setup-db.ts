import { pool, db, isDatabaseAvailable } from './db';
import { users, schools, students, lessons, songs, achievementDefinitions, schoolMemberships } from '@shared/schema';
import { count, eq } from 'drizzle-orm';
import { scrypt, randomBytes } from 'crypto';
import { promisify } from 'util';
import { migrationRunner } from './migrations-runner';

const scryptAsync = promisify(scrypt);

/**
 * Hash password using scrypt (matches auth.ts)
 */
async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

interface SetupDatabaseOptions {
  migrate?: boolean;
  seedAdminAndSchool?: boolean;
  seedAchievements?: boolean;
  seedTestData?: boolean;
}

export async function setupDatabase(options: SetupDatabaseOptions = {}) {
  const defaultSeedTestData = process.env.NODE_ENV !== "production";
  const {
    migrate = true,
    seedAdminAndSchool: shouldSeedAdminAndSchool = true,
    seedAchievements: shouldSeedAchievements = true,
    seedTestData: shouldSeedTestData = defaultSeedTestData,
  } = options;

  console.log('🔧 Starting database bootstrap...');

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

    if (migrate) {
      console.log('🔄 Running schema migrations...');
      const migrationStatus = await createTables();
      console.log(
        `✅ Schema migrations complete (${migrationStatus.migrationsExecuted.length} applied, ` +
        `${migrationStatus.migrationsPending.length} pending)`,
      );
    }

    if (shouldSeedAdminAndSchool) {
      console.log('👤 Setting up admin user...');
      await seedAdminAndSchool();
      console.log('✅ Admin setup complete');
    }

    if (shouldSeedAchievements) {
      console.log('🏆 Seeding achievements...');
      await seedAchievements();
      console.log('✅ Achievements seeded');
    }

    if (shouldSeedTestData) {
      console.log('📚 Seeding test data...');
      await seedTestData();
      console.log('✅ Test data seeded');
    }

    // 6. Get status
    const status = await getDatabaseStatus();

    console.log('✅ Database bootstrap completed successfully!');
    return { success: true, message: 'Database bootstrap completed', status };

  } catch (error) {
    console.error('❌ Database bootstrap failed:', error);
    return {
      success: false,
      message: 'Database bootstrap failed',
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Run versioned schema migrations.
 */
async function createTables() {
  return migrationRunner.runPendingMigrations();
}

/**
 * Seed admin user and default school
 * Creates accounts in logical order:
 * 1. Admin (platform_owner) - manages the platform
 * 2. School Owner - will own the school
 * 3. School - created with owner reference
 * 4. Teacher - assigned to the school
 * 5. Student - assigned to the school and teacher
 */
async function seedAdminAndSchool() {
  // 1. Get or create admin (platform_owner) - FIRST, they manage the platform
  console.log('  Step 1: Creating platform admin...');
  let admin = await db.select().from(users).where(eq(users.username, 'admin')).limit(1).then(r => r[0]);

  if (!admin) {
    // Use ADMIN_PASSWORD env var; fall back to a cryptographically random password
    // so the system is never bootstrapped with a predictable credential.
    const rawPassword = process.env.ADMIN_PASSWORD || randomBytes(16).toString('hex');
    if (!process.env.ADMIN_PASSWORD) {
      console.warn(`\n⚠️  ADMIN_PASSWORD not set — generated one-time password: ${rawPassword}`);
      console.warn('    Save this now. It will NOT be shown again.\n');
    }
    const adminPassword = await hashPassword(rawPassword);
    [admin] = await db.insert(users).values({
      username: process.env.ADMIN_USERNAME || 'admin',
      password: adminPassword,
      name: process.env.ADMIN_NAME || 'Admin User',
      email: process.env.ADMIN_EMAIL || 'admin@musicdott.local',
      role: 'platform_owner',
      schoolId: null, // Platform owner doesn't belong to a specific school
      bio: 'System administrator',
    }).returning();
    console.log(`    ✅ Created admin: ${admin.username} (ID: ${admin.id})`);
  } else {
    console.log(`    ℹ️  Admin exists: ${admin.username} (ID: ${admin.id})`);
  }

  // 2. Get or create school_owner (stefan) — development only
  // In production, the school owner is created via the registration flow.
  if (process.env.NODE_ENV === 'production') {
    console.log('  Step 2-5: Skipping test accounts in production environment.');
    return;
  }

  console.log('  Step 2: Creating school owner (dev only)...');
  let schoolOwner = await db.select().from(users).where(eq(users.username, 'stefan')).limit(1).then(r => r[0]);

  if (!schoolOwner) {
    const schoolOwnerPassword = await hashPassword('schoolowner123');
    [schoolOwner] = await db.insert(users).values({
      username: 'stefan',
      password: schoolOwnerPassword,
      name: 'Stefan van de Brug',
      email: 'stefan@stefanvandebrug.nl',
      role: 'school_owner',
      schoolId: null, // Will be updated after school creation
      instruments: 'drums,percussion',
      bio: 'Eigenaar en hoofddocent van Muziekschool Stefan van de Brug',
    }).returning();
    console.log(`    ✅ Created school_owner: ${schoolOwner.username} (ID: ${schoolOwner.id})`);
  } else {
    console.log(`    ℹ️  School owner exists: ${schoolOwner.username} (ID: ${schoolOwner.id})`);
  }

  // 3. Get or create school - THIRD, now we can link to the owner
  console.log('  Step 3: Creating school with owner...');
  let school = await db.select().from(schools).limit(1).then(r => r[0]);

  if (!school) {
    [school] = await db.insert(schools).values({
      name: process.env.DEFAULT_SCHOOL_NAME || 'Muziekschool Stefan van de Brug',
      ownerId: schoolOwner.id, // Link to the school owner we just created
      address: process.env.DEFAULT_SCHOOL_ADDRESS || 'Muziekstraat 1',
      city: process.env.DEFAULT_SCHOOL_CITY || 'Utrecht',
      phone: process.env.DEFAULT_SCHOOL_PHONE || '+31 30 123 4567',
      website: 'https://www.stefanvandebrug.nl',
      description: 'Professionele drumschool met persoonlijke begeleiding',
      instruments: 'drums,percussion,cajon',
    }).returning();
    console.log(`    ✅ Created school: ${school.name} (ID: ${school.id}) with owner: ${schoolOwner.name}`);

    // Update school owner's schoolId to link back to the school
    await db.update(users).set({ schoolId: school.id }).where(eq(users.id, schoolOwner.id));
    console.log(`    ✅ Linked school owner to school`);

    // Create school membership for the owner
    await db.insert(schoolMemberships).values({
      schoolId: school.id,
      userId: schoolOwner.id,
      role: 'owner',
    }).onConflictDoNothing();
    console.log(`    ✅ Created school membership for owner`);
  } else {
    console.log(`    ℹ️  School exists: ${school.name} (ID: ${school.id})`);

    // Ensure school owner is linked if school exists but owner isn't linked
    if (!school.ownerId && schoolOwner) {
      await db.update(schools).set({ ownerId: schoolOwner.id }).where(eq(schools.id, school.id));
      await db.update(users).set({ schoolId: school.id }).where(eq(users.id, schoolOwner.id));
      console.log(`    ✅ Fixed: Linked existing school to owner`);
    }
  }

  // 4. Get or create teacher (mark) - FOURTH, assigned to the school
  console.log('  Step 4: Creating teacher...');
  let teacher = await db.select().from(users).where(eq(users.username, 'mark')).limit(1).then(r => r[0]);

  if (!teacher) {
    const teacherPassword = await hashPassword('teacher123');
    [teacher] = await db.insert(users).values({
      username: 'mark',
      password: teacherPassword,
      name: 'Mark Jansen',
      email: 'mark@stefanvandebrug.nl',
      role: 'teacher',
      schoolId: school.id,
      instruments: 'drums,cajon',
      bio: 'Drumdocent bij Muziekschool Stefan van de Brug',
    }).returning();
    console.log(`    ✅ Created teacher: ${teacher.username} (ID: ${teacher.id})`);

    // Create school membership for the teacher
    await db.insert(schoolMemberships).values({
      schoolId: school.id,
      userId: teacher.id,
      role: 'teacher',
    }).onConflictDoNothing();
    console.log(`    ✅ Created school membership for teacher`);
  } else {
    console.log(`    ℹ️  Teacher exists: ${teacher.username} (ID: ${teacher.id})`);
    // Ensure existing teacher is linked to the school
    if (teacher.schoolId !== school.id) {
      await db.update(users).set({ schoolId: school.id }).where(eq(users.id, teacher.id));
      console.log(`    ✅ Linked existing teacher to school`);
    }
    await db.insert(schoolMemberships).values({
      schoolId: school.id,
      userId: teacher.id,
      role: 'teacher',
    }).onConflictDoNothing();
  }

  // 5. Get or create student user (tim) - FIFTH, assigned to school and teacher
  console.log('  Step 5: Creating student...');
  let studentUser = await db.select().from(users).where(eq(users.username, 'tim')).limit(1).then(r => r[0]);

  if (!studentUser) {
    const studentPassword = await hashPassword('student123');
    [studentUser] = await db.insert(users).values({
      username: 'tim',
      password: studentPassword,
      name: 'Tim de Vries',
      email: 'tim@student.stefanvandebrug.nl',
      role: 'student',
      schoolId: school.id,
      bio: 'Leerling drums - beginner niveau',
    }).returning();
    console.log(`    ✅ Created student user: ${studentUser.username} (ID: ${studentUser.id})`);

    // Create corresponding student record linked to the student user
    const [studentRecord] = await db.insert(students).values({
      schoolId: school.id,
      userId: teacher.id, // Creator is the teacher
      accountId: studentUser.id, // Linked user account
      name: studentUser.name,
      email: studentUser.email,
      phone: '+31 6 12345678',
      instrument: 'drums',
      level: 'beginner',
      assignedTeacherId: teacher.id,
      notes: 'Leeftijd: 14 jaar\nOuder: Jan de Vries\nOuder Email: jan.devries@example.nl',
      isActive: true,
    }).returning();
    console.log(`    ✅ Created student record (ID: ${studentRecord.id}) linked to user: ${studentUser.username}`);
  } else {
    console.log(`    ℹ️  Student user exists: ${studentUser.username} (ID: ${studentUser.id})`);
    if (studentUser.schoolId !== school.id) {
      await db.update(users).set({ schoolId: school.id }).where(eq(users.id, studentUser.id));
      console.log(`    ✅ Linked existing student user to school`);
    }
    // Ensure a student record exists for the user
    const existingStudentRecord = await db.select().from(students).where(eq(students.accountId, studentUser.id)).limit(1);
    if (existingStudentRecord.length === 0) {
      const [studentRecord] = await db.insert(students).values({
        schoolId: school.id,
        userId: teacher.id, // Creator is the teacher
        accountId: studentUser.id, // Linked user account
        name: studentUser.name,
        email: studentUser.email,
        phone: '+31 6 12345678',
        instrument: 'drums',
        level: 'beginner',
        assignedTeacherId: teacher.id,
        notes: 'Leeftijd: 14 jaar\nOuder: Jan de Vries\nOuder Email: jan.devries@example.nl',
        isActive: true,
      }).returning();
      console.log(`    ✅ Created missing student record (ID: ${studentRecord.id}) for user: ${studentUser.username}`);
    }
  }

  if (process.env.NODE_ENV !== 'production') {
    console.log('\n╔════════════════════════════════════════════════════════════════════╗');
    console.log('║                    LOGIN CREDENTIALS                               ║');
    console.log('║         Muziekschool Stefan van de Brug                            ║');
    console.log('╠════════════════════════════════════════════════════════════════════╣');
    console.log('║ Platform Owner: admin / admin                                      ║');
    console.log('║ School Owner:   stefan / schoolowner123 (Stefan van de Brug)       ║');
    console.log('║ Teacher:        mark / teacher123 (Mark Jansen)                    ║');
    console.log('║ Student:        tim / student123 (Tim de Vries)                    ║');
    console.log('╚════════════════════════════════════════════════════════════════════╝\n');
  }
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

  // Create test students with realistic Dutch names
  const studentData = [
    { name: 'Sophie Bakker', email: 'sophie.bakker@test.nl', phone: '+31 6 11111111', instrument: 'drums', level: 'beginner', notes: 'Leeftijd: 12 jaar\nOuder: Petra Bakker' },
    { name: 'Lars van den Berg', email: 'lars.vdberg@test.nl', phone: '+31 6 22222222', instrument: 'drums', level: 'intermediate', notes: 'Leeftijd: 16 jaar\nOuder: Marco van den Berg' },
    { name: 'Emma Visser', email: 'emma.visser@test.nl', phone: '+31 6 33333333', instrument: 'cajon', level: 'advanced', notes: 'Leeftijd: 18 jaar\nSpeelt al 5 jaar' },
  ];

  for (const s of studentData) {
    await db.insert(students).values({
      schoolId: school.id,
      userId: teacher.id, // Creator is the teacher
      name: s.name,
      email: s.email,
      phone: s.phone,
      instrument: s.instrument,
      level: s.level,
      assignedTeacherId: teacher.id,
      notes: s.notes,
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
export async function getDatabaseStatus() {
  try {
    if (!isDatabaseAvailable || !db) {
      return {
        connected: false,
        migrations: await migrationRunner.getStatus(),
        error: 'Database not available',
      };
    }

    const [userCount, studentCount, lessonCount, songCount, migrationStatus] = await Promise.all([
      db.select({ count: count() }).from(users).then((rows) => rows[0]),
      db.select({ count: count() }).from(students).then((rows) => rows[0]),
      db.select({ count: count() }).from(lessons).then((rows) => rows[0]),
      db.select({ count: count() }).from(songs).then((rows) => rows[0]),
      migrationRunner.getStatus(),
    ]);

    return {
      connected: true,
      users: Number(userCount?.count ?? 0),
      students: Number(studentCount?.count ?? 0),
      lessons: Number(lessonCount?.count ?? 0),
      songs: Number(songCount?.count ?? 0),
      migrations: migrationStatus,
    };
  } catch (error) {
    return { connected: false, error: String(error) };
  }
}

// Legacy export for compatibility
export async function verifyDatabaseSetup() {
  return setupDatabase({
    migrate: true,
    seedAdminAndSchool: false,
    seedAchievements: false,
    seedTestData: false,
  });
}

async function runCli() {
  const args = new Set(process.argv.slice(2));

  if (args.has("--status")) {
    console.log(JSON.stringify(await getDatabaseStatus(), null, 2));
    return;
  }

  if (args.has("--migrate-only")) {
    const result = await setupDatabase({
      migrate: true,
      seedAdminAndSchool: false,
      seedAchievements: false,
      seedTestData: false,
    });
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  if (args.has("--seed-only")) {
    const result = await setupDatabase({
      migrate: false,
      seedAdminAndSchool: true,
      seedAchievements: true,
      seedTestData: true,
    });
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  if (args.has("--seed-core-only")) {
    const result = await setupDatabase({
      migrate: false,
      seedAdminAndSchool: true,
      seedAchievements: true,
      seedTestData: false,
    });
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  const result = await setupDatabase();
  console.log(JSON.stringify(result, null, 2));
}

if (process.argv[1]?.endsWith("server/setup-db.ts")) {
  void runCli().catch((error) => {
    console.error("❌ Database bootstrap command failed:", error);
    process.exit(1);
  });
}
