import fs from 'fs/promises';
import path from 'path';
import type { IStorage } from './storage';
import type { 
  User, Student, Song, Lesson, Assignment, Session, School, GroovePattern, SchoolMembership,
  AchievementDefinition, StudentAchievement, RecurringSchedule, PracticeSession,
  InsertUser, InsertStudent, InsertSong, InsertLesson, InsertAssignment, InsertSession,
  InsertSchool, InsertGroovePattern, InsertSchoolMembership, InsertAchievementDefinition, InsertStudentAchievement,
  InsertRecurringSchedule, InsertPracticeSession
} from '@shared/schema';
import session from 'express-session';
import createMemoryStore from 'memorystore';
import ConnectPgSimple from 'connect-pg-simple';

const MemoryStore = createMemoryStore(session);
const PgSession = ConnectPgSimple(session);

// File-based session store implementation
class FileSessionStore extends session.Store {
  private sessionsFile: string;
  private sessions: Map<string, any> = new Map();

  constructor(dataDir: string) {
    super();
    this.sessionsFile = path.join(dataDir, 'sessions.json');
    this.loadSessions();
  }

  private async loadSessions() {
    try {
      const data = await fs.readFile(this.sessionsFile, 'utf-8');
      const sessionsObj = JSON.parse(data);
      this.sessions = new Map(Object.entries(sessionsObj));
      console.log(`📂 Loaded ${this.sessions.size} sessions from disk`);
    } catch (error) {
      // File doesn't exist or is empty, start with empty sessions
      this.sessions = new Map();
      console.log('📂 Starting with empty session store');
    }
  }

  private async saveSessions() {
    try {
      const sessionsObj = Object.fromEntries(this.sessions);
      const tempFile = this.sessionsFile + '.tmp';
      await fs.writeFile(tempFile, JSON.stringify(sessionsObj, null, 2), 'utf-8');
      await fs.rename(tempFile, this.sessionsFile);
    } catch (error) {
      console.error('Failed to save sessions:', error);
    }
  }

  get(sid: string, callback: (err?: any, session?: any) => void) {
    try {
      const session = this.sessions.get(sid);
      if (session && session.expires && new Date(session.expires) <= new Date()) {
        // Session expired
        this.sessions.delete(sid);
        this.saveSessions(); // Don't await
        return callback(null, null);
      }
      callback(null, session || null);
    } catch (error) {
      callback(error);
    }
  }

  set(sid: string, session: any, callback?: (err?: any) => void) {
    try {
      this.sessions.set(sid, session);
      this.saveSessions(); // Don't await to avoid blocking
      if (callback) callback();
    } catch (error) {
      if (callback) callback(error);
    }
  }

  destroy(sid: string, callback?: (err?: any) => void) {
    try {
      this.sessions.delete(sid);
      this.saveSessions(); // Don't await
      if (callback) callback();
    } catch (error) {
      if (callback) callback(error);
    }
  }

  clear(callback?: (err?: any) => void) {
    try {
      this.sessions.clear();
      this.saveSessions(); // Don't await
      if (callback) callback();
    } catch (error) {
      if (callback) callback(error);
    }
  }

  length(callback: (err?: any, length?: number) => void) {
    callback(null, this.sessions.size);
  }

  all(callback: (err?: any, obj?: any) => void) {
    try {
      const sessions = Object.fromEntries(this.sessions);
      callback(null, sessions);
    } catch (error) {
      callback(error);
    }
  }

  touch(sid: string, session: any, callback?: (err?: any) => void) {
    // Update the session's last access time
    this.set(sid, session, callback);
  }
}

// FileStorage: JSON-backed persistent storage that survives restarts
export class FileStorage implements IStorage {
  private dataDir: string;
  private cache: Map<string, any[]> = new Map();
  private initialized: boolean = false;

  sessionStore: session.Store;

  constructor(dataDir: string = './data') {
    this.dataDir = dataDir;
    this.initializeSessionStore();
  }

  private initializeSessionStore() {
    // Try to use PostgreSQL session store if DATABASE_URL is available
    if (process.env.DATABASE_URL) {
      try {
        this.sessionStore = new PgSession({
          conString: process.env.DATABASE_URL,
          tableName: 'session',
          createTableIfMissing: true,
        });
        console.log('✅ PostgreSQL session store initialized');
        return;
      } catch (error) {
        console.warn('⚠️ Failed to initialize PostgreSQL session store, falling back to file-based store:', error);
      }
    }

    // Fallback to file-based session store using JSON files
    this.sessionStore = new FileSessionStore(this.dataDir);
    console.log('✅ File-based session store initialized');
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;
    
    try {
      // Create data directory if it doesn't exist
      await fs.mkdir(this.dataDir, { recursive: true });
      
      // Load all collections into memory
      await this.loadAllCollections();
      
      this.initialized = true;
      console.log(`✅ FileStorage initialized with data directory: ${this.dataDir}`);
    } catch (error) {
      console.error('FileStorage initialization failed:', error);
      throw error;
    }
  }

  private async loadAllCollections(): Promise<void> {
    const collections = [
      'users', 'schools', 'students', 'teachers', 'lessons', 'songs', 
      'assignments', 'sessions', 'studentMessages', 'messageReplies',
      'achievements', 'studentAchievements', 'educationalContent',
      'groovePatterns', 'notifications', 'subscriptions', 'recurringSchedules',
      'schoolMemberships'
    ];

    for (const collection of collections) {
      await this.loadCollection(collection);
    }
  }

  private async loadCollection(collection: string): Promise<any[]> {
    try {
      const filePath = path.join(this.dataDir, `${collection}.json`);
      const data = await fs.readFile(filePath, 'utf-8');
      const items = JSON.parse(data);
      this.cache.set(collection, items);
      return items;
    } catch (error) {
      // File doesn't exist or is empty, start with empty array
      this.cache.set(collection, []);
      return [];
    }
  }

