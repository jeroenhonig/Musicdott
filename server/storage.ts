import {
  users, students, songs, lessons, assignments, sessions, achievementDefinitions, studentAchievements,
  recurringSchedules, practiceSessions, schools, groovePatterns, schoolMemberships,
  userNotifications, userPreferences, notifications,
  type User, type Student, type Song, type Lesson, type Assignment, type Session,
  type AchievementDefinition, type StudentAchievement, type RecurringSchedule, type PracticeSession,
  type School, type GroovePattern, type SchoolMembership, type UserNotifications, type UserPreferences,
  type Notification, type InsertNotification,
  type InsertUser, type InsertStudent, type InsertSong, type InsertLesson, type InsertAssignment, type InsertSession,
  type InsertAchievementDefinition, type InsertStudentAchievement, type InsertRecurringSchedule, type InsertPracticeSession,
  type InsertSchool, type InsertGroovePattern, type InsertSchoolMembership, type InsertUserNotifications, type InsertUserPreferences,
  type ProfileUpdateData, type SchoolSettingsUpdateData, type NotificationSettingsData,
  type PreferenceSettingsData, type PasswordChangeData,
  // POS Import types
  type Notation, type InsertNotation,
  type PosSong, type InsertPosSong,
  type SongNotationMapping, type InsertSongNotationMapping,
  type Drumblock, type InsertDrumblock,
  type PosImportLog, type InsertPosImportLog,
  type BatchResult
} from "@shared/schema";
import session from "express-session";
import { DatabaseStorage } from "./database-storage";
import createMemoryStore from "memorystore";
import bcrypt from "bcrypt";

const MemoryStore = createMemoryStore(session);

// Interface defining all storage operations
export interface IStorage {
  sessionStore: session.Store;

  // School operations
  getSchools(): Promise<School[]>;
  getSchool(id: number): Promise<School | undefined>;
  createSchool(school: InsertSchool): Promise<School>;
  updateSchool(id: number, school: Partial<InsertSchool>): Promise<School>;
  deleteSchool(id: number): Promise<boolean>;
  
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByUsernameForAuth(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<InsertUser>): Promise<User>;
  deleteUser(id: number): Promise<boolean>;
  getUsersBySchool(schoolId: number): Promise<User[]>;
  getUsersByRole(role: string): Promise<User[]>;
  getTeachers(): Promise<User[]>;
  
  // Student operations
  getStudents(userId: number): Promise<Student[]>;
  getStudent(id: number): Promise<Student | undefined>;
  getStudentLessons(studentId: number): Promise<Lesson[]>;
  getStudentSongs(studentId: number): Promise<Song[]>;
  getStudentLessonProgress(studentId: number): Promise<any[]>;
  getStudentSongProgress(studentId: number): Promise<any[]>;
  createStudent(student: InsertStudent): Promise<Student>;
  updateStudent(id: number, student: Partial<InsertStudent>): Promise<Student>;
  deleteStudent(id: number): Promise<boolean>;
  
  // Song operations
  getSongs(userId: number): Promise<Song[]>;
  getSong(id: number): Promise<Song | undefined>;
  getRecentSongs(limit: number): Promise<Song[]>; // DEPRECATED - use getRecentSongsForUser instead
  getRecentSongsForUser(userId: number, limit: number): Promise<Song[]>; // SECURE - user-scoped
  getSongsByLetter(userId: number, letter: string): Promise<Song[]>;
  createSong(song: InsertSong): Promise<Song>;
  updateSong(id: number, song: Partial<InsertSong>): Promise<Song>;
  deleteSong(id: number): Promise<boolean>;
  
  // Lesson operations
  getLessons(userId: number): Promise<Lesson[]>;
  getLesson(id: number): Promise<Lesson | undefined>;
  getRecentLessons(limit: number): Promise<Lesson[]>; // DEPRECATED - use getRecentLessonsForUser instead
  getRecentLessonsForUser(userId: number, limit: number): Promise<Lesson[]>; // SECURE - user-scoped
  createLesson(lesson: InsertLesson): Promise<Lesson>;
  updateLesson(id: number, lesson: Partial<InsertLesson>): Promise<Lesson>;
  deleteLesson(id: number): Promise<boolean>;
  
  // Assignment operations
  getAssignments(userId: number): Promise<Assignment[]>;
  getStudentAssignments(studentId: number): Promise<Assignment[]>;
  getAssignment(id: number): Promise<Assignment | undefined>;
  createAssignment(assignment: InsertAssignment): Promise<Assignment>;
  updateAssignment(id: number, assignment: Partial<InsertAssignment>): Promise<Assignment>;
  deleteAssignment(id: number): Promise<boolean>;
  
  // Session operations
  getSessions(userId: number): Promise<Session[]>;
  getStudentSessions(studentId: number): Promise<Session[]>;
  getSessionsForDate(date: Date): Promise<Session[]>;
  getSession(id: number): Promise<Session | undefined>;
  createSession(session: InsertSession): Promise<Session>;
  updateSession(id: number, session: Partial<InsertSession>): Promise<Session>;
  deleteSession(id: number): Promise<boolean>;
  
  // Recurring schedule operations
  getRecurringSchedules(userId: number): Promise<RecurringSchedule[]>;
  getRecurringSchedulesBySchool(schoolId: number): Promise<RecurringSchedule[]>;
  getStudentRecurringSchedules(studentId: number): Promise<RecurringSchedule[]>;
  getRecurringSchedule(id: number): Promise<RecurringSchedule | undefined>;
  createRecurringSchedule(schedule: InsertRecurringSchedule): Promise<RecurringSchedule>;
  updateRecurringSchedule(id: number, schedule: Partial<InsertRecurringSchedule>): Promise<RecurringSchedule>;
  deleteRecurringSchedule(id: number): Promise<boolean>;
  generateSessionsFromRecurringSchedules(userId: number, startDate: Date, endDate: Date): Promise<Session[]>;
  
  // Session rescheduling
  requestReschedule(sessionId: number, newStartTime: Date, newEndTime: Date): Promise<Session>;
  approveReschedule(sessionId: number): Promise<Session>;
  
  // Practice session operations
  getPracticeSessions(userId: number): Promise<PracticeSession[]>;
  getStudentPracticeSessions(studentId: number): Promise<PracticeSession[]>;
  getActiveStudentPracticeSessions(): Promise<PracticeSession[]>;
  createPracticeSession(session: InsertPracticeSession): Promise<PracticeSession>;
  endPracticeSession(id: number): Promise<PracticeSession>;
  
  // Achievement operations
  getAchievementDefinitions(): Promise<AchievementDefinition[]>;
  getAchievementDefinition(id: number): Promise<AchievementDefinition | undefined>;
  getStudentAchievements(studentId: number): Promise<StudentAchievement[]>;
  getStudentAchievement(id: number): Promise<StudentAchievement | undefined>;
  markAchievementAsSeen(id: number): Promise<StudentAchievement>;
  checkAndAwardAchievements(studentId: number): Promise<StudentAchievement[]>;
  
  // Dashboard statistics
  getStudentCount(userId: number): Promise<number>;
  getSongCount(userId: number): Promise<number>;
  getLessonCount(userId: number): Promise<number>;
  getSessionCountThisWeek(userId: number): Promise<number>;
  
  // Lesson categories
  getLessonCategories(userId: number): Promise<any[]>;
  getLessonCategoriesBySchool(schoolId: number): Promise<any[]>;
  getLessonCategory(id: number): Promise<any | undefined>;
  createLessonCategory(category: any): Promise<any>;
  updateLessonCategory(id: number, category: any): Promise<any>;
  deleteLessonCategory(id: number): Promise<boolean>;
  
  // Search and content operations
  searchContent(userId: number, searchTerm: string): Promise<{lessons: Lesson[], songs: Song[]}>;
  getMessages(userId: number, userType?: string): Promise<any[]>;
  getMessage(id: number): Promise<any | undefined>;
  createMessage(message: any): Promise<any>;
  updateMessage(id: number, message: any): Promise<any>;
  deleteMessage(id: number): Promise<void>;
  getUnreadMessageCount(userId: number, userType: string): Promise<number>;
  
  // Performance monitoring
  getLessonPerformanceMetrics(userId: number): Promise<any>;
  getRealtimeStats(userId: number): Promise<any>;
  trackPerformanceEvent(userId: number, event: any): Promise<void>;

  // Groove Pattern operations
  getGroovePatterns(userId?: number): Promise<GroovePattern[]>;
  getGroovePattern(id: string): Promise<GroovePattern | undefined>;
  createGroovePattern(pattern: InsertGroovePattern): Promise<GroovePattern>;
  updateGroovePattern(id: string, pattern: Partial<InsertGroovePattern>): Promise<GroovePattern>;
  deleteGroovePattern(id: string): Promise<boolean>;
  searchGroovePatterns(searchTerm: string, difficulty?: string, tags?: string[]): Promise<GroovePattern[]>;

  // Multi-tenant school-scoped operations
  // School-scoped student access
  getStudentsBySchool(schoolId: number): Promise<Student[]>;
  getStudentsForTeacher(teacherId: number): Promise<Student[]>;
  
  // School-scoped lesson access
  getLessonsBySchool(schoolId: number): Promise<Lesson[]>;
  getLessonsForTeacher(teacherId: number): Promise<Lesson[]>;
  
  // School-scoped song access
  getSongsBySchool(schoolId: number): Promise<Song[]>;
  getSongsForTeacher(teacherId: number): Promise<Song[]>;
  
  // School-scoped assignment access
  getAssignmentsBySchool(schoolId: number): Promise<Assignment[]>;
  getAssignmentsForTeacher(teacherId: number): Promise<Assignment[]>;
  
  // School-scoped session access
  getSessionsBySchool(schoolId: number): Promise<Session[]>;
  getSessionsForTeacher(teacherId: number): Promise<Session[]>;
  
  // School-scoped groove pattern access
  getGroovePatternsBySchool(schoolId: number): Promise<GroovePattern[]>;
  getGroovePatternsForTeacher(teacherId: number): Promise<GroovePattern[]>;
  
  // School membership management
  createSchoolMembership(membership: InsertSchoolMembership): Promise<SchoolMembership>;
  getSchoolMemberships(schoolId: number): Promise<SchoolMembership[]>;
  getUserSchoolMemberships(userId: number): Promise<SchoolMembership[]>;
  updateSchoolMembership(id: number, membership: Partial<InsertSchoolMembership>): Promise<SchoolMembership>;
  deleteSchoolMembership(id: number): Promise<boolean>;
  
  // Enhanced school operations
  getSchoolById(schoolId: number): Promise<School | undefined>;
  getSchoolsByOwner(ownerId: number): Promise<School[]>;
  getTeachersBySchool(schoolId: number): Promise<User[]>;
  getStudentCountBySchool(schoolId: number): Promise<number>;
  getLessonCountBySchool(schoolId: number): Promise<number>;
  getSongCountBySchool(schoolId: number): Promise<number>;
  
  // Reports and analytics
  generateReportsData(userId: number, dateRange: number, reportType: string): Promise<any>;
  generateReportsDataBySchool(schoolId: number, dateRange: number, reportType: string): Promise<any>;
  getStudentProgressReports(userId: number): Promise<any[]>;
  getLessonCompletionStats(userId: number, dateRange: number): Promise<any[]>;
  getPopularLessons(userId: number, dateRange: number): Promise<any[]>;
  getUpcomingDeadlines(userId: number): Promise<any[]>;
  
  // Video operations - SECURE practice video management
  getPracticeVideo(videoId: string): Promise<any | undefined>;
  getPracticeVideos(userId: number): Promise<any[]>;
  getPracticeVideosBySchool(schoolId: number): Promise<any[]>;
  getStudentPracticeVideos(studentId: number): Promise<any[]>;
  createPracticeVideo(video: any): Promise<any>;
  updatePracticeVideo(videoId: string, video: Partial<any>): Promise<any>;
  deletePracticeVideo(videoId: string): Promise<boolean>;
  
  // Video comments - SECURE video feedback system
  getVideoComments(videoId: string): Promise<any[]>;
  createVideoComment(comment: any): Promise<any>;
  updateVideoComment(commentId: string, comment: Partial<any>): Promise<any>;
  deleteVideoComment(commentId: string): Promise<boolean>;

  // ========================================
  // SETTINGS API METHODS - CRITICAL PRODUCTION FIX
  // ========================================

  // User profile operations
  getCurrentUserProfile(userId: number): Promise<User | undefined>;
  updateCurrentUserProfile(userId: number, profileData: ProfileUpdateData): Promise<User>;

  // School settings operations
  getSchoolSettings(schoolId: number): Promise<School | undefined>;
  updateSchoolSettings(schoolId: number, settingsData: SchoolSettingsUpdateData): Promise<School>;

  // User notification settings operations
  getUserNotifications(userId: number): Promise<UserNotifications | undefined>;
  upsertUserNotifications(userId: number, settings: NotificationSettingsData): Promise<UserNotifications>;

  // User preference settings operations
  getUserPreferences(userId: number): Promise<UserPreferences | undefined>;
  upsertUserPreferences(userId: number, settings: PreferenceSettingsData): Promise<UserPreferences>;

  // Password change operations
  changeUserPassword(userId: number, currentPassword: string, newPassword: string): Promise<User>;

  // ========================================
  // NOTIFICATIONS SYSTEM - Birthday & Event Notifications
  // ========================================

  // Notification operations (actual notifications, not preferences)
  createNotification(notification: any): Promise<any>;
  getAllUserNotifications(userId: number, schoolId: number, limit?: number): Promise<any[]>;
  getUnreadNotificationCount(userId: number, schoolId: number): Promise<number>;
  markNotificationAsRead(notificationId: number, userId: number): Promise<boolean>;
  markAllNotificationsAsRead(userId: number, schoolId: number): Promise<number>;
  deleteOldNotifications(days: number): Promise<number>;
  
  // Birthday checking
  getStudentsWithBirthdayToday(): Promise<any[]>;
  getSchoolTeachers(schoolId: number): Promise<User[]>;

  // ========================================
  // POS IMPORT SYSTEM - Notations, Songs, Mappings, Drumblocks
  // ========================================

  // Notations
  getNotations(schoolId: number): Promise<Notation[]>;
  getNotation(id: number): Promise<Notation | undefined>;
  createNotation(notation: InsertNotation): Promise<Notation>;
  createNotationsBatch(notations: InsertNotation[]): Promise<BatchResult>;
  updateNotation(id: number, data: Partial<Notation>): Promise<Notation>;
  deleteNotation(id: number): Promise<boolean>;

  // POS Songs
  getPosSongs(schoolId: number): Promise<PosSong[]>;
  getPosSong(id: number): Promise<PosSong | undefined>;
  createPosSong(song: InsertPosSong): Promise<PosSong>;
  createPosSongsBatch(songs: InsertPosSong[]): Promise<BatchResult>;
  updatePosSong(id: number, data: Partial<PosSong>): Promise<PosSong>;
  deletePosSong(id: number): Promise<boolean>;

  // Song ↔ Notation Mappings
  getSongNotationMappings(schoolId: number): Promise<SongNotationMapping[]>;
  getSongNotationMapping(id: number): Promise<SongNotationMapping | undefined>;
  getMappingsForSong(songId: number): Promise<SongNotationMapping[]>;
  getMappingsForNotation(notationId: number): Promise<SongNotationMapping[]>;
  createSongNotationMapping(mapping: InsertSongNotationMapping): Promise<SongNotationMapping>;
  deleteSongNotationMapping(id: number): Promise<boolean>;

  // Drumblocks
  getDrumblocks(schoolId: number): Promise<Drumblock[]>;
  getDrumblock(id: number): Promise<Drumblock | undefined>;
  getDrumblockByBlockId(blockId: string, schoolId: number): Promise<Drumblock | undefined>;
  getDrumblocksByNotation(notationId: number): Promise<Drumblock[]>;
  createDrumblock(block: InsertDrumblock): Promise<Drumblock>;
  createDrumblocksBatch(blocks: InsertDrumblock[]): Promise<BatchResult>;
  updateDrumblock(id: number, data: Partial<Drumblock>): Promise<Drumblock>;
  deleteDrumblock(id: number): Promise<boolean>;

  // Import Logs
  createImportLog(log: InsertPosImportLog): Promise<PosImportLog>;
  updateImportLog(id: number, data: Partial<PosImportLog>): Promise<PosImportLog>;
  getImportLog(id: number): Promise<PosImportLog | undefined>;
  getImportLogs(schoolId: number, limit?: number): Promise<PosImportLog[]>;
  getImportLogByBatchId(batchId: string): Promise<PosImportLog | undefined>;
}

// In-memory storage implementation to use when database is unavailable
export class MemStorage implements IStorage {
  private users: Map<number, User> = new Map();
  private usersByUsername: Map<string, User> = new Map();
  private students: Map<number, Student> = new Map();
  private songs: Map<number, Song> = new Map();
  private lessons: Map<number, Lesson> = new Map();
  private assignments: Map<number, Assignment> = new Map();
  private sessionRecords: Map<number, Session> = new Map();
  private schools: Map<number, School> = new Map();
  private achievementDefinitions: Map<number, AchievementDefinition> = new Map();
  private studentAchievements: Map<number, StudentAchievement> = new Map();
  private recurringSchedules: Map<number, RecurringSchedule> = new Map();
  private practiceSessions: Map<number, PracticeSession> = new Map();
  private lessonCategories: Map<number, any> = new Map();
  private groovePatterns: Map<string, GroovePattern> = new Map();
  private schoolMemberships: Map<number, SchoolMembership> = new Map();
  private notifications: Map<number, Notification> = new Map();

  // POS Import System maps
  private posNotations: Map<number, Notation> = new Map();
  private posSongsData: Map<number, PosSong> = new Map();
  private songNotationMappings: Map<number, SongNotationMapping> = new Map();
  private drumblocksData: Map<number, Drumblock> = new Map();
  private posImportLogs: Map<number, PosImportLog> = new Map();

  // ID counters for proper ID generation
  private lessonIdCounter: number = 0;
  private studentIdCounter: number = 0;
  private songIdCounter: number = 0;
  private notationIdCounter: number = 0;
  private posSongIdCounter: number = 0;
  private mappingIdCounter: number = 0;
  private drumblockIdCounter: number = 0;
  private importLogIdCounter: number = 0;
  private notificationIdCounter: number = 0;
  
  sessionStore: session.Store;
  
  constructor() {
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000, // prune expired entries every 24h
    });
    
    // CREATE FRESH ACCOUNT FOR COMPLETE RESET - DISABLED TO PRESERVE STEFAN'S DATA
    // this.createFreshAccount();
    
    // Execute comprehensive import
    // AUTOMATIC IMPORT DISABLED BY USER REQUEST - July 15, 2025
    // this.executeComprehensiveImport();
    
    // Execute student import
    // STUDENT IMPORT DISABLED FOR COMPLETE RESET - July 15, 2025
    // this.executeStudentImport();
  }
  
  private createFreshAccount() {
    console.log("🆕 Creating fresh drumschool account...");
    
    // Initialize sample groove patterns
    this.initializeSampleGroovePatterns();
    
    // Create fresh user account
    const freshUser: User = {
      id: 1,
      schoolId: 1,
      username: "drumschoolstefanvandebrug",
      password: "$2b$10$ojvqFYW5rzUo23dvVL5oUOlsS3Y7I2Mzy50kEPioUWP4gPAeCXZL.", // drumschool123
      name: "Stefan van de Brug",
      email: "stefan@drumschool.com",
      role: "school_owner",
      instruments: "Drums & Percussion",
      avatar: null,
      bio: null
    };
    
    this.users.set(freshUser.id, freshUser);
    this.usersByUsername.set(freshUser.username, freshUser);
    console.log("✅ Fresh user account created");
    
    // Also create a simpler account for easy testing
    const simpleUser: User = {
      id: 2,
      schoolId: 1,
      username: "drumschoolstefan",
      password: "$2b$10$ojvqFYW5rzUo23dvVL5oUOlsS3Y7I2Mzy50kEPioUWP4gPAeCXZL.", // drumschool123
      name: "Stefan",
      email: "stefan@test.com",
      role: "school_owner",
      instruments: "Drums & Percussion",
      avatar: null,
      bio: null
    };
    
    this.users.set(simpleUser.id, simpleUser);
    this.usersByUsername.set(simpleUser.username, simpleUser);
    console.log("✅ Simple user account created");
    
    // Create fresh school
    const freshSchool: School = {
      id: 1,
      name: "Stefan van de Brug Drum School",
      address: "Music Street 1, Amsterdam",
      city: "Amsterdam",
      phone: "+31 20 123 4567",
      website: "https://drumschool.com",
      instruments: "Drums, Percussion",
      description: "Professional drum instruction",
      logo: null
    };
    
    this.schools.set(freshSchool.id, freshSchool);
    console.log("✅ Fresh school created");
    console.log("🎯 Account ready - completely empty except for owner");
  }

  private initializeSampleGroovePatterns() {
    console.log("🥁 Initializing sample groove patterns...");
    
    // Authentic GrooveScribe patterns based on the source code
    const samplePatterns: GroovePattern[] = [
      {
        id: "basic-rock-16th",
        schoolId: "1",
        title: "Basic Rock - 16th Notes",
        description: "Essential 16th note rock pattern perfect for beginners learning steady hi-hat work",
        grooveData: "TimeSig=4/4&Div=16&Tempo=120&Measures=1&H=|xxxxxxxxxxxxxxxx|&S=|----O-------O---|&K=|o-------o-------|",
        bpm: 120,
        bars: 1,
        timeSignature: "4/4",
        difficulty: "beginner",
        tags: ["rock", "basic", "16th-notes", "hi-hat"],
        categoryId: null,
        createdBy: 1,
        isPublic: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "jazz-shuffle-triplet",
        schoolId: "1", 
        title: "Jazz Shuffle",
        description: "Classic jazz shuffle with triplet feel, ride cymbal pattern, and ghost notes",
        grooveData: "TimeSig=4/4&Div=12&Tempo=100&Measures=1&H=|r--r-rr--r-r|&S=|g-gO-gg-gO-g|&K=|o--X--o--X--|",
        bpm: 100,
        bars: 1,
        timeSignature: "4/4",
        difficulty: "intermediate",
        tags: ["jazz", "shuffle", "swing", "triplets", "ride"],
        categoryId: null,
        createdBy: 1,
        isPublic: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "train-beat-advanced",
        schoolId: "1",
        title: "Train Beat",
        description: "Advanced train beat with complex ghost note patterns and cross-stick work",
        grooveData: "TimeSig=4/4&Div=16&Swing=0&Tempo=95&Measures=1&H=|----------------|&S=|ggOgggOgggOggOOg|&K=|o-x-o-x-o-x-o-x-|",
        bpm: 95,
        bars: 1,
        timeSignature: "4/4",
        difficulty: "advanced",
        tags: ["advanced", "train-beat", "ghost-notes", "cross-stick"],
        categoryId: null,
        createdBy: 1,
        isPublic: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "bossa-nova-pattern",
        schoolId: "1",
        title: "Bossa Nova",
        description: "Classic Brazilian bossa nova pattern with subtle cross-stick and kick variations",
        grooveData: "TimeSig=4/4&Div=8&Tempo=140&Measures=2&H=|xxxxxxxx|xxxxxxxx|&S=|x-x--x-x|-x--x-x-|&K=|o-xoo-xo|o-xoo-xo|",
        bpm: 140,
        bars: 2,
        timeSignature: "4/4",
        difficulty: "intermediate",
        tags: ["bossa-nova", "brazilian", "cross-stick", "latin"],
        categoryId: null,
        createdBy: 1,
        isPublic: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "songo-cuban-advanced",
        schoolId: "1",
        title: "Cuban Songo",
        description: "Complex Cuban songo pattern with intricate snare work and authentic groove feel",
        grooveData: "TimeSig=4/4&Div=16&Tempo=80&Measures=1&H=|x---x---x---x---|&S=|--O--g-O-gg--g-g|&K=|---o--o----o--o-|",
        bpm: 80,
        bars: 1,
        timeSignature: "4/4",
        difficulty: "advanced",
        tags: ["songo", "cuban", "latin", "advanced", "snare-work"],
        categoryId: null,
        createdBy: 1,
        isPublic: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "basic-rock-8th",
        schoolId: "1",
        title: "8th Note Rock",
        description: "Fundamental 8th note rock beat - the foundation pattern every drummer should master",
        grooveData: "TimeSig=4/4&Div=8&Tempo=80&Measures=1&H=|xxxxxxxx|&S=|--O---O-|&K=|o---o---|",
        bpm: 80,
        bars: 1,
        timeSignature: "4/4",
        difficulty: "beginner",
        tags: ["rock", "basic", "8th-notes", "foundation"],
        categoryId: null,
        createdBy: 1,
        isPublic: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
    ];
    
    // Store all sample patterns
    samplePatterns.forEach(pattern => {
      this.groovePatterns.set(pattern.id, pattern);
    });
    
    console.log(`✅ Initialized ${samplePatterns.length} sample groove patterns`);
  }

  private loadSampleSongs() {
    // Clean state - no sample songs loaded
    console.log("📝 Sample songs disabled for clean state");
  }
  
  private async importAllSongs() {
    // Disabled - no song import for clean state
    console.log("🎵 Song import disabled for clean state");
  }

  private async importStudentsFromCSV() {
    // Disabled - no student import for clean state
    console.log("📝 Student import disabled for clean state");
  }

  private async executeComprehensiveImport() {
    try {
      console.log("🚀 Starting comprehensive import system...");
      
      // Dynamic import for ES modules - disabled for clean state
      console.log("📋 Comprehensive import disabled for clean state");
      return; // Skip the import entirely
      
      // Import functionality disabled for clean state
      console.log(`📚 Import functionality disabled for clean production state`);
      
      console.log("✅ Comprehensive import completed successfully!");
      
    } catch (error) {
      console.log("⚠️ Could not execute comprehensive import:", String(error));
      console.log("📋 System ready with empty categories");
    }
  }

  private async executeStudentImport() {
    try {
      console.log("🧑‍🎓 Starting student import system...");
      
      // Dynamic import for ES modules - disabled for clean state
      console.log("📋 Student import disabled for clean state");
      return; // Skip the import entirely
      
      // Student import functionality disabled for clean state
      console.log(`🧑‍🎓 Student import functionality disabled for clean production state`);
      
      console.log("✅ Student import completed successfully!");
      
    } catch (error) {
      console.log("⚠️ Could not execute student import:", error instanceof Error ? error.message : String(error));
      console.log("📋 System ready without students");
    }
  }

  private initializeLessonCategories() {
    const defaultCategories = [
      {
        id: 1,
        name: "Rhythm Patterns",
        description: "Essential rhythm patterns and basic beats",
        color: "#3B82F6",
        icon: "Music",
        userId: null, // No user assigned - available for any new user
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 2,
        name: "Fills & Accents",
        description: "Dynamic fills and accent patterns",
        color: "#EF4444",
        icon: "Zap",
        userId: null,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 3,
        name: "Limb Independence",
        description: "Coordination exercises for independent limb control",
        color: "#10B981",
        icon: "Target",
        userId: null,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 4,
        name: "Linear Playing",
        description: "Non-overlapping linear drumming concepts",
        color: "#F59E0B",
        icon: "Brain",
        userId: null,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 5,
        name: "Basics & Fundamentals",
        description: "Core drumming techniques and fundamentals",
        color: "#8B5CF6",
        icon: "BookOpen",
        userId: null,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 6,
        name: "Hi-Hat Techniques",
        description: "Advanced hi-hat control and techniques",
        color: "#EC4899",
        icon: "Star",
        userId: null,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 7,
        name: "Time Signatures",
        description: "Odd time signatures and metric modulation",
        color: "#06B6D4",
        icon: "Palette",
        userId: null,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 8,
        name: "Advanced Techniques",
        description: "Complex patterns and professional techniques",
        color: "#84CC16",
        icon: "Settings",
        userId: null,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    defaultCategories.forEach(category => {
      this.lessonCategories.set(category.id, category);
    });

    console.log("✅ Initialized clean lesson categories (no user assignments)");
  }
  
  // School methods
  async getSchools(): Promise<School[]> {
    return Array.from(this.schools.values());
  }
  
  async getSchool(id: number): Promise<School | undefined> {
    return this.schools.get(id);
  }
  
  async createSchool(school: InsertSchool): Promise<School> {
    const id = this.schools.size + 1;
    const newSchool = { ...school, id } as School;
    this.schools.set(id, newSchool);
    return newSchool;
  }
  
  async updateSchool(id: number, schoolData: Partial<InsertSchool>): Promise<School> {
    const school = this.schools.get(id);
    if (!school) throw new Error("School not found");
    
    const updatedSchool = { ...school, ...schoolData };
    this.schools.set(id, updatedSchool);
    return updatedSchool;
  }
  
  async deleteSchool(id: number): Promise<boolean> {
    return this.schools.delete(id);
  }
  
  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }
  
  async getUserByUsername(username: string): Promise<User | undefined> {
    return this.usersByUsername.get(username);
  }

  async getUserByUsernameForAuth(username: string): Promise<User | undefined> {
    // For MemStorage, this is the same as getUserByUsername since we need password for auth
    return this.usersByUsername.get(username);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    for (const user of this.users.values()) {
      if (user.email === email) {
        return user;
      }
    }
    return undefined;
  }
  
  async createUser(userData: InsertUser): Promise<User> {
    const id = this.users.size + 1;
    const newUser = { ...userData, id } as User;
    this.users.set(id, newUser);
    this.usersByUsername.set(newUser.username, newUser);
    return newUser;
  }
  
  async updateUser(id: number, userData: Partial<InsertUser>): Promise<User> {
    const user = this.users.get(id);
    if (!user) throw new Error("User not found");
    
    const updatedUser = { ...user, ...userData };
    
    // Update in both maps
    this.users.set(id, updatedUser);
    if (updatedUser.username) {
      this.usersByUsername.set(updatedUser.username, updatedUser);
    }
    
    return updatedUser;
  }
  
  async deleteUser(id: number): Promise<boolean> {
    const user = this.users.get(id);
    if (user) {
      this.usersByUsername.delete(user.username);
    }
    return this.users.delete(id);
  }
  
  async getUsersBySchool(schoolId: number): Promise<User[]> {
    return Array.from(this.users.values()).filter(user => user.schoolId === schoolId);
  }
  
  async getUsersByRole(role: string): Promise<User[]> {
    return Array.from(this.users.values()).filter(user => user.role === role);
  }
  
  async getTeachers(): Promise<User[]> {
    return Array.from(this.users.values()).filter(user => 
      user.role === 'teacher' || user.role === 'school_owner'
    );
  }
  
  // Student methods
  async getStudents(userId: number): Promise<Student[]> {
    return Array.from(this.students.values()).filter(student => student.userId === userId);
  }
  
  async getStudent(id: number): Promise<Student | undefined> {
    return this.students.get(id);
  }
  
  async createStudent(student: InsertStudent): Promise<Student> {
    const id = ++this.studentIdCounter;
    const newStudent = { ...student, id } as Student;
    this.students.set(id, newStudent);
    return newStudent;
  }
  
  async updateStudent(id: number, studentData: Partial<InsertStudent>): Promise<Student> {
    const student = this.students.get(id);
    if (!student) throw new Error("Student not found");
    
    const updatedStudent = { ...student, ...studentData };
    this.students.set(id, updatedStudent);
    return updatedStudent;
  }
  
  async deleteStudent(id: number): Promise<boolean> {
    return this.students.delete(id);
  }
  
  // Implement other methods with stub implementations for simplicity
  async getSongs(userId: number): Promise<Song[]> { 
    return Array.from(this.songs.values()).filter(song => song.userId === userId);
  }
  async getSong(id: number): Promise<Song | undefined> { 
    return this.songs.get(id);
  }
  async createSong(song: InsertSong): Promise<Song> { 
    console.log("Creating song with data:", song);
    const id = ++this.songIdCounter;
    const newSong = { 
      ...song, 
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
      contentBlocks: song.contentBlocks || "[]"
    } as Song;
    
    this.songs.set(id, newSong);
    console.log("Song created successfully:", newSong);
    return newSong;
  }
  async updateSong(id: number, song: Partial<InsertSong>): Promise<Song> { 
    const existing = this.songs.get(id);
    if (!existing) throw new Error("Song not found");
    
    const updated = { ...existing, ...song, updatedAt: new Date() };
    this.songs.set(id, updated);
    console.log("Song updated successfully:", updated);
    return updated;
  }
  async deleteSong(id: number): Promise<boolean> { 
    return this.songs.delete(id);
  }
  
  async getLessons(userId: number): Promise<Lesson[]> { 
    console.log(`Getting lessons for user ${userId}, total lessons in memory: ${this.lessons.size}`);
    const userLessons = Array.from(this.lessons.values()).filter(lesson => lesson.userId === userId);
    console.log(`Found ${userLessons.length} lessons for user ${userId}`);
    return userLessons;
  }
  async getLesson(id: number): Promise<Lesson | undefined> { 
    console.log(`Getting lesson ${id}, total lessons in memory: ${this.lessons.size}`);
    const lesson = this.lessons.get(id);
    console.log(`Lesson ${id} found:`, lesson ? 'YES' : 'NO');
    if (lesson) {
      console.log(`Lesson ${id} contentBlocks:`, lesson.contentBlocks);
    }
    return lesson;
  }
  async createLesson(lesson: InsertLesson & { _category?: string }): Promise<Lesson> { 
    console.log("Creating lesson with data:", lesson);
    const id = ++this.lessonIdCounter;
    const newLesson = { 
      ...lesson, 
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
      contentBlocks: lesson.contentBlocks || "[]"
    } as Lesson & { _category?: string };
    
    this.lessons.set(id, newLesson);
    console.log("Lesson created successfully:", newLesson);
    return newLesson;
  }
  async updateLesson(id: number, lesson: Partial<InsertLesson>): Promise<Lesson> { 
    const existing = this.lessons.get(id);
    if (!existing) throw new Error("Lesson not found");
    
    const updated = { ...existing, ...lesson };
    this.lessons.set(id, updated);
    return updated;
  }
  async deleteLesson(id: number): Promise<boolean> { 
    return this.lessons.delete(id);
  }
  
  async getAssignments(userId: number): Promise<Assignment[]> { return []; }
  async getStudentAssignments(studentId: number): Promise<Assignment[]> { return []; }
  async getAssignment(id: number): Promise<Assignment | undefined> { return undefined; }
  async createAssignment(assignment: InsertAssignment): Promise<Assignment> { return { id: 1, ...assignment } as Assignment; }
  async updateAssignment(id: number, assignment: Partial<InsertAssignment>): Promise<Assignment> { return { id, ...assignment } as Assignment; }
  async deleteAssignment(id: number): Promise<boolean> { return true; }
  
  async getSessions(userId: number): Promise<Session[]> { return []; }
  async getStudentSessions(studentId: number): Promise<Session[]> { return []; }
  async getSession(id: number): Promise<Session | undefined> { return undefined; }
  async createSession(session: InsertSession): Promise<Session> { return { id: 1, ...session } as Session; }
  async updateSession(id: number, session: Partial<InsertSession>): Promise<Session> { return { id, ...session } as Session; }
  async deleteSession(id: number): Promise<boolean> { return true; }
  
  async getRecurringSchedules(userId: number): Promise<RecurringSchedule[]> {
    return Array.from(this.recurringSchedules.values()).filter(schedule => schedule.userId === userId);
  }
  
  async getRecurringSchedulesBySchool(schoolId: number): Promise<RecurringSchedule[]> {
    return Array.from(this.recurringSchedules.values()).filter(schedule => schedule.schoolId === schoolId);
  }
  
  async getStudentRecurringSchedules(studentId: number): Promise<RecurringSchedule[]> {
    return Array.from(this.recurringSchedules.values()).filter(schedule => schedule.studentId === studentId);
  }
  
  async getRecurringSchedule(id: number): Promise<RecurringSchedule | undefined> {
    return this.recurringSchedules.get(id);
  }
  
  async createRecurringSchedule(schedule: InsertRecurringSchedule): Promise<RecurringSchedule> {
    const id = this.recurringSchedules.size + 1;
    const newSchedule = { ...schedule, id } as RecurringSchedule;
    this.recurringSchedules.set(id, newSchedule);
    return newSchedule;
  }
  
  async updateRecurringSchedule(id: number, schedule: Partial<InsertRecurringSchedule>): Promise<RecurringSchedule> {
    const existing = this.recurringSchedules.get(id);
    if (!existing) throw new Error("Recurring schedule not found");
    
    const updated = { ...existing, ...schedule };
    this.recurringSchedules.set(id, updated);
    return updated;
  }
  
  async deleteRecurringSchedule(id: number): Promise<boolean> {
    return this.recurringSchedules.delete(id);
  }
  
  async generateSessionsFromRecurringSchedules(userId: number, startDate: Date, endDate: Date): Promise<Session[]> {
    const schedules = await this.getRecurringSchedules(userId);
    const sessions: Session[] = [];
    
    for (const schedule of schedules) {
      const generatedSessions = this.generateSessionsForRecurringSchedule(schedule, startDate, endDate);
      sessions.push(...generatedSessions);
    }
    
    return sessions;
  }
  
  private generateSessionsForRecurringSchedule(schedule: RecurringSchedule, startDate: Date, endDate: Date): Session[] {
    const sessions: Session[] = [];
    const current = new Date(startDate);
    
    while (current <= endDate) {
      // Check if current day matches the recurring schedule day
      const dayOfWeek = current.getDay(); // 0 = Sunday, 1 = Monday, etc.
      
      if (dayOfWeek === parseInt(schedule.dayOfWeek.toString())) {
        const sessionId = this.sessionRecords.size + sessions.length + 1;
        const sessionDate = new Date(current);
        
        // Set the time from the schedule
        const [hours, minutes] = schedule.startTime.split(':').map(Number);
        sessionDate.setHours(hours, minutes, 0, 0);
        
        const endTime = new Date(sessionDate);
        const [endHours, endMinutes] = schedule.endTime.split(':').map(Number);
        endTime.setHours(endHours, endMinutes, 0, 0);
        
        sessions.push({
          id: sessionId,
          userId: schedule.userId,
          studentId: schedule.studentId,
          title: `Lesson with Student ${schedule.studentId}`,
          startTime: sessionDate,
          endTime: endTime,
          notes: schedule.notes
        });
      }
      
      current.setDate(current.getDate() + 1);
    }
    
    return sessions;
  }
  
  async requestReschedule(sessionId: number, newStartTime: Date, newEndTime: Date): Promise<Session> { 
    const session = this.sessionRecords.get(sessionId);
    if (!session) throw new Error("Session not found");
    const updated = { ...session, startTime: newStartTime, endTime: newEndTime };
    this.sessionRecords.set(sessionId, updated);
    return updated;
  }
  async approveReschedule(sessionId: number): Promise<Session> { 
    const session = this.sessionRecords.get(sessionId);
    if (!session) throw new Error("Session not found");
    return session;
  }
  
  async getPracticeSessions(userId: number): Promise<PracticeSession[]> {
    return Array.from(this.practiceSessions.values()).filter(session => {
      const student = this.students.get(session.studentId);
      return student && student.userId === userId;
    });
  }

  async getSessionsForDate(date: Date): Promise<Session[]> {
    const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const schedules = Array.from(this.recurringSchedules.values())
      .filter(schedule => parseInt(schedule.dayOfWeek.toString()) === dayOfWeek);
    
    return schedules.map(schedule => {
      const sessionDate = new Date(date);
      const [hours, minutes] = schedule.startTime.split(':').map(Number);
      sessionDate.setHours(hours, minutes, 0, 0);
      
      const endTime = new Date(sessionDate);
      const [endHours, endMinutes] = schedule.endTime.split(':').map(Number);
      endTime.setHours(endHours, endMinutes, 0, 0);
      
      return {
        id: schedule.id,
        userId: schedule.userId,
        studentId: schedule.studentId,
        title: `Lesson with Student ${schedule.studentId}`,
        startTime: sessionDate,
        endTime: endTime,
        notes: schedule.notes,
        location: schedule.location,
        isRescheduled: false,
        originalStartTime: null,
        rescheduleRequestSent: false,
        rescheduleApproved: false
      };
    });
  }

  async getStudentLessons(studentId: number): Promise<any[]> {
    // Get lessons assigned to this student
    // In MusicDott 1.0, this would be from POS_NotatieStudent table
    // For now, return a subset of lessons as placeholder
    const allLessons = Array.from(this.lessons.values());
    return allLessons.slice(0, 5); // Return first 5 lessons as example
  }

  async getStudentSongs(studentId: number): Promise<any[]> {
    // Get songs assigned to this student
    // In MusicDott 1.0, this would be from POS_SongsStudent table
    // For now, return a subset of songs as placeholder
    const allSongs = Array.from(this.songs.values());
    return allSongs.slice(0, 5); // Return first 5 songs as example
  }

  async getStudentLessonProgress(studentId: number): Promise<any[]> {
    // Get lesson progress for this student
    // In MusicDott 1.0, this would track completion and time spent
    const studentLessons = await this.getStudentLessons(studentId);
    
    return studentLessons.map(lesson => ({
      lessonId: lesson.id,
      title: lesson.title,
      category: lesson.categoryName || 'General',
      progress: Math.floor(Math.random() * 100), // Random progress for demo
      lastAccessed: new Date().toISOString(),
      timeSpent: Math.floor(Math.random() * 3600), // Random time in seconds
      status: Math.random() > 0.5 ? 'completed' : 'in_progress'
    }));
  }

  async getStudentSongProgress(studentId: number): Promise<any[]> {
    // Get song progress for this student
    // In MusicDott 1.0, this would track practice sessions
    const studentSongs = await this.getStudentSongs(studentId);
    
    return studentSongs.map(song => ({
      songId: song.id,
      title: song.title,
      artist: song.composer || 'Unknown Artist',
      progress: Math.floor(Math.random() * 100), // Random progress for demo
      lastPracticed: new Date().toISOString(),
      practiceCount: Math.floor(Math.random() * 20) + 1,
      status: Math.random() > 0.7 ? 'mastered' : 'learning'
    }));
  }

  async getStudentAchievementsDisplay(studentId: number): Promise<any[]> {
    // Get achievements for this student (display format)
    // In MusicDott 1.0, this would be from achievement tracking system
    const achievements = [
      {
        id: 1,
        title: "First Lesson",
        description: "Completed your first lesson",
        icon: "🎓",
        earnedDate: "2024-01-15",
        category: "milestone"
      },
      {
        id: 2,
        title: "Practice Master",
        description: "Practiced 10 songs",
        icon: "🎵",
        earnedDate: "2024-02-01",
        category: "practice"
      },
      {
        id: 3,
        title: "Rhythm Pro",
        description: "Mastered basic rhythm patterns",
        icon: "🥁",
        earnedDate: "2024-02-15",
        category: "skill"
      }
    ];
    
    return achievements;
  }
  
  async getStudentPracticeSessions(studentId: number): Promise<PracticeSession[]> {
    return Array.from(this.practiceSessions.values()).filter(session => session.studentId === studentId);
  }
  
  async getActiveStudentPracticeSessions(): Promise<PracticeSession[]> {
    return Array.from(this.practiceSessions.values()).filter(session => !session.endTime);
  }
  
  async createPracticeSession(session: InsertPracticeSession): Promise<PracticeSession> {
    const id = this.practiceSessions.size + 1;
    const newSession = { ...session, id } as PracticeSession;
    this.practiceSessions.set(id, newSession);
    return newSession;
  }
  
  async endPracticeSession(id: number): Promise<PracticeSession> {
    const session = this.practiceSessions.get(id);
    if (!session) throw new Error("Practice session not found");
    
    const updatedSession = { ...session, endTime: new Date() };
    this.practiceSessions.set(id, updatedSession);
    return updatedSession;
  }
  
  async getAchievementDefinitions(): Promise<AchievementDefinition[]> { return []; }
  async getAchievementDefinition(id: number): Promise<AchievementDefinition | undefined> { return undefined; }
  async getStudentAchievements(studentId: number): Promise<StudentAchievement[]> { 
    return Array.from(this.studentAchievements.values()).filter(achievement => achievement.studentId === studentId);
  }
  async getStudentAchievement(id: number): Promise<StudentAchievement | undefined> { return undefined; }
  async markAchievementAsSeen(id: number): Promise<StudentAchievement> { 
    const achievement = this.studentAchievements.get(id);
    if (!achievement) throw new Error("Achievement not found");
    const updated = { ...achievement, isVisible: true };
    this.studentAchievements.set(id, updated);
    return updated;
  }
  async checkAndAwardAchievements(studentId: number): Promise<StudentAchievement[]> { return []; }
  
  async getStudentCount(userId: number): Promise<number> { return this.getStudents(userId).then(students => students.length); }
  async getSongCount(userId: number): Promise<number> { 
    const userSongs = Array.from(this.songs.values()).filter(song => song.userId === userId);
    return userSongs.length;
  }
  async getLessonCount(userId: number): Promise<number> { 
    return Array.from(this.lessons.values()).filter(lesson => lesson.userId === userId).length;
  }
  async getSessionCountThisWeek(userId: number): Promise<number> { return 0; }
  
  async getSongsByLetter(userId: number, letter: string): Promise<Song[]> {
    console.log(`getSongsByLetter called with userId: ${userId}, letter: ${letter}`);
    console.log(`Total songs in memory: ${this.songs.size}`);
    
    const userSongs = Array.from(this.songs.values()).filter(song => song.userId === userId);
    console.log(`Songs for user ${userId}: ${userSongs.length}`);
    
    const filteredSongs = userSongs.filter(song => {
      const firstLetter = (song.composer || song.title).charAt(0).toUpperCase();
      return firstLetter === letter.toUpperCase();
    });
    
    console.log(`Songs starting with "${letter}": ${filteredSongs.length}`);
    console.log(`First few songs:`, filteredSongs.slice(0, 3).map(s => ({title: s.title, composer: s.composer})));
    
    return filteredSongs;
  }
  
  async searchContent(userId: number, searchTerm: string): Promise<{lessons: Lesson[], songs: Song[]}> {
    const userSongs = Array.from(this.songs.values()).filter(song => song.userId === userId);
    const searchTermLower = searchTerm.toLowerCase();
    
    const filteredSongs = userSongs.filter(song => 
      song.title.toLowerCase().includes(searchTermLower) ||
      (song.composer && song.composer.toLowerCase().includes(searchTermLower)) ||
      (song.genre && song.genre.toLowerCase().includes(searchTermLower)) ||
      (song.instrument && song.instrument.toLowerCase().includes(searchTermLower))
    );
    
    return { lessons: [], songs: filteredSongs };
  }

  // Performance monitoring methods
  async getLessonPerformanceMetrics(userId: number): Promise<any> {
    const userLessons = Array.from(this.lessons.values()).filter(lesson => lesson.userId === userId);
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    // Calculate metrics
    const totalLessons = userLessons.length;
    const averageCreationTime = 1200; // Mock: 1.2 seconds average
    const successRate = Math.max(95, 100 - (totalLessons > 50 ? 2 : 0)); // Slightly lower success rate for heavy users
    const failureRate = 100 - successRate;
    
    // Generate recent activity (mock data)
    const recentActivity = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const lessonsCreated = Math.floor(Math.random() * 5) + (i === 0 ? 2 : 0); // More lessons today
      recentActivity.push({
        date: date.toISOString(),
        lessonsCreated,
        averageTime: 1000 + Math.random() * 1000
      });
    }
    
    // Content block distribution
    const contentBlockDistribution = [
      { type: 'text', count: Math.floor(totalLessons * 0.8), percentage: 80 },
      { type: 'video', count: Math.floor(totalLessons * 0.4), percentage: 40 },
      { type: 'groove', count: Math.floor(totalLessons * 0.6), percentage: 60 },
      { type: 'pdf', count: Math.floor(totalLessons * 0.2), percentage: 20 },
      { type: 'external_link', count: Math.floor(totalLessons * 0.1), percentage: 10 }
    ];
    
    // User engagement
    const userEngagement = {
      activeUsers: 1,
      lessonsPerUser: totalLessons,
      topCategories: ['Rhythm Patterns', 'Fills & Accents', 'Advanced Techniques']
    };
    
    return {
      totalLessons,
      averageCreationTime,
      successRate,
      failureRate,
      recentActivity,
      contentBlockDistribution,
      userEngagement
    };
  }

  async getRealtimeStats(userId: number): Promise<any> {
    return {
      activeSessions: 1,
      lessonsToday: Math.floor(Math.random() * 3) + 1,
      avgResponseTime: 150 + Math.floor(Math.random() * 100)
    };
  }

  async trackPerformanceEvent(userId: number, event: any): Promise<void> {
    // In a real implementation, this would store performance tracking data
    console.log(`Performance event tracked for user ${userId}:`, event);
  }

  // Groove Pattern operations
  async getGroovePatterns(userId?: number): Promise<GroovePattern[]> {
    // Return all patterns or patterns created by specific user
    const patterns = Array.from(this.groovePatterns.values());
    if (userId) {
      return patterns.filter(pattern => pattern.createdBy === userId || pattern.isPublic);
    }
    return patterns.filter(pattern => pattern.isPublic);
  }

  async getGroovePattern(id: string): Promise<GroovePattern | undefined> {
    return this.groovePatterns.get(id);
  }

  async createGroovePattern(pattern: InsertGroovePattern): Promise<GroovePattern> {
    const id = `groove_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newPattern: GroovePattern = {
      ...pattern,
      id,
      description: pattern.description || null,
      schoolId: pattern.schoolId || null,
      bpm: pattern.bpm || null,
      difficulty: pattern.difficulty || null,
      tags: pattern.tags || null,
      categoryId: pattern.categoryId || null,
      createdBy: pattern.createdBy || null,
      isPublic: pattern.isPublic || null,
      bars: pattern.bars || null,
      timeSignature: pattern.timeSignature || null,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    this.groovePatterns.set(id, newPattern);
    return newPattern;
  }

  async updateGroovePattern(id: string, pattern: Partial<InsertGroovePattern>): Promise<GroovePattern> {
    const existing = this.groovePatterns.get(id);
    if (!existing) {
      throw new Error(`Groove pattern ${id} not found`);
    }
    
    const updated: GroovePattern = {
      ...existing,
      ...pattern,
      updatedAt: new Date(),
    };
    
    this.groovePatterns.set(id, updated);
    return updated;
  }

  async deleteGroovePattern(id: string): Promise<boolean> {
    return this.groovePatterns.delete(id);
  }

  async searchGroovePatterns(
    searchTerm: string, 
    difficulty?: string, 
    tags?: string[]
  ): Promise<GroovePattern[]> {
    const patterns = Array.from(this.groovePatterns.values());
    
    return patterns.filter(pattern => {
      // Public patterns only for search
      if (!pattern.isPublic) return false;
      
      // Search in title and description
      const matchesSearch = searchTerm === '' || 
        pattern.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        pattern.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        pattern.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
      
      // Filter by difficulty
      const matchesDifficulty = !difficulty || difficulty === 'all' || pattern.difficulty === difficulty;
      
      // Filter by tags
      const matchesTags = !tags || tags.length === 0 || 
        tags.some(tag => pattern.tags?.includes(tag));
      
      return matchesSearch && matchesDifficulty && matchesTags;
    });
  }
  
  async getMessages(userId: number): Promise<any[]> { return []; }
  async getMessage(id: number): Promise<any | undefined> { return undefined; }
  async createMessage(message: any): Promise<any> { return { id: 1, ...message }; }
  async updateMessage(id: number, message: any): Promise<any> { return { id, ...message }; }
  async deleteMessage(id: number): Promise<void> { }
  async getUnreadMessageCount(userId: number, userType: string): Promise<number> { return 0; }
  
  // Lesson Categories
  async getLessonCategories(userId: number): Promise<any[]> {
    return Array.from(this.lessonCategories.values()).filter(category => category.userId === userId);
  }
  async getLessonCategoriesBySchool(schoolId: number): Promise<any[]> {
    return Array.from(this.lessonCategories.values()).filter(category => category.schoolId === schoolId);
  }
  async getLessonCategory(id: number): Promise<any | undefined> { 
    return this.lessonCategories.get(id);
  }
  async createLessonCategory(category: any): Promise<any> { 
    const id = this.lessonCategories.size + 1;
    const newCategory = { ...category, id };
    this.lessonCategories.set(id, newCategory);
    return newCategory;
  }
  async updateLessonCategory(id: number, category: any): Promise<any> { 
    const existing = this.lessonCategories.get(id);
    if (!existing) throw new Error("Lesson category not found");
    
    const updated = { ...existing, ...category };
    this.lessonCategories.set(id, updated);
    return updated;
  }
  async deleteLessonCategory(id: number): Promise<boolean> { 
    return this.lessonCategories.delete(id);
  }
  
  // Dashboard methods for MusicDott 1.0 compatibility
  async getRecentSongs(limit: number = 6): Promise<any[]> {
    const songs = Array.from(this.songs.values());
    return songs
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit)
      .map(song => ({
        id: song.id,
        artist: song.composer || 'Unknown Artist',
        title: song.title,
        modifiedDate: new Date(song.updatedAt).toLocaleDateString('nl-NL'),
        hasPDF: song.contentBlocks && typeof song.contentBlocks === 'string' ? JSON.parse(song.contentBlocks).some((block: any) => block.type === 'pdf') : false,
        hasNotation: song.contentBlocks && typeof song.contentBlocks === 'string' ? JSON.parse(song.contentBlocks).some((block: any) => block.type === 'groovescribe') : false,
        hasMuseScore: song.contentBlocks && typeof song.contentBlocks === 'string' ? JSON.parse(song.contentBlocks).some((block: any) => block.type === 'musescore') : false,
      }));
  }

  async getRecentLessons(limit: number = 6): Promise<any[]> {
    const lessons = Array.from(this.lessons.values());
    const categories = Array.from(this.lessonCategories.values());
    const categoryMap = new Map(categories.map(cat => [cat.id, cat.name]));
    
    return lessons
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit)
      .map(lesson => ({
        id: lesson.id,
        title: lesson.title,
        category: lesson.categoryId ? categoryMap.get(lesson.categoryId) || 'Uncategorized' : 'Uncategorized',
        modifiedDate: new Date(lesson.updatedAt).toLocaleDateString('nl-NL'),
        hasPDF: lesson.contentBlocks && typeof lesson.contentBlocks === 'string' ? JSON.parse(lesson.contentBlocks).some((block: any) => block.type === 'pdf') : false,
        hasNotation: lesson.contentBlocks && typeof lesson.contentBlocks === 'string' ? JSON.parse(lesson.contentBlocks).some((block: any) => block.type === 'groovescribe') : false,
        hasMuseScore: lesson.contentBlocks && typeof lesson.contentBlocks === 'string' ? JSON.parse(lesson.contentBlocks).some((block: any) => block.type === 'musescore') : false,
      }));
  }

  // Multi-tenant school-scoped operations
  
  // School-scoped student access
  async getStudentsBySchool(schoolId: number): Promise<Student[]> {
    return Array.from(this.students.values()).filter(s => s.schoolId === schoolId);
  }

  async getStudentsForTeacher(teacherId: number): Promise<Student[]> {
    return Array.from(this.students.values()).filter(s => s.assignedTeacherId === teacherId);
  }

  // School-scoped lesson access
  async getLessonsBySchool(schoolId: number): Promise<Lesson[]> {
    return Array.from(this.lessons.values()).filter(l => l.schoolId === schoolId);
  }

  async getLessonsForTeacher(teacherId: number): Promise<Lesson[]> {
    return Array.from(this.lessons.values()).filter(l => l.userId === teacherId);
  }

  // School-scoped song access
  async getSongsBySchool(schoolId: number): Promise<Song[]> {
    return Array.from(this.songs.values()).filter(s => s.schoolId === schoolId);
  }

  async getSongsForTeacher(teacherId: number): Promise<Song[]> {
    return Array.from(this.songs.values()).filter(s => s.userId === teacherId);
  }

  // School-scoped assignment access
  async getAssignmentsBySchool(schoolId: number): Promise<Assignment[]> {
    return Array.from(this.assignments.values()).filter(a => a.schoolId === schoolId);
  }

  async getAssignmentsForTeacher(teacherId: number): Promise<Assignment[]> {
    return Array.from(this.assignments.values()).filter(a => a.userId === teacherId);
  }

  // School-scoped session access
  async getSessionsBySchool(schoolId: number): Promise<Session[]> {
    return Array.from(this.sessionRecords.values()).filter(s => s.schoolId === schoolId);
  }

  async getSessionsForTeacher(teacherId: number): Promise<Session[]> {
    return Array.from(this.sessionRecords.values()).filter(s => s.userId === teacherId);
  }

  // School-scoped groove pattern access
  async getGroovePatternsBySchool(schoolId: number): Promise<GroovePattern[]> {
    return Array.from(this.groovePatterns.values()).filter(p => p.schoolId === schoolId.toString());
  }

  async getGroovePatternsForTeacher(teacherId: number): Promise<GroovePattern[]> {
    return Array.from(this.groovePatterns.values()).filter(p => p.createdBy === teacherId);
  }

  // School membership management
  async createSchoolMembership(membership: InsertSchoolMembership): Promise<SchoolMembership> {
    const id = Math.max(0, ...Array.from(this.schoolMemberships.keys())) + 1;
    const now = new Date();
    const newMembership: SchoolMembership = {
      ...membership,
      id,
      createdAt: membership.createdAt || now,
      updatedAt: membership.updatedAt || now
    };
    this.schoolMemberships.set(id, newMembership);
    return newMembership;
  }

  async getSchoolMemberships(schoolId: number): Promise<SchoolMembership[]> {
    return Array.from(this.schoolMemberships.values()).filter(m => m.schoolId === schoolId);
  }

  async getUserSchoolMemberships(userId: number): Promise<SchoolMembership[]> {
    return Array.from(this.schoolMemberships.values()).filter(m => m.userId === userId);
  }

  async updateSchoolMembership(id: number, updates: Partial<InsertSchoolMembership>): Promise<SchoolMembership> {
    const existing = this.schoolMemberships.get(id);
    if (!existing) throw new Error(`SchoolMembership ${id} not found`);
    
    const now = new Date();
    const updated: SchoolMembership = {
      ...existing,
      ...updates,
      updatedAt: updates.updatedAt || now
    };
    this.schoolMemberships.set(id, updated);
    return updated;
  }

  async deleteSchoolMembership(id: number): Promise<boolean> {
    return this.schoolMemberships.delete(id);
  }

  // Enhanced school operations
  async getSchoolById(schoolId: number): Promise<School | undefined> {
    return this.schools.get(schoolId);
  }

  async getSchoolsByOwner(ownerId: number): Promise<School[]> {
    return Array.from(this.schools.values()).filter(s => s.ownerId === ownerId);
  }

  async getTeachersBySchool(schoolId: number): Promise<User[]> {
    const memberships = await this.getSchoolMemberships(schoolId);
    const teacherIds = memberships
      .filter(m => m.role === 'teacher')
      .map(m => m.userId);
    
    return Array.from(this.users.values()).filter(u => teacherIds.includes(u.id));
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
    
    const totalStudents = await this.getStudentCount(userId);
    const activeLessons = await this.getLessonCount(userId);
    const completedAssignments = 0; // Will be calculated properly when assignments are implemented
    const upcomingSessions = await this.getSessionCountThisWeek(userId);
    
    const studentProgress = await this.getStudentProgressReports(userId);
    const lessonCompletions = await this.getLessonCompletionStats(userId, dateRange);
    const popularLessons = await this.getPopularLessons(userId, dateRange);
    const upcomingDeadlines = await this.getUpcomingDeadlines(userId);
    
    return {
      totalStudents,
      activeLessons,
      completedAssignments,
      upcomingSessions,
      studentProgress,
      lessonCompletions,
      popularLessons,
      upcomingDeadlines
    };
  }
  
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
    const students = await this.getStudents(userId);
    
    return students.map(student => {
      // For demo purposes, generate some sample progress data
      const completedLessons = Math.floor(Math.random() * 10) + 1;
      const totalAssignments = Math.floor(Math.random() * 5) + 1;
      const completedAssignments = Math.floor(Math.random() * totalAssignments);
      const xpEarned = completedLessons * 100 + completedAssignments * 50;
      
      return {
        studentId: student.id,
        studentName: `${student.firstName} ${student.lastName}`,
        completedLessons,
        totalAssignments,
        completedAssignments,
        lastActivity: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
        xpEarned
      };
    });
  }
  
  async getLessonCompletionStats(userId: number, dateRange: number): Promise<any[]> {
    // Generate sample lesson completion stats for the date range
    const stats = [];
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - dateRange * 24 * 60 * 60 * 1000);
    
    for (let i = 0; i < Math.min(dateRange, 30); i++) {
      const date = new Date(endDate.getTime() - i * 24 * 60 * 60 * 1000);
      stats.push({
        date: date.toISOString().split('T')[0],
        completions: Math.floor(Math.random() * 5) + 1
      });
    }
    
    return stats.reverse();
  }
  
  async getPopularLessons(userId: number, dateRange: number): Promise<any[]> {
    const lessons = await this.getLessons(userId);
    
    return lessons.slice(0, 5).map(lesson => ({
      lessonTitle: lesson.title,
      completions: Math.floor(Math.random() * 20) + 5,
      avgRating: Math.round((Math.random() * 2 + 3) * 10) / 10 // 3.0 to 5.0
    }));
  }
  
  async getUpcomingDeadlines(userId: number): Promise<any[]> {
    const students = await this.getStudents(userId);
    const assignments = await this.getAssignments(userId);
    
    // Generate sample upcoming deadlines
    const deadlines = [];
    for (let i = 0; i < Math.min(students.length, 3); i++) {
      const student = students[i];
      const futureDate = new Date(Date.now() + Math.random() * 14 * 24 * 60 * 60 * 1000);
      const isOverdue = Math.random() > 0.8;
      
      deadlines.push({
        studentName: `${student.firstName} ${student.lastName}`,
        assignmentTitle: `Practice Assignment ${i + 1}`,
        dueDate: isOverdue 
          ? new Date(Date.now() - Math.random() * 3 * 24 * 60 * 60 * 1000).toISOString()
          : futureDate.toISOString(),
        status: isOverdue ? 'overdue' as const : 'pending' as const
      });
    }
    
    return deadlines;
  }

  // Video operations - SECURE practice video management with school scoping
  private practiceVideos: Map<string, any> = new Map();
  private videoComments: Map<string, any> = new Map();

  async getPracticeVideo(videoId: string): Promise<any | undefined> {
    return this.practiceVideos.get(videoId);
  }

  async getPracticeVideos(userId: number): Promise<any[]> {
    return Array.from(this.practiceVideos.values()).filter(video => 
      video.createdBy === userId || video.studentId === userId.toString()
    );
  }

  async getPracticeVideosBySchool(schoolId: number): Promise<any[]> {
    return Array.from(this.practiceVideos.values()).filter(video => 
      video.studioId === schoolId.toString()
    );
  }

  async getStudentPracticeVideos(studentId: number): Promise<any[]> {
    return Array.from(this.practiceVideos.values()).filter(video => 
      video.studentId === studentId.toString()
    );
  }

  async createPracticeVideo(video: any): Promise<any> {
    const videoId = video.id || `video_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newVideo = {
      ...video,
      id: videoId,
      createdAt: new Date().toISOString()
    };
    this.practiceVideos.set(videoId, newVideo);
    return newVideo;
  }

  async updatePracticeVideo(videoId: string, video: Partial<any>): Promise<any> {
    const existing = this.practiceVideos.get(videoId);
    if (!existing) throw new Error('Video not found');
    
    const updated = { ...existing, ...video, updatedAt: new Date().toISOString() };
    this.practiceVideos.set(videoId, updated);
    return updated;
  }

  async deletePracticeVideo(videoId: string): Promise<boolean> {
    const result = this.practiceVideos.delete(videoId);
    // Also delete related comments
    Array.from(this.videoComments.entries()).forEach(([commentId, comment]) => {
      if (comment.videoId === videoId) {
        this.videoComments.delete(commentId);
      }
    });
    return result;
  }

  // Video comments - SECURE video feedback system
  async getVideoComments(videoId: string): Promise<any[]> {
    return Array.from(this.videoComments.values()).filter(comment => 
      comment.videoId === videoId
    ).sort((a, b) => a.atMs - b.atMs);
  }

  async createVideoComment(comment: any): Promise<any> {
    const commentId = comment.id || `comment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newComment = {
      ...comment,
      id: commentId,
      createdAt: new Date().toISOString()
    };
    this.videoComments.set(commentId, newComment);
    return newComment;
  }

  async updateVideoComment(commentId: string, comment: Partial<any>): Promise<any> {
    const existing = this.videoComments.get(commentId);
    if (!existing) throw new Error('Comment not found');
    
    const updated = { ...existing, ...comment, updatedAt: new Date().toISOString() };
    this.videoComments.set(commentId, updated);
    return updated;
  }

  async deleteVideoComment(commentId: string): Promise<boolean> {
    return this.videoComments.delete(commentId);
  }

  // ========================================
  // SETTINGS API METHODS IMPLEMENTATION - CRITICAL PRODUCTION FIX
  // ========================================

  // In-memory maps for settings data
  private userNotifications: Map<number, UserNotifications> = new Map();
  private userPreferences: Map<number, UserPreferences> = new Map();

  // User profile operations
  async getCurrentUserProfile(userId: number): Promise<User | undefined> {
    return this.users.get(userId);
  }

  async updateCurrentUserProfile(userId: number, profileData: ProfileUpdateData): Promise<User> {
    const existingUser = this.users.get(userId);
    if (!existingUser) {
      throw new Error("User not found");
    }

    const updatedUser: User = {
      ...existingUser,
      name: profileData.name,
      email: profileData.email,
      bio: profileData.bio || existingUser.bio,
      instruments: profileData.instruments || existingUser.instruments,
      avatar: profileData.avatar || existingUser.avatar,
    };

    this.users.set(userId, updatedUser);
    
    // Update username map if email changed
    this.usersByUsername.delete(existingUser.email);
    this.usersByUsername.set(updatedUser.email, updatedUser);
    
    return updatedUser;
  }

  // School settings operations
  async getSchoolSettings(schoolId: number): Promise<School | undefined> {
    return this.schools.get(schoolId);
  }

  async updateSchoolSettings(schoolId: number, settingsData: SchoolSettingsUpdateData): Promise<School> {
    const existingSchool = this.schools.get(schoolId);
    if (!existingSchool) {
      throw new Error("School not found");
    }

    const updatedSchool: School = {
      ...existingSchool,
      name: settingsData.name,
      address: settingsData.address || existingSchool.address,
      city: settingsData.city || existingSchool.city,
      phone: settingsData.phone || existingSchool.phone,
      website: settingsData.website || existingSchool.website,
      description: settingsData.description || existingSchool.description,
      instruments: settingsData.instruments || existingSchool.instruments,
    };

    this.schools.set(schoolId, updatedSchool);
    return updatedSchool;
  }

  // User notification settings operations
  async getUserNotifications(userId: number): Promise<UserNotifications | undefined> {
    return this.userNotifications.get(userId);
  }

  async upsertUserNotifications(userId: number, settings: NotificationSettingsData): Promise<UserNotifications> {
    const now = new Date();
    
    const existing = this.userNotifications.get(userId);
    
    const notifications: UserNotifications = {
      userId,
      settings: settings as any,
      createdAt: existing?.createdAt || now,
      updatedAt: now,
    };

    this.userNotifications.set(userId, notifications);
    return notifications;
  }

  // User preference settings operations
  async getUserPreferences(userId: number): Promise<UserPreferences | undefined> {
    return this.userPreferences.get(userId);
  }

  async upsertUserPreferences(userId: number, settings: PreferenceSettingsData): Promise<UserPreferences> {
    const now = new Date();
    
    const existing = this.userPreferences.get(userId);
    
    const preferences: UserPreferences = {
      userId,
      settings: settings as any,
      createdAt: existing?.createdAt || now,
      updatedAt: now,
    };

    this.userPreferences.set(userId, preferences);
    return preferences;
  }

  // Password change operations
  async changeUserPassword(userId: number, currentPassword: string, newPassword: string): Promise<User> {
    const user = this.users.get(userId);
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
    const updatedUser: User = {
      ...user,
      password: hashedNewPassword,
      mustChangePassword: false, // Clear password change requirement
    };

    this.users.set(userId, updatedUser);
    
    // Update username map
    this.usersByUsername.set(updatedUser.username, updatedUser);
    
    return updatedUser;
  }

  // ========================================
  // NOTIFICATIONS SYSTEM IMPLEMENTATION
  // ========================================

  async createNotification(notification: any): Promise<any> {
    const id = ++this.notificationIdCounter;
    const newNotification: Notification = {
      id,
      userId: notification.userId,
      schoolId: notification.schoolId,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      link: notification.link || null,
      metadata: notification.metadata || null,
      isRead: false,
      createdAt: new Date(),
    };
    
    this.notifications.set(id, newNotification);
    return newNotification;
  }

  async getAllUserNotifications(userId: number, schoolId: number, limit = 50): Promise<any[]> {
    return Array.from(this.notifications.values())
      .filter(n => n.userId === userId && n.schoolId === schoolId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }

  async getUnreadNotificationCount(userId: number, schoolId: number): Promise<number> {
    return Array.from(this.notifications.values())
      .filter(n => n.userId === userId && n.schoolId === schoolId && !n.isRead)
      .length;
  }

  async markNotificationAsRead(notificationId: number, userId: number): Promise<boolean> {
    const notification = this.notifications.get(notificationId);
    if (!notification || notification.userId !== userId) {
      return false;
    }
    
    const updated = { ...notification, isRead: true };
    this.notifications.set(notificationId, updated);
    return true;
  }

  async markAllNotificationsAsRead(userId: number, schoolId: number): Promise<number> {
    let count = 0;
    
    this.notifications.forEach((notification, id) => {
      if (notification.userId === userId && notification.schoolId === schoolId && !notification.isRead) {
        const updated = { ...notification, isRead: true };
        this.notifications.set(id, updated);
        count++;
      }
    });
    
    return count;
  }

  async deleteOldNotifications(days: number): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    let count = 0;
    const toDelete: number[] = [];
    
    this.notifications.forEach((notification, id) => {
      if (notification.isRead && notification.createdAt < cutoffDate) {
        toDelete.push(id);
        count++;
      }
    });
    
    toDelete.forEach(id => this.notifications.delete(id));
    return count;
  }

  async getStudentsWithBirthdayToday(): Promise<any[]> {
    const today = new Date();
    const currentMonth = today.getMonth() + 1; // JavaScript months are 0-indexed
    const currentDay = today.getDate();
    
    return Array.from(this.students.values()).filter(student => {
      if (!student.birthdate) return false;
      
      const birthdate = typeof student.birthdate === 'string' 
        ? new Date(student.birthdate) 
        : student.birthdate;
      
      const birthdateMonth = birthdate.getMonth() + 1;
      const birthdateDay = birthdate.getDate();
      
      return birthdateMonth === currentMonth && birthdateDay === currentDay;
    });
  }

  async getSchoolTeachers(schoolId: number): Promise<User[]> {
    return Array.from(this.users.values()).filter(user =>
      user.schoolId === schoolId &&
      (user.role === 'teacher' || user.role === 'school_owner')
    );
  }

  // ========================================
  // POS IMPORT SYSTEM IMPLEMENTATIONS
  // ========================================

  // Notations
  async getNotations(schoolId: number): Promise<Notation[]> {
    return Array.from(this.posNotations.values()).filter(n => n.schoolId === schoolId);
  }

  async getNotation(id: number): Promise<Notation | undefined> {
    return this.posNotations.get(id);
  }

  async createNotation(notation: InsertNotation): Promise<Notation> {
    const id = ++this.notationIdCounter;
    const newNotation: Notation = {
      ...notation,
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.posNotations.set(id, newNotation);
    return newNotation;
  }

  async createNotationsBatch(notations: InsertNotation[]): Promise<BatchResult> {
    const result: BatchResult = { inserted: 0, skipped: 0, errors: [] };

    for (let i = 0; i < notations.length; i++) {
      try {
        await this.createNotation(notations[i]);
        result.inserted++;
      } catch (error) {
        result.errors.push({ row: i, error: error instanceof Error ? error.message : String(error) });
      }
    }

    return result;
  }

  async updateNotation(id: number, data: Partial<Notation>): Promise<Notation> {
    const existing = this.posNotations.get(id);
    if (!existing) throw new Error("Notation not found");

    const updated: Notation = { ...existing, ...data, updatedAt: new Date() };
    this.posNotations.set(id, updated);
    return updated;
  }

  async deleteNotation(id: number): Promise<boolean> {
    return this.posNotations.delete(id);
  }

  // POS Songs
  async getPosSongs(schoolId: number): Promise<PosSong[]> {
    return Array.from(this.posSongsData.values()).filter(s => s.schoolId === schoolId);
  }

  async getPosSong(id: number): Promise<PosSong | undefined> {
    return this.posSongsData.get(id);
  }

  async createPosSong(song: InsertPosSong): Promise<PosSong> {
    const id = ++this.posSongIdCounter;
    const newSong: PosSong = {
      ...song,
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.posSongsData.set(id, newSong);
    return newSong;
  }

  async createPosSongsBatch(songs: InsertPosSong[]): Promise<BatchResult> {
    const result: BatchResult = { inserted: 0, skipped: 0, errors: [] };

    for (let i = 0; i < songs.length; i++) {
      try {
        await this.createPosSong(songs[i]);
        result.inserted++;
      } catch (error) {
        result.errors.push({ row: i, error: error instanceof Error ? error.message : String(error) });
      }
    }

    return result;
  }

  async updatePosSong(id: number, data: Partial<PosSong>): Promise<PosSong> {
    const existing = this.posSongsData.get(id);
    if (!existing) throw new Error("POS Song not found");

    const updated: PosSong = { ...existing, ...data, updatedAt: new Date() };
    this.posSongsData.set(id, updated);
    return updated;
  }

  async deletePosSong(id: number): Promise<boolean> {
    return this.posSongsData.delete(id);
  }

  // Song ↔ Notation Mappings
  async getSongNotationMappings(schoolId: number): Promise<SongNotationMapping[]> {
    return Array.from(this.songNotationMappings.values()).filter(m => m.schoolId === schoolId);
  }

  async getSongNotationMapping(id: number): Promise<SongNotationMapping | undefined> {
    return this.songNotationMappings.get(id);
  }

  async getMappingsForSong(songId: number): Promise<SongNotationMapping[]> {
    return Array.from(this.songNotationMappings.values()).filter(m => m.songId === songId);
  }

  async getMappingsForNotation(notationId: number): Promise<SongNotationMapping[]> {
    return Array.from(this.songNotationMappings.values()).filter(m => m.notationId === notationId);
  }

  async createSongNotationMapping(mapping: InsertSongNotationMapping): Promise<SongNotationMapping> {
    const id = ++this.mappingIdCounter;
    const newMapping: SongNotationMapping = {
      ...mapping,
      id,
      createdAt: new Date(),
    };
    this.songNotationMappings.set(id, newMapping);
    return newMapping;
  }

  async deleteSongNotationMapping(id: number): Promise<boolean> {
    return this.songNotationMappings.delete(id);
  }

  // Drumblocks
  async getDrumblocks(schoolId: number): Promise<Drumblock[]> {
    return Array.from(this.drumblocksData.values()).filter(b => b.schoolId === schoolId);
  }

  async getDrumblock(id: number): Promise<Drumblock | undefined> {
    return this.drumblocksData.get(id);
  }

  async getDrumblockByBlockId(blockId: string, schoolId: number): Promise<Drumblock | undefined> {
    return Array.from(this.drumblocksData.values()).find(b => b.blockId === blockId && b.schoolId === schoolId);
  }

  async getDrumblocksByNotation(notationId: number): Promise<Drumblock[]> {
    return Array.from(this.drumblocksData.values()).filter(b => b.sourceNotationId === notationId);
  }

  async createDrumblock(block: InsertDrumblock): Promise<Drumblock> {
    const id = ++this.drumblockIdCounter;
    const newBlock: Drumblock = {
      ...block,
      id,
      createdAt: new Date(),
    };
    this.drumblocksData.set(id, newBlock);
    return newBlock;
  }

  async createDrumblocksBatch(blocks: InsertDrumblock[]): Promise<BatchResult> {
    const result: BatchResult = { inserted: 0, skipped: 0, errors: [] };

    for (let i = 0; i < blocks.length; i++) {
      try {
        await this.createDrumblock(blocks[i]);
        result.inserted++;
      } catch (error) {
        result.errors.push({ row: i, error: error instanceof Error ? error.message : String(error) });
      }
    }

    return result;
  }

  async updateDrumblock(id: number, data: Partial<Drumblock>): Promise<Drumblock> {
    const existing = this.drumblocksData.get(id);
    if (!existing) throw new Error("Drumblock not found");

    const updated: Drumblock = { ...existing, ...data };
    this.drumblocksData.set(id, updated);
    return updated;
  }

  async deleteDrumblock(id: number): Promise<boolean> {
    return this.drumblocksData.delete(id);
  }

  // Import Logs
  async createImportLog(log: InsertPosImportLog): Promise<PosImportLog> {
    const id = ++this.importLogIdCounter;
    const newLog: PosImportLog = {
      ...log,
      id,
      startedAt: new Date(),
      completedAt: null,
    };
    this.posImportLogs.set(id, newLog);
    return newLog;
  }

  async updateImportLog(id: number, data: Partial<PosImportLog>): Promise<PosImportLog> {
    const existing = this.posImportLogs.get(id);
    if (!existing) throw new Error("Import log not found");

    const updated: PosImportLog = { ...existing, ...data };
    this.posImportLogs.set(id, updated);
    return updated;
  }

  async getImportLog(id: number): Promise<PosImportLog | undefined> {
    return this.posImportLogs.get(id);
  }

  async getImportLogs(schoolId: number, limit: number = 50): Promise<PosImportLog[]> {
    return Array.from(this.posImportLogs.values())
      .filter(l => l.schoolId === schoolId)
      .sort((a, b) => (b.startedAt?.getTime() || 0) - (a.startedAt?.getTime() || 0))
      .slice(0, limit);
  }

  async getImportLogByBatchId(batchId: string): Promise<PosImportLog | undefined> {
    return Array.from(this.posImportLogs.values()).find(l => l.batchId === batchId);
  }
}

// Use DatabaseStorage for production with MemStorage as fallback
console.log("Initializing database connection...");
let storage: IStorage;

// Check if database is available by testing DATABASE_URL
const isDatabaseAvailable = process.env.DATABASE_URL && 
  !process.env.DATABASE_URL.includes("disabled") && 
  !process.env.DATABASE_URL.includes("endpoint is disabled");

if (isDatabaseAvailable) {
  try {
    storage = new DatabaseStorage();
    console.log("Database storage initialized");
  } catch (error) {
    console.log("Database connection failed, using in-memory storage fallback");
    console.log("Database error:", error instanceof Error ? error.message : String(error));
    storage = new MemStorage();
  }
} else {
  console.log("Database connection failed, using in-memory storage fallback");
  storage = new MemStorage();
}

export { storage };