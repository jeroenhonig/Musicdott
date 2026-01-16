#!/usr/bin/env tsx

import fs from 'fs/promises';
import path from 'path';
import { FileStorage } from '../file-storage';
import type { School, User, Student, Song, Lesson, Assignment, Session, RecurringSchedule, GroovePattern } from '@shared/schema';

interface MigrationOptions {
  dryRun?: boolean;
  force?: boolean;
  verbose?: boolean;
  dataDir?: string;
}

interface MigrationStats {
  schoolsCreated: number;
  usersUpdated: number;
  studentsUpdated: number;
  songsUpdated: number;
  lessonsUpdated: number;
  assignmentsUpdated: number;
  sessionsUpdated: number;
  recurringSchedulesUpdated: number;
  groovePatternsUpdated: number;
  errors: string[];
}

class LegacyDataMigrator {
  private storage: FileStorage;
  private options: MigrationOptions;
  private stats: MigrationStats;
  private dataDir: string;

  constructor(options: MigrationOptions = {}) {
    this.dataDir = options.dataDir || './data';
    this.storage = new FileStorage(this.dataDir);
    this.options = options;
    this.stats = {
      schoolsCreated: 0,
      usersUpdated: 0,
      studentsUpdated: 0,
      songsUpdated: 0,
      lessonsUpdated: 0,
      assignmentsUpdated: 0,
      sessionsUpdated: 0,
      recurringSchedulesUpdated: 0,
      groovePatternsUpdated: 0,
      errors: []
    };
  }

  async migrate(): Promise<void> {
    try {
      this.log('🚀 Starting MusicDott 1.0 legacy data migration...');
      
      if (this.options.dryRun) {
        this.log('📋 DRY RUN MODE - No changes will be made');
      }

      // Initialize storage
      await this.storage.initialize();

      // Analyze current state
      await this.analyzeDataState();

      // Create backup if not dry run
      if (!this.options.dryRun) {
        await this.createBackup();
      }

      // Step 1: Ensure default school exists
      const defaultSchool = await this.ensureDefaultSchool();

      // Step 2: Create teacher schools and assign data
      const teacherSchools = await this.createTeacherSchools();

      // Step 3: Migrate data to proper schools
      await this.migrateStudents(defaultSchool, teacherSchools);
      await this.migrateSongs(defaultSchool, teacherSchools);
      await this.migrateLessons(defaultSchool, teacherSchools);
      await this.migrateRecurringSchedules(defaultSchool, teacherSchools);
      await this.migrateAssignments(defaultSchool, teacherSchools);
      await this.migrateSessions(defaultSchool, teacherSchools);
      await this.migrateGroovePatterns(defaultSchool, teacherSchools);

      // Step 4: Verify migration
      await this.verifyMigration();

      this.printSummary();

    } catch (error) {
      this.stats.errors.push(`Migration failed: ${error instanceof Error ? error.message : String(error)}`);
      this.log('❌ Migration failed:', error);
      throw error;
    }
  }

  private async analyzeDataState(): Promise<void> {
    this.log('🔍 Analyzing current data state...');
    
    const collections = [
      'students', 'songs', 'lessons', 'assignments', 
      'sessions', 'recurringSchedules', 'groovePatterns', 'schools', 'users'
    ];

    for (const collection of collections) {
      try {
        const filePath = path.join(this.dataDir, `${collection}.json`);
        const exists = await fs.access(filePath).then(() => true).catch(() => false);
        if (exists) {
          const data = JSON.parse(await fs.readFile(filePath, 'utf-8'));
          const withSchoolId = data.filter((item: any) => item.schoolId != null).length;
          const withoutSchoolId = data.filter((item: any) => item.schoolId == null).length;
          
          this.log(`📊 ${collection}: ${data.length} total, ${withSchoolId} with schoolId, ${withoutSchoolId} need migration`);
        } else {
          this.log(`📊 ${collection}: File not found`);
        }
      } catch (error) {
        this.log(`⚠️ Error analyzing ${collection}:`, error);
      }
    }
  }

  private async createBackup(): Promise<void> {
    this.log('💾 Creating backup...');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = path.join(this.dataDir, `backup-${timestamp}`);
    
    try {
      await fs.mkdir(backupDir, { recursive: true });
      
      const files = await fs.readdir(this.dataDir);
      const jsonFiles = files.filter(f => f.endsWith('.json'));
      
      for (const file of jsonFiles) {
        const srcPath = path.join(this.dataDir, file);
        const destPath = path.join(backupDir, file);
        await fs.copyFile(srcPath, destPath);
      }
      
      this.log(`✅ Backup created: ${backupDir}`);
    } catch (error) {
      throw new Error(`Failed to create backup: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async ensureDefaultSchool(): Promise<School> {
    this.log('🏫 Ensuring default school exists...');
    
    const schools = await this.storage.getSchools();
    let defaultSchool = schools.find(s => s.name === 'MusicDott Legacy School');
    
    if (!defaultSchool && !this.options.dryRun) {
      // Create platform owner user if doesn't exist
      let platformOwner = await this.storage.getUserByEmail('admin@musicdott.app');
      if (!platformOwner) {
        platformOwner = await this.storage.createUser({
          schoolId: null,
          username: 'platform-admin',
          password: '$2b$10$dummy-hash-for-platform-admin',
          name: 'Platform Administrator',
          email: 'admin@musicdott.app',
          role: 'platform_owner',
          instruments: null,
          avatar: null,
          bio: 'Platform administrator for MusicDott legacy data migration'
        });
        this.log('👤 Created platform owner user');
      }

      defaultSchool = await this.storage.createSchool({
        name: 'MusicDott Legacy School',
        address: 'Den Haag, Netherlands',
        phone: null,
        email: 'legacy@musicdott.app',
        website: null,
        description: 'Default school for imported MusicDott 1.0 legacy data',
        isActive: true,
        ownerId: platformOwner.id!,
        subscriptionStatus: 'active',
        subscriptionPlan: 'professional'
      });
      
      this.stats.schoolsCreated++;
      this.log(`✅ Created default school: ${defaultSchool.name} (ID: ${defaultSchool.id})`);
    } else if (defaultSchool) {
      this.log(`✅ Default school exists: ${defaultSchool.name} (ID: ${defaultSchool.id})`);
    } else {
      this.log('📋 DRY RUN: Would create default school "MusicDott Legacy School"');
      // Return a mock school for dry run
      defaultSchool = {
        id: 1,
        name: 'MusicDott Legacy School',
        address: 'Den Haag, Netherlands',
        phone: null,
        email: 'legacy@musicdott.app',
        website: null,
        description: 'Default school for imported MusicDott 1.0 legacy data',
        isActive: true,
        ownerId: 1,
        subscriptionStatus: 'active',
        subscriptionPlan: 'professional',
        createdAt: new Date(),
        updatedAt: new Date()
      } as School;
    }

    return defaultSchool;
  }

  private async createTeacherSchools(): Promise<Map<number, School>> {
    this.log('👨‍🏫 Analyzing teacher assignments and creating schools...');
    
    const teacherSchools = new Map<number, School>();
    const students = await this.loadJsonFile<Student[]>('students');
    
    if (!students) return teacherSchools;

    // Group students by assigned teacher
    const teacherGroups = new Map<number, Student[]>();
    students.forEach(student => {
      if (student.assignedTeacherId) {
        if (!teacherGroups.has(student.assignedTeacherId)) {
          teacherGroups.set(student.assignedTeacherId, []);
        }
        teacherGroups.get(student.assignedTeacherId)!.push(student);
      }
    });

    this.log(`📊 Found ${teacherGroups.size} teachers with assigned students`);

    // For each teacher, create or find their school
    for (const [teacherId, teacherStudents] of teacherGroups) {
      try {
        const teacher = await this.storage.getUser(teacherId);
        
        if (teacher && teacherStudents.length > 0) {
          const schoolName = `${teacher.name}'s Music School`;
          
          if (!this.options.dryRun) {
            let teacherSchool = await this.storage.getSchools().then(schools => 
              schools.find(s => s.name === schoolName)
            );

            if (!teacherSchool) {
              teacherSchool = await this.storage.createSchool({
                name: schoolName,
                address: 'Den Haag, Netherlands',
                phone: null,
                email: teacher.email,
                website: null,
                description: `Music school for ${teacher.name} with ${teacherStudents.length} students`,
                isActive: true,
                ownerId: teacher.id!,
                subscriptionStatus: 'active',
                subscriptionPlan: 'professional'
              });
              
              this.stats.schoolsCreated++;
              this.log(`✅ Created teacher school: ${schoolName} for ${teacherStudents.length} students`);
            }
            
            teacherSchools.set(teacherId, teacherSchool);
          } else {
            this.log(`📋 DRY RUN: Would create school "${schoolName}" for teacher ${teacher.name} (${teacherStudents.length} students)`);
          }
        }
      } catch (error) {
        this.stats.errors.push(`Error creating school for teacher ${teacherId}: ${error instanceof Error ? error.message : String(error)}`);
        this.log(`⚠️ Error processing teacher ${teacherId}:`, error);
      }
    }

    return teacherSchools;
  }

  private async migrateStudents(defaultSchool: School, teacherSchools: Map<number, School>): Promise<void> {
    this.log('👥 Migrating students...');
    
    const students = await this.loadJsonFile<Student[]>('students');
    if (!students) return;

    const studentsToUpdate: Student[] = [];

    for (const student of students) {
      // Skip if already has schoolId
      if (student.schoolId) {
        continue;
      }

      let targetSchoolId = defaultSchool.id!;
      
      // Assign to teacher's school if teacher is assigned and has a school
      if (student.assignedTeacherId && teacherSchools.has(student.assignedTeacherId)) {
        targetSchoolId = teacherSchools.get(student.assignedTeacherId)!.id!;
      }

      const updatedStudent = {
        ...student,
        schoolId: targetSchoolId
      };

      studentsToUpdate.push(updatedStudent);
      this.stats.studentsUpdated++;
    }

    if (studentsToUpdate.length > 0 && !this.options.dryRun) {
      await this.saveJsonFile('students', students.map(s => {
        const updated = studentsToUpdate.find(us => us.id === s.id);
        return updated || s;
      }));
      this.log(`✅ Updated ${studentsToUpdate.length} students with schoolId`);
    } else if (studentsToUpdate.length > 0) {
      this.log(`📋 DRY RUN: Would update ${studentsToUpdate.length} students with schoolId`);
    } else {
      this.log('✅ All students already have schoolId');
    }
  }

  private async migrateSongs(defaultSchool: School, teacherSchools: Map<number, School>): Promise<void> {
    this.log('🎵 Migrating songs...');
    
    const songs = await this.loadJsonFile<Song[]>('songs');
    if (!songs) return;

    const songsToUpdate: Song[] = [];

    for (const song of songs) {
      // Skip if already has schoolId
      if ((song as any).schoolId) {
        continue;
      }

      let targetSchoolId = defaultSchool.id!;
      
      // Assign to teacher's school if song has userId and that user has a school
      if (song.userId && teacherSchools.has(song.userId)) {
        targetSchoolId = teacherSchools.get(song.userId)!.id!;
      }

      const updatedSong = {
        ...song,
        schoolId: targetSchoolId
      } as Song & { schoolId: number };

      songsToUpdate.push(updatedSong);
      this.stats.songsUpdated++;
    }

    if (songsToUpdate.length > 0 && !this.options.dryRun) {
      await this.saveJsonFile('songs', songs.map(s => {
        const updated = songsToUpdate.find(us => us.id === s.id);
        return updated || s;
      }));
      this.log(`✅ Updated ${songsToUpdate.length} songs with schoolId`);
    } else if (songsToUpdate.length > 0) {
      this.log(`📋 DRY RUN: Would update ${songsToUpdate.length} songs with schoolId`);
    } else {
      this.log('✅ All songs already have schoolId');
    }
  }

  private async migrateLessons(defaultSchool: School, teacherSchools: Map<number, School>): Promise<void> {
    this.log('📚 Migrating lessons...');
    
    const lessons = await this.loadJsonFile<Lesson[]>('lessons');
    if (!lessons) return;

    const lessonsToUpdate: Lesson[] = [];

    for (const lesson of lessons) {
      // Skip if already has schoolId
      if ((lesson as any).schoolId) {
        continue;
      }

      let targetSchoolId = defaultSchool.id!;
      
      // Assign to teacher's school if lesson has userId and that user has a school
      if (lesson.userId && teacherSchools.has(lesson.userId)) {
        targetSchoolId = teacherSchools.get(lesson.userId)!.id!;
      }

      const updatedLesson = {
        ...lesson,
        schoolId: targetSchoolId
      } as Lesson & { schoolId: number };

      lessonsToUpdate.push(updatedLesson);
      this.stats.lessonsUpdated++;
    }

    if (lessonsToUpdate.length > 0 && !this.options.dryRun) {
      await this.saveJsonFile('lessons', lessons.map(l => {
        const updated = lessonsToUpdate.find(ul => ul.id === l.id);
        return updated || l;
      }));
      this.log(`✅ Updated ${lessonsToUpdate.length} lessons with schoolId`);
    } else if (lessonsToUpdate.length > 0) {
      this.log(`📋 DRY RUN: Would update ${lessonsToUpdate.length} lessons with schoolId`);
    } else {
      this.log('✅ All lessons already have schoolId');
    }
  }

  private async migrateRecurringSchedules(defaultSchool: School, teacherSchools: Map<number, School>): Promise<void> {
    this.log('📅 Migrating recurring schedules...');
    
    const schedules = await this.loadJsonFile<RecurringSchedule[]>('recurringSchedules');
    if (!schedules) return;

    const schedulesToUpdate: RecurringSchedule[] = [];

    for (const schedule of schedules) {
      // Skip if already has schoolId
      if ((schedule as any).schoolId) {
        continue;
      }

      let targetSchoolId = defaultSchool.id!;
      
      // Assign to teacher's school if schedule has userId and that user has a school
      if (schedule.userId && teacherSchools.has(schedule.userId)) {
        targetSchoolId = teacherSchools.get(schedule.userId)!.id!;
      }

      const updatedSchedule = {
        ...schedule,
        schoolId: targetSchoolId
      } as RecurringSchedule & { schoolId: number };

      schedulesToUpdate.push(updatedSchedule);
      this.stats.recurringSchedulesUpdated++;
    }

    if (schedulesToUpdate.length > 0 && !this.options.dryRun) {
      await this.saveJsonFile('recurringSchedules', schedules.map(s => {
        const updated = schedulesToUpdate.find(us => us.id === s.id);
        return updated || s;
      }));
      this.log(`✅ Updated ${schedulesToUpdate.length} recurring schedules with schoolId`);
    } else if (schedulesToUpdate.length > 0) {
      this.log(`📋 DRY RUN: Would update ${schedulesToUpdate.length} recurring schedules with schoolId`);
    } else {
      this.log('✅ All recurring schedules already have schoolId');
    }
  }

  private async migrateAssignments(defaultSchool: School, teacherSchools: Map<number, School>): Promise<void> {
    this.log('📝 Migrating assignments...');
    
    const assignments = await this.loadJsonFile<Assignment[]>('assignments');
    if (!assignments) return;

    const assignmentsToUpdate: Assignment[] = [];

    for (const assignment of assignments) {
      // Skip if already has schoolId
      if ((assignment as any).schoolId) {
        continue;
      }

      let targetSchoolId = defaultSchool.id!;
      
      // Assign to teacher's school if assignment has userId and that user has a school
      if (assignment.userId && teacherSchools.has(assignment.userId)) {
        targetSchoolId = teacherSchools.get(assignment.userId)!.id!;
      }

      const updatedAssignment = {
        ...assignment,
        schoolId: targetSchoolId
      } as Assignment & { schoolId: number };

      assignmentsToUpdate.push(updatedAssignment);
      this.stats.assignmentsUpdated++;
    }

    if (assignmentsToUpdate.length > 0 && !this.options.dryRun) {
      await this.saveJsonFile('assignments', assignments.map(a => {
        const updated = assignmentsToUpdate.find(ua => ua.id === a.id);
        return updated || a;
      }));
      this.log(`✅ Updated ${assignmentsToUpdate.length} assignments with schoolId`);
    } else if (assignmentsToUpdate.length > 0) {
      this.log(`📋 DRY RUN: Would update ${assignmentsToUpdate.length} assignments with schoolId`);
    } else {
      this.log('✅ All assignments already have schoolId');
    }
  }

  private async migrateSessions(defaultSchool: School, teacherSchools: Map<number, School>): Promise<void> {
    this.log('🎯 Migrating sessions...');
    
    const sessions = await this.loadJsonFile<Session[]>('sessions');
    if (!sessions) return;

    const sessionsToUpdate: Session[] = [];

    for (const session of sessions) {
      // Skip if already has schoolId
      if ((session as any).schoolId) {
        continue;
      }

      let targetSchoolId = defaultSchool.id!;
      
      // Assign to teacher's school if session has userId and that user has a school
      if (session.userId && teacherSchools.has(session.userId)) {
        targetSchoolId = teacherSchools.get(session.userId)!.id!;
      }

      const updatedSession = {
        ...session,
        schoolId: targetSchoolId
      } as Session & { schoolId: number };

      sessionsToUpdate.push(updatedSession);
      this.stats.sessionsUpdated++;
    }

    if (sessionsToUpdate.length > 0 && !this.options.dryRun) {
      await this.saveJsonFile('sessions', sessions.map(s => {
        const updated = sessionsToUpdate.find(us => us.id === s.id);
        return updated || s;
      }));
      this.log(`✅ Updated ${sessionsToUpdate.length} sessions with schoolId`);
    } else if (sessionsToUpdate.length > 0) {
      this.log(`📋 DRY RUN: Would update ${sessionsToUpdate.length} sessions with schoolId`);
    } else {
      this.log('✅ All sessions already have schoolId');
    }
  }

  private async migrateGroovePatterns(defaultSchool: School, teacherSchools: Map<number, School>): Promise<void> {
    this.log('🥁 Migrating groove patterns...');
    
    const patterns = await this.loadJsonFile<GroovePattern[]>('groovePatterns');
    if (!patterns) return;

    const patternsToUpdate: GroovePattern[] = [];

    for (const pattern of patterns) {
      // Skip if already has schoolId
      if ((pattern as any).schoolId) {
        continue;
      }

      let targetSchoolId = defaultSchool.id!;
      
      // Assign to teacher's school if pattern has createdBy and that user has a school
      if (pattern.createdBy && teacherSchools.has(pattern.createdBy)) {
        targetSchoolId = teacherSchools.get(pattern.createdBy)!.id!;
      }

      const updatedPattern = {
        ...pattern,
        schoolId: targetSchoolId
      } as GroovePattern & { schoolId: number };

      patternsToUpdate.push(updatedPattern);
      this.stats.groovePatternsUpdated++;
    }

    if (patternsToUpdate.length > 0 && !this.options.dryRun) {
      await this.saveJsonFile('groovePatterns', patterns.map(p => {
        const updated = patternsToUpdate.find(up => up.id === p.id);
        return updated || p;
      }));
      this.log(`✅ Updated ${patternsToUpdate.length} groove patterns with schoolId`);
    } else if (patternsToUpdate.length > 0) {
      this.log(`📋 DRY RUN: Would update ${patternsToUpdate.length} groove patterns with schoolId`);
    } else {
      this.log('✅ All groove patterns already have schoolId');
    }
  }

  private async verifyMigration(): Promise<void> {
    this.log('✅ Verifying migration...');
    
    const collections = [
      'students', 'songs', 'lessons', 'assignments',
      'sessions', 'recurringSchedules', 'groovePatterns'
    ];

    for (const collection of collections) {
      try {
        const data = await this.loadJsonFile<any[]>(collection);
        if (!data) continue;

        const withoutSchoolId = data.filter(item => !item.schoolId);
        if (withoutSchoolId.length > 0) {
          this.stats.errors.push(`${collection}: ${withoutSchoolId.length} items still missing schoolId`);
          this.log(`⚠️ ${collection}: ${withoutSchoolId.length} items still missing schoolId`);
        } else {
          this.log(`✅ ${collection}: All ${data.length} items have schoolId`);
        }
      } catch (error) {
        this.stats.errors.push(`Error verifying ${collection}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }

  private async loadJsonFile<T>(filename: string): Promise<T | null> {
    try {
      const filePath = path.join(this.dataDir, `${filename}.json`);
      const data = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      if (this.options.verbose) {
        this.log(`📁 File ${filename}.json not found or empty`);
      }
      return null;
    }
  }

  private async saveJsonFile(filename: string, data: any): Promise<void> {
    try {
      const filePath = path.join(this.dataDir, `${filename}.json`);
      await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
    } catch (error) {
      throw new Error(`Failed to save ${filename}.json: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private log(message: string, ...args: any[]): void {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${message}`, ...args);
  }

  private printSummary(): void {
    this.log('\n📊 MIGRATION SUMMARY');
    this.log('=====================================');
    this.log(`🏫 Schools created: ${this.stats.schoolsCreated}`);
    this.log(`👤 Users updated: ${this.stats.usersUpdated}`);
    this.log(`👥 Students updated: ${this.stats.studentsUpdated}`);
    this.log(`🎵 Songs updated: ${this.stats.songsUpdated}`);
    this.log(`📚 Lessons updated: ${this.stats.lessonsUpdated}`);
    this.log(`📝 Assignments updated: ${this.stats.assignmentsUpdated}`);
    this.log(`🎯 Sessions updated: ${this.stats.sessionsUpdated}`);
    this.log(`📅 Recurring schedules updated: ${this.stats.recurringSchedulesUpdated}`);
    this.log(`🥁 Groove patterns updated: ${this.stats.groovePatternsUpdated}`);
    
    if (this.stats.errors.length > 0) {
      this.log(`\n❌ ERRORS (${this.stats.errors.length}):`);
      this.stats.errors.forEach(error => this.log(`   • ${error}`));
    } else {
      this.log('\n✅ Migration completed successfully with no errors!');
    }
    
    const totalUpdated = this.stats.usersUpdated + this.stats.studentsUpdated + 
                        this.stats.songsUpdated + this.stats.lessonsUpdated +
                        this.stats.assignmentsUpdated + this.stats.sessionsUpdated +
                        this.stats.recurringSchedulesUpdated + this.stats.groovePatternsUpdated;
    
    this.log(`\n🎯 Total items updated: ${totalUpdated}`);
    
    if (this.options.dryRun) {
      this.log('\n📋 This was a DRY RUN - no actual changes were made');
      this.log('Run without --dry-run to perform the actual migration');
    }
  }
}

// CLI execution
async function main() {
  const args = process.argv.slice(2);
  
  const options: MigrationOptions = {
    dryRun: args.includes('--dry-run'),
    force: args.includes('--force'),
    verbose: args.includes('--verbose'),
    dataDir: args.find(arg => arg.startsWith('--data-dir='))?.split('=')[1]
  };

  try {
    const migrator = new LegacyDataMigrator(options);
    await migrator.migrate();
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Export for use as module
export { LegacyDataMigrator, type MigrationOptions, type MigrationStats };

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}