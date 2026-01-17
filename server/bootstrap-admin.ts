import { pool, db } from './db';
import { users, schools } from '@shared/schema';
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
 * Generate a secure random password
 */
function generateSecurePassword(): string {
  const length = 16;
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
  let password = '';
  const randomBytesBuffer = randomBytes(length);

  for (let i = 0; i < length; i++) {
    password += charset[randomBytesBuffer[i] % charset.length];
  }

  // Ensure password meets complexity requirements
  if (!/[a-z]/.test(password)) password += 'a';
  if (!/[A-Z]/.test(password)) password += 'A';
  if (!/[0-9]/.test(password)) password += '1';
  if (!/[!@#$%^&*]/.test(password)) password += '!';

  return password;
}

/**
 * Bootstrap admin user and default school
 * Runs on first startup to ensure system is accessible
 */
export async function bootstrapAdmin(): Promise<void> {
  console.log('🔐 Starting admin bootstrap process...');

  try {
    // Check if any admin user exists
    const existingAdmins = await db
      .select()
      .from(users)
      .where(eq(users.role, 'admin'))
      .limit(1);

    if (existingAdmins.length > 0) {
      console.log('✅ Admin user already exists, skipping bootstrap');
      return;
    }

    console.log('📝 No admin user found, creating default admin...');

    // Get admin credentials from environment variables
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@musicdott.local';
    const adminUsername = process.env.ADMIN_USERNAME || 'admin';
    const adminName = process.env.ADMIN_NAME || 'System Administrator';
    let adminPassword = process.env.ADMIN_PASSWORD;
    let generatedPassword = false;

    // Generate secure password if not provided
    if (!adminPassword) {
      adminPassword = generateSecurePassword();
      generatedPassword = true;
      console.warn('⚠️  ADMIN_PASSWORD not set in environment, generated secure password');
    }

    // Hash the password
    const hashedPassword = await hashPassword(adminPassword);

    // Check if default school exists
    let defaultSchool = await db
      .select()
      .from(schools)
      .limit(1);

    let schoolId: number;

    if (defaultSchool.length === 0) {
      console.log('📚 Creating default school...');

      // Create default school (owner_id will be set after user creation)
      const [newSchool] = await db
        .insert(schools)
        .values({
          name: process.env.DEFAULT_SCHOOL_NAME || 'MusicDott School',
          address: process.env.DEFAULT_SCHOOL_ADDRESS || '',
          city: process.env.DEFAULT_SCHOOL_CITY || '',
          phone: process.env.DEFAULT_SCHOOL_PHONE || '',
          description: 'Default school created during initial setup',
          instruments: 'drums,piano,guitar,bass,vocals',
        })
        .returning();

      schoolId = newSchool.id;
      console.log(`✅ Created default school (ID: ${schoolId})`);
    } else {
      schoolId = defaultSchool[0].id;
      console.log(`✅ Using existing school (ID: ${schoolId})`);
    }

    // Create admin user
    const [adminUser] = await db
      .insert(users)
      .values({
        username: adminUsername,
        password: hashedPassword,
        name: adminName,
        email: adminEmail,
        role: 'admin',
        schoolId: schoolId,
        mustChangePassword: false,
        bio: 'System administrator account',
      })
      .returning();

    console.log(`✅ Created admin user (ID: ${adminUser.id})`);

    // Update school owner if it wasn't set
    if (defaultSchool.length === 0 || !defaultSchool[0].ownerId) {
      await db
        .update(schools)
        .set({ ownerId: adminUser.id })
        .where(eq(schools.id, schoolId));
      console.log(`✅ Set admin as school owner`);
    }

    // Print credentials
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║            ADMIN ACCOUNT CREATED SUCCESSFULLY              ║');
    console.log('╠════════════════════════════════════════════════════════════╣');
    console.log(`║ Username: ${adminUsername.padEnd(48)} ║`);
    console.log(`║ Email:    ${adminEmail.padEnd(48)} ║`);

    if (generatedPassword) {
      console.log('║                                                            ║');
      console.log('║ ⚠️  IMPORTANT: Save this password - it will NOT be shown  ║');
      console.log('║     again! Set ADMIN_PASSWORD env var to customize it.   ║');
      console.log('║                                                            ║');
      console.log(`║ Password: ${adminPassword.padEnd(48)} ║`);
    } else {
      console.log('║ Password: (from ADMIN_PASSWORD environment variable)      ║');
    }

    console.log('╚════════════════════════════════════════════════════════════╝\n');

  } catch (error) {
    console.error('❌ Admin bootstrap failed:', error);
    throw error;
  }
}