  private async saveCollection(collection: string): Promise<void> {
    try {
      const data = this.cache.get(collection) || [];
      const filePath = path.join(this.dataDir, `${collection}.json`);
      const tempPath = `${filePath}.tmp`;
      
      // Atomic write: write to temp file then rename
      await fs.writeFile(tempPath, JSON.stringify(data, null, 2), 'utf-8');
      await fs.rename(tempPath, filePath);
    } catch (error) {
      console.error(`Failed to save collection ${collection}:`, error);
      throw error;
    }
  }

  private getCollection(collection: string): any[] {
    return this.cache.get(collection) || [];
  }

  private async updateCollection(collection: string, items: any[]): Promise<void> {
    this.cache.set(collection, items);
    await this.saveCollection(collection);
  }

  // Helper function to normalize undefined to null for schema compliance
  private normalizeForSchema<T extends Record<string, any>>(obj: T): T {
    const normalized = { ...obj };
    for (const [key, value] of Object.entries(normalized)) {
      if (value === undefined) {
        (normalized as any)[key] = null;
      }
    }
    return normalized;
  }

  // Helper to ensure User objects have all required fields
  private normalizeUser(user: any): User {
    return this.normalizeForSchema({
      ...user,
      schoolId: user.schoolId ?? null,
      instruments: user.instruments ?? null,
      avatar: user.avatar ?? null,
      bio: user.bio ?? null,
      mustChangePassword: user.mustChangePassword ?? null,
      lastLoginAt: user.lastLoginAt ?? null
    });
  }

  // Helper to ensure School objects have all required fields
  private normalizeSchool(school: any): School {
    return this.normalizeForSchema({
      ...school,
      instruments: school.instruments ?? null,
      address: school.address ?? null,
      city: school.city ?? null,
      website: school.website ?? null,
      phone: school.phone ?? null,
      description: school.description ?? null,
      logo: school.logo ?? null,
      createdAt: school.createdAt ?? new Date(),
      updatedAt: school.updatedAt ?? new Date()
    });
  }

  // Helper to ensure Student objects have all required fields
  private normalizeStudent(student: any): Student {
    return this.normalizeForSchema({
      ...student,
      userId: student.userId ?? null,
      role: student.role ?? null,
      address: student.address ?? null,
      city: student.city ?? null,
      phone: student.phone ?? null,
      firstName: student.firstName ?? null,
      lastName: student.lastName ?? null,
      dateOfBirth: student.dateOfBirth ?? null,
      parentEmail: student.parentEmail ?? null,
      parentPhone: student.parentPhone ?? null,
      emergencyContact: student.emergencyContact ?? null,
      instrument: student.instrument ?? null,
      level: student.level ?? null,
      notes: student.notes ?? null,
      accountId: student.accountId ?? null,
      assignedTeacherId: student.assignedTeacherId ?? null
    });
  }

  // IStorage implementation

  async createUser(user: InsertUser): Promise<User> {
    const users = this.getCollection('users');
    const id = users.length > 0 ? Math.max(...users.map(u => u.id)) + 1 : 1;
    const newUser = this.normalizeUser({ ...user, id });
    await this.updateCollection('users', [...users, newUser]);
    return newUser;
  }

  async getUser(id: number): Promise<User | undefined> {
    const users = this.getCollection('users');
    return users.find(u => u.id === id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const users = this.getCollection('users');
    return users.find(u => u.username.toLowerCase() === username.toLowerCase());
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const users = this.getCollection('users');
    return users.find(u => u.email === email);
  }

  async updateUser(id: number, updates: Partial<InsertUser>): Promise<User> {
    const users = this.getCollection('users');
    const index = users.findIndex(u => u.id === id);
    if (index === -1) throw new Error(`User ${id} not found`);
    
    users[index] = this.normalizeUser({ ...users[index], ...updates });
    await this.updateCollection('users', users);
    return users[index];
  }

  async deleteUser(id: number): Promise<boolean> {
    const users = this.getCollection('users');
    const filtered = users.filter(u => u.id !== id);
    if (filtered.length === users.length) return false;
    
    await this.updateCollection('users', filtered);
    return true;
  }

  // School methods
  async createSchool(school: InsertSchool): Promise<School> {
    const schools = this.getCollection('schools');
    const id = schools.length > 0 ? Math.max(...schools.map(s => s.id)) + 1 : 1;
    const newSchool = this.normalizeSchool({ ...school, id });
    await this.updateCollection('schools', [...schools, newSchool]);
    return newSchool;
  }

  async getSchool(id: number): Promise<School | undefined> {
    const schools = this.getCollection('schools');
    return schools.find(s => s.id === id);
  }

  async getSchools(): Promise<School[]> {
    return this.getCollection('schools');
  }

  async updateSchool(id: number, updates: Partial<InsertSchool>): Promise<School> {
    const schools = this.getCollection('schools');
    const index = schools.findIndex(s => s.id === id);
    if (index === -1) throw new Error(`School ${id} not found`);
    
    schools[index] = this.normalizeSchool({ ...schools[index], ...updates });
    await this.updateCollection('schools', schools);
    return schools[index];
  }

  async deleteSchool(id: number): Promise<boolean> {
    const schools = this.getCollection('schools');
    const filtered = schools.filter(s => s.id !== id);
    if (filtered.length === schools.length) return false;
    
    await this.updateCollection('schools', filtered);
    return true;
  }

  // Student methods
  async createStudent(student: InsertStudent): Promise<Student> {
    const students = this.getCollection('students');
    const id = students.length > 0 ? Math.max(...students.map(s => s.id)) + 1 : 1;
    const newStudent = this.normalizeForSchema({ ...student, id });
    await this.updateCollection('students', [...students, newStudent]);
    return newStudent;
  }

  async getStudent(id: number): Promise<Student | undefined> {
    const students = this.getCollection('students');
    return students.find(s => s.id === id);
  }

  async getStudents(userId: number): Promise<Student[]> {
    const students = this.getCollection('students');
    // Find user to get their schoolId
    const user = await this.getUser(userId);
    if (!user?.schoolId) return [];
    return students.filter(s => s.schoolId === user.schoolId);
  }

  async updateStudent(id: number, updates: Partial<InsertStudent>): Promise<Student> {
    const students = this.getCollection('students');
    const index = students.findIndex(s => s.id === id);
    if (index === -1) throw new Error(`Student ${id} not found`);
    
    students[index] = this.normalizeForSchema({ ...students[index], ...updates });
    await this.updateCollection('students', students);
    return students[index];
  }

  async deleteStudent(id: number): Promise<boolean> {
    const students = this.getCollection('students');
    const filtered = students.filter(s => s.id !== id);
    if (filtered.length === students.length) return false;
    
    await this.updateCollection('students', filtered);
    return true;
  }

  // Song methods
  async createSong(song: InsertSong): Promise<Song> {
    const songs = this.getCollection('songs');
    const id = songs.length > 0 ? Math.max(...songs.map(s => s.id)) + 1 : 1;
    const now = new Date();
    const newSong = this.normalizeForSchema({ 
      ...song, 
      id, 
      createdAt: song.createdAt || now,
      updatedAt: song.updatedAt || now 
    });
    await this.updateCollection('songs', [...songs, newSong]);
    return newSong;
  }

  async getSong(id: number): Promise<Song | undefined> {
    const songs = this.getCollection('songs');
    return songs.find(s => s.id === id);
  }

  async getSongs(userId: number): Promise<Song[]> {
    const songs = this.getCollection('songs');
    // Find user to get their schoolId
    const user = await this.getUser(userId);
    if (!user?.schoolId) return [];
    return songs.filter(s => s.schoolId === user.schoolId);
  }

  async updateSong(id: number, updates: Partial<InsertSong>): Promise<Song> {
    const songs = this.getCollection('songs');
    const index = songs.findIndex(s => s.id === id);
    if (index === -1) throw new Error(`Song ${id} not found`);
    
    const now = new Date();
    songs[index] = this.normalizeForSchema({ 
      ...songs[index], 
      ...updates, 
      updatedAt: updates.updatedAt || now 
    });
    await this.updateCollection('songs', songs);
    return songs[index];
  }

  async deleteSong(id: number): Promise<boolean> {
    const songs = this.getCollection('songs');
    const filtered = songs.filter(s => s.id !== id);
    if (filtered.length === songs.length) return false;
    
    await this.updateCollection('songs', filtered);
    return true;
  }

  // Lesson methods
  async createLesson(lesson: InsertLesson): Promise<Lesson> {
    const lessons = this.getCollection('lessons');
    const id = lessons.length > 0 ? Math.max(...lessons.map(l => l.id)) + 1 : 1;
    const now = new Date();
    const newLesson = this.normalizeForSchema({ 
      ...lesson, 
      id, 
      createdAt: lesson.createdAt || now,
      updatedAt: lesson.updatedAt || now 
    });
    await this.updateCollection('lessons', [...lessons, newLesson]);
    return newLesson;
  }

  async getLesson(id: number): Promise<Lesson | undefined> {
    const lessons = this.getCollection('lessons');
    return lessons.find(l => l.id === id);
  }

  async getLessons(userId: number): Promise<Lesson[]> {
    const lessons = this.getCollection('lessons');
    // Find user to get their schoolId
    const user = await this.getUser(userId);
    if (!user?.schoolId) return [];
    return lessons.filter(l => l.schoolId === user.schoolId);
  }

  async updateLesson(id: number, updates: Partial<InsertLesson>): Promise<Lesson> {
    const lessons = this.getCollection('lessons');
    const index = lessons.findIndex(l => l.id === id);
    if (index === -1) throw new Error(`Lesson ${id} not found`);
    
    const now = new Date();
    lessons[index] = this.normalizeForSchema({ 
      ...lessons[index], 
      ...updates, 
      updatedAt: updates.updatedAt || now 
    });
    await this.updateCollection('lessons', lessons);
    return lessons[index];
  }

  async deleteLesson(id: number): Promise<boolean> {
    const lessons = this.getCollection('lessons');
    const filtered = lessons.filter(l => l.id !== id);
    if (filtered.length === lessons.length) return false;
    
    await this.updateCollection('lessons', filtered);
    return true;
  }

  // Additional User methods
  async getUsersBySchool(schoolId: number): Promise<User[]> {
    const users = this.getCollection('users');
    return users.filter(u => u.schoolId === schoolId);
  }

  async getUsersByRole(role: string): Promise<User[]> {
    const users = this.getCollection('users');
    return users.filter(u => u.role === role);
  }

  async getTeachers(): Promise<User[]> {
    return this.getUsersByRole('teacher');
  }

  // Assignment methods
  async getAssignments(userId: number): Promise<Assignment[]> {
    const assignments = this.getCollection('assignments');
    const user = await this.getUser(userId);
    if (!user?.schoolId) return [];
    return assignments.filter(a => a.schoolId === user.schoolId);
  }

  async getStudentAssignments(studentId: number): Promise<Assignment[]> {
    const assignments = this.getCollection('assignments');
    return assignments.filter(a => a.studentId === studentId);
  }

  async getAssignment(id: number): Promise<Assignment | undefined> {
    const assignments = this.getCollection('assignments');
    return assignments.find(a => a.id === id);
  }

  async createAssignment(assignment: InsertAssignment): Promise<Assignment> {
    const assignments = this.getCollection('assignments');
    const id = assignments.length > 0 ? Math.max(...assignments.map(a => a.id)) + 1 : 1;
    const newAssignment = this.normalizeForSchema({ ...assignment, id });
    await this.updateCollection('assignments', [...assignments, newAssignment]);
    return newAssignment;
  }

  async updateAssignment(id: number, assignment: Partial<InsertAssignment>): Promise<Assignment> {
    const assignments = this.getCollection('assignments');
    const index = assignments.findIndex(a => a.id === id);
    if (index === -1) throw new Error(`Assignment ${id} not found`);
    
    assignments[index] = this.normalizeForSchema({ ...assignments[index], ...assignment });
    await this.updateCollection('assignments', assignments);
    return assignments[index];
  }

  async deleteAssignment(id: number): Promise<boolean> {
    const assignments = this.getCollection('assignments');
    const filtered = assignments.filter(a => a.id !== id);
    if (filtered.length === assignments.length) return false;
    
    await this.updateCollection('assignments', filtered);
    return true;
  }

  // Session methods
  async getSessions(userId: number): Promise<Session[]> {
    const sessions = this.getCollection('sessions');
    const user = await this.getUser(userId);
    if (!user?.schoolId) return [];
    return sessions.filter(s => s.schoolId === user.schoolId);
  }

  async getStudentSessions(studentId: number): Promise<Session[]> {
    const sessions = this.getCollection('sessions');
    return sessions.filter(s => s.studentId === studentId);
  }

  async getSession(id: number): Promise<Session | undefined> {
    const sessions = this.getCollection('sessions');
    return sessions.find(s => s.id === id);
  }

  async createSession(session: InsertSession): Promise<Session> {
    const sessions = this.getCollection('sessions');
    const id = sessions.length > 0 ? Math.max(...sessions.map(s => s.id)) + 1 : 1;
    const newSession = this.normalizeForSchema({ ...session, id });
    await this.updateCollection('sessions', [...sessions, newSession]);
    return newSession;
  }

  async updateSession(id: number, session: Partial<InsertSession>): Promise<Session> {
    const sessions = this.getCollection('sessions');
    const index = sessions.findIndex(s => s.id === id);
    if (index === -1) throw new Error(`Session ${id} not found`);
    
    sessions[index] = this.normalizeForSchema({ ...sessions[index], ...session });
    await this.updateCollection('sessions', sessions);
    return sessions[index];
  }

  async deleteSession(id: number): Promise<boolean> {
    const sessions = this.getCollection('sessions');
    const filtered = sessions.filter(s => s.id !== id);
    if (filtered.length === sessions.length) return false;
    
    await this.updateCollection('sessions', filtered);
    return true;
  }

  // Recurring schedule methods
  async getRecurringSchedules(userId: number): Promise<RecurringSchedule[]> {
    const schedules = this.getCollection('recurringSchedules');
    const user = await this.getUser(userId);
    if (!user?.schoolId) return [];
    return schedules.filter(r => r.schoolId === user.schoolId);
  }

  async getRecurringSchedulesBySchool(schoolId: number): Promise<RecurringSchedule[]> {
    const schedules = this.getCollection('recurringSchedules');
    return schedules.filter(r => r.schoolId === schoolId);
  }

  async getStudentRecurringSchedules(studentId: number): Promise<RecurringSchedule[]> {
    const schedules = this.getCollection('recurringSchedules');
    return schedules.filter(r => r.studentId === studentId);
  }

  async getRecurringSchedule(id: number): Promise<RecurringSchedule | undefined> {
    const schedules = this.getCollection('recurringSchedules');
    return schedules.find(r => r.id === id);
  }

  async createRecurringSchedule(schedule: InsertRecurringSchedule): Promise<RecurringSchedule> {
    const schedules = this.getCollection('recurringSchedules');
    const id = schedules.length > 0 ? Math.max(...schedules.map(r => r.id)) + 1 : 1;
    const now = new Date();
    const newSchedule = this.normalizeForSchema({ 
      ...schedule, 
      id,
      createdAt: schedule.createdAt || now,
      updatedAt: schedule.updatedAt || now 
    });
    await this.updateCollection('recurringSchedules', [...schedules, newSchedule]);
    return newSchedule;
  }

  async updateRecurringSchedule(id: number, schedule: Partial<InsertRecurringSchedule>): Promise<RecurringSchedule> {
    const schedules = this.getCollection('recurringSchedules');
    const index = schedules.findIndex(r => r.id === id);
    if (index === -1) throw new Error(`RecurringSchedule ${id} not found`);
    
    const now = new Date();
    schedules[index] = this.normalizeForSchema({ 
      ...schedules[index], 
      ...schedule, 
      updatedAt: schedule.updatedAt || now 
    });
    await this.updateCollection('recurringSchedules', schedules);
    return schedules[index];
  }

  async deleteRecurringSchedule(id: number): Promise<boolean> {
    const schedules = this.getCollection('recurringSchedules');
    const filtered = schedules.filter(r => r.id !== id);
    if (filtered.length === schedules.length) return false;
    
    await this.updateCollection('recurringSchedules', filtered);
    return true;
  }

  async generateSessionsFromRecurringSchedules(userId: number, startDate: Date, endDate: Date): Promise<Session[]> {
    const recurringSchedules = await this.getRecurringSchedules(userId);
    const generatedSessions: Session[] = [];
    
    // Simple implementation: generate one session per recurring schedule in the date range
    for (const schedule of recurringSchedules) {
      const session: Session = {
        id: Date.now() + Math.random(), // Temporary ID
        userId: schedule.userId,
        studentId: schedule.studentId,
        title: `Lesson from recurring schedule`,
        startTime: startDate,
        endTime: endDate,
        notes: `Generated from recurring schedule ${schedule.id}`
      };
      generatedSessions.push(session);
    }
    
    return generatedSessions;
  }

  // Session rescheduling
  async requestReschedule(sessionId: number, newStartTime: Date, newEndTime: Date): Promise<Session> {
    const session = await this.getSession(sessionId);
    if (!session) throw new Error(`Session ${sessionId} not found`);
    
    return this.updateSession(sessionId, {
      startTime: newStartTime,
      endTime: newEndTime
    });
  }

  async approveReschedule(sessionId: number): Promise<Session> {
    const session = await this.getSession(sessionId);
    if (!session) throw new Error(`Session ${sessionId} not found`);
    
    return this.updateSession(sessionId, {
      notes: session.notes ? `${session.notes} - Rescheduled` : 'Rescheduled'
    });
  }

  // Practice session methods
  async getPracticeSessions(userId: number): Promise<PracticeSession[]> {
    const practiceSessions = this.getCollection('practiceSessions');
    const user = await this.getUser(userId);
    if (!user?.schoolId) return [];
    return practiceSessions.filter(p => p.schoolId === user.schoolId);
  }

  async getStudentPracticeSessions(studentId: number): Promise<PracticeSession[]> {
    const practiceSessions = this.getCollection('practiceSessions');
    return practiceSessions.filter(p => p.studentId === studentId);
  }

  async getActiveStudentPracticeSessions(): Promise<PracticeSession[]> {
    const practiceSessions = this.getCollection('practiceSessions');
    return practiceSessions.filter(p => p.endTime === null);
  }

  async createPracticeSession(session: InsertPracticeSession): Promise<PracticeSession> {
    const practiceSessions = this.getCollection('practiceSessions');
    const id = practiceSessions.length > 0 ? Math.max(...practiceSessions.map(p => p.id)) + 1 : 1;
    const newSession = this.normalizeForSchema({ ...session, id });
    await this.updateCollection('practiceSessions', [...practiceSessions, newSession]);
    return newSession;
  }

  async endPracticeSession(id: number): Promise<PracticeSession> {
    const practiceSessions = this.getCollection('practiceSessions');
    const index = practiceSessions.findIndex(p => p.id === id);
    if (index === -1) throw new Error(`PracticeSession ${id} not found`);
    
    practiceSessions[index] = { ...practiceSessions[index], endTime: new Date() };
    await this.updateCollection('practiceSessions', practiceSessions);
    return practiceSessions[index];
  }

  // Achievement methods
  async getAchievementDefinitions(): Promise<AchievementDefinition[]> {
    return this.getCollection('achievementDefinitions');
  }

  async getAchievementDefinition(id: number): Promise<AchievementDefinition | undefined> {
    const achievements = this.getCollection('achievementDefinitions');
    return achievements.find(a => a.id === id);
  }

  async getStudentAchievements(studentId: number): Promise<StudentAchievement[]> {
    const studentAchievements = this.getCollection('studentAchievements');
    return studentAchievements.filter(sa => sa.studentId === studentId);
  }

  async getStudentAchievement(id: number): Promise<StudentAchievement | undefined> {
    const studentAchievements = this.getCollection('studentAchievements');
    return studentAchievements.find(sa => sa.id === id);
  }

  async markAchievementAsSeen(id: number): Promise<StudentAchievement> {
    const studentAchievements = this.getCollection('studentAchievements');
    const index = studentAchievements.findIndex(sa => sa.id === id);
    if (index === -1) throw new Error(`StudentAchievement ${id} not found`);
    
    studentAchievements[index] = { ...studentAchievements[index], seen: true };
    await this.updateCollection('studentAchievements', studentAchievements);
    return studentAchievements[index];
  }

  async checkAndAwardAchievements(studentId: number): Promise<StudentAchievement[]> {
    // Simple implementation: return existing achievements
    return this.getStudentAchievements(studentId);
  }

  // Dashboard statistics
  async getStudentCount(userId: number): Promise<number> {
    const students = await this.getStudents(userId);
    return students.length;
  }

  async getSongCount(userId: number): Promise<number> {
    const songs = await this.getSongs(userId);
    return songs.length;
  }

  async getLessonCount(userId: number): Promise<number> {
    const lessons = await this.getLessons(userId);
    return lessons.length;
  }

  async getSessionCountThisWeek(userId: number): Promise<number> {
    const sessions = await this.getSessions(userId);
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    return sessions.filter(s => new Date(s.startTime) > weekAgo).length;
  }

  // Lesson categories
  async getLessonCategories(userId: number): Promise<any[]> {
    const categories = this.getCollection('lessonCategories');
    const user = await this.getUser(userId);
    if (!user?.schoolId) return [];
    return categories.filter(c => c.schoolId === user.schoolId);
  }

  async getLessonCategory(id: number): Promise<any | undefined> {
    const categories = this.getCollection('lessonCategories');
    return categories.find(c => c.id === id);
  }

  async createLessonCategory(category: any): Promise<any> {
    const categories = this.getCollection('lessonCategories');
    const id = categories.length > 0 ? Math.max(...categories.map(c => c.id)) + 1 : 1;
    const newCategory = { ...category, id };
    await this.updateCollection('lessonCategories', [...categories, newCategory]);
    return newCategory;
  }

  async updateLessonCategory(id: number, category: any): Promise<any> {
    const categories = this.getCollection('lessonCategories');
    const index = categories.findIndex(c => c.id === id);
    if (index === -1) throw new Error(`LessonCategory ${id} not found`);
    
    categories[index] = { ...categories[index], ...category };
    await this.updateCollection('lessonCategories', categories);
    return categories[index];
  }

  async deleteLessonCategory(id: number): Promise<boolean> {
    const categories = this.getCollection('lessonCategories');
    const filtered = categories.filter(c => c.id !== id);
    if (filtered.length === categories.length) return false;
    
    await this.updateCollection('lessonCategories', filtered);
    return true;
  }

  // Search and content operations
  async searchContent(userId: number, searchTerm: string): Promise<{lessons: Lesson[], songs: Song[]}> {
    const lessons = await this.getLessons(userId);
    const songs = await this.getSongs(userId);
    
    const searchLower = searchTerm.toLowerCase();
    const filteredLessons = lessons.filter(l => 
      l.title.toLowerCase().includes(searchLower) || 
      l.description?.toLowerCase().includes(searchLower)
    );
    const filteredSongs = songs.filter(s => 
      s.title.toLowerCase().includes(searchLower) || 
      s.artist?.toLowerCase().includes(searchLower)
    );
    
    return { lessons: filteredLessons, songs: filteredSongs };
  }

  async getMessages(userId: number, userType?: string): Promise<any[]> {
    const messages = this.getCollection('messages');
    return messages.filter(m => m.userId === userId);
  }

  async getMessage(id: number): Promise<any | undefined> {
    const messages = this.getCollection('messages');
    return messages.find(m => m.id === id);
  }

  async createMessage(message: any): Promise<any> {
    const messages = this.getCollection('messages');
    const id = messages.length > 0 ? Math.max(...messages.map(m => m.id)) + 1 : 1;
    const newMessage = { ...message, id };
    await this.updateCollection('messages', [...messages, newMessage]);
    return newMessage;
  }

  async updateMessage(id: number, message: any): Promise<any> {
    const messages = this.getCollection('messages');
    const index = messages.findIndex(m => m.id === id);
    if (index === -1) throw new Error(`Message ${id} not found`);
    
    messages[index] = { ...messages[index], ...message };
    await this.updateCollection('messages', messages);
    return messages[index];
  }

  async deleteMessage(id: number): Promise<void> {
    const messages = this.getCollection('messages');
    const filtered = messages.filter(m => m.id !== id);
    await this.updateCollection('messages', filtered);
  }

  // Performance monitoring
  async getLessonPerformanceMetrics(userId: number): Promise<any> {
    return {
      totalLessons: await this.getLessonCount(userId),
      totalStudents: await this.getStudentCount(userId),
      totalSongs: await this.getSongCount(userId),
      weeklyActivity: await this.getSessionCountThisWeek(userId)
    };
  }

  async getRealtimeStats(userId: number): Promise<any> {
    return this.getLessonPerformanceMetrics(userId);
  }

  async trackPerformanceEvent(userId: number, event: any): Promise<void> {
    // Simple implementation: could store in a performanceEvents collection
    console.log(`Performance event for user ${userId}:`, event);
  }

  // Additional helper methods
  async getSessionsForDate(date: Date): Promise<Session[]> {
    const sessions = this.getCollection('sessions');
    const dateStr = date.toDateString();
    return sessions.filter(s => new Date(s.startTime).toDateString() === dateStr);
  }

  async getSongsByLetter(userId: number, letter: string): Promise<Song[]> {
    const songs = await this.getSongs(userId);
    return songs.filter(s => s.title.toLowerCase().startsWith(letter.toLowerCase()));
  }

  // Groove Pattern methods  
  async getGroovePatterns(userId?: number): Promise<GroovePattern[]> {
    const patterns = this.getCollection('groovePatterns');
    if (userId) {
      const user = await this.getUser(userId);
      if (!user?.schoolId) return [];
      return patterns.filter(p => p.schoolId === user.schoolId);
    }
    return patterns;
  }

  async getGroovePattern(id: string): Promise<GroovePattern | undefined> {
    const patterns = this.getCollection('groovePatterns');
    return patterns.find(p => p.id === id);
  }

  async createGroovePattern(pattern: InsertGroovePattern): Promise<GroovePattern> {
    const patterns = this.getCollection('groovePatterns');
    const now = new Date();
    const newPattern = this.normalizeForSchema({
      ...pattern,
      createdAt: now,
      updatedAt: now
    });
    await this.updateCollection('groovePatterns', [...patterns, newPattern]);
    return newPattern;
  }

  async updateGroovePattern(id: string, pattern: Partial<InsertGroovePattern>): Promise<GroovePattern> {
    const patterns = this.getCollection('groovePatterns');
    const index = patterns.findIndex(p => p.id === id);
    if (index === -1) throw new Error(`GroovePattern ${id} not found`);
    
    const now = new Date();
    patterns[index] = this.normalizeForSchema({ 
      ...patterns[index], 
      ...pattern, 
      updatedAt: now 
    });
    await this.updateCollection('groovePatterns', patterns);
    return patterns[index];
  }

  async deleteGroovePattern(id: string): Promise<boolean> {
    const patterns = this.getCollection('groovePatterns');
    const filtered = patterns.filter(p => p.id !== id);
    if (filtered.length === patterns.length) return false;
    
    await this.updateCollection('groovePatterns', filtered);
    return true;
  }

  async searchGroovePatterns(searchTerm: string, difficulty?: string, tags?: string[]): Promise<GroovePattern[]> {
    const patterns = this.getCollection('groovePatterns');
    let filtered = patterns;
    
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(p => 
        p.title.toLowerCase().includes(searchLower) || 
        p.description?.toLowerCase().includes(searchLower)
      );
    }
    
    if (difficulty) {
      filtered = filtered.filter(p => p.difficulty === difficulty);
    }
    
    if (tags && tags.length > 0) {
      filtered = filtered.filter(p => 
        tags.some(tag => p.tags?.includes(tag))
      );
    }
    
    return filtered;
  }

  // Multi-tenant school-scoped operations
  
  // School-scoped student access
  async getStudentsBySchool(schoolId: number): Promise<Student[]> {
    const students = this.getCollection('students');
    return students.filter(s => s.schoolId === schoolId);
  }

  async getStudentsForTeacher(teacherId: number): Promise<Student[]> {
    const students = this.getCollection('students');
    return students.filter(s => s.assignedTeacherId === teacherId);
  }

  // School-scoped lesson access
  async getLessonsBySchool(schoolId: number): Promise<Lesson[]> {
    const lessons = this.getCollection('lessons');
    return lessons.filter(l => l.schoolId === schoolId);
  }

  async getLessonsForTeacher(teacherId: number): Promise<Lesson[]> {
    const lessons = this.getCollection('lessons');
    return lessons.filter(l => l.userId === teacherId);
  }

  // School-scoped song access
  async getSongsBySchool(schoolId: number): Promise<Song[]> {
    const songs = this.getCollection('songs');
    return songs.filter(s => s.schoolId === schoolId);
  }

  async getSongsForTeacher(teacherId: number): Promise<Song[]> {
    const songs = this.getCollection('songs');
    return songs.filter(s => s.userId === teacherId);
  }

  // DEPRECATED - use getRecentSongsForUser instead for proper tenant scoping
  async getRecentSongs(limit: number): Promise<Song[]> {
    console.warn("SECURITY WARNING: getRecentSongs() is deprecated - use getRecentSongsForUser() for proper tenant scoping");
    const songs = this.getCollection('songs');
    return songs
      .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
      .slice(0, limit);
  }

  // SECURE - user-scoped method with proper tenant filtering
  async getRecentSongsForUser(userId: number, limit: number): Promise<Song[]> {
    try {
      console.log(`Getting recent songs for user ${userId}, limit: ${limit}`);
      const user = await this.getUser(userId);
      if (!user) {
        console.warn(`User ${userId} not found`);
        return [];
      }

      let songs: Song[];

      // School owners see all recent songs in their school, teachers see only their own
      if (user.role === 'school_owner') {
        // Get all songs from users in the same school
        const allUsers = this.getCollection('users');
        const schoolUsers = allUsers.filter(u => u.schoolId === user.schoolId);
        const schoolUserIds = schoolUsers.map(u => u.id);
        
        const allSongs = this.getCollection('songs');
        songs = allSongs.filter(s => schoolUserIds.includes(s.userId));
        console.log(`School owner sees ${songs.length} songs from ${schoolUserIds.length} users in school ${user.schoolId}`);
      } else {
        // Teachers and other users see only their own songs
        const allSongs = this.getCollection('songs');
        songs = allSongs.filter(s => s.userId === userId);
        console.log(`User sees ${songs.length} songs they created`);
      }

      // Sort by creation date and limit
      return songs
        .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
        .slice(0, limit);
    } catch (error) {
      console.error(`Error getting recent songs for user ${userId}:`, error);
      return [];
    }
  }

  // DEPRECATED - use getRecentLessonsForUser instead for proper tenant scoping
  async getRecentLessons(limit: number): Promise<Lesson[]> {
    console.warn("SECURITY WARNING: getRecentLessons() is deprecated - use getRecentLessonsForUser() for proper tenant scoping");
    const lessons = this.getCollection('lessons');
    return lessons
      .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
      .slice(0, limit);
  }

  // SECURE - user-scoped method with proper tenant filtering
  async getRecentLessonsForUser(userId: number, limit: number): Promise<Lesson[]> {
    try {
      console.log(`Getting recent lessons for user ${userId}, limit: ${limit}`);
      const user = await this.getUser(userId);
      if (!user) {
        console.warn(`User ${userId} not found`);
        return [];
      }

      let lessons: Lesson[];

      // School owners see all recent lessons in their school, teachers see only their own
      if (user.role === 'school_owner') {
        // Get all lessons from users in the same school
        const allUsers = this.getCollection('users');
        const schoolUsers = allUsers.filter(u => u.schoolId === user.schoolId);
        const schoolUserIds = schoolUsers.map(u => u.id);
        
        const allLessons = this.getCollection('lessons');
        lessons = allLessons.filter(l => schoolUserIds.includes(l.userId));
        console.log(`School owner sees ${lessons.length} lessons from ${schoolUserIds.length} users in school ${user.schoolId}`);
      } else {
        // Teachers and other users see only their own lessons
        const allLessons = this.getCollection('lessons');
        lessons = allLessons.filter(l => l.userId === userId);
        console.log(`User sees ${lessons.length} lessons they created`);
      }

      // Sort by creation date and limit
      return lessons
        .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
        .slice(0, limit);
    } catch (error) {
      console.error(`Error getting recent lessons for user ${userId}:`, error);
      return [];
    }
  }

  // School-scoped assignment access
  async getAssignmentsBySchool(schoolId: number): Promise<Assignment[]> {
    const assignments = this.getCollection('assignments');
    return assignments.filter(a => a.schoolId === schoolId);
  }

  async getAssignmentsForTeacher(teacherId: number): Promise<Assignment[]> {
    const assignments = this.getCollection('assignments');
    return assignments.filter(a => a.userId === teacherId);
  }

  // School-scoped session access
  async getSessionsBySchool(schoolId: number): Promise<Session[]> {
    const sessions = this.getCollection('sessions');
    return sessions.filter(s => s.schoolId === schoolId);
  }

  async getSessionsForTeacher(teacherId: number): Promise<Session[]> {
    const sessions = this.getCollection('sessions');
    return sessions.filter(s => s.userId === teacherId);
  }

  // School-scoped groove pattern access
  async getGroovePatternsBySchool(schoolId: number): Promise<GroovePattern[]> {
    const patterns = this.getCollection('groovePatterns');
    return patterns.filter(p => p.schoolId === schoolId);
  }

  async getGroovePatternsForTeacher(teacherId: number): Promise<GroovePattern[]> {
    const patterns = this.getCollection('groovePatterns');
    return patterns.filter(p => p.createdBy === teacherId);
  }

  // School membership management
  async createSchoolMembership(membership: InsertSchoolMembership): Promise<SchoolMembership> {
    const memberships = this.getCollection('schoolMemberships');
    const id = memberships.length > 0 ? Math.max(...memberships.map(m => m.id)) + 1 : 1;
    const now = new Date();
    const newMembership = this.normalizeForSchema({ 
      ...membership, 
      id,
      createdAt: membership.createdAt || now,
      updatedAt: membership.updatedAt || now
    });
    await this.updateCollection('schoolMemberships', [...memberships, newMembership]);
    return newMembership;
  }

  async getSchoolMemberships(schoolId: number): Promise<SchoolMembership[]> {
    const memberships = this.getCollection('schoolMemberships');
    return memberships.filter(m => m.schoolId === schoolId);
  }

  async getUserSchoolMemberships(userId: number): Promise<SchoolMembership[]> {
    const memberships = this.getCollection('schoolMemberships');
    return memberships.filter(m => m.userId === userId);
  }

  async updateSchoolMembership(id: number, updates: Partial<InsertSchoolMembership>): Promise<SchoolMembership> {
    const memberships = this.getCollection('schoolMemberships');
    const index = memberships.findIndex(m => m.id === id);
    if (index === -1) throw new Error(`SchoolMembership ${id} not found`);
    
    const now = new Date();
    memberships[index] = this.normalizeForSchema({ 
      ...memberships[index], 
      ...updates, 
      updatedAt: updates.updatedAt || now 
    });
    await this.updateCollection('schoolMemberships', memberships);
    return memberships[index];
  }

  async deleteSchoolMembership(id: number): Promise<boolean> {
    const memberships = this.getCollection('schoolMemberships');
    const filtered = memberships.filter(m => m.id !== id);
    if (filtered.length === memberships.length) return false;
    
    await this.updateCollection('schoolMemberships', filtered);
    return true;
  }

  // Enhanced school operations
  async getSchoolById(schoolId: number): Promise<School | undefined> {
    return this.getSchool(schoolId);
  }

  async getSchoolsByOwner(ownerId: number): Promise<School[]> {
    const schools = this.getCollection('schools');
    return schools.filter(s => s.ownerId === ownerId);
  }

  async getTeachersBySchool(schoolId: number): Promise<User[]> {
    const memberships = await this.getSchoolMemberships(schoolId);
    const teacherIds = memberships
      .filter(m => m.role === 'teacher')
      .map(m => m.userId);
    
    const users = this.getCollection('users');
    return users.filter(u => teacherIds.includes(u.id));
  }

  async getStudentCountBySchool(schoolId: number): Promise<number> {
    const students = await this.getStudentsBySchool(schoolId);
    return students.length;
  }

  async getLessonCountBySchool(schoolId: number): Promise<number> {
    const lessons = await this.getLessonsBySchool(schoolId);
    return lessons.length;
  }

  async getSongCountBySchool(schoolId: number): Promise<number> {
    const songs = await this.getSongsBySchool(schoolId);
    return songs.length;
  }

  // Reports and analytics methods
  async generateReportsData(userId: number, dateRange: number, reportType: string): Promise<any> {
    const user = await this.getUser(userId);
    if (!user) throw new Error("User not found");
    
    console.log(`[FileStorage] Generating reports for user ${userId}, range: ${dateRange} days, type: ${reportType}`);
    
    const totalStudents = await this.getStudentCount(userId);
    const activeLessons = await this.getLessonCount(userId);
    const completedAssignments = 0; // Will be calculated when assignments are implemented
    const upcomingSessions = await this.getSessionCountThisWeek(userId);
    
    console.log(`[FileStorage] Stats: students=${totalStudents}, lessons=${activeLessons}, sessions=${upcomingSessions}`);
    
    const studentProgress = await this.getStudentProgressReports(userId);
    const lessonCompletions = await this.getLessonCompletionStats(userId, dateRange);
    const popularLessons = await this.getPopularLessons(userId, dateRange);
    const upcomingDeadlines = await this.getUpcomingDeadlines(userId);
    
    const reportData = {
      totalStudents,
      activeLessons,
      completedAssignments,
      upcomingSessions,
      studentProgress,
      lessonCompletions,
      popularLessons,
      upcomingDeadlines
    };
    
    console.log(`[FileStorage] Generated report data with ${studentProgress.length} student progress entries`);
    return reportData;
  }

  async getStudentProgressReports(userId: number): Promise<any[]> {
    const students = await this.getStudents(userId);
    console.log(`[FileStorage] Processing ${students.length} students for progress reports`);
    
    return await Promise.all(students.map(async student => {
      // Get actual data from student records instead of mock data
      const assignments = await this.getStudentAssignments(student.id);
      const sessions = await this.getStudentSessions(student.id);
      
      // Calculate XP based on level and actual progress
      const baseXP = {
        'beginner': 50,
        'intermediate': 150,
        'advanced': 300
      };
      
      // Use real data: count actual completed lessons from sessions
      const completedLessons = sessions.length;
      const totalAssignments = assignments.length;
      const completedAssignments = assignments.filter(a => a.completed).length;
      
      // Calculate last activity from actual sessions or assignments
      const lastSessionDate = sessions.length > 0 ? Math.max(...sessions.map(s => new Date(s.createdAt).getTime())) : 0;
      const lastAssignmentDate = assignments.length > 0 ? Math.max(...assignments.map(a => new Date(a.createdAt).getTime())) : 0;
      const lastActivity = Math.max(lastSessionDate, lastAssignmentDate);
      
      return {
        studentId: student.id,
        studentName: `${student.firstName} ${student.lastName}`,
        completedLessons,
        totalAssignments,
        completedAssignments,
        lastActivity: lastActivity > 0 ? new Date(lastActivity).toISOString().split('T')[0] : 'Never',
        xpEarned: (baseXP[student.level as keyof typeof baseXP] || 100) + (completedLessons * 10) + (completedAssignments * 25)
      };
    }));
  }

  async getLessonCompletionStats(userId: number, dateRange: number): Promise<any[]> {
    const sessions = await this.getSessionsForUser(userId);
    console.log(`[FileStorage] Generating real completion stats from ${sessions.length} sessions over ${dateRange} days`);
    
    // Get real completion data from actual sessions
    const stats = [];
    for (let i = dateRange; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      // Count actual completions for this date
      const dailyCompletions = sessions.filter(session => {
        const sessionDate = new Date(session.createdAt).toISOString().split('T')[0];
        return sessionDate === dateStr && session.completed;
      }).length;
      
      stats.push({
        date: dateStr,
        completions: dailyCompletions
      });
    }
    
    return stats;
  }

  async getPopularLessons(userId: number, dateRange: number): Promise<any[]> {
    const lessons = await this.getLessons(userId);
    const sessions = await this.getSessionsForUser(userId);
    console.log(`[FileStorage] Calculating real popularity from ${lessons.length} lessons and ${sessions.length} sessions`);
    
    // Count actual lesson usage from sessions
    const lessonStats = new Map();
    sessions.forEach(session => {
      if (session.lessonId) {
        const count = lessonStats.get(session.lessonId) || 0;
        lessonStats.set(session.lessonId, count + 1);
      }
    });
    
    // Map lessons with their actual completion counts
    const popularLessons = lessons
      .map(lesson => ({
        lessonTitle: lesson.title,
        completions: lessonStats.get(lesson.id) || 0,
        avgRating: null // We don't have rating system yet
      }))
      .sort((a, b) => b.completions - a.completions)
      .slice(0, 5);
    
    return popularLessons;
  }

  async getUpcomingDeadlines(userId: number): Promise<any[]> {
    const students = await this.getStudents(userId);
    console.log(`[FileStorage] Generating upcoming deadlines for ${students.length} students`);
    
    // Generate mock upcoming deadlines
    const deadlines = [];
    for (let i = 0; i < Math.min(3, students.length); i++) {
      const student = students[i];
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + Math.floor(Math.random() * 14) + 1); // 1-14 days from now
      
      deadlines.push({
        studentName: `${student.firstName} ${student.lastName}`,
        assignmentTitle: `Practice Assignment ${i + 1}`,
        dueDate: dueDate.toISOString().split('T')[0],
        status: Math.random() > 0.7 ? 'overdue' : 'pending'
      });
    }
    
    return deadlines;
  }
}