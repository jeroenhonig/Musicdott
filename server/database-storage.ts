import { eq, and, gte, lte, or, desc, sql, count, inArray } from "drizzle-orm";
import { db, pool } from "./db";
import {
  users, students, songs, lessons, assignments, sessions, schools, schoolMemberships,
  achievementDefinitions, studentAchievements, recurringSchedules, practiceSessions,
  userNotifications, userPreferences, notifications,
  // POS Import tables
  notations, posSongs, songNotationMappings, drumblocks, posImportLogs,
  type User, type InsertUser,
  type Student, type InsertStudent,
  type Song, type InsertSong,
  type Lesson, type InsertLesson,
  type Assignment, type InsertAssignment,
  type Session, type InsertSession,
  type School, type InsertSchool,
  type SchoolMembership, type InsertSchoolMembership,
  type AchievementDefinition, type InsertAchievementDefinition,
  type StudentAchievement, type InsertStudentAchievement,
  type RecurringSchedule, type InsertRecurringSchedule,
  type PracticeSession, type InsertPracticeSession,
  type UserNotifications, type InsertUserNotifications,
  type UserPreferences, type InsertUserPreferences,
  type Notification, type InsertNotification,
  type ProfileUpdateData, type SchoolSettingsUpdateData,
  type NotificationSettingsData, type PreferenceSettingsData,
  // POS Import types
  type Notation, type InsertNotation,
  type PosSong, type InsertPosSong,
  type SongNotationMapping, type InsertSongNotationMapping,
  type Drumblock, type InsertDrumblock,
  type PosImportLog, type InsertPosImportLog,
  type BatchResult
} from "@shared/schema";
import { IStorage } from "./storage";
import connectPg from "connect-pg-simple";
import session from "express-session";
import { addDays, startOfWeek, endOfWeek } from "date-fns";
import bcrypt from "bcrypt";

const PostgresSessionStore = connectPg(session);

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    this.sessionStore = new PostgresSessionStore({ 
      pool, 
      createTableIfMissing: true 
    });
  }

  // School operations
  async getSchools(): Promise<School[]> {
    // Select all fields to match School type
    return await db.select().from(schools);
  }

  async getSchool(id: number): Promise<School | undefined> {
    // Select all fields to match School type
    const [school] = await db.select().from(schools).where(eq(schools.id, id));
    return school;
  }

  async createSchool(school: InsertSchool): Promise<School> {
    const [newSchool] = await db.insert(schools).values(school).returning();
    return newSchool;
  }

  async updateSchool(id: number, school: Partial<InsertSchool>): Promise<School> {
    const [updatedSchool] = await db
      .update(schools)
      .set(school)
      .where(eq(schools.id, id))
      .returning();
    return updatedSchool;
  }

  async deleteSchool(id: number): Promise<boolean> {
    await db.delete(schools).where(eq(schools.id, id));
    return true;
  }
  
  // Additional User operations
  async getUsersBySchool(schoolId: number): Promise<User[]> {
    // SECURITY FIX: Remove password field exposure to prevent hash leakage
    return await db.select({
      id: users.id,
      schoolId: users.schoolId,
      username: users.username,
      // password: users.password, // REMOVED FOR SECURITY
      name: users.name,
      email: users.email,
      role: users.role,
      instruments: users.instruments,
      avatar: users.avatar,
      bio: users.bio,
      mustChangePassword: users.mustChangePassword,
      lastLoginAt: users.lastLoginAt
    }).from(users).where(eq(users.schoolId, schoolId)) as Promise<User[]>;
  }

  async getUsersByRole(role: string): Promise<User[]> {
    // SECURITY FIX: Remove password field exposure to prevent hash leakage
    return await db.select({
      id: users.id,
      schoolId: users.schoolId,
      username: users.username,
      // password: users.password, // REMOVED FOR SECURITY
      name: users.name,
      email: users.email,
      role: users.role,
      instruments: users.instruments,
      avatar: users.avatar,
      bio: users.bio,
      mustChangePassword: users.mustChangePassword,
      lastLoginAt: users.lastLoginAt
    }).from(users).where(eq(users.role, role)) as Promise<User[]>;
  }

  async updateUser(id: number, userData: Partial<InsertUser>): Promise<User> {
    const [updatedUser] = await db
      .update(users)
      .set(userData)
      .where(eq(users.id, id))
      .returning();
    return updatedUser;
  }

  async deleteUser(id: number): Promise<boolean> {
    await db.delete(users).where(eq(users.id, id));
    return true;
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    // SECURITY FIX: Remove password field exposure to prevent hash leakage
    const [user] = await db.select({
      id: users.id,
      schoolId: users.schoolId,
      username: users.username,
      // password: users.password, // REMOVED FOR SECURITY
      name: users.name,
      email: users.email,
      role: users.role,
      instruments: users.instruments,
      avatar: users.avatar,
      bio: users.bio,
      mustChangePassword: users.mustChangePassword,
      lastLoginAt: users.lastLoginAt
    })
      .from(users)
      .where(eq(users.id, id)) as { id: number; schoolId: number | null; username: string; name: string; email: string; role: string; instruments: string | null; avatar: string | null; bio: string | null; mustChangePassword: boolean | null; lastLoginAt: Date | null; }[];
    return user as User | undefined;
  }

  // SECURITY: Authentication-only method that includes password for login verification
  async getUserByUsernameForAuth(username: string): Promise<User | undefined> {
    const [user] = await db.select({
      id: users.id,
      schoolId: users.schoolId,
      username: users.username,
      password: users.password, // ONLY for authentication purposes
      name: users.name,
      email: users.email,
      role: users.role,
      instruments: users.instruments,
      avatar: users.avatar,
      bio: users.bio,
      mustChangePassword: users.mustChangePassword,
      lastLoginAt: users.lastLoginAt
    })
      .from(users)
      .where(eq(users.username, username));
    return user;
  }

  // SECURITY FIX: General user lookup method without password exposure
  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select({
      id: users.id,
      schoolId: users.schoolId,
      username: users.username,
      // password: users.password, // REMOVED FOR SECURITY
      name: users.name,
      email: users.email,
      role: users.role,
      instruments: users.instruments,
      avatar: users.avatar,
      bio: users.bio,
      mustChangePassword: users.mustChangePassword,
      lastLoginAt: users.lastLoginAt
    })
      .from(users)
      .where(eq(users.username, username)) as { id: number; schoolId: number | null; username: string; name: string; email: string; role: string; instruments: string | null; avatar: string | null; bio: string | null; mustChangePassword: boolean | null; lastLoginAt: Date | null; }[];
    return user as User | undefined;
  }

  async createUser(user: InsertUser): Promise<User> {
    const [newUser] = await db.insert(users)
      .values(user)
      .returning();
    return newUser;
  }

  // Student operations
  async getStudents(userId: number): Promise<Student[]> {
    // Support both legacy account_id and current userId for imported data
    // Use explicit column selection matching actual database columns
    return db.select({
      id: students.id,
      userId: students.userId,
      accountId: students.accountId,
      name: students.name,
      email: students.email,
      phone: students.phone,
      level: students.level,
      instrument: students.instrument,
      assignedTeacherId: students.assignedTeacherId,
      notes: students.notes,
      createdAt: students.createdAt,
      updatedAt: students.updatedAt,
      isActive: students.isActive
    })
      .from(students)
      .where(
        or(
          eq(students.userId, userId),
          eq(students.accountId, userId)
        )
      );
  }

  async getStudent(id: number): Promise<Student | undefined> {
    const [student] = await db.select({
      id: students.id,
      userId: students.userId,
      accountId: students.accountId,
      name: students.name,
      email: students.email,
      phone: students.phone,
      level: students.level,
      instrument: students.instrument,
      assignedTeacherId: students.assignedTeacherId,
      notes: students.notes,
      createdAt: students.createdAt,
      updatedAt: students.updatedAt,
      isActive: students.isActive
    })
      .from(students)
      .where(eq(students.id, id));
    return student;
  }

  async createStudent(student: InsertStudent): Promise<Student> {
    const [newStudent] = await db.insert(students)
      .values(student)
      .returning();
    return newStudent;
  }

  async updateStudent(id: number, student: Partial<InsertStudent>): Promise<Student> {
    const [updatedStudent] = await db.update(students)
      .set(student)
      .where(eq(students.id, id))
      .returning();
    return updatedStudent;
  }

  async deleteStudent(id: number): Promise<boolean> {
    const result = await db.delete(students)
      .where(eq(students.id, id));
    return true;
  }

  // Song operations
  async getSongs(userId: number): Promise<Song[]> {
    // Use explicit column selection matching actual database columns
    return db.select({
      id: songs.id,
      userId: songs.userId,
      schoolId: songs.schoolId,
      title: songs.title,
      artist: songs.artist,
      composer: songs.composer,
      genre: songs.genre,
      bpm: songs.bpm,
      duration: songs.duration,
      description: songs.description,
      difficulty: songs.difficulty,
      instrument: songs.instrument,
      level: songs.level,
      contentBlocks: songs.contentBlocks,
      groovePatterns: songs.groovePatterns,
      isActive: songs.isActive,
      key: songs.key,
      tempo: songs.tempo,
      createdAt: songs.createdAt,
      updatedAt: songs.updatedAt
    })
      .from(songs)
      .where(eq(songs.userId, userId));
  }

  // Add missing getSongsBySchool method
  async getSongsBySchool(schoolId: number): Promise<Song[]> {
    return db.select({
      id: songs.id,
      userId: songs.userId,
      schoolId: songs.schoolId,
      title: songs.title,
      artist: songs.artist,
      composer: songs.composer,
      genre: songs.genre,
      bpm: songs.bpm,
      duration: songs.duration,
      description: songs.description,
      difficulty: songs.difficulty,
      instrument: songs.instrument,
      level: songs.level,
      contentBlocks: songs.contentBlocks,
      groovePatterns: songs.groovePatterns,
      isActive: songs.isActive,
      key: songs.key,
      tempo: songs.tempo,
      createdAt: songs.createdAt,
      updatedAt: songs.updatedAt
    })
      .from(songs)
      .where(eq(songs.schoolId, schoolId));
  }

  async getSong(id: number): Promise<Song | undefined> {
    const [song] = await db.select({
      id: songs.id,
      userId: songs.userId,
      schoolId: songs.schoolId,
      title: songs.title,
      artist: songs.artist,
      composer: songs.composer,
      genre: songs.genre,
      bpm: songs.bpm,
      duration: songs.duration,
      description: songs.description,
      difficulty: songs.difficulty,
      instrument: songs.instrument,
      level: songs.level,
      contentBlocks: songs.contentBlocks,
      groovePatterns: songs.groovePatterns,
      isActive: songs.isActive,
      key: songs.key,
      tempo: songs.tempo,
      createdAt: songs.createdAt,
      updatedAt: songs.updatedAt
    })
      .from(songs)
      .where(eq(songs.id, id));
    return song;
  }

  async createSong(song: InsertSong): Promise<Song> {
    const [newSong] = await db.insert(songs)
      .values(song)
      .returning();
    return newSong;
  }

  async updateSong(id: number, song: Partial<InsertSong>): Promise<Song> {
    const [updatedSong] = await db.update(songs)
      .set(song)
      .where(eq(songs.id, id))
      .returning();
    return updatedSong;
  }

  async deleteSong(id: number): Promise<boolean> {
    await db.delete(songs)
      .where(eq(songs.id, id));
    return true;
  }

  // Lesson operations
  async getLessons(userId: number): Promise<Lesson[]> {
    // Use explicit column selection matching actual database columns
    return db.select({
      id: lessons.id,
      title: lessons.title,
      description: lessons.description,
      contentType: lessons.contentType,
      instrument: lessons.instrument,
      level: lessons.level,
      category: lessons.category,
      categoryId: lessons.categoryId,
      userId: lessons.userId,
      contentBlocks: lessons.contentBlocks,
      orderNumber: lessons.orderNumber,
      isActive: lessons.isActive,
      createdAt: lessons.createdAt,
      updatedAt: lessons.updatedAt
    })
      .from(lessons)
      .where(eq(lessons.userId, userId));
  }

  // Add missing getLessonsBySchool method
  async getLessonsBySchool(schoolId: number): Promise<Lesson[]> {
    // FIXED: Get lessons from ALL teachers in the school, not just school_owner
    return db.select({
      id: lessons.id,
      title: lessons.title,
      description: lessons.description,
      contentType: lessons.contentType,
      instrument: lessons.instrument,
      level: lessons.level,
      category: lessons.category,
      categoryId: lessons.categoryId,
      userId: lessons.userId,
      contentBlocks: lessons.contentBlocks,
      orderNumber: lessons.orderNumber,
      isActive: lessons.isActive,
      createdAt: lessons.createdAt,
      updatedAt: lessons.updatedAt
    })
      .from(lessons)
      .innerJoin(users, eq(lessons.userId, users.id))
      .where(eq(users.schoolId, schoolId));
  }

  async getLesson(id: number): Promise<Lesson | undefined> {
    const [lesson] = await db.select({
      id: lessons.id,
      title: lessons.title,
      description: lessons.description,
      contentType: lessons.contentType,
      instrument: lessons.instrument,
      level: lessons.level,
      category: lessons.category,
      categoryId: lessons.categoryId,
      userId: lessons.userId,
      contentBlocks: lessons.contentBlocks,
      orderNumber: lessons.orderNumber,
      isActive: lessons.isActive,
      createdAt: lessons.createdAt,
      updatedAt: lessons.updatedAt
    })
      .from(lessons)
      .where(eq(lessons.id, id));
    return lesson;
  }

  async createLesson(lesson: InsertLesson): Promise<Lesson> {
    // Log what we're receiving for contentBlocks
    if (lesson.contentBlocks) {
      console.log("Creating lesson with contentBlocks:", lesson.contentBlocks);
      try {
        // Try to parse it to make sure it's valid JSON
        const parsed = JSON.parse(lesson.contentBlocks);
        console.log("Parsed content blocks:", parsed);
      } catch (error) {
        console.error("Failed to parse content blocks:", error);
      }
    }

    const [newLesson] = await db.insert(lessons)
      .values(lesson)
      .returning();
    return newLesson;
  }

  async updateLesson(id: number, lesson: Partial<InsertLesson>): Promise<Lesson> {
    const [updatedLesson] = await db.update(lessons)
      .set(lesson)
      .where(eq(lessons.id, id))
      .returning();
    return updatedLesson;
  }

  async deleteLesson(id: number): Promise<boolean> {
    await db.delete(lessons)
      .where(eq(lessons.id, id));
    return true;
  }

  // Assignment operations
  async getAssignments(userId: number): Promise<Assignment[]> {
    return db.select({
      id: assignments.id,
      schoolId: assignments.schoolId,
      userId: assignments.userId,
      studentId: assignments.studentId,
      lessonId: assignments.lessonId,
      songId: assignments.songId,
      title: assignments.title,
      description: assignments.description,
      dueDate: assignments.dueDate,
      status: assignments.status
    })
      .from(assignments)
      .where(eq(assignments.userId, userId));
  }

  async getStudentAssignments(studentId: number): Promise<Assignment[]> {
    return db.select({
      id: assignments.id,
      schoolId: assignments.schoolId,
      userId: assignments.userId,
      studentId: assignments.studentId,
      lessonId: assignments.lessonId,
      songId: assignments.songId,
      title: assignments.title,
      description: assignments.description,
      dueDate: assignments.dueDate,
      status: assignments.status
    })
      .from(assignments)
      .where(eq(assignments.studentId, studentId));
  }

  async getAssignment(id: number): Promise<Assignment | undefined> {
    const [assignment] = await db.select({
      id: assignments.id,
      schoolId: assignments.schoolId,
      userId: assignments.userId,
      studentId: assignments.studentId,
      lessonId: assignments.lessonId,
      songId: assignments.songId,
      title: assignments.title,
      description: assignments.description,
      dueDate: assignments.dueDate,
      status: assignments.status
    })
      .from(assignments)
      .where(eq(assignments.id, id));
    return assignment;
  }

  async createAssignment(assignment: InsertAssignment): Promise<Assignment> {
    const [newAssignment] = await db.insert(assignments)
      .values(assignment)
      .returning();
    return newAssignment;
  }

  async updateAssignment(id: number, assignment: Partial<InsertAssignment>): Promise<Assignment> {
    const [updatedAssignment] = await db.update(assignments)
      .set(assignment)
      .where(eq(assignments.id, id))
      .returning();
    return updatedAssignment;
  }

  async deleteAssignment(id: number): Promise<boolean> {
    await db.delete(assignments)
      .where(eq(assignments.id, id));
    return true;
  }

  // Session operations
  async getSessions(userId: number): Promise<Session[]> {
    try {
      // Check if the column exists in the table to avoid runtime errors
      if (sessions.userId) {
        return db.select({
          id: sessions.id,
          schoolId: sessions.schoolId,
          userId: sessions.userId,
          studentId: sessions.studentId,
          title: sessions.title,
          startTime: sessions.startTime,
          endTime: sessions.endTime,
          durationMin: sessions.durationMin,
          notes: sessions.notes
        })
          .from(sessions)
          .where(eq(sessions.userId, userId));
      } else {
        // Fallback if userId column doesn't exist
        console.warn("userId column not found in sessions table, returning empty array");
        return [];
      }
    } catch (error) {
      console.error("Error in getSessions:", error);
      return [];
    }
  }

  async getStudentSessions(studentId: number): Promise<Session[]> {
    return db.select({
      id: sessions.id,
      schoolId: sessions.schoolId,
      userId: sessions.userId,
      studentId: sessions.studentId,
      title: sessions.title,
      startTime: sessions.startTime,
      endTime: sessions.endTime,
      durationMin: sessions.durationMin,
      notes: sessions.notes
    })
      .from(sessions)
      .where(eq(sessions.studentId, studentId));
  }

  async getSession(id: number): Promise<Session | undefined> {
    const [session] = await db.select({
      id: sessions.id,
      schoolId: sessions.schoolId,
      userId: sessions.userId,
      studentId: sessions.studentId,
      title: sessions.title,
      startTime: sessions.startTime,
      endTime: sessions.endTime,
      durationMin: sessions.durationMin,
      notes: sessions.notes
    })
      .from(sessions)
      .where(eq(sessions.id, id));
    return session;
  }

  async createSession(session: InsertSession): Promise<Session> {
    const [newSession] = await db.insert(sessions)
      .values(session)
      .returning();
    return newSession;
  }

  async updateSession(id: number, session: Partial<InsertSession>): Promise<Session> {
    const [updatedSession] = await db.update(sessions)
      .set(session)
      .where(eq(sessions.id, id))
      .returning();
    return updatedSession;
  }

  async deleteSession(id: number): Promise<boolean> {
    await db.delete(sessions)
      .where(eq(sessions.id, id));
    return true;
  }

  // Dashboard statistics
  async getStudentCount(userId: number): Promise<number> {
    try {
      if (!students.userId) {
        console.warn("userId column not found in students table, returning 0");
        return 0;
      }
      
      const result = await db.select({ count: count() })
        .from(students)
        .where(eq(students.userId, userId));
      return Number(result[0].count) || 0;
    } catch (error) {
      console.error("Error in getStudentCount:", error);
      return 0;
    }
  }

  async getSongCount(userId: number): Promise<number> {
    try {
      if (!songs.userId) {
        console.warn("userId column not found in songs table, returning 0");
        return 0;
      }
      
      const result = await db.select({ count: count() })
        .from(songs)
        .where(eq(songs.userId, userId));
      return Number(result[0].count) || 0;
    } catch (error) {
      console.error("Error in getSongCount:", error);
      return 0;
    }
  }

  async getLessonCount(userId: number): Promise<number> {
    try {
      if (!lessons.userId) {
        console.warn("userId column not found in lessons table, returning 0");
        return 0;
      }
      
      const result = await db.select({ count: count() })
        .from(lessons)
        .where(eq(lessons.userId, userId));
      return Number(result[0].count) || 0;
    } catch (error) {
      console.error("Error in getLessonCount:", error);
      return 0;
    }
  }

  async getSessionCountThisWeek(userId: number): Promise<number> {
    try {
      // If sessions table doesn't exist, return 0
      if (!sessions.userId) {
        console.warn("userId column not found in sessions table, returning 0");
        return 0;
      }
      
      const now = new Date();
      const startDate = startOfWeek(now);
      const endDate = endOfWeek(now);

      // Use count() from drizzle
      const result = await db.select({ count: sql`count(*)` })
        .from(sessions)
        .where(
          and(
            eq(sessions.userId, userId),
            gte(sessions.startTime, startDate),
            lte(sessions.startTime, endDate)
          )
        );
      
      return Number(result[0].count) || 0;
    } catch (error) {
      console.error("Error getting session count this week:", error);
      return 0;
    }
  }

  // Recurring Schedule operations
  async getRecurringSchedules(userId: number): Promise<RecurringSchedule[]> {
    return db.select({
      id: recurringSchedules.id,
      userId: recurringSchedules.userId,
      studentId: recurringSchedules.studentId,
      dayOfWeek: recurringSchedules.dayOfWeek,
      startTime: recurringSchedules.startTime,
      endTime: recurringSchedules.endTime,
      location: recurringSchedules.location,
      notes: recurringSchedules.notes,
      timezone: recurringSchedules.timezone,
      frequency: recurringSchedules.frequency,
      isActive: recurringSchedules.isActive,
      iCalDtStart: recurringSchedules.iCalDtStart,
      iCalRrule: recurringSchedules.iCalRrule,
      iCalTzid: recurringSchedules.iCalTzid,
      createdAt: recurringSchedules.createdAt,
      updatedAt: recurringSchedules.updatedAt
    })
      .from(recurringSchedules)
      .where(eq(recurringSchedules.userId, userId));
  }

  async getStudentRecurringSchedules(studentId: number): Promise<RecurringSchedule[]> {
    return db.select({
      id: recurringSchedules.id,
      userId: recurringSchedules.userId,
      studentId: recurringSchedules.studentId,
      dayOfWeek: recurringSchedules.dayOfWeek,
      startTime: recurringSchedules.startTime,
      endTime: recurringSchedules.endTime,
      location: recurringSchedules.location,
      notes: recurringSchedules.notes,
      timezone: recurringSchedules.timezone,
      frequency: recurringSchedules.frequency,
      isActive: recurringSchedules.isActive,
      iCalDtStart: recurringSchedules.iCalDtStart,
      iCalRrule: recurringSchedules.iCalRrule,
      iCalTzid: recurringSchedules.iCalTzid,
      createdAt: recurringSchedules.createdAt,
      updatedAt: recurringSchedules.updatedAt
    })
      .from(recurringSchedules)
      .where(eq(recurringSchedules.studentId, studentId));
  }

  async getRecurringSchedule(id: number): Promise<RecurringSchedule | undefined> {
    const [schedule] = await db.select({
      id: recurringSchedules.id,
      userId: recurringSchedules.userId,
      studentId: recurringSchedules.studentId,
      dayOfWeek: recurringSchedules.dayOfWeek,
      startTime: recurringSchedules.startTime,
      endTime: recurringSchedules.endTime,
      location: recurringSchedules.location,
      notes: recurringSchedules.notes,
      timezone: recurringSchedules.timezone,
      frequency: recurringSchedules.frequency,
      isActive: recurringSchedules.isActive,
      iCalDtStart: recurringSchedules.iCalDtStart,
      iCalRrule: recurringSchedules.iCalRrule,
      iCalTzid: recurringSchedules.iCalTzid,
      createdAt: recurringSchedules.createdAt,
      updatedAt: recurringSchedules.updatedAt
    })
      .from(recurringSchedules)
      .where(eq(recurringSchedules.id, id));
    return schedule;
  }

  async createRecurringSchedule(schedule: InsertRecurringSchedule): Promise<RecurringSchedule> {
    const [newSchedule] = await db.insert(recurringSchedules)
      .values(schedule)
      .returning();
    return newSchedule;
  }

  async updateRecurringSchedule(id: number, schedule: Partial<InsertRecurringSchedule>): Promise<RecurringSchedule> {
    const [updatedSchedule] = await db.update(recurringSchedules)
      .set(schedule)
      .where(eq(recurringSchedules.id, id))
      .returning();
    return updatedSchedule;
  }

  async deleteRecurringSchedule(id: number): Promise<boolean> {
    await db.delete(recurringSchedules)
      .where(eq(recurringSchedules.id, id));
    return true;
  }

  async generateSessionsFromRecurringSchedules(userId: number, startDate: Date, endDate: Date): Promise<Session[]> {
    // This is a complex operation that requires logic to generate sessions from recurring patterns
    // For now, we'll return an empty array, but this should be implemented based on business logic
    return [];
  }

  // Session operations for rescheduling
  async requestReschedule(sessionId: number, newStartTime: Date, newEndTime: Date): Promise<Session> {
    const [updatedSession] = await db.update(sessions)
      .set({
        rescheduleRequestSent: true,
        originalStartTime: db.sql`${sessions.startTime}`,
        startTime: newStartTime,
        endTime: newEndTime,
      })
      .where(eq(sessions.id, sessionId))
      .returning();
    return updatedSession;
  }

  async approveReschedule(sessionId: number): Promise<Session> {
    const [updatedSession] = await db.update(sessions)
      .set({
        rescheduleApproved: true,
        isRescheduled: true,
      })
      .where(eq(sessions.id, sessionId))
      .returning();
    return updatedSession;
  }

  // Practice session operations
  async getPracticeSessions(userId: number): Promise<PracticeSession[]> {
    return db.select({
      id: practiceSessions.id,
      studentId: practiceSessions.studentId,
      lessonId: practiceSessions.lessonId,
      songId: practiceSessions.songId,
      startTime: practiceSessions.startTime,
      endTime: practiceSessions.endTime,
      duration: practiceSessions.duration,
      notes: practiceSessions.notes
    })
      .from(practiceSessions)
      .where(eq(practiceSessions.studentId, userId));
  }

  async getStudentPracticeSessions(studentId: number): Promise<PracticeSession[]> {
    return db.select({
      id: practiceSessions.id,
      studentId: practiceSessions.studentId,
      lessonId: practiceSessions.lessonId,
      songId: practiceSessions.songId,
      startTime: practiceSessions.startTime,
      endTime: practiceSessions.endTime,
      duration: practiceSessions.duration,
      notes: practiceSessions.notes
    })
      .from(practiceSessions)
      .where(eq(practiceSessions.studentId, studentId));
  }

  async getActiveStudentPracticeSessions(): Promise<PracticeSession[]> {
    return db.select({
      id: practiceSessions.id,
      studentId: practiceSessions.studentId,
      lessonId: practiceSessions.lessonId,
      songId: practiceSessions.songId,
      startTime: practiceSessions.startTime,
      endTime: practiceSessions.endTime,
      duration: practiceSessions.duration,
      notes: practiceSessions.notes
    })
      .from(practiceSessions)
      .where(eq(practiceSessions.isActive, true));
  }

  async getPracticeSession(id: number): Promise<PracticeSession | undefined> {
    const [session] = await db.select({
      id: practiceSessions.id,
      studentId: practiceSessions.studentId,
      lessonId: practiceSessions.lessonId,
      songId: practiceSessions.songId,
      startTime: practiceSessions.startTime,
      endTime: practiceSessions.endTime,
      duration: practiceSessions.duration,
      notes: practiceSessions.notes
    })
      .from(practiceSessions)
      .where(eq(practiceSessions.id, id));
    return session;
  }

  async createPracticeSession(session: InsertPracticeSession): Promise<PracticeSession> {
    const [newSession] = await db.insert(practiceSessions)
      .values(session)
      .returning();
    return newSession;
  }

  async endPracticeSession(id: number): Promise<PracticeSession> {
    const [updatedSession] = await db.update(practiceSessions)
      .set({
        isActive: false,
        endTime: new Date(),
      })
      .where(eq(practiceSessions.id, id))
      .returning();
    return updatedSession;
  }

  // Achievement operations
  async getAchievementDefinitions(): Promise<AchievementDefinition[]> {
    return db.select({
      id: achievementDefinitions.id,
      name: achievementDefinitions.name,
      description: achievementDefinitions.description,
      criteria: achievementDefinitions.criteria,
      badgeImage: achievementDefinitions.badgeImage,
      points: achievementDefinitions.points,
      createdAt: achievementDefinitions.createdAt,
      updatedAt: achievementDefinitions.updatedAt,
      type: achievementDefinitions.type,
      iconName: achievementDefinitions.iconName,
      badgeColor: achievementDefinitions.badgeColor,
      xpValue: achievementDefinitions.xpValue
    })
      .from(achievementDefinitions);
  }

  async getAchievementDefinition(id: number): Promise<AchievementDefinition | undefined> {
    const [definition] = await db.select({
      id: achievementDefinitions.id,
      name: achievementDefinitions.name,
      description: achievementDefinitions.description,
      criteria: achievementDefinitions.criteria,
      badgeImage: achievementDefinitions.badgeImage,
      points: achievementDefinitions.points,
      createdAt: achievementDefinitions.createdAt,
      updatedAt: achievementDefinitions.updatedAt,
      type: achievementDefinitions.type,
      iconName: achievementDefinitions.iconName,
      badgeColor: achievementDefinitions.badgeColor,
      xpValue: achievementDefinitions.xpValue
    })
      .from(achievementDefinitions)
      .where(eq(achievementDefinitions.id, id));
    return definition;
  }

  async createAchievementDefinition(achievement: InsertAchievementDefinition): Promise<AchievementDefinition> {
    const [newDefinition] = await db.insert(achievementDefinitions)
      .values(achievement)
      .returning();
    return newDefinition;
  }

  async updateAchievementDefinition(id: number, achievement: Partial<InsertAchievementDefinition>): Promise<AchievementDefinition> {
    const [updatedDefinition] = await db.update(achievementDefinitions)
      .set(achievement)
      .where(eq(achievementDefinitions.id, id))
      .returning();
    return updatedDefinition;
  }

  async deleteAchievementDefinition(id: number): Promise<boolean> {
    await db.delete(achievementDefinitions)
      .where(eq(achievementDefinitions.id, id));
    return true;
  }

  // Student Achievement operations
  async getStudentAchievements(studentId: number): Promise<StudentAchievement[]> {
    return db.select({
      id: studentAchievements.id,
      studentId: studentAchievements.studentId,
      achievementType: studentAchievements.achievementType,
      title: studentAchievements.title,
      description: studentAchievements.description,
      pointsEarned: studentAchievements.pointsEarned,
      badgeIcon: studentAchievements.badgeIcon,
      isVisible: studentAchievements.isVisible,
      earnedAt: studentAchievements.earnedAt
    })
      .from(studentAchievements)
      .where(eq(studentAchievements.studentId, studentId));
  }

  async getStudentAchievement(id: number): Promise<StudentAchievement | undefined> {
    const [achievement] = await db.select({
      id: studentAchievements.id,
      studentId: studentAchievements.studentId,
      achievementType: studentAchievements.achievementType,
      title: studentAchievements.title,
      description: studentAchievements.description,
      pointsEarned: studentAchievements.pointsEarned,
      badgeIcon: studentAchievements.badgeIcon,
      isVisible: studentAchievements.isVisible,
      earnedAt: studentAchievements.earnedAt
    })
      .from(studentAchievements)
      .where(eq(studentAchievements.id, id));
    return achievement;
  }

  async createStudentAchievement(achievement: InsertStudentAchievement): Promise<StudentAchievement> {
    const [newAchievement] = await db.insert(studentAchievements)
      .values(achievement)
      .returning();
    return newAchievement;
  }

  async updateStudentAchievement(id: number, achievement: Partial<InsertStudentAchievement>): Promise<StudentAchievement> {
    const [updatedAchievement] = await db.update(studentAchievements)
      .set(achievement)
      .where(eq(studentAchievements.id, id))
      .returning();
    return updatedAchievement;
  }

  async deleteStudentAchievement(id: number): Promise<boolean> {
    await db.delete(studentAchievements)
      .where(eq(studentAchievements.id, id));
    return true;
  }

  async markAchievementAsSeen(id: number): Promise<StudentAchievement> {
    const [updatedAchievement] = await db.update(studentAchievements)
      .set({ isNew: false })
      .where(eq(studentAchievements.id, id))
      .returning();
    return updatedAchievement;
  }

  async checkAndAwardAchievements(studentId: number): Promise<StudentAchievement[]> {
    // This is a complex operation that requires business logic to check achievements
    // For now, we'll return an empty array, but this should be implemented based on criteria
    return [];
  }

  // Additional student query methods
  async getStudentsBySchool(schoolId: number): Promise<Student[]> {
    // Get students whose user_id points to a user with school_id matching
    // The students.user_id = users.id where users.school_id = schoolId
    const result = await db.select({
      id: students.id,
      userId: students.userId,
      accountId: students.accountId,
      name: students.name,
      email: students.email,
      phone: students.phone,
      level: students.level,
      instrument: students.instrument,
      assignedTeacherId: students.assignedTeacherId,
      notes: students.notes,
      createdAt: students.createdAt,
    })
      .from(students)
      .innerJoin(users, eq(students.userId, users.id))
      .where(eq(users.schoolId, schoolId))
      .orderBy(students.name);
    
    return result as Student[];
  }

  async getStudentsForTeacher(teacherId: number): Promise<Student[]> {
    // Use explicit column selection matching actual database columns
    return db.select({
      id: students.id,
      userId: students.userId,
      accountId: students.accountId,
      name: students.name,
      email: students.email,
      phone: students.phone,
      level: students.level,
      instrument: students.instrument,
      assignedTeacherId: students.assignedTeacherId,
      notes: students.notes,
      createdAt: students.createdAt,
      updatedAt: students.updatedAt,
      isActive: students.isActive
    })
      .from(students)
      .where(eq(students.assignedTeacherId, teacherId));
  }

  // User-related missing methods
  async getTeachers(): Promise<User[]> {
    return await db.select().from(users).where(eq(users.role, 'teacher'));
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  // Student data methods
  async getStudentLessons(studentId: number): Promise<Lesson[]> {
    // For now, return empty array as there's no direct student-lesson relationship in current schema
    // This would need to be implemented based on actual assignment/progress tracking
    return [];
  }

  async getStudentSongs(studentId: number): Promise<Song[]> {
    // For now, return empty array as there's no direct student-song relationship in current schema
    // This would need to be implemented based on actual assignment/progress tracking
    return [];
  }

  async getStudentLessonProgress(studentId: number): Promise<any[]> {
    // Return empty array until progress tracking is fully implemented
    return [];
  }

  async getStudentSongProgress(studentId: number): Promise<any[]> {
    // Return empty array until progress tracking is fully implemented
    return [];
  }

  // Content retrieval methods
  async getRecentSongs(limit: number): Promise<Song[]> {
    return db.select({
      id: songs.id,
      userId: songs.userId,
      schoolId: songs.schoolId,
      title: songs.title,
      artist: songs.artist,
      composer: songs.composer,
      genre: songs.genre,
      bpm: songs.bpm,
      duration: songs.duration,
      description: songs.description,
      difficulty: songs.difficulty,
      instrument: songs.instrument,
      level: songs.level,
      contentBlocks: songs.contentBlocks,
      groovePatterns: songs.groovePatterns,
      isActive: songs.isActive,
      key: songs.key,
      tempo: songs.tempo,
      createdAt: songs.createdAt,
      updatedAt: songs.updatedAt
    })
      .from(songs)
      .where(eq(songs.isActive, true))
      .orderBy(desc(songs.createdAt))
      .limit(limit);
  }

  async getSongsByLetter(letter: string): Promise<Song[]> {
    return db.select({
      id: songs.id,
      userId: songs.userId,
      schoolId: songs.schoolId,
      title: songs.title,
      artist: songs.artist,
      composer: songs.composer,
      genre: songs.genre,
      bpm: songs.bpm,
      duration: songs.duration,
      description: songs.description,
      difficulty: songs.difficulty,
      instrument: songs.instrument,
      level: songs.level,
      contentBlocks: songs.contentBlocks,
      groovePatterns: songs.groovePatterns,
      isActive: songs.isActive,
      key: songs.key,
      tempo: songs.tempo,
      createdAt: songs.createdAt,
      updatedAt: songs.updatedAt
    })
      .from(songs)
      .where(
        and(
          eq(songs.isActive, true),
          sql`UPPER(${songs.title}) LIKE ${letter.toUpperCase() + '%'}`
        )
      )
      .orderBy(songs.title);
  }

  async getRecentLessons(limit: number): Promise<Lesson[]> {
    return db.select({
      id: lessons.id,
      title: lessons.title,
      description: lessons.description,
      contentType: lessons.contentType,
      instrument: lessons.instrument,
      level: lessons.level,
      category: lessons.category,
      categoryId: lessons.categoryId,
      userId: lessons.userId,
      contentBlocks: lessons.contentBlocks,
      orderNumber: lessons.orderNumber,
      isActive: lessons.isActive,
      createdAt: lessons.createdAt,
      updatedAt: lessons.updatedAt
    })
      .from(lessons)
      .where(eq(lessons.isActive, true))
      .orderBy(desc(lessons.createdAt))
      .limit(limit);
  }

  // Session methods
  async getSessionsForDate(date: Date): Promise<Session[]> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    return db.select()
      .from(sessions)
      .where(
        and(
          gte(sessions.startTime, startOfDay),
          lte(sessions.startTime, endOfDay)
        )
      );
  }

  // Recurring schedule methods
  async getRecurringSchedulesBySchool(schoolId: number): Promise<RecurringSchedule[]> {
    // Get all recurring schedules for users in this school by joining with users table
    const schedulesData = await db.select({
      id: recurringSchedules.id,
      userId: recurringSchedules.userId,
      studentId: recurringSchedules.studentId,
      dayOfWeek: recurringSchedules.dayOfWeek,
      startTime: recurringSchedules.startTime,
      endTime: recurringSchedules.endTime,
      location: recurringSchedules.location,
      notes: recurringSchedules.notes,
      // timezone: recurringSchedules.timezone, // Column doesn't exist in database
      frequency: recurringSchedules.frequency,
      isActive: recurringSchedules.isActive,
      iCalDtStart: recurringSchedules.iCalDtStart,
      iCalRrule: recurringSchedules.iCalRrule,
      iCalTzid: recurringSchedules.iCalTzid,
      createdAt: recurringSchedules.createdAt,
      updatedAt: recurringSchedules.updatedAt,
      schoolId: users.schoolId
    })
      .from(recurringSchedules)
      .innerJoin(users, eq(recurringSchedules.userId, users.id))
      .where(eq(users.schoolId, schoolId));
    
    return schedulesData;
  }

  // Search functionality
  async searchContent(userId: number, searchTerm: string): Promise<{lessons: Lesson[], songs: Song[]}> {
    const searchPattern = `%${searchTerm.toLowerCase()}%`;
    
    const lessonResults = await db.select({
      id: lessons.id,
      title: lessons.title,
      description: lessons.description,
      contentType: lessons.contentType,
      instrument: lessons.instrument,
      level: lessons.level,
      category: lessons.category,
      categoryId: lessons.categoryId,
      userId: lessons.userId,
      contentBlocks: lessons.contentBlocks,
      orderNumber: lessons.orderNumber,
      isActive: lessons.isActive,
      createdAt: lessons.createdAt,
      updatedAt: lessons.updatedAt
    })
      .from(lessons)
      .where(
        and(
          eq(lessons.userId, userId),
          or(
            sql`LOWER(${lessons.title}) LIKE ${searchPattern}`,
            sql`LOWER(${lessons.description}) LIKE ${searchPattern}`
          )
        )
      );

    const songResults = await db.select({
      id: songs.id,
      userId: songs.userId,
      schoolId: songs.schoolId,
      title: songs.title,
      artist: songs.artist,
      composer: songs.composer,
      genre: songs.genre,
      bpm: songs.bpm,
      duration: songs.duration,
      description: songs.description,
      difficulty: songs.difficulty,
      instrument: songs.instrument,
      level: songs.level,
      contentBlocks: songs.contentBlocks,
      groovePatterns: songs.groovePatterns,
      isActive: songs.isActive,
      key: songs.key,
      tempo: songs.tempo,
      createdAt: songs.createdAt,
      updatedAt: songs.updatedAt
    })
      .from(songs)
      .where(
        and(
          eq(songs.userId, userId),
          or(
            sql`LOWER(${songs.title}) LIKE ${searchPattern}`,
            sql`LOWER(${songs.artist}) LIKE ${searchPattern}`,
            sql`LOWER(${songs.description}) LIKE ${searchPattern}`
          )
        )
      );

    return { lessons: lessonResults, songs: songResults };
  }

  // Message system methods
  async getMessages(userId: number): Promise<any[]> {
    // Return empty array for now - messages system not fully implemented
    return [];
  }

  async getMessage(id: number): Promise<any | undefined> {
    // Return undefined for now - messages system not fully implemented
    return undefined;
  }

  async createMessage(message: any): Promise<any> {
    // Return the message as-is for now - messages system not fully implemented
    return message;
  }

  async updateMessage(id: number, message: any): Promise<any> {
    // Return the message as-is for now - messages system not fully implemented
    return message;
  }

  async deleteMessage(id: number): Promise<boolean> {
    // Return true for now - messages system not fully implemented
    return true;
  }

  async getUnreadMessageCount(userId: number, userType: string): Promise<number> {
    // Query messages table for unread messages where user is recipient
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(messages)
      .where(
        and(
          eq(messages.recipientId, userId),
          eq(messages.recipientType, userType),
          eq(messages.isRead, false)
        )
      );
    
    return Number(result[0]?.count || 0);
  }

  // Lesson categories methods (stub implementation)
  async getLessonCategories(userId: number): Promise<any[]> {
    // Return empty array for now - lesson categories not fully implemented
    return [];
  }

  async getLessonCategoriesBySchool(schoolId: number): Promise<any[]> {
    // Return empty array for now - lesson categories not fully implemented
    return [];
  }

  async getLessonCategory(id: number): Promise<any | undefined> {
    // Return undefined for now - lesson categories not fully implemented
    return undefined;
  }

  async createLessonCategory(category: any): Promise<any> {
    // Return the category as-is for now - lesson categories not fully implemented
    return category;
  }

  async updateLessonCategory(id: number, category: any): Promise<any> {
    // Return the category as-is for now - lesson categories not fully implemented
    return category;
  }

  async deleteLessonCategory(id: number): Promise<boolean> {
    // Return true for now - lesson categories not fully implemented
    return true;
  }

  // Performance monitoring methods (stub implementation)
  async getLessonPerformanceMetrics(userId: number): Promise<any> {
    // Return empty object for now - performance monitoring not fully implemented
    return {};
  }

  async getRealtimeStats(userId: number): Promise<any> {
    // Return basic stats object for now
    return {
      studentCount: await this.getStudentCount(userId),
      songCount: await this.getSongCount(userId),
      lessonCount: await this.getLessonCount(userId),
      sessionCount: await this.getSessionCountThisWeek(userId)
    };
  }

  async trackPerformanceEvent(userId: number, event: any): Promise<void> {
    // No-op for now - performance tracking not fully implemented
    return;
  }

  // Multi-tenant school-scoped methods
  async getLessonsForTeacher(teacherId: number): Promise<Lesson[]> {
    return this.getLessons(teacherId);
  }

  async getSongsForTeacher(teacherId: number): Promise<Song[]> {
    return this.getSongs(teacherId);
  }

  async getAssignmentsBySchool(schoolId: number): Promise<Assignment[]> {
    // FIXED: Get assignments from ALL teachers in the school, not just school_owner
    return db.select()
      .from(assignments)
      .innerJoin(users, eq(assignments.userId, users.id))
      .where(eq(users.schoolId, schoolId));
  }

  async getAssignmentsForTeacher(teacherId: number): Promise<Assignment[]> {
    return this.getAssignments(teacherId);
  }

  async getSessionsBySchool(schoolId: number): Promise<Session[]> {
    // FIXED: Get sessions from ALL teachers in the school, not just school_owner
    return db.select()
      .from(sessions)
      .innerJoin(users, eq(sessions.userId, users.id))
      .where(eq(users.schoolId, schoolId));
  }

  async getSessionsForTeacher(teacherId: number): Promise<Session[]> {
    return this.getSessions(teacherId);
  }

  async getTeachersBySchool(schoolId: number): Promise<User[]> {
    // SECURITY FIX: Remove password field exposure to prevent hash leakage
    return await db.select({
      id: users.id,
      schoolId: users.schoolId,
      username: users.username,
      // password: users.password, // REMOVED FOR SECURITY
      name: users.name,
      email: users.email,
      role: users.role,
      instruments: users.instruments,
      avatar: users.avatar,
      bio: users.bio,
      mustChangePassword: users.mustChangePassword,
      lastLoginAt: users.lastLoginAt
    }).from(users).where(
      and(
        eq(users.schoolId, schoolId),
        eq(users.role, 'teacher')
      )
    ) as Promise<User[]>;
  }

  async getStudentCountBySchool(schoolId: number): Promise<number> {
    // FIXED: Count students from ALL teachers in the school, not just school_owner
    const result = await db.select({ count: sql`count(distinct ${students.id})` })
      .from(students)
      .innerJoin(users, or(
        eq(students.userId, users.id),
        eq(students.accountId, users.id)
      ))
      .where(eq(users.schoolId, schoolId));
    return Number(result[0].count) || 0;
  }

  async getLessonCountBySchool(schoolId: number): Promise<number> {
    // FIXED: Count lessons from ALL teachers in the school, not just school_owner
    const result = await db.select({ count: sql`count(*)` })
      .from(lessons)
      .innerJoin(users, eq(lessons.userId, users.id))
      .where(eq(users.schoolId, schoolId));
    return Number(result[0].count) || 0;
  }

  async getSongCountBySchool(schoolId: number): Promise<number> {
    // FIXED: Count songs from entire school using schoolId column
    const result = await db.select({ count: sql`count(*)` })
      .from(songs)
      .where(eq(songs.schoolId, schoolId));
    return Number(result[0].count) || 0;
  }

  async getSchoolById(schoolId: number): Promise<School | undefined> {
    return this.getSchool(schoolId);
  }

  async getSchoolsByOwner(ownerId: number): Promise<School[]> {
    const user = await this.getUser(ownerId);
    if (user && user.schoolId) {
      const school = await this.getSchool(user.schoolId);
      return school ? [school] : [];
    }
    return [];
  }

  // Groove Patterns methods (stub implementation)
  async getGroovePatterns(userId?: number): Promise<any[]> {
    // Return empty array for now - groove patterns system not fully implemented
    return [];
  }

  async getGroovePattern(id: string): Promise<any | undefined> {
    // Return undefined for now - groove patterns system not fully implemented
    return undefined;
  }

  async createGroovePattern(pattern: any): Promise<any> {
    // Return the pattern as-is for now - groove patterns system not fully implemented
    return pattern;
  }

  async updateGroovePattern(id: string, pattern: any): Promise<any> {
    // Return the pattern as-is for now - groove patterns system not fully implemented
    return pattern;
  }

  async deleteGroovePattern(id: string): Promise<boolean> {
    // Return true for now - groove patterns system not fully implemented
    return true;
  }

  async searchGroovePatterns(searchTerm: string, difficulty?: string, tags?: string[]): Promise<any[]> {
    // Return empty array for now - groove patterns system not fully implemented
    return [];
  }

  async getGroovePatternsBySchool(schoolId: number): Promise<any[]> {
    // Return empty array for now - groove patterns system not fully implemented
    return [];
  }

  async getGroovePatternsForTeacher(teacherId: number): Promise<any[]> {
    // Return empty array for now - groove patterns system not fully implemented
    return [];
  }

  // School membership methods
  async createSchoolMembership(membership: any): Promise<any> {
    // Return the membership as-is for now - school memberships not fully implemented
    return membership;
  }

  async getSchoolMemberships(schoolId: number): Promise<any[]> {
    // Return empty array for now - school memberships not fully implemented
    return [];
  }

  async updateSchoolMembership(id: number, membership: any): Promise<any> {
    // Return the membership as-is for now - school memberships not fully implemented
    return membership;
  }

  async deleteSchoolMembership(id: number): Promise<boolean> {
    // Return true for now - school memberships not fully implemented
    return true;
  }

  // Reports and analytics methods (stub implementation)
  async generateReportsData(userId: number, dateRange: number, reportType: string): Promise<any> {
    // Return basic report structure for now
    return {
      reportType,
      dateRange,
      data: [],
      summary: {
        totalStudents: await this.getStudentCount(userId),
        totalSongs: await this.getSongCount(userId),
        totalLessons: await this.getLessonCount(userId)
      }
    };
  }
  
  // School-scoped reports - shows all data for the school
  async generateReportsDataBySchool(schoolId: number, dateRange: number, reportType: string): Promise<any> {
    return {
      reportType,
      dateRange,
      data: [],
      summary: {
        totalStudents: await this.getStudentCountBySchool(schoolId),
        totalSongs: await this.getSongCountBySchool(schoolId),
        totalLessons: await this.getLessonCountBySchool(schoolId)
      }
    };
  }

  async getStudentProgressReports(userId: number): Promise<any[]> {
    // Return empty array for now - progress reports not fully implemented
    return [];
  }

  async getLessonCompletionStats(userId: number, dateRange: number): Promise<any[]> {
    // Return empty array for now - lesson completion stats not fully implemented
    return [];
  }

  async getPopularLessons(userId: number, dateRange: number): Promise<any[]> {
    // Return empty array for now - popular lessons stats not fully implemented
    return [];
  }

  async getUpcomingDeadlines(userId: number): Promise<any[]> {
    // Return empty array for now - deadlines not fully implemented
    return [];
  }

  // School membership methods - now fully implemented with proper types
  async getUserSchoolMemberships(userId: number): Promise<SchoolMembership[]> {
    try {
      const memberships = await db.select({
        id: schoolMemberships.id,
        schoolId: schoolMemberships.schoolId,
        userId: schoolMemberships.userId,
        role: schoolMemberships.role,
        createdAt: schoolMemberships.createdAt,
        updatedAt: schoolMemberships.updatedAt
      })
        .from(schoolMemberships)
        .where(eq(schoolMemberships.userId, userId));
      
      return memberships;
    } catch (error) {
      console.warn("getUserSchoolMemberships failed, returning empty array:", (error as Error).message);
      return [];
    }
  }

  // ========================================
  // SETTINGS API METHODS IMPLEMENTATION - CRITICAL PRODUCTION FIX
  // ========================================

  // User profile operations
  async getCurrentUserProfile(userId: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    return user;
  }

  async updateCurrentUserProfile(userId: number, profileData: ProfileUpdateData): Promise<User> {
    const [updatedUser] = await db
      .update(users)
      .set({
        name: profileData.name,
        email: profileData.email,
        bio: profileData.bio,
        instruments: profileData.instruments,
        avatar: profileData.avatar,
      })
      .where(eq(users.id, userId))
      .returning();
    return updatedUser;
  }

  // School settings operations
  async getSchoolSettings(schoolId: number): Promise<School | undefined> {
    const [school] = await db.select().from(schools).where(eq(schools.id, schoolId));
    return school;
  }

  async updateSchoolSettings(schoolId: number, settingsData: SchoolSettingsUpdateData): Promise<School> {
    const [updatedSchool] = await db
      .update(schools)
      .set({
        name: settingsData.name,
        address: settingsData.address,
        city: settingsData.city,
        phone: settingsData.phone,
        website: settingsData.website,
        description: settingsData.description,
        instruments: settingsData.instruments,
      })
      .where(eq(schools.id, schoolId))
      .returning();
    return updatedSchool;
  }

  // User notification settings operations
  async getUserNotifications(userId: number): Promise<UserNotifications | undefined> {
    try {
      const [notifications] = await db
        .select()
        .from(userNotifications)
        .where(eq(userNotifications.userId, userId));
      return notifications;
    } catch (error) {
      // Return undefined if table doesn't exist yet or no record found
      console.log("getUserNotifications: table may not exist or no record found");
      return undefined;
    }
  }

  async upsertUserNotifications(userId: number, settings: NotificationSettingsData): Promise<UserNotifications> {
    try {
      // Try to update first
      const [existing] = await db
        .select()
        .from(userNotifications)
        .where(eq(userNotifications.userId, userId));

      if (existing) {
        // Update existing record
        const [updated] = await db
          .update(userNotifications)
          .set({ 
            settings: settings as any,
            updatedAt: new Date()
          })
          .where(eq(userNotifications.userId, userId))
          .returning();
        return updated;
      } else {
        // Insert new record
        const [inserted] = await db
          .insert(userNotifications)
          .values({
            userId,
            settings: settings as any,
          })
          .returning();
        return inserted;
      }
    } catch (error) {
      // Handle case where table doesn't exist yet
      console.error("upsertUserNotifications error:", error);
      throw new Error("Failed to save notification settings");
    }
  }

  // User preference settings operations
  async getUserPreferences(userId: number): Promise<UserPreferences | undefined> {
    try {
      const [preferences] = await db
        .select()
        .from(userPreferences)
        .where(eq(userPreferences.userId, userId));
      return preferences;
    } catch (error) {
      // Return undefined if table doesn't exist yet or no record found
      console.log("getUserPreferences: table may not exist or no record found");
      return undefined;
    }
  }

  async upsertUserPreferences(userId: number, settings: PreferenceSettingsData): Promise<UserPreferences> {
    try {
      // Try to update first
      const [existing] = await db
        .select()
        .from(userPreferences)
        .where(eq(userPreferences.userId, userId));

      if (existing) {
        // Update existing record
        const [updated] = await db
          .update(userPreferences)
          .set({ 
            settings: settings as any,
            updatedAt: new Date()
          })
          .where(eq(userPreferences.userId, userId))
          .returning();
        return updated;
      } else {
        // Insert new record
        const [inserted] = await db
          .insert(userPreferences)
          .values({
            userId,
            settings: settings as any,
          })
          .returning();
        return inserted;
      }
    } catch (error) {
      // Handle case where table doesn't exist yet
      console.error("upsertUserPreferences error:", error);
      throw new Error("Failed to save user preferences");
    }
  }

  // Password change operations
  async changeUserPassword(userId: number, currentPassword: string, newPassword: string): Promise<User> {
    // First, get the current user to verify the current password
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    
    if (!user) {
      throw new Error("User not found");
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      throw new Error("Current password is incorrect");
    }

    // Hash the new password
    const saltRounds = 10;
    const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update the user's password
    const [updatedUser] = await db
      .update(users)
      .set({ 
        password: hashedNewPassword,
        mustChangePassword: false // Clear password change requirement
      })
      .where(eq(users.id, userId))
      .returning();

    return updatedUser;
  }

  // ========================================
  // NOTIFICATIONS SYSTEM IMPLEMENTATION
  // ========================================

  async createNotification(notification: any): Promise<any> {
    const [newNotification] = await db
      .insert(notifications)
      .values({
        userId: notification.userId,
        schoolId: notification.schoolId,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        link: notification.link || null,
        metadata: notification.metadata || null,
      })
      .returning();
    
    return newNotification;
  }

  async getAllUserNotifications(userId: number, schoolId: number, limit = 50): Promise<any[]> {
    return await db
      .select()
      .from(notifications)
      .where(
        and(
          eq(notifications.userId, userId),
          eq(notifications.schoolId, schoolId)
        )
      )
      .orderBy(desc(notifications.createdAt))
      .limit(limit);
  }

  async getUnreadNotificationCount(userId: number, schoolId: number): Promise<number> {
    const result = await db
      .select({ count: count() })
      .from(notifications)
      .where(
        and(
          eq(notifications.userId, userId),
          eq(notifications.schoolId, schoolId),
          eq(notifications.isRead, false)
        )
      );
    
    return result[0]?.count || 0;
  }

  async markNotificationAsRead(notificationId: number, userId: number): Promise<boolean> {
    const result = await db
      .update(notifications)
      .set({ isRead: true })
      .where(
        and(
          eq(notifications.id, notificationId),
          eq(notifications.userId, userId)
        )
      )
      .returning();
    
    return result.length > 0;
  }

  async markAllNotificationsAsRead(userId: number, schoolId: number): Promise<number> {
    const result = await db
      .update(notifications)
      .set({ isRead: true })
      .where(
        and(
          eq(notifications.userId, userId),
          eq(notifications.schoolId, schoolId),
          eq(notifications.isRead, false)
        )
      )
      .returning();
    
    return result.length;
  }

  async deleteOldNotifications(days: number): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    const result = await db
      .delete(notifications)
      .where(
        and(
          eq(notifications.isRead, true),
          lte(notifications.createdAt, cutoffDate)
        )
      )
      .returning();
    
    return result.length;
  }

  async getStudentsWithBirthdayToday(): Promise<any[]> {
    const today = new Date();
    const currentMonth = today.getMonth() + 1;
    const currentDay = today.getDate();
    
    return await db
      .select()
      .from(students)
      .where(
        and(
          sql`EXTRACT(MONTH FROM ${students.birthdate}) = ${currentMonth}`,
          sql`EXTRACT(DAY FROM ${students.birthdate}) = ${currentDay}`
        )
      );
  }

  async getSchoolTeachers(schoolId: number): Promise<User[]> {
    return await db
      .select({
        id: users.id,
        schoolId: users.schoolId,
        username: users.username,
        name: users.name,
        email: users.email,
        role: users.role,
        instruments: users.instruments,
        avatar: users.avatar,
        bio: users.bio,
        mustChangePassword: users.mustChangePassword,
        lastLoginAt: users.lastLoginAt
      })
      .from(users)
      .where(
        and(
          eq(users.schoolId, schoolId),
          or(
            eq(users.role, 'teacher'),
            eq(users.role, 'school_owner')
          )
        )
      ) as Promise<User[]>;
  }

  // ========================================
  // POS IMPORT SYSTEM - Notations, Songs, Mappings, Drumblocks
  // ========================================

  // Notations
  async getNotations(schoolId: number): Promise<Notation[]> {
    return await db
      .select()
      .from(notations)
      .where(eq(notations.schoolId, schoolId))
      .orderBy(desc(notations.createdAt));
  }

  async getNotation(id: number): Promise<Notation | undefined> {
    const [notation] = await db
      .select()
      .from(notations)
      .where(eq(notations.id, id));
    return notation;
  }

  async createNotation(notation: InsertNotation): Promise<Notation> {
    const [newNotation] = await db
      .insert(notations)
      .values(notation)
      .returning();
    return newNotation;
  }

  async createNotationsBatch(notationsData: InsertNotation[]): Promise<BatchResult> {
    const result: BatchResult = { inserted: 0, skipped: 0, errors: [] };

    if (notationsData.length === 0) return result;

    try {
      // Use batch insert with ON CONFLICT handling
      const inserted = await db
        .insert(notations)
        .values(notationsData)
        .returning();
      result.inserted = inserted.length;
    } catch (error) {
      // Fall back to individual inserts to track specific errors
      for (let i = 0; i < notationsData.length; i++) {
        try {
          await db.insert(notations).values(notationsData[i]);
          result.inserted++;
        } catch (err) {
          result.errors.push({ row: i, error: err instanceof Error ? err.message : String(err) });
        }
      }
    }

    return result;
  }

  async updateNotation(id: number, data: Partial<Notation>): Promise<Notation> {
    const [updated] = await db
      .update(notations)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(notations.id, id))
      .returning();
    return updated;
  }

  async deleteNotation(id: number): Promise<boolean> {
    await db.delete(notations).where(eq(notations.id, id));
    return true;
  }

  // POS Songs
  async getPosSongs(schoolId: number): Promise<PosSong[]> {
    return await db
      .select()
      .from(posSongs)
      .where(eq(posSongs.schoolId, schoolId))
      .orderBy(desc(posSongs.createdAt));
  }

  async getPosSong(id: number): Promise<PosSong | undefined> {
    const [song] = await db
      .select()
      .from(posSongs)
      .where(eq(posSongs.id, id));
    return song;
  }

  async createPosSong(song: InsertPosSong): Promise<PosSong> {
    const [newSong] = await db
      .insert(posSongs)
      .values(song)
      .returning();
    return newSong;
  }

  async createPosSongsBatch(songsData: InsertPosSong[]): Promise<BatchResult> {
    const result: BatchResult = { inserted: 0, skipped: 0, errors: [] };

    if (songsData.length === 0) return result;

    try {
      const inserted = await db
        .insert(posSongs)
        .values(songsData)
        .returning();
      result.inserted = inserted.length;
    } catch (error) {
      // Fall back to individual inserts to track specific errors
      for (let i = 0; i < songsData.length; i++) {
        try {
          await db.insert(posSongs).values(songsData[i]);
          result.inserted++;
        } catch (err) {
          result.errors.push({ row: i, error: err instanceof Error ? err.message : String(err) });
        }
      }
    }

    return result;
  }

  async updatePosSong(id: number, data: Partial<PosSong>): Promise<PosSong> {
    const [updated] = await db
      .update(posSongs)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(posSongs.id, id))
      .returning();
    return updated;
  }

  async deletePosSong(id: number): Promise<boolean> {
    await db.delete(posSongs).where(eq(posSongs.id, id));
    return true;
  }

  // Song ↔ Notation Mappings
  async getSongNotationMappings(schoolId: number): Promise<SongNotationMapping[]> {
    return await db
      .select()
      .from(songNotationMappings)
      .where(eq(songNotationMappings.schoolId, schoolId))
      .orderBy(desc(songNotationMappings.createdAt));
  }

  async getSongNotationMapping(id: number): Promise<SongNotationMapping | undefined> {
    const [mapping] = await db
      .select()
      .from(songNotationMappings)
      .where(eq(songNotationMappings.id, id));
    return mapping;
  }

  async getMappingsForSong(songId: number): Promise<SongNotationMapping[]> {
    return await db
      .select()
      .from(songNotationMappings)
      .where(eq(songNotationMappings.songId, songId));
  }

  async getMappingsForNotation(notationId: number): Promise<SongNotationMapping[]> {
    return await db
      .select()
      .from(songNotationMappings)
      .where(eq(songNotationMappings.notationId, notationId));
  }

  async createSongNotationMapping(mapping: InsertSongNotationMapping): Promise<SongNotationMapping> {
    const [newMapping] = await db
      .insert(songNotationMappings)
      .values(mapping)
      .returning();
    return newMapping;
  }

  async deleteSongNotationMapping(id: number): Promise<boolean> {
    await db.delete(songNotationMappings).where(eq(songNotationMappings.id, id));
    return true;
  }

  // Drumblocks
  async getDrumblocks(schoolId: number): Promise<Drumblock[]> {
    return await db
      .select()
      .from(drumblocks)
      .where(eq(drumblocks.schoolId, schoolId))
      .orderBy(desc(drumblocks.createdAt));
  }

  async getDrumblock(id: number): Promise<Drumblock | undefined> {
    const [block] = await db
      .select()
      .from(drumblocks)
      .where(eq(drumblocks.id, id));
    return block;
  }

  async getDrumblockByBlockId(blockId: string, schoolId: number): Promise<Drumblock | undefined> {
    const [block] = await db
      .select()
      .from(drumblocks)
      .where(
        and(
          eq(drumblocks.blockId, blockId),
          eq(drumblocks.schoolId, schoolId)
        )
      );
    return block;
  }

  async getDrumblocksByNotation(notationId: number): Promise<Drumblock[]> {
    return await db
      .select()
      .from(drumblocks)
      .where(eq(drumblocks.sourceNotationId, notationId));
  }

  async createDrumblock(block: InsertDrumblock): Promise<Drumblock> {
    const [newBlock] = await db
      .insert(drumblocks)
      .values(block)
      .returning();
    return newBlock;
  }

  async createDrumblocksBatch(blocksData: InsertDrumblock[]): Promise<BatchResult> {
    const result: BatchResult = { inserted: 0, skipped: 0, errors: [] };

    if (blocksData.length === 0) return result;

    try {
      const inserted = await db
        .insert(drumblocks)
        .values(blocksData)
        .returning();
      result.inserted = inserted.length;
    } catch (error) {
      // Fall back to individual inserts to track specific errors
      for (let i = 0; i < blocksData.length; i++) {
        try {
          await db.insert(drumblocks).values(blocksData[i]);
          result.inserted++;
        } catch (err) {
          result.errors.push({ row: i, error: err instanceof Error ? err.message : String(err) });
        }
      }
    }

    return result;
  }

  async updateDrumblock(id: number, data: Partial<Drumblock>): Promise<Drumblock> {
    const [updated] = await db
      .update(drumblocks)
      .set(data)
      .where(eq(drumblocks.id, id))
      .returning();
    return updated;
  }

  async deleteDrumblock(id: number): Promise<boolean> {
    await db.delete(drumblocks).where(eq(drumblocks.id, id));
    return true;
  }

  // Import Logs
  async createImportLog(log: InsertPosImportLog): Promise<PosImportLog> {
    const [newLog] = await db
      .insert(posImportLogs)
      .values(log)
      .returning();
    return newLog;
  }

  async updateImportLog(id: number, data: Partial<PosImportLog>): Promise<PosImportLog> {
    const [updated] = await db
      .update(posImportLogs)
      .set(data)
      .where(eq(posImportLogs.id, id))
      .returning();
    return updated;
  }

  async getImportLog(id: number): Promise<PosImportLog | undefined> {
    const [log] = await db
      .select()
      .from(posImportLogs)
      .where(eq(posImportLogs.id, id));
    return log;
  }

  async getImportLogs(schoolId: number, limit: number = 50): Promise<PosImportLog[]> {
    return await db
      .select()
      .from(posImportLogs)
      .where(eq(posImportLogs.schoolId, schoolId))
      .orderBy(desc(posImportLogs.startedAt))
      .limit(limit);
  }

  async getImportLogByBatchId(batchId: string): Promise<PosImportLog | undefined> {
    const [log] = await db
      .select()
      .from(posImportLogs)
      .where(eq(posImportLogs.batchId, batchId));
    return log;
  }
}