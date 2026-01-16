import { type IStorage, MemStorage } from "./storage";
import { FileStorage } from "./file-storage";
import { DatabaseStorage } from "./database-storage";
import { isDatabaseAvailable } from "./db";
import type { RealtimeBus } from "./services/realtime-bus";
import { 
  EVENT_ENTITIES, 
  EVENT_ACTIONS, 
  EVENT_TYPES,
  createRealtimeEvent, 
  validateRealtimeEvent,
  getEventRoute,
  BROADCAST_AUDIENCES,
  type RealtimeEvent,
  type EventEntity,
  type EventAction
} from "@shared/events";

// Interface for user context in storage operations
interface UserContext {
  userId: number;
  schoolId?: number;
  role: string;
}

class StorageWrapper implements IStorage {
  private actualStorage: IStorage;
  private initialized = false;
  private realtimeBus?: RealtimeBus;
  private currentUserContext?: UserContext;
  private storageInitialized = false;
  
  constructor() {
    console.log("🔄 StorageWrapper created - waiting for explicit initialization...");
    // Start with MemStorage temporarily until proper initialization
    this.actualStorage = new MemStorage();
    this.initialized = false;
  }

  /**
   * Initialize storage after database verification has completed
   * This should be called from server startup after database is verified
   */
  async initializeStorage(): Promise<void> {
    if (this.storageInitialized) {
      console.log("⚠️ Storage already initialized, skipping...");
      return;
    }

    console.log("🔄 Initializing storage after database verification...");
    
    // Now check database availability after proper initialization time
    console.log("🔍 Checking database availability...");
    if (isDatabaseAvailable) {
      console.log("✅ Using DatabaseStorage (PostgreSQL) with session store");
      this.actualStorage = new DatabaseStorage();
      this.initialized = true;
      this.storageInitialized = true;
      
      // Verify session store is working
      if (this.actualStorage.sessionStore) {
        console.log('✅ PostgreSQL session store initialized successfully');
      } else {
        console.error('❌ PostgreSQL session store failed to initialize');
      }
    } else {
      console.log("📁 Database not available - using FileStorage");
      // Use FileStorage as fallback, not temporary storage
      this.actualStorage = new FileStorage('./data');
      this.initialized = false;
      await this.initializeFileStorage();
      this.storageInitialized = true;
      // Still check for database in background for potential upgrade
      this.waitForDatabaseUpgrade();
    }
    
    // Monitor database availability for runtime switching (only after initial setup)
    setInterval(() => {
      if (isDatabaseAvailable && !(this.actualStorage instanceof DatabaseStorage)) {
        console.log("🔄 Switching to DatabaseStorage (database became available)");
        this.actualStorage = new DatabaseStorage();
        this.initialized = true;
      } else if (!isDatabaseAvailable && !(this.actualStorage instanceof FileStorage)) {
        console.log("🔄 Switching to FileStorage fallback (database unavailable)");
        this.actualStorage = new FileStorage('./data');
        this.initializeFileStorage();
      }
    }, 5000);
  }

  private async waitForDatabaseUpgrade() {
    let attempts = 0;
    const maxAttempts = 20;
    
    // Keep checking for database availability to upgrade storage
    const checkForUpgrade = async () => {
      attempts++;
      if (attempts % 5 === 0) {
        console.log(`🔄 Background database check attempt ${attempts}...`);
      }
      
      if (isDatabaseAvailable && !(this.actualStorage instanceof DatabaseStorage)) {
        console.log("✅ Database became available! Upgrading to DatabaseStorage");
        this.actualStorage = new DatabaseStorage();
        this.initialized = true;
        return;
      }
      
      if (attempts < maxAttempts) {
        setTimeout(checkForUpgrade, 2000);
      }
    };
    
    // Start checking after 2 seconds to give system time
    setTimeout(checkForUpgrade, 2000);
  }

  private async initializeFileStorage() {
    try {
      await (this.actualStorage as FileStorage).initialize();
      this.initialized = true;
      console.log("✅ File-based persistent storage initialized");
    } catch (error) {
      console.error("❌ FileStorage initialization failed, falling back to MemStorage:", error);
      this.actualStorage = new MemStorage();
      this.initialized = true;
    }
  }
  
  private async waitForInitialization(): Promise<void> {
    while (!this.initialized) {
      await new Promise(resolve => setTimeout(resolve, 50)); // Wait 50ms and check again
    }
  }
  
  get sessionStore() {
    return this.actualStorage.sessionStore;
  }

  /**
   * Set RealtimeBus instance for event broadcasting
   */
  public setRealtimeBus(realtimeBus: RealtimeBus): void {
    this.realtimeBus = realtimeBus;
    console.log("✅ RealtimeBus integrated with StorageWrapper");
  }

  /**
   * Set current user context for tracking operations
   */
  public setUserContext(userContext: UserContext): void {
    this.currentUserContext = userContext;
  }

  /**
   * Clear current user context
   */
  public clearUserContext(): void {
    this.currentUserContext = undefined;
  }

  /**
   * Broadcast real-time event for data changes with smart targeting
   * SECURITY: Requires explicit schoolId - no fallbacks to prevent cross-tenant leakage
   */
  private async broadcastEvent(
    entity: EventEntity,
    action: EventAction,
    data: any,
    schoolId?: number
  ): Promise<void> {
    if (!this.realtimeBus) {
      console.log("⚠️ RealtimeBus not available for broadcasting");
      return;
    }

    try {
      // SECURITY: Determine schoolId with safe fallback order - NO userId fallback
      const targetSchoolId = schoolId || 
                            this.currentUserContext?.schoolId || 
                            data?.schoolId;

      if (!targetSchoolId || typeof targetSchoolId !== 'number') {
        console.error(`❌ SECURITY: Invalid or missing schoolId for ${entity}.${action} event. ` +
                     `schoolId=${schoolId}, userContext=${this.currentUserContext?.schoolId}, ` +
                     `dataSchoolId=${data?.schoolId}. Event blocked to prevent cross-tenant leakage.`);
        return;
      }

      // Create standardized event using shared contract
      const event = createRealtimeEvent(
        entity,
        action,
        data,
        targetSchoolId,
        this.currentUserContext?.userId,
        data?.id || data?.entityId
      );

      // Validate event structure
      if (!validateRealtimeEvent(event)) {
        console.error(`❌ Invalid event structure for ${entity}.${action}:`, event);
        return;
      }

      // Use standardized event routing from shared contract
      const eventRoute = getEventRoute(event.type);
      let broadcastCount = 0;

      if (eventRoute) {
        switch (eventRoute.audience) {
          case BROADCAST_AUDIENCES.SCHOOL_WIDE:
            broadcastCount = this.realtimeBus.emitToSchool(targetSchoolId, event);
            console.log(`📡 School-wide broadcast: ${event.type} to ${broadcastCount} members in school ${targetSchoolId}`);
            break;
            
          case BROADCAST_AUDIENCES.TEACHERS_ONLY:
            broadcastCount = this.realtimeBus.emitToTeachers(targetSchoolId, event);
            console.log(`📡 Teacher-only broadcast: ${event.type} to ${broadcastCount} teachers in school ${targetSchoolId}`);
            break;
            
          case BROADCAST_AUDIENCES.STUDENTS_ONLY:
            broadcastCount = this.realtimeBus.emitToStudents(targetSchoolId, event);
            console.log(`📡 Student-only broadcast: ${event.type} to ${broadcastCount} students in school ${targetSchoolId}`);
            break;
            
          default:
            console.warn(`⚠️ Unknown audience type for event ${event.type}, defaulting to teachers`);
            broadcastCount = this.realtimeBus.emitToTeachers(targetSchoolId, event);
            break;
        }
      } else {
        // Fallback for events not in routing table
        console.warn(`⚠️ No route defined for event ${event.type}, defaulting to teachers`);
        broadcastCount = this.realtimeBus.emitToTeachers(targetSchoolId, event);
      }

    } catch (error) {
      console.error(`❌ Failed to broadcast real-time event ${entity}.${action}:`, error);
      // Don't throw - broadcasting failures shouldn't break database operations
    }
  }

  // Note: Broadcast routing logic moved to shared/events.ts for consistency
  // All event routing now uses standardized EVENT_ROUTES configuration
  
  // Delegate all methods to the actual storage
  async getSchools() { return this.actualStorage.getSchools(); }
  async getSchool(id: number) { return this.actualStorage.getSchool(id); }
  async createSchool(school: any) { return this.actualStorage.createSchool(school); }
  async updateSchool(id: number, school: any) { return this.actualStorage.updateSchool(id, school); }
  async deleteSchool(id: number) { return this.actualStorage.deleteSchool(id); }
  
  async getUser(id: number) { return this.actualStorage.getUser(id); }
  async getUserByUsername(username: string) { return this.actualStorage.getUserByUsername(username); }
  async getUserByUsernameForAuth(username: string) { return this.actualStorage.getUserByUsernameForAuth(username); }
  async createUser(user: any) { 
    await this.waitForInitialization(); 
    const result = await this.actualStorage.createUser(user);
    await this.broadcastEvent('user', 'create', result, result.schoolId);
    return result;
  }
  async updateUser(id: number, user: any) { 
    const result = await this.actualStorage.updateUser(id, user);
    await this.broadcastEvent('user', 'update', result, result.schoolId);
    return result;
  }
  async deleteUser(id: number) { 
    // Get user data before deletion for broadcasting
    const userData = await this.actualStorage.getUser(id);
    const result = await this.actualStorage.deleteUser(id);
    if (result && userData) {
      await this.broadcastEvent('user', 'delete', { id, ...userData }, userData.schoolId);
    }
    return result;
  }
  async getUsersBySchool(schoolId: number) { return this.actualStorage.getUsersBySchool(schoolId); }
  async getUsersByRole(role: string) { return this.actualStorage.getUsersByRole(role); }
  async getTeachers() { return this.actualStorage.getTeachers(); }
  async getUserByEmail(email: string) { return this.actualStorage.getUserByEmail(email); }
  
  async getStudents(userId: number) { return this.actualStorage.getStudents(userId); }
  async getStudent(id: number) { return this.actualStorage.getStudent(id); }
  async getStudentLessons(studentId: number) { return this.actualStorage.getStudentLessons(studentId); }
  async getStudentSongs(studentId: number) { return this.actualStorage.getStudentSongs(studentId); }
  async getStudentLessonProgress(studentId: number) { return this.actualStorage.getStudentLessonProgress(studentId); }
  async getStudentSongProgress(studentId: number) { return this.actualStorage.getStudentSongProgress(studentId); }
  async createStudent(student: any) { 
    const result = await this.actualStorage.createStudent(student);
    await this.broadcastEvent('student', 'create', result, result.schoolId);
    return result;
  }
  async updateStudent(id: number, student: any) { 
    const result = await this.actualStorage.updateStudent(id, student);
    await this.broadcastEvent('student', 'update', result, result.schoolId);
    return result;
  }
  async deleteStudent(id: number) { 
    // Get student data before deletion for broadcasting
    const studentData = await this.actualStorage.getStudent(id);
    const result = await this.actualStorage.deleteStudent(id);
    if (result && studentData) {
      await this.broadcastEvent('student', 'delete', { id, ...studentData }, studentData.schoolId);
    }
    return result;
  }
  
  async getSongs(userId: number) { return this.actualStorage.getSongs(userId); }
  async getSong(id: number) { return this.actualStorage.getSong(id); }
  async getRecentSongs(limit: number) { return this.actualStorage.getRecentSongs(limit); }
  async getRecentSongsForUser(userId: number, limit: number) { return this.actualStorage.getRecentSongsForUser(userId, limit); }
  async getSongsByLetter(userId: number, letter: string) { return this.actualStorage.getSongsByLetter(userId, letter); }
  async createSong(song: any) { 
    const result = await this.actualStorage.createSong(song);
    // Extract schoolId from user creating the song or song data
    const schoolId = this.currentUserContext?.schoolId || song.schoolId;
    await this.broadcastEvent('song', 'create', result, schoolId);
    return result;
  }
  async updateSong(id: number, song: any) { 
    const result = await this.actualStorage.updateSong(id, song);
    // Extract schoolId from user updating the song or song data
    const schoolId = this.currentUserContext?.schoolId || song.schoolId || result.schoolId;
    await this.broadcastEvent('song', 'update', result, schoolId);
    return result;
  }
  async deleteSong(id: number) { 
    // Get song data before deletion for broadcasting
    const songData = await this.actualStorage.getSong(id);
    const result = await this.actualStorage.deleteSong(id);
    if (result && songData) {
      const schoolId = this.currentUserContext?.schoolId || songData.schoolId;
      await this.broadcastEvent('song', 'delete', { id, ...songData }, schoolId);
    }
    return result;
  }
  
  async getLessons(userId: number) { return this.actualStorage.getLessons(userId); }
  async getLesson(id: number) { return this.actualStorage.getLesson(id); }
  async getRecentLessons(limit: number) { return this.actualStorage.getRecentLessons(limit); }
  async getRecentLessonsForUser(userId: number, limit: number) { return this.actualStorage.getRecentLessonsForUser(userId, limit); }
  async createLesson(lesson: any) { 
    const result = await this.actualStorage.createLesson(lesson);
    // Extract schoolId from user creating the lesson or lesson data
    const schoolId = this.currentUserContext?.schoolId || lesson.schoolId;
    await this.broadcastEvent('lesson', 'create', result, schoolId);
    return result;
  }
  async updateLesson(id: number, lesson: any) { 
    const result = await this.actualStorage.updateLesson(id, lesson);
    // Extract schoolId from user updating the lesson or lesson data
    const schoolId = this.currentUserContext?.schoolId || lesson.schoolId || result.schoolId;
    await this.broadcastEvent('lesson', 'update', result, schoolId);
    return result;
  }
  async deleteLesson(id: number) { 
    // Get lesson data before deletion for broadcasting
    const lessonData = await this.actualStorage.getLesson(id);
    const result = await this.actualStorage.deleteLesson(id);
    if (result && lessonData) {
      const schoolId = this.currentUserContext?.schoolId || lessonData.schoolId;
      await this.broadcastEvent('lesson', 'delete', { id, ...lessonData }, schoolId);
    }
    return result;
  }
  
  async getAssignments(userId: number) { return this.actualStorage.getAssignments(userId); }
  async getStudentAssignments(studentId: number) { return this.actualStorage.getStudentAssignments(studentId); }
  async getAssignment(id: number) { return this.actualStorage.getAssignment(id); }
  async createAssignment(assignment: any) { 
    const result = await this.actualStorage.createAssignment(assignment);
    // Extract schoolId from user creating the assignment or assignment data
    const schoolId = this.currentUserContext?.schoolId || assignment.schoolId;
    await this.broadcastEvent('assignment', 'create', result, schoolId);
    return result;
  }
  async updateAssignment(id: number, assignment: any) { 
    const result = await this.actualStorage.updateAssignment(id, assignment);
    // Extract schoolId from user updating the assignment or assignment data
    const schoolId = this.currentUserContext?.schoolId || assignment.schoolId || result.schoolId;
    await this.broadcastEvent('assignment', 'update', result, schoolId);
    return result;
  }
  async deleteAssignment(id: number) { 
    // Get assignment data before deletion for broadcasting
    const assignmentData = await this.actualStorage.getAssignment(id);
    const result = await this.actualStorage.deleteAssignment(id);
    if (result && assignmentData) {
      const schoolId = this.currentUserContext?.schoolId || assignmentData.schoolId;
      await this.broadcastEvent('assignment', 'delete', { id, ...assignmentData }, schoolId);
    }
    return result;
  }
  
  async getSessions(userId: number) { return this.actualStorage.getSessions(userId); }
  async getStudentSessions(studentId: number) { return this.actualStorage.getStudentSessions(studentId); }
  async getSessionsForDate(date: Date) { return this.actualStorage.getSessionsForDate(date); }
  async getSession(id: number) { return this.actualStorage.getSession(id); }
  async createSession(session: any) { 
    const result = await this.actualStorage.createSession(session);
    // Extract schoolId from user creating the session or session data
    const schoolId = this.currentUserContext?.schoolId || session.schoolId;
    await this.broadcastEvent('session', 'create', result, schoolId);
    return result;
  }
  async updateSession(id: number, session: any) { 
    const result = await this.actualStorage.updateSession(id, session);
    // Extract schoolId from user updating the session or session data
    const schoolId = this.currentUserContext?.schoolId || session.schoolId || result.schoolId;
    await this.broadcastEvent('session', 'update', result, schoolId);
    return result;
  }
  async deleteSession(id: number) { 
    // Get session data before deletion for broadcasting
    const sessionData = await this.actualStorage.getSession(id);
    const result = await this.actualStorage.deleteSession(id);
    if (result && sessionData) {
      const schoolId = this.currentUserContext?.schoolId || sessionData.schoolId;
      await this.broadcastEvent('session', 'delete', { id, ...sessionData }, schoolId);
    }
    return result;
  }
  
  async getRecurringSchedules(userId: number) { return this.actualStorage.getRecurringSchedules(userId); }
  async getRecurringSchedulesBySchool(schoolId: number) { return this.actualStorage.getRecurringSchedulesBySchool(schoolId); }
  async getStudentRecurringSchedules(studentId: number) { return this.actualStorage.getStudentRecurringSchedules(studentId); }
  async getRecurringSchedule(id: number) { return this.actualStorage.getRecurringSchedule(id); }
  async createRecurringSchedule(schedule: any) { 
    const result = await this.actualStorage.createRecurringSchedule(schedule);
    // Extract schoolId from user creating the schedule or schedule data
    const schoolId = this.currentUserContext?.schoolId || schedule.schoolId;
    await this.broadcastEvent('schedule', 'create', result, schoolId);
    return result;
  }
  async updateRecurringSchedule(id: number, schedule: any) { 
    const result = await this.actualStorage.updateRecurringSchedule(id, schedule);
    // Extract schoolId from user updating the schedule or schedule data
    const schoolId = this.currentUserContext?.schoolId || schedule.schoolId || result.schoolId;
    await this.broadcastEvent('schedule', 'update', result, schoolId);
    return result;
  }
  async deleteRecurringSchedule(id: number) { 
    // Get schedule data before deletion for broadcasting
    const scheduleData = await this.actualStorage.getRecurringSchedule(id);
    const result = await this.actualStorage.deleteRecurringSchedule(id);
    if (result && scheduleData) {
      const schoolId = this.currentUserContext?.schoolId || scheduleData.schoolId;
      await this.broadcastEvent('schedule', 'delete', { id, ...scheduleData }, schoolId);
    }
    return result;
  }
  async generateSessionsFromRecurringSchedules(userId: number, startDate: Date, endDate: Date) { 
    return this.actualStorage.generateSessionsFromRecurringSchedules(userId, startDate, endDate); 
  }
  
  async requestReschedule(sessionId: number, newStartTime: Date, newEndTime: Date) { 
    return this.actualStorage.requestReschedule(sessionId, newStartTime, newEndTime); 
  }
  async approveReschedule(sessionId: number) { return this.actualStorage.approveReschedule(sessionId); }
  
  async getPracticeSessions(userId: number) { return this.actualStorage.getPracticeSessions(userId); }
  async getStudentPracticeSessions(studentId: number) { return this.actualStorage.getStudentPracticeSessions(studentId); }
  async getActiveStudentPracticeSessions() { return this.actualStorage.getActiveStudentPracticeSessions(); }
  async createPracticeSession(session: any) { 
    const result = await this.actualStorage.createPracticeSession(session);
    // Extract schoolId from user creating the practice session or session data
    const schoolId = this.currentUserContext?.schoolId || session.schoolId;
    await this.broadcastEvent('practice', 'start', result, schoolId);
    return result;
  }
  async endPracticeSession(id: number) { 
    const result = await this.actualStorage.endPracticeSession(id);
    // Extract schoolId from user ending the practice session or session data
    const schoolId = this.currentUserContext?.schoolId || result.schoolId;
    await this.broadcastEvent('practice', 'end', result, schoolId);
    return result;
  }
  
  async getPracticeVideo(videoId: string) { return this.actualStorage.getPracticeVideo(videoId); }
  async getPracticeVideos(userId: number) { return this.actualStorage.getPracticeVideos(userId); }
  async getPracticeVideosBySchool(schoolId: number) { return this.actualStorage.getPracticeVideosBySchool(schoolId); }
  
  async getAchievementDefinitions() { return this.actualStorage.getAchievementDefinitions(); }
  async getAchievementDefinition(id: number) { return this.actualStorage.getAchievementDefinition(id); }
  async getStudentAchievements(studentId: number) { return this.actualStorage.getStudentAchievements(studentId); }
  async getStudentAchievement(id: number) { return this.actualStorage.getStudentAchievement(id); }
  async markAchievementAsSeen(id: number) { return this.actualStorage.markAchievementAsSeen(id); }
  async checkAndAwardAchievements(studentId: number) { return this.actualStorage.checkAndAwardAchievements(studentId); }
  
  async getStudentCount(userId: number) { return this.actualStorage.getStudentCount(userId); }
  async getSongCount(userId: number) { return this.actualStorage.getSongCount(userId); }
  async getLessonCount(userId: number) { return this.actualStorage.getLessonCount(userId); }
  async getSessionCountThisWeek(userId: number) { return this.actualStorage.getSessionCountThisWeek(userId); }
  
  // NOTE: getSongsByLetter is implemented in FileStorage but not in IStorage interface - removing for now
  async searchContent(userId: number, searchTerm: string) { return this.actualStorage.searchContent(userId, searchTerm); }
  
  async getMessages(userId: number) { return this.actualStorage.getMessages(userId); }
  async getMessage(id: number) { return this.actualStorage.getMessage(id); }
  async createMessage(message: any) { 
    const result = await this.actualStorage.createMessage(message);
    // Determine schoolId from message data or current user context
    const schoolId = this.currentUserContext?.schoolId || message.schoolId;
    await this.broadcastEvent('message', 'create', result, schoolId);
    return result;
  }
  async updateMessage(id: number, message: any) { 
    const result = await this.actualStorage.updateMessage(id, message);
    // Extract schoolId from current user context or message data
    const schoolId = this.currentUserContext?.schoolId || message.schoolId || result.schoolId;
    await this.broadcastEvent('message', 'update', result, schoolId);
    return result;
  }
  async deleteMessage(id: number) { 
    // Get message data before deletion for broadcasting
    const messageData = await this.actualStorage.getMessage(id);
    const result = await this.actualStorage.deleteMessage(id);
    if (result && messageData) {
      const schoolId = this.currentUserContext?.schoolId || messageData.schoolId;
      await this.broadcastEvent('message', 'delete', { id, ...messageData }, schoolId);
    }
    return result;
  }
  
  // Lesson Categories
  async getLessonCategories(userId: number) { return this.actualStorage.getLessonCategories(userId); }
  async getLessonCategory(id: number) { return this.actualStorage.getLessonCategory(id); }
  async createLessonCategory(category: any) { return this.actualStorage.createLessonCategory(category); }
  async updateLessonCategory(id: number, category: any) { return this.actualStorage.updateLessonCategory(id, category); }
  async deleteLessonCategory(id: number) { return this.actualStorage.deleteLessonCategory(id); }

  // Performance monitoring
  async getLessonPerformanceMetrics(userId: number) { return this.actualStorage.getLessonPerformanceMetrics(userId); }
  async getRealtimeStats(userId: number) { return this.actualStorage.getRealtimeStats(userId); }
  async trackPerformanceEvent(userId: number, event: any) { return this.actualStorage.trackPerformanceEvent(userId, event); }
  // NOTE: getSessionsForDate is implemented in FileStorage but not in IStorage interface - removing for now

  // Groove Pattern operations
  async getGroovePatterns(userId?: number) {
    return this.actualStorage.getGroovePatterns(userId);
  }

  async getGroovePattern(id: string) {
    return this.actualStorage.getGroovePattern(id);
  }

  async createGroovePattern(pattern: any) {
    return this.actualStorage.createGroovePattern(pattern);
  }

  async updateGroovePattern(id: string, pattern: any) {
    return this.actualStorage.updateGroovePattern(id, pattern);
  }

  async deleteGroovePattern(id: string) {
    return this.actualStorage.deleteGroovePattern(id);
  }

  async searchGroovePatterns(searchTerm: string, difficulty?: string, tags?: string[]) {
    return this.actualStorage.searchGroovePatterns(searchTerm, difficulty, tags);
  }

  // Multi-tenant school-scoped operations
  
  // School-scoped student access
  async getStudentsBySchool(schoolId: number) { 
    return this.actualStorage.getStudentsBySchool(schoolId); 
  }
  
  async getStudentsForTeacher(teacherId: number) { 
    return this.actualStorage.getStudentsForTeacher(teacherId); 
  }
  
  // School-scoped lesson access
  async getLessonsBySchool(schoolId: number) { 
    return this.actualStorage.getLessonsBySchool(schoolId); 
  }
  
  async getLessonsForTeacher(teacherId: number) { 
    return this.actualStorage.getLessonsForTeacher(teacherId); 
  }
  
  // School-scoped song access
  async getSongsBySchool(schoolId: number) { 
    return this.actualStorage.getSongsBySchool(schoolId); 
  }
  
  async getSongsForTeacher(teacherId: number) { 
    return this.actualStorage.getSongsForTeacher(teacherId); 
  }
  
  // School-scoped assignment access
  async getAssignmentsBySchool(schoolId: number) { 
    return this.actualStorage.getAssignmentsBySchool(schoolId); 
  }
  
  async getAssignmentsForTeacher(teacherId: number) { 
    return this.actualStorage.getAssignmentsForTeacher(teacherId); 
  }
  
  // School-scoped session access
  async getSessionsBySchool(schoolId: number) { 
    return this.actualStorage.getSessionsBySchool(schoolId); 
  }
  
  async getSessionsForTeacher(teacherId: number) { 
    return this.actualStorage.getSessionsForTeacher(teacherId); 
  }
  
  // School-scoped groove pattern access
  async getGroovePatternsBySchool(schoolId: number) { 
    return this.actualStorage.getGroovePatternsBySchool(schoolId); 
  }
  
  async getGroovePatternsForTeacher(teacherId: number) { 
    return this.actualStorage.getGroovePatternsForTeacher(teacherId); 
  }
  
  // School membership management
  async createSchoolMembership(membership: any) { 
    return this.actualStorage.createSchoolMembership(membership); 
  }
  
  async getSchoolMemberships(schoolId: number) { 
    return this.actualStorage.getSchoolMemberships(schoolId); 
  }
  
  async getUserSchoolMemberships(userId: number) { 
    return this.actualStorage.getUserSchoolMemberships(userId); 
  }
  
  async updateSchoolMembership(id: number, membership: any) { 
    return this.actualStorage.updateSchoolMembership(id, membership); 
  }
  
  async deleteSchoolMembership(id: number) { 
    return this.actualStorage.deleteSchoolMembership(id); 
  }
  
  // Enhanced school operations
  async getSchoolById(schoolId: number) { 
    return this.actualStorage.getSchoolById(schoolId); 
  }
  
  async getSchoolsByOwner(ownerId: number) { 
    return this.actualStorage.getSchoolsByOwner(ownerId); 
  }
  
  async getTeachersBySchool(schoolId: number) { 
    return this.actualStorage.getTeachersBySchool(schoolId); 
  }
  
  async getStudentCountBySchool(schoolId: number) { 
    return this.actualStorage.getStudentCountBySchool(schoolId); 
  }
  
  async getLessonCountBySchool(schoolId: number) { 
    return this.actualStorage.getLessonCountBySchool(schoolId); 
  }
  
  async getSongCountBySchool(schoolId: number) { 
    return this.actualStorage.getSongCountBySchool(schoolId); 
  }

  // Reports and analytics methods
  async generateReportsData(userId: number, dateRange: number, reportType: string) {
    return this.actualStorage.generateReportsData(userId, dateRange, reportType);
  }
  
  async generateReportsDataBySchool(schoolId: number, dateRange: number, reportType: string) {
    return this.actualStorage.generateReportsDataBySchool(schoolId, dateRange, reportType);
  }

  async getStudentProgressReports(userId: number) {
    return this.actualStorage.getStudentProgressReports(userId);
  }

  async getLessonCompletionStats(userId: number, dateRange: number) {
    return this.actualStorage.getLessonCompletionStats(userId, dateRange);
  }

  async getPopularLessons(userId: number, dateRange: number) {
    return this.actualStorage.getPopularLessons(userId, dateRange);
  }

  async getUpcomingDeadlines(userId: number) {
    return this.actualStorage.getUpcomingDeadlines(userId);
  }

  // ========================================
  // SETTINGS API DELEGATIONS - CRITICAL PRODUCTION FIX
  // ========================================

  // User profile operations
  async getCurrentUserProfile(userId: number) {
    return this.actualStorage.getCurrentUserProfile(userId);
  }

  async updateCurrentUserProfile(userId: number, profileData: any) {
    return this.actualStorage.updateCurrentUserProfile(userId, profileData);
  }

  // School settings operations
  async getSchoolSettings(schoolId: number) {
    return this.actualStorage.getSchoolSettings(schoolId);
  }

  async updateSchoolSettings(schoolId: number, settingsData: any) {
    return this.actualStorage.updateSchoolSettings(schoolId, settingsData);
  }

  // User notification settings operations
  async getUserNotifications(userId: number) {
    return this.actualStorage.getUserNotifications(userId);
  }

  // Notification system operations (actual notifications, not preferences)
  async createNotification(notification: any) {
    return this.actualStorage.createNotification(notification);
  }

  async getAllUserNotifications(userId: number, schoolId: number, limit?: number) {
    return this.actualStorage.getAllUserNotifications(userId, schoolId, limit);
  }

  async getUnreadNotificationCount(userId: number, schoolId: number) {
    return this.actualStorage.getUnreadNotificationCount(userId, schoolId);
  }

  async markNotificationAsRead(notificationId: number, userId: number) {
    return this.actualStorage.markNotificationAsRead(notificationId, userId);
  }

  async markAllNotificationsAsRead(userId: number, schoolId: number) {
    return this.actualStorage.markAllNotificationsAsRead(userId, schoolId);
  }

  async deleteOldNotifications(days: number) {
    return this.actualStorage.deleteOldNotifications(days);
  }

  async upsertUserNotifications(userId: number, settings: any) {
    return this.actualStorage.upsertUserNotifications(userId, settings);
  }

  // User preference settings operations
  async getUserPreferences(userId: number) {
    return this.actualStorage.getUserPreferences(userId);
  }

  async upsertUserPreferences(userId: number, settings: any) {
    return this.actualStorage.upsertUserPreferences(userId, settings);
  }

  // Password change operations
  async changeUserPassword(userId: number, currentPassword: string, newPassword: string) {
    return this.actualStorage.changeUserPassword(userId, currentPassword, newPassword);
  }
}

export const storage = new StorageWrapper();