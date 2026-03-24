import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { getStorageRuntimeState, storage } from "./storage-wrapper";
import {
  setupAuth,
  requireAuth,
  enforcePasswordChange,
  sessionMiddleware,
  comparePasswords,
  changeAuthenticatedUserPassword,
} from "./auth";
// WebSocketManager removed - using RealtimeBus instead (set up in index.ts)
import { db } from "./db";
import { eq, and, or, ne, not, sql } from "drizzle-orm";
import { notificationService } from "./services/notification-service";
import { registerSchoolRoutes } from "./routes/schools";
import { registerTeacherRoutes } from "./routes/teachers";
import { registerStudentRoutes } from "./routes/students";
import { registerSongRoutes } from "./routes/songs";
import { registerMessageRoutes } from "./routes/messages";
import { registerPlatformAdminRoutes } from "./routes/platform-admin";
import { registerRecurringScheduleRoutes } from "./routes/recurring-schedules";
import { registerNotificationRoutes } from "./routes/notifications";
import { canAccessSchoolId, getAccessibleSchoolIds } from "./routes/school-scope";
import { z } from "zod";
import {
  insertStudentSchema,
  insertSongSchema,
  insertLessonSchema,
  insertLessonCategorySchema,
  updateLessonCategorySchema,
  insertAssignmentSchema,
  insertSessionSchema,
  insertAchievementDefinitionSchema,
  insertStudentAchievementSchema,
  students,
  sessions,
  users,
  profileUpdateSchema,
  schoolSettingsUpdateSchema,
  notificationSettingsSchema,
  preferenceSettingsSchema
} from "@shared/schema";
import { ownerLoginSchema, passwordChangeRequestSchema } from "@shared/auth-validation";
import { ownerAuthRateLimit, passwordChangeRateLimit, verifySameOrigin } from "./middleware/security";
import { 
  loadSchoolContext, 
  requireTeacherOrOwner,
  requireSchoolOwner as authzRequireSchoolOwner,
  applySchoolFiltering 
} from "./middleware/authz";
import multer from "multer";
import path from "path";
import fs from "fs";
import { execSync } from "child_process";
import ImportUtility from "./import-utility";
import { importStudents } from "./importStudents";
import { importSchedule } from "./importSchedule";
import { resetStudentPassword } from "./services/student-accounts";
import { fixExistingCorruptedSongs } from "./utils/optimized-import";

interface RegisterRoutesOptions {
  minimal?: boolean;
}

export async function registerRoutes(app: Express, server?: Server, options: RegisterRoutesOptions = {}): Promise<Server> {
  const { minimal = false } = options;

  // Health check endpoint for deployment verification
  app.get("/health", (req: Request, res: Response) => {
    res.status(200).json({ 
      status: "healthy", 
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.version
    });
  });

  // Enhanced API health check with comprehensive database status
  app.get("/api/health", async (req: Request, res: Response) => {
    try {
      const { isDatabaseAvailable, performHealthCheck, getDatabaseStatus } = await import("./db");
      
      let dbStatus = "unknown";
      let dbLatency = 0;
      let dbDetails = {};
      
      if (isDatabaseAvailable) {
        try {
          const start = Date.now();
          const healthCheckResult = await performHealthCheck();
          dbLatency = Date.now() - start;
          
          if (healthCheckResult) {
            dbStatus = "connected";
            dbDetails = getDatabaseStatus();
          } else {
            dbStatus = "disconnected";
          }
        } catch (dbError) {
          console.warn("Database health check failed:", dbError instanceof Error ? dbError.message : String(dbError));
          dbStatus = "error";
        }
      } else {
        dbStatus = "unavailable";
        dbDetails = getDatabaseStatus();
      }
      
      const healthData = {
        status: "healthy", 
        api: "ready",
        database: {
          status: dbStatus,
          latency: dbLatency > 0 ? `${dbLatency}ms` : null,
          ...dbDetails
        },
        storage: getStorageRuntimeState(),
        timestamp: new Date().toISOString(),
        uptime: Math.floor(process.uptime()),
        memory: {
          used: Math.round(process.memoryUsage().rss / 1024 / 1024),
          heap: Math.round(process.memoryUsage().heapUsed / 1024 / 1024)
        }
      };
      
      // Return 200 even if DB is down, since app can run with in-memory storage
      res.status(200).json(healthData);
    } catch (error) {
      console.error("Health check error:", error);
      res.status(200).json({ 
        status: "healthy", 
        api: "ready",
        database: { status: "error" },
        storage: getStorageRuntimeState(),
        timestamp: new Date().toISOString()
      });
    }
  });

  // Setup authentication routes
  setupAuth(app);

  // Configure RealtimeBus with session middleware (must be after setupAuth)
  if ((app as any).realtimeBus && sessionMiddleware) {
    (app as any).realtimeBus.configureSessionMiddleware(sessionMiddleware);
  }

  // Protect authenticated cookie-based mutations against cross-site requests.
  app.use('/api', verifySameOrigin);

  // Apply password change enforcement to all API routes
  app.use('/api', enforcePasswordChange);
  
  // Register role-based routes
  registerSchoolRoutes(app);
  registerTeacherRoutes(app);
  registerStudentRoutes(app);
  registerSongRoutes(app);
  registerMessageRoutes(app);
  registerPlatformAdminRoutes(app);
  registerRecurringScheduleRoutes(app);
  registerNotificationRoutes(app);

  if (!minimal) {
    // Register gamification routes
    app.use("/api/gamification", (await import("./routes/gamification")).default);

    // Register video routes
    app.use("/api/videos", (await import("./routes/video")).default);

    // Register groove patterns routes
    app.use("/api/groove-patterns", (await import("./routes/groove-patterns")).default);

    // Register AI services routes
    app.use("/api/ai", (await import("./routes/ai-services")).default);

    // Register notation collaboration routes
    app.use("/api/notation", (await import("./routes/notation")).default);

    // Register iCal import/export routes
    app.use("/api/ical", (await import("./routes/ical")).default);

    // Register JSON import routes
    app.use("/api/import", (await import("./routes/json-import")).default);

    // Register POS import routes (notations, songs, drumblocks)
    app.use("/api/pos-import", (await import("./routes/pos-import")).default);
    // Also register under /api for direct access to notations, pos-songs, mappings, drumblocks
    app.use("/api", (await import("./routes/pos-import")).default);

    // Register subscription routes with billing alias for compatibility
    app.use("/api/billing", (await import("./routes/subscriptions")).default);
  }

  // Register DrumSchool Manager integration routes
  app.use("/api/drumschool-integration", (await import("./routes/drumschool-integration")).default);
  
  // Add categories alias for lesson-categories compatibility - SECURE: Teacher/Owner only with proper multi-tenant context
  app.get("/api/categories", requireAuth, loadSchoolContext, requireTeacherOrOwner(), async (req: Request, res: Response) => {
    try {
      console.log("Fetching categories (lesson-categories) for user:", req.user!.id, "school:", req.school?.id);
      let categories;
      const schoolId = req.school?.id || req.user!.schoolId;

      // School owners see ALL categories in their school
      if (req.school?.isSchoolOwner() && schoolId) {
        categories = await storage.getLessonCategoriesBySchool(schoolId);
      } else {
        categories = await storage.getLessonCategories(req.user!.id);
      }
      console.log("Categories retrieved with secure scoping:", categories);
      res.json(categories);
    } catch (error) {
      console.error("Error fetching categories:", error);
      res.status(500).json({ message: "Failed to fetch categories" });
    }
  });

  // Add recent content endpoints for dashboard - SECURE with authorization and tenant scoping
  app.get("/api/songs/recent", loadSchoolContext, requireTeacherOrOwner(), async (req: Request, res: Response) => {
    try {
      console.log("Fetching recent songs for user:", req.user!.id, "school:", req.school?.id);
      // Use the new secure user-scoped method with proper tenant filtering
      const recentSongs = await storage.getRecentSongsForUser(req.user!.id, 6);
      console.log("Recent songs retrieved with secure scoping:", recentSongs.length);
      res.json(recentSongs);
    } catch (error) {
      console.error("Error getting recent songs:", error);
      res.status(500).json({ message: "Failed to get recent songs" });
    }
  });

  app.get("/api/lessons/recent", loadSchoolContext, requireTeacherOrOwner(), async (req: Request, res: Response) => {
    try {
      console.log("Fetching recent lessons for user:", req.user!.id, "school:", req.school?.id);
      // Use the new secure user-scoped method with proper tenant filtering
      const recentLessons = await storage.getRecentLessonsForUser(req.user!.id, 6);
      console.log("Recent lessons retrieved with secure scoping:", recentLessons.length);
      res.json(recentLessons);
    } catch (error) {
      console.error("Error getting recent lessons:", error);
      res.status(500).json({ message: "Failed to get recent lessons" });
    }
  });

  // REMOVED: /api/test-reports endpoint - was a critical security vulnerability
  // This endpoint exposed analytics data publicly without any authentication

  // Reports and analytics endpoint - SECURE: Teacher/Owner only
  app.get("/api/reports", requireAuth, loadSchoolContext, requireTeacherOrOwner(), async (req: Request, res: Response) => {
    
    try {
      const { range = "30", type = "overview" } = req.query;
      const dateRange = parseInt(range as string);
      const reportType = type as string;
      
      // Use school-scoped data for school owners/teachers
      const schoolId = req.school?.id || req.user!.schoolId;
      
      console.log(`Generating reports for user ${req.user!.id}, school: ${schoolId}, range: ${dateRange} days, type: ${reportType}`);
      
      let reportsData;
      if (schoolId) {
        // School-scoped: shows all students/lessons/songs in the school
        reportsData = await storage.generateReportsDataBySchool(schoolId, dateRange, reportType);
      } else {
        // Fallback to user-scoped
        reportsData = await storage.generateReportsData(req.user!.id, dateRange, reportType);
      }
      console.log("Reports data generated successfully:", Object.keys(reportsData), reportsData.summary);
      
      res.json(reportsData);
    } catch (error) {
      console.error("Error generating reports:", error);
      res.status(500).json({ message: "Failed to generate reports" });
    }
  });
  
  // Schedule management routes are handled in the main routes below

  // Today's schedule endpoint - shows students scheduled for today
  app.get("/api/schedule/today", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    
    try {
      const today = new Date();
      const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const dayOfWeek = dayNames[today.getDay()];
      
      // Get recurring schedules for today from the school
      const schoolId = req.user!.schoolId;
      if (!schoolId) {
        return res.json([]);
      }
      
      const schedules = await storage.getRecurringSchedulesBySchool(schoolId);
      const todaySchedules = schedules.filter(s => 
        s.dayOfWeek.toLowerCase() === dayOfWeek && s.isActive !== false
      );
      
      // Get all students for this school in one query (optimize: no N+1)
      const students = await storage.getStudentsBySchool(schoolId);
      const studentMap = new Map(students.map(s => [s.id, s]));
      
      // Build schedule with student info
      const schedule = todaySchedules.map(s => {
        const student = studentMap.get(s.studentId);
        if (!student) return null;
        
        return {
          id: student.id,
          name: student.name,
          firstName: student.name.split(' ')[0] || '',
          lastName: student.name.split(' ').slice(1).join(' ') || '',
          startTime: s.startTime,
          endTime: s.endTime,
          location: s.location || 'Studio',
          phoneNumber: student.phone,
          email: student.email,
          age: null,
          instrument: student.instrument || 'Drums',
          level: student.level || 'Intermediate',
          assignedLessons: 0,
          assignedSongs: 0,
          progress: 0,
          lastActivity: new Date().toISOString()
        };
      }).filter((item): item is NonNullable<typeof item> => item !== null)
        .sort((a, b) => a.startTime.localeCompare(b.startTime));
      
      res.json(schedule);
    } catch (error) {
      console.error("Error fetching today's schedule:", error);
      res.status(500).json({ message: "Failed to fetch today's schedule" });
    }
  });

  // Student lessons endpoint for today window
  app.get("/api/student/lessons/:id", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    
    try {
      const studentId = parseInt(req.params.id);
      // Get lessons assigned to this student
      const lessons = await storage.getStudentLessons(studentId);
      res.json(lessons);
    } catch (error) {
      console.error("Error fetching student lessons:", error);
      res.status(500).json({ message: "Failed to fetch student lessons" });
    }
  });

  // Student songs endpoint for today window
  app.get("/api/student/songs/:id", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    
    try {
      const studentId = parseInt(req.params.id);
      // Get songs assigned to this student
      const songs = await storage.getStudentSongs(studentId);
      res.json(songs);
    } catch (error) {
      console.error("Error fetching student songs:", error);
      res.status(500).json({ message: "Failed to fetch student songs" });
    }
  });

  // NOTE: Student progress routes moved to server/routes/students.ts with proper security

  // MusicDott 1.0 Style Dashboard Endpoints
  app.get("/api/dashboard/widgets", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    
    try {
      // In original: SELECT * FROM POS_Docent WHERE mlid=$userid
      // mlDashSongs, mlDashLesson, mlDashBook, mlDashNews, mlDashSchool
      const widgets = {
        showSongs: true,
        showLessons: true,
        showBooks: true,
        showNews: true,
        showSchool: true
      };
      res.json(widgets);
    } catch (error) {
      console.error("Error fetching dashboard widgets:", error);
      res.status(500).json({ message: "Failed to fetch widgets" });
    }
  });

  app.get("/api/dashboard/recent-songs", requireAuth, loadSchoolContext, requireTeacherOrOwner(), applySchoolFiltering(), async (req: Request, res: Response) => {
    try {
      // SECURE: Use school-scoped method with proper tenant filtering
      console.log("Fetching recent dashboard songs for user:", req.user!.id, "school:", req.school?.id);
      const recentSongs = await storage.getRecentSongsForUser(req.user!.id, 6);
      console.log("Dashboard recent songs retrieved with secure scoping:", recentSongs.length);
      res.json(recentSongs);
    } catch (error) {
      console.error("Error fetching recent songs:", error);
      res.status(500).json({ message: "Failed to fetch recent songs" });
    }
  });

  app.get("/api/dashboard/recent-lessons", requireAuth, loadSchoolContext, requireTeacherOrOwner(), applySchoolFiltering(), async (req: Request, res: Response) => {
    try {
      // SECURE: Use school-scoped method with proper tenant filtering
      console.log("Fetching recent dashboard lessons for user:", req.user!.id, "school:", req.school?.id);
      const recentLessons = await storage.getRecentLessonsForUser(req.user!.id, 6);
      console.log("Dashboard recent lessons retrieved with secure scoping:", recentLessons.length);
      res.json(recentLessons);
    } catch (error) {
      console.error("Error fetching recent lessons:", error);
      res.status(500).json({ message: "Failed to fetch recent lessons" });
    }
  });

  // API routes - all routes are prefixed with /api

  // Students - role-based access with proper multi-tenant filtering
  app.get("/api/students", 
    requireAuth,
    loadSchoolContext,
    requireTeacherOrOwner(),
    async (req: Request, res: Response) => {
      try {
        let students;
        
        // Get schoolId from context or user
        const schoolId = req.school?.id || req.user!.schoolId;
        
        // Platform owners can see all students across all schools
        if (req.school!.isPlatformOwner()) {
          students = await storage.getStudents(req.user!.id);
        }
        // School owners see ALL students in their school (school-scoped)
        else if (req.school!.isSchoolOwner() && schoolId) {
          students = await storage.getStudentsBySchool(schoolId);
        }
        // Teachers see only their assigned students
        else if (req.school!.isTeacher()) {
          students = await storage.getStudentsForTeacher(req.user!.id);
        }
        else {
          return res.status(403).json({ 
            message: "Insufficient permissions to view students",
            role: req.school!.role
          });
        }
        
        // Log for debugging multi-tenant access
        if (process.env.NODE_ENV !== 'production') {
          console.log(`Students access: User ${req.user!.id} with role ${req.school!.role} in school ${schoolId} retrieved ${students.length} students`);
        }
        
        res.json(students);
      } catch (error) {
        console.error("Error fetching students with authorization:", error);
        res.status(500).json({ message: "Failed to fetch students" });
      }
    }
  );


  // Note: Other student routes are now handled in server/routes/students.ts
  // Note: All song routes are now handled in server/routes/songs.ts

  // Lessons - role-based access with proper multi-tenant filtering
  app.get("/api/lessons",
    requireAuth,
    loadSchoolContext,
    requireTeacherOrOwner(),
    applySchoolFiltering(),
    async (req: Request, res: Response) => {
      try {
        let lessons;
        const schoolId = req.school?.id || req.user!.schoolId;

        // Platform owners can see all lessons across all schools
        if (req.school!.isPlatformOwner()) {
          lessons = await storage.getLessons(req.user!.id);
        }
        // School owners see ALL lessons in their school
        else if (req.school!.isSchoolOwner() && schoolId) {
          lessons = await storage.getLessonsBySchool(schoolId);
        }
        // Teachers see only their own lessons
        else if (req.school!.isTeacher()) {
          lessons = await storage.getLessons(req.user!.id);
        }
        else {
          return res.status(403).json({
            message: "Insufficient permissions to view lessons",
            role: req.school!.role
          });
        }

        // Log for debugging multi-tenant access
        if (process.env.NODE_ENV !== 'production') {
          console.log(`Lessons access: User ${req.user!.id} with role ${req.school!.role} in school ${req.school!.id} retrieved ${lessons.length} lessons`);
        }

        res.json(lessons);
      } catch (error) {
        console.error("Error fetching lessons with authorization:", error);
        res.status(500).json({ message: "Failed to fetch lessons" });
      }
    }
  );

  app.get("/api/lessons/:id",
    requireAuth,
    loadSchoolContext,
    requireTeacherOrOwner(),
    async (req: Request, res: Response) => {

    try {
      const id = parseInt(req.params.id);
      const lesson = await storage.getLesson(id);

      if (!lesson) {
        return res.status(404).json({ message: "Lesson not found" });
      }

      // SECURITY: School isolation - verify lesson belongs to user's school
      if (!req.school?.isPlatformOwner()) {
        const userSchoolId = req.school?.id || req.user!.schoolId;
        if (lesson.schoolId && lesson.schoolId !== userSchoolId) {
          return res.status(403).json({ message: "Access denied. Lesson belongs to a different school." });
        }
      }

      res.json(lesson);
    } catch (error) {
      console.error("Error fetching lesson:", error);
      res.status(500).json({ message: "Failed to fetch lesson" });
    }
  });

  app.post("/api/lessons", 
    requireAuth,
    loadSchoolContext,
    requireTeacherOrOwner(),
    async (req: Request, res: Response) => {
    try {
      console.log("Creating lesson with request body:", req.body);
      
      // Validate request data using the corrected schema
      const validatedData = insertLessonSchema.parse(req.body);
      
      // Create lesson data with user context (schoolId and userId set automatically)
      const lessonData = {
        ...validatedData,
        schoolId: req.user!.schoolId!, // From loadSchoolContext middleware 
        userId: req.user!.id,
        contentType: validatedData.contentType || 'markdown', // Default to markdown if not specified
      };
      
      console.log("Validated lesson data:", lessonData);
      const lesson = await storage.createLesson(lessonData);
      console.log("Lesson created successfully:", lesson);
      res.status(201).json(lesson);
    } catch (error) {
      console.error("Error creating lesson:", error);
      if (error instanceof z.ZodError) {
        console.error("Validation errors:", error.errors);
        return res.status(400).json({ message: "Invalid lesson data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create lesson" });
    }
  });

  app.put("/api/lessons/:id",
    requireAuth,
    loadSchoolContext,
    requireTeacherOrOwner(),
    async (req: Request, res: Response) => {

    try {
      const id = parseInt(req.params.id);
      const lesson = await storage.getLesson(id);

      if (!lesson) {
        return res.status(404).json({ message: "Lesson not found" });
      }

      // SECURITY: School isolation and ownership check
      const userSchoolId = req.school?.id || req.user!.schoolId;

      // Platform owners can edit any lesson
      if (req.school?.isPlatformOwner()) {
        // Allow
      }
      // School owners can edit lessons in their school
      else if (req.school?.isSchoolOwner() && lesson.schoolId === userSchoolId) {
        // Allow
      }
      // Teachers can only edit their own lessons
      else if (lesson.userId === req.user!.id) {
        // Allow
      }
      else {
        return res.status(403).json({ message: "You don't have permission to edit this lesson" });
      }

      const validatedData = insertLessonSchema.partial().parse(req.body);
      const updatedLesson = await storage.updateLesson(id, validatedData);

      res.json(updatedLesson);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid lesson data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update lesson" });
    }
  });

  app.delete("/api/lessons/:id",
    requireAuth,
    loadSchoolContext,
    requireTeacherOrOwner(),
    async (req: Request, res: Response) => {

    try {
      const id = parseInt(req.params.id);
      const lesson = await storage.getLesson(id);

      if (!lesson) {
        return res.status(404).json({ message: "Lesson not found" });
      }

      // SECURITY: School isolation and ownership check
      const userSchoolId = req.school?.id || req.user!.schoolId;

      // Platform owners can delete any lesson
      if (req.school?.isPlatformOwner()) {
        // Allow
      }
      // School owners can delete lessons in their school
      else if (req.school?.isSchoolOwner() && lesson.schoolId === userSchoolId) {
        // Allow
      }
      // Teachers can only delete their own lessons
      else if (lesson.userId === req.user!.id) {
        // Allow
      }
      else {
        return res.status(403).json({ message: "You don't have permission to delete this lesson" });
      }

      await storage.deleteLesson(id);
      res.status(204).end();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete lesson" });
    }
  });

  // Lesson Categories - SECURE: Teacher/Owner only with proper multi-tenant context
  app.get("/api/lesson-categories", requireAuth, loadSchoolContext, requireTeacherOrOwner(), async (req: Request, res: Response) => {
    try {
      console.log("Fetching lesson categories for user:", req.user!.id, "school:", req.school?.id);
      let categories;
      const schoolId = req.school?.id || req.user!.schoolId;

      // School owners see ALL categories in their school
      if (req.school?.isSchoolOwner() && schoolId) {
        categories = await storage.getLessonCategoriesBySchool(schoolId);
      } else {
        categories = await storage.getLessonCategories(req.user!.id);
      }
      console.log("Lesson categories retrieved:", categories);
      res.json(categories);
    } catch (error) {
      console.error("Error fetching lesson categories:", error);
      res.status(500).json({ message: "Failed to fetch lesson categories" });
    }
  });

  app.post("/api/lesson-categories", requireAuth, loadSchoolContext, requireTeacherOrOwner(), async (req: Request, res: Response) => {
    try {
      if (!req.school?.id) {
        return res.status(400).json({ message: "School context required for category creation" });
      }

      const validatedData = insertLessonCategorySchema.parse({
        ...req.body,
        userId: req.user!.id,
        schoolId: req.school.id // CRITICAL: Set schoolId from authenticated school context
      });
      
      console.log("Creating lesson category with data:", validatedData);
      const category = await storage.createLessonCategory(validatedData);
      console.log("Lesson category created successfully:", category);
      res.status(201).json(category);
    } catch (error) {
      console.error("Error creating lesson category:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid category data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create lesson category" });
    }
  });

  app.put("/api/lesson-categories/:id", requireAuth, loadSchoolContext, requireTeacherOrOwner(), async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      
      // Verify category exists and belongs to user's school
      const existingCategory = await storage.getLessonCategory(id);
      if (!existingCategory) {
        return res.status(404).json({ message: "Category not found" });
      }
      
      if (!req.school?.canAccessSchool(existingCategory.schoolId)) {
        return res.status(403).json({ message: "Access denied. Category belongs to a different school." });
      }
      
      // Use secure update schema that prevents manipulation of immutable fields
      const validatedData = updateLessonCategorySchema.parse(req.body);
      
      // SECURITY: Force immutable fields to existing values to prevent cross-tenant attacks
      const updateData = {
        ...validatedData,
        schoolId: existingCategory.schoolId, // Immutable - force existing value
        userId: existingCategory.userId,     // Immutable - force existing value
      };
      
      console.log("Updating lesson category with secure data:", updateData);
      const category = await storage.updateLessonCategory(id, updateData);
      res.json(category);
    } catch (error) {
      console.error("Error updating lesson category:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid category data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update lesson category" });
    }
  });

  app.delete("/api/lesson-categories/:id", requireAuth, loadSchoolContext, requireTeacherOrOwner(), async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      
      // Verify category exists and belongs to user's school
      const existingCategory = await storage.getLessonCategory(id);
      if (!existingCategory) {
        return res.status(404).json({ message: "Category not found" });
      }
      
      if (!req.school?.canAccessSchool(existingCategory.schoolId)) {
        return res.status(403).json({ message: "Access denied. Category belongs to a different school." });
      }
      
      await storage.deleteLessonCategory(id);
      res.status(204).end();
    } catch (error) {
      console.error("Error deleting lesson category:", error);
      res.status(500).json({ message: "Failed to delete lesson category" });
    }
  });

  // Performance monitoring endpoints - SECURE: Teacher/Owner only
  app.get("/api/performance/lessons", requireAuth, loadSchoolContext, requireTeacherOrOwner(), async (req: Request, res: Response) => {
    
    try {
      const metrics = await storage.getLessonPerformanceMetrics(req.user!.id);
      res.json(metrics);
    } catch (error) {
      console.error("Error fetching lesson performance metrics:", error);
      res.status(500).json({ message: "Failed to fetch performance metrics" });
    }
  });

  app.get("/api/performance/realtime", requireAuth, loadSchoolContext, requireTeacherOrOwner(), async (req: Request, res: Response) => {
    
    try {
      const stats = await storage.getRealtimeStats(req.user!.id);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching realtime stats:", error);
      res.status(500).json({ message: "Failed to fetch realtime stats" });
    }
  });

  app.post("/api/performance/track", requireAuth, loadSchoolContext, requireTeacherOrOwner(), async (req: Request, res: Response) => {
    
    try {
      const { action, duration, success, metadata } = req.body;
      await storage.trackPerformanceEvent(req.user!.id, {
        action,
        duration,
        success,
        metadata,
        timestamp: new Date()
      });
      res.status(201).json({ message: "Performance event tracked" });
    } catch (error) {
      console.error("Error tracking performance event:", error);
      res.status(500).json({ message: "Failed to track performance event" });
    }
  });

  // Search functionality
  app.get("/api/search", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    
    try {
      const searchTerm = req.query.q as string;
      if (!searchTerm || searchTerm.trim().length < 2) {
        return res.status(400).json({ message: "Search term must be at least 2 characters" });
      }
      
      const results = await storage.searchContent(req.user!.id, searchTerm.trim());
      res.json(results);
    } catch (error) {
      res.status(500).json({ message: "Failed to search content" });
    }
  });

  // Songs by letter (alphabetical browsing)
  app.get("/api/songs/by-letter/:letter", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    
    try {
      const letter = req.params.letter.toUpperCase();
      console.log(`getSongsByLetter route called with letter: ${letter}`);
      console.log(`User ID: ${req.user!.id}`);
      
      if (!/^[A-Z#]$/.test(letter)) {
        console.log(`Invalid letter format: ${letter}`);
        return res.status(400).json({ message: "Invalid letter format" });
      }
      
      const songs = await storage.getSongsByLetter(req.user!.id, letter);
      console.log(`Route: Found ${songs.length} songs for letter ${letter}`);
      res.json(songs);
    } catch (error) {
      console.error("Error in getSongsByLetter route:", error);
      res.status(500).json({ message: "Failed to fetch songs by letter" });
    }
  });

  // Assignments
  app.get("/api/assignments",
    requireAuth,
    loadSchoolContext,
    requireTeacherOrOwner(),
    async (req: Request, res: Response) => {
    try {
      let assignments;
      const schoolId = req.school?.id || req.user!.schoolId;

      // Platform owners see all assignments
      if (req.school?.isPlatformOwner()) {
        assignments = await storage.getAssignments(req.user!.id);
      }
      // School owners see ALL assignments in their school
      else if (req.school?.isSchoolOwner() && schoolId) {
        assignments = await storage.getAssignmentsBySchool(schoolId);
      }
      // Teachers see only their own assignments
      else {
        assignments = await storage.getAssignments(req.user!.id);
      }

      res.json(assignments);
    } catch (error) {
      console.error("Error fetching assignments:", error);
      res.status(500).json({ message: "Failed to fetch assignments" });
    }
  });

  // NOTE: Student assignments route moved to server/routes/students.ts with proper security

  app.post("/api/assignments",
    requireAuth,
    loadSchoolContext,
    requireTeacherOrOwner(),
    async (req: Request, res: Response) => {
    try {
      const validatedData = insertAssignmentSchema.parse({
        ...req.body,
        userId: req.user!.id,
        dueDate: req.body.dueDate ? new Date(req.body.dueDate) : undefined
      });

      // Verify the student belongs to user's school
      const student = await storage.getStudent(validatedData.studentId);
      if (!student) {
        return res.status(404).json({ message: "Student not found" });
      }

      // SECURITY: School isolation check
      const userSchoolId = req.school?.id || req.user!.schoolId;
      if (!req.school?.isPlatformOwner() && student.schoolId !== userSchoolId) {
        return res.status(403).json({ message: "Student belongs to a different school" });
      }

      // Teachers can only assign to their own students
      if (req.school?.isTeacher() && student.userId !== req.user!.id && student.assignedTeacherId !== req.user!.id) {
        return res.status(403).json({ message: "Student is not assigned to you" });
      }
      
      // If a song is specified, verify it belongs to user's school
      if (validatedData.songId) {
        const song = await storage.getSong(validatedData.songId);
        if (!song) {
          return res.status(404).json({ message: "Song not found" });
        }
        // School isolation: song must be from same school
        if (!req.school?.isPlatformOwner() && song.schoolId !== userSchoolId) {
          return res.status(403).json({ message: "Song belongs to a different school" });
        }
      }

      // If a lesson is specified, verify it belongs to user's school
      if (validatedData.lessonId) {
        const lesson = await storage.getLesson(validatedData.lessonId);
        if (!lesson) {
          return res.status(404).json({ message: "Lesson not found" });
        }
        // School isolation: lesson must be from same school
        if (!req.school?.isPlatformOwner() && lesson.schoolId !== userSchoolId) {
          return res.status(403).json({ message: "Lesson belongs to a different school" });
        }
      }
      
      const assignment = await storage.createAssignment(validatedData);
      
      // Send notification to student about new assignment
      try {
        if (student.userId && student.schoolId) {
          await notificationService.sendNotification({
            userId: student.userId,
            schoolId: student.schoolId,
            type: 'assignment',
            title: 'New Assignment',
            message: `You have a new assignment: ${validatedData.title}`,
            link: `/assignments/${assignment.id}`,
            metadata: { assignmentId: assignment.id, studentId: student.id }
          });
        }
      } catch (notifError) {
        console.error('Failed to send assignment notification:', notifError);
        // Don't fail the assignment creation if notification fails
      }
      
      res.status(201).json(assignment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid assignment data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create assignment" });
    }
  });

  app.put("/api/assignments/:id",
    requireAuth,
    loadSchoolContext,
    requireTeacherOrOwner(),
    async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const assignment = await storage.getAssignment(id);

      if (!assignment) {
        return res.status(404).json({ message: "Assignment not found" });
      }

      // SECURITY: School isolation and ownership check
      const userSchoolId = req.school?.id || req.user!.schoolId;

      // Get student to verify school
      const existingStudent = await storage.getStudent(assignment.studentId);
      if (!req.school?.isPlatformOwner() && existingStudent?.schoolId !== userSchoolId) {
        return res.status(403).json({ message: "Assignment belongs to a different school" });
      }

      // Platform owners can edit any assignment
      if (req.school?.isPlatformOwner()) {
        // Allow
      }
      // School owners can edit assignments in their school
      else if (req.school?.isSchoolOwner()) {
        // Allow (already verified school above)
      }
      // Teachers can only edit their own assignments
      else if (assignment.userId === req.user!.id) {
        // Allow
      }
      else {
        return res.status(403).json({ message: "You don't have permission to edit this assignment" });
      }

      const validatedData = insertAssignmentSchema.partial().parse(req.body);

      // If updating the student, verify school isolation
      if (validatedData.studentId) {
        const student = await storage.getStudent(validatedData.studentId);
        if (!student) {
          return res.status(404).json({ message: "Student not found" });
        }
        if (!req.school?.isPlatformOwner() && student.schoolId !== userSchoolId) {
          return res.status(403).json({ message: "Student belongs to a different school" });
        }
      }

      // If updating the song, verify school isolation
      if (validatedData.songId) {
        const song = await storage.getSong(validatedData.songId);
        if (!song) {
          return res.status(404).json({ message: "Song not found" });
        }
        if (!req.school?.isPlatformOwner() && song.schoolId !== userSchoolId) {
          return res.status(403).json({ message: "Song belongs to a different school" });
        }
      }

      // If updating the lesson, verify school isolation
      if (validatedData.lessonId) {
        const lesson = await storage.getLesson(validatedData.lessonId);
        if (!lesson) {
          return res.status(404).json({ message: "Lesson not found" });
        }
        if (!req.school?.isPlatformOwner() && lesson.schoolId !== userSchoolId) {
          return res.status(403).json({ message: "Lesson belongs to a different school" });
        }
      }

      const updatedAssignment = await storage.updateAssignment(id, validatedData);

      // If the assignment is being marked as completed, check for achievements
      if (validatedData.completedDate && assignment.studentId) {
        await storage.checkAndAwardAchievements(assignment.studentId);
      }

      res.json(updatedAssignment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid assignment data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update assignment" });
    }
  });

  app.delete("/api/assignments/:id",
    requireAuth,
    loadSchoolContext,
    requireTeacherOrOwner(),
    async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const assignment = await storage.getAssignment(id);

      if (!assignment) {
        return res.status(404).json({ message: "Assignment not found" });
      }

      // SECURITY: School isolation and ownership check
      const userSchoolId = req.school?.id || req.user!.schoolId;

      // Get student to verify school
      const existingStudent = await storage.getStudent(assignment.studentId);
      if (!req.school?.isPlatformOwner() && existingStudent?.schoolId !== userSchoolId) {
        return res.status(403).json({ message: "Assignment belongs to a different school" });
      }

      // Platform owners can delete any assignment
      if (req.school?.isPlatformOwner()) {
        // Allow
      }
      // School owners can delete assignments in their school
      else if (req.school?.isSchoolOwner()) {
        // Allow
      }
      // Teachers can only delete their own assignments
      else if (assignment.userId === req.user!.id) {
        // Allow
      }
      else {
        return res.status(403).json({ message: "You don't have permission to delete this assignment" });
      }

      await storage.deleteAssignment(id);
      res.status(204).end();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete assignment" });
    }
  });

  // Sessions (schedule)
  app.get("/api/sessions",
    requireAuth,
    loadSchoolContext,
    requireTeacherOrOwner(),
    async (req: Request, res: Response) => {
    try {
      let sessions;
      const schoolId = req.school?.id || req.user!.schoolId;

      // Platform owners see all sessions
      if (req.school?.isPlatformOwner()) {
        sessions = await storage.getSessions(req.user!.id);
      }
      // School owners see ALL sessions in their school
      else if (req.school?.isSchoolOwner() && schoolId) {
        sessions = await storage.getSessionsBySchool(schoolId);
      }
      // Teachers see only their own sessions
      else {
        sessions = await storage.getSessions(req.user!.id);
      }

      res.json(sessions);
    } catch (error) {
      console.error("Sessions endpoint error:", error);
      res.json([]); // Always return an empty array instead of 500 error
    }
  });

  // NOTE: Student sessions route moved to server/routes/students.ts with proper security

  app.post("/api/sessions",
    requireAuth,
    loadSchoolContext,
    requireTeacherOrOwner(),
    async (req: Request, res: Response) => {
    try {
      const validatedData = insertSessionSchema.parse({
        ...req.body,
        userId: req.user!.id
      });

      // Verify the student exists and belongs to user's school
      const student = await storage.getStudent(validatedData.studentId);
      if (!student) {
        return res.status(404).json({ message: "Student not found" });
      }

      // SECURITY: School isolation check
      const userSchoolId = req.school?.id || req.user!.schoolId;
      if (!req.school?.isPlatformOwner() && student.schoolId !== userSchoolId) {
        return res.status(403).json({ message: "Student belongs to a different school" });
      }

      // Teachers can only create sessions for their own students
      if (req.school?.isTeacher() && student.userId !== req.user!.id && student.assignedTeacherId !== req.user!.id) {
        return res.status(403).json({ message: "Student is not assigned to you" });
      }

      const session = await storage.createSession(validatedData);
      res.status(201).json(session);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid session data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create session" });
    }
  });

  app.put("/api/sessions/:id",
    requireAuth,
    loadSchoolContext,
    requireTeacherOrOwner(),
    async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const session = await storage.getSession(id);

      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }

      // SECURITY: School isolation check via student
      const userSchoolId = req.school?.id || req.user!.schoolId;
      const existingStudent = await storage.getStudent(session.studentId);
      if (!req.school?.isPlatformOwner() && existingStudent?.schoolId !== userSchoolId) {
        return res.status(403).json({ message: "Session belongs to a different school" });
      }

      // Platform owners can edit any session
      if (req.school?.isPlatformOwner()) {
        // Allow
      }
      // School owners can edit sessions in their school
      else if (req.school?.isSchoolOwner()) {
        // Allow
      }
      // Teachers can only edit their own sessions
      else if (session.userId === req.user!.id) {
        // Allow
      }
      else {
        return res.status(403).json({ message: "You don't have permission to edit this session" });
      }

      const validatedData = insertSessionSchema.partial().parse(req.body);

      // If updating the student, verify school isolation
      if (validatedData.studentId) {
        const student = await storage.getStudent(validatedData.studentId);
        if (!student) {
          return res.status(404).json({ message: "Student not found" });
        }
        if (!req.school?.isPlatformOwner() && student.schoolId !== userSchoolId) {
          return res.status(403).json({ message: "Student belongs to a different school" });
        }
      }

      const updatedSession = await storage.updateSession(id, validatedData);
      res.json(updatedSession);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid session data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update session" });
    }
  });

  app.delete("/api/sessions/:id",
    requireAuth,
    loadSchoolContext,
    async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const session = await storage.getSession(id);

      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }

      // Get the student for school isolation check
      const student = await storage.getStudent(session.studentId);

      // SECURITY: School isolation check
      const userSchoolId = req.school?.id || req.user!.schoolId;
      if (!req.school?.isPlatformOwner() && student?.schoolId !== userSchoolId) {
        return res.status(403).json({ message: "Session belongs to a different school" });
      }

      // Check authorization based on role
      let canDelete = false;
      let isStudentCancelling = false;

      // Platform owners can delete any session
      if (req.school?.isPlatformOwner()) {
        canDelete = true;
      }
      // School owners can delete sessions in their school
      else if (req.school?.isSchoolOwner()) {
        canDelete = true;
      }
      // Teachers can delete their own sessions
      else if (req.school?.isTeacher() && session.userId === req.user!.id) {
        canDelete = true;
      }
      // Students can cancel their own sessions
      else if (req.school?.isStudent() && student?.accountId === req.user!.id) {
        canDelete = true;
        isStudentCancelling = true;
      }

      if (!canDelete) {
        return res.status(403).json({ message: "You don't have permission to delete this session" });
      }

      // If student is cancelling, send notification message to teacher
      if (isStudentCancelling && student) {
        try {
          const { db } = await import("./db");
          const { studentMessages } = await import("@shared/schema");

          const startTime = new Date(session.startTime).toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          });

          await db.insert(studentMessages).values({
            studentId: session.studentId,
            teacherId: session.userId,
            subject: "Lesson Cancellation",
            message: `Student ${student.name} has cancelled their lesson "${session.title}" scheduled for ${startTime}.`,
            isRead: false,
            responseRead: false,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        } catch (messageError) {
          console.error("Failed to send cancellation notification:", messageError);
        }
      }

      await storage.deleteSession(id);
      res.status(204).end();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete session" });
    }
  });

  // Achievement definitions endpoints
  app.get("/api/achievements", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    
    try {
      const achievements = await storage.getAchievementDefinitions();
      res.json(achievements);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch achievements" });
    }
  });
  
  app.get("/api/achievements/:id", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    
    try {
      const id = parseInt(req.params.id);
      const achievement = await storage.getAchievementDefinition(id);
      
      if (!achievement) {
        return res.status(404).json({ message: "Achievement not found" });
      }
      
      res.json(achievement);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch achievement" });
    }
  });
  
  // NOTE: Student achievements route moved to server/routes/students.ts with proper security
  
  // NOTE: Student achievement checking route moved to server/routes/students.ts with proper security
  
  // NOTE: Achievement seen marking route moved to server/routes/students.ts with proper security
  
  // Student progress tracking endpoints
  app.get("/api/students/:studentId/progress", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    
    try {
      const studentId = parseInt(req.params.studentId);
      const student = await storage.getStudent(studentId);
      
      if (!student) {
        return res.status(404).json({ message: "Student not found" });
      }
      
      if (student.userId !== req.user!.id) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      // Get all the relevant data for this student
      const [
        assignments,
        achievements,
        practiceSessions,
        sessions
      ] = await Promise.all([
        storage.getStudentAssignments(studentId),
        storage.getStudentAchievements(studentId),
        storage.getStudentPracticeSessions(studentId),
        storage.getStudentSessions(studentId)
      ]);

      // Calculate progress statistics
      const completedAssignments = assignments.filter(a => a.completedDate);
      const pendingAssignments = assignments.filter(a => !a.completedDate);
      
      // Calculate practice time statistics
      const totalPracticeTime = practiceSessions.reduce((total, session) => {
        if (!session.endTime) return total;
        const duration = new Date(session.endTime).getTime() - new Date(session.startTime).getTime();
        return total + (duration / (1000 * 60)); // convert to minutes
      }, 0);
      
      // Get practice time by day for the last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const practiceByDay = practiceSessions.reduce((acc, session) => {
        if (!session.endTime) return acc;
        
        const startDate = new Date(session.startTime);
        if (startDate < thirtyDaysAgo) return acc;
        
        const dateKey = startDate.toISOString().slice(0, 10); // YYYY-MM-DD
        const duration = (new Date(session.endTime).getTime() - startDate.getTime()) / (1000 * 60); // minutes
        
        if (!acc[dateKey]) acc[dateKey] = 0;
        acc[dateKey] += duration;
        
        return acc;
      }, {} as Record<string, number>);
      
      // Get skills mastery data based on completed assignments
      const skillsMastery: Record<string, { total: number, completed: number }> = {};
      
      for (const assignment of assignments) {
        // Skip if no lesson (it might be just a song)
        if (!assignment.lessonId) continue;
        
        // Find the lesson to get its instrument and level
        const lesson = await storage.getLesson(assignment.lessonId);
        if (!lesson || !lesson.instrument) continue;
        
        const skill = lesson.instrument.toLowerCase();
        
        if (!skillsMastery[skill]) {
          skillsMastery[skill] = { total: 0, completed: 0 };
        }
        
        skillsMastery[skill].total++;
        if (assignment.completedDate) {
          skillsMastery[skill].completed++;
        }
      }
      
      // Format achievements data
      const achievementsByType: Record<string, any[]> = {};
      
      // Fetch achievement definitions for all student achievements
      for (const achievement of achievements) {
        try {
          const achievementDef = await storage.getAchievementDefinition(achievement.achievementId);
          if (!achievementDef) continue;
          
          const type = achievementDef.type;
          if (!achievementsByType[type]) achievementsByType[type] = [];
          
          achievementsByType[type].push({
            id: achievement.id,
            name: achievementDef.name,
            description: achievementDef.description,
            iconName: achievementDef.iconName,
            dateEarned: achievement.dateEarned,
            isNew: achievement.isNew
          });
        } catch (error) {
          console.error(`Error fetching achievement definition ${achievement.achievementId}:`, error);
        }
      }
      
      // Return the comprehensive progress data
      res.json({
        student: {
          id: student.id,
          name: student.name,
          instrument: student.instrument,
          level: student.level
        },
        overallProgress: {
          totalAssignments: assignments.length,
          completedAssignments: completedAssignments.length,
          completionRate: assignments.length ? 
            Math.round((completedAssignments.length / assignments.length) * 100) : 0,
          totalPracticeTime: Math.round(totalPracticeTime),
          totalPracticeSessions: practiceSessions.length,
          totalScheduledSessions: sessions.length,
          averagePracticeTimePerSession: practiceSessions.length ? 
            Math.round(totalPracticeTime / practiceSessions.length) : 0
        },
        practiceStats: {
          byDay: practiceByDay,
          recentSessions: practiceSessions
            .filter(ps => ps.endTime) // Only include completed sessions
            .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
            .slice(0, 10) // Get the 10 most recent sessions
        },
        skillsMastery: Object.entries(skillsMastery).map(([skill, data]) => ({
          skill,
          mastery: data.total ? Math.round((data.completed / data.total) * 100) : 0,
          totalLessons: data.total,
          completedLessons: data.completed
        })),
        achievements: {
          total: achievements.length,
          byType: achievementsByType,
          recent: achievements
            .sort((a, b) => new Date(b.dateEarned).getTime() - new Date(a.dateEarned).getTime())
            .slice(0, 5) // Get the 5 most recent achievements
        },
        assignmentDetails: {
          completed: completedAssignments,
          pending: pendingAssignments
        }
      });
    } catch (error) {
      console.error("Error fetching student progress:", error);
      res.status(500).json({ message: "Failed to fetch student progress data" });
    }
  });

  // Canonical teachers endpoint (school-scoped for assignment/scheduling UIs)
  app.get("/api/teachers", requireAuth, loadSchoolContext, requireTeacherOrOwner(), async (req: Request, res: Response) => {
    try {
      const schoolId = req.school?.id || req.user!.schoolId;
      const teachers = await storage.getUsersByRole("teacher");
      const schoolTeachers = schoolId
        ? teachers.filter((teacher) => teacher.schoolId === schoolId)
        : teachers;
      res.json(schoolTeachers);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch teachers" });
    }
  });
  // Dashboard stats endpoint
  app.get("/api/dashboard/stats",
    requireAuth,
    loadSchoolContext,
    async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const schoolId = req.school?.id || req.user!.schoolId;

      let students, songs, lessons, categories;

      // Platform owners see all data
      if (req.school?.isPlatformOwner()) {
        students = await storage.getStudents(userId);
        songs = await storage.getSongs(userId);
        lessons = await storage.getLessons(userId);
        categories = await storage.getLessonCategories(userId);
      }
      // School owners see ALL data in their school
      else if (req.school?.isSchoolOwner() && schoolId) {
        students = await storage.getStudentsBySchool(schoolId);
        songs = await storage.getSongsBySchool(schoolId);
        lessons = await storage.getLessonsBySchool(schoolId);
        categories = await storage.getLessonCategoriesBySchool(schoolId);
      }
      // Teachers see only their own data
      else if (req.school?.isTeacher()) {
        students = await storage.getStudentsForTeacher(userId);
        songs = await storage.getSongs(userId);
        lessons = await storage.getLessons(userId);
        categories = await storage.getLessonCategories(userId);
      }
      // Students see limited data
      else {
        students = [];
        songs = await storage.getSongs(userId);
        lessons = await storage.getLessons(userId);
        categories = await storage.getLessonCategories(userId);
      }

      res.json({
        students: students.length,
        songs: songs.length,
        lessons: lessons.length,
        categories: categories.length
      });
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });

  // Practice session endpoints
  app.get("/api/practice-sessions", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    try {
      const userId = req.user!.id;
      const practiceSessions = await storage.getPracticeSessions(userId);
      res.json(practiceSessions);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch practice sessions" });
    }
  });
  
  // NOTE: Student practice sessions route moved to server/routes/students.ts with proper security
  
  app.get("/api/practice-sessions/active", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    try {
      const activeSessions = await storage.getActiveStudentPracticeSessions();
      res.json(activeSessions);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch active practice sessions" });
    }
  });
  
  app.post("/api/practice-sessions", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    try {
      const practiceSession = await storage.createPracticeSession(req.body);
      
      // Notify the teacher via WebSocket
      const student = await storage.getStudent(req.body.studentId);
      if (student) {
        const wsManager = (app as any).wsManager;
        wsManager.sendNotification(student.userId, {
          type: "practice_started",
          data: {
            studentId: student.id,
            studentName: student.name,
            sessionId: practiceSession.id,
            timestamp: new Date()
          }
        });
      }
      
      res.status(201).json(practiceSession);
    } catch (error) {
      res.status(500).json({ message: "Failed to create practice session" });
    }
  });
  
  app.post("/api/practice-sessions/:id/end", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    try {
      const sessionId = parseInt(req.params.id);
      const updatedSession = await storage.endPracticeSession(sessionId);
      
      // Update notes if provided
      if (req.body.notes) {
        await storage.updateSession(sessionId, { notes: req.body.notes });
      }
      
      // Notify teacher via WebSocket
      const student = await storage.getStudent(updatedSession.studentId);
      if (student) {
        const wsManager = (app as any).wsManager;
        wsManager.sendNotification(student.userId, {
          type: "practice_ended",
          data: {
            studentId: student.id,
            studentName: student.name,
            sessionId: updatedSession.id,
            timestamp: new Date()
          }
        });
      }
      
      res.json(updatedSession);
    } catch (error) {
      res.status(500).json({ message: "Failed to end practice session" });
    }
  });

  // Configure multer for CSV file uploads
  const upload = multer({
    storage: multer.diskStorage({
      destination: (req, file, cb) => {
        const uploadDir = 'uploads';
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
      },
      filename: (req, file, cb) => {
        const timestamp = Date.now();
        const extension = path.extname(file.originalname);
        cb(null, `${file.fieldname}_${timestamp}${extension}`);
      }
    }),
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB limit
    },
    fileFilter: (req, file, cb) => {
      if (file.mimetype === 'text/csv' || file.originalname.toLowerCase().endsWith('.csv')) {
        cb(null, true);
      } else {
        cb(new Error('Only CSV files are allowed'), false);
      }
    }
  });

  // MusicDott 2.0 Import Endpoints - Students
  app.post("/api/import/students", requireAuth, loadSchoolContext, requireTeacherOrOwner(), async (req: any, res: Response) => {
    try {
      // Validate request body
      const { filePath, schoolId } = req.body;
      const requestedSchoolId = typeof schoolId === "number"
        ? schoolId
        : schoolId
          ? Number.parseInt(String(schoolId), 10)
          : undefined;
      const targetSchoolId = requestedSchoolId ?? req.school?.id ?? req.user?.schoolId;
      
      if (!filePath) {
        return res.status(400).json({ 
          success: false,
          message: "filePath is required" 
        });
      }

      if (!targetSchoolId || !canAccessSchoolId(req, targetSchoolId)) {
        return res.status(403).json({
          success: false,
          message: "You don't have access to import students for this school"
        });
      }

      // Security: Restrict file access to ./export directory only
      const normalizedPath = path.normalize(filePath);
      if (!normalizedPath.startsWith('export/') || normalizedPath.includes('../')) {
        return res.status(400).json({ 
          success: false,
          message: "Invalid file path. Only files in ./export directory are allowed" 
        });
      }

      // Check if file exists
      const fullPath = path.resolve(normalizedPath);
      if (!fs.existsSync(fullPath)) {
        return res.status(404).json({ 
          success: false,
          message: "Import file not found" 
        });
      }

      // Execute the import
      const result = await importStudents(normalizedPath, targetSchoolId);
      
      res.json({
        success: true,
        message: "Student import completed",
        stats: {
          imported: result.imported,
          updated: result.updated,
          failed: result.failed,
          total: result.imported + result.updated + result.failed
        },
        errors: result.errors || []
      });

    } catch (error) {
      console.error("Error importing students:", error);
      res.status(500).json({ 
        success: false,
        message: "Import failed",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // MusicDott 2.0 Import Endpoints - Schedules
  app.post("/api/import/schedule", requireAuth, loadSchoolContext, requireTeacherOrOwner(), async (req: any, res: Response) => {
    try {
      // Validate request body
      const { filePath, defaultUserId } = req.body;
      const targetUserId = typeof defaultUserId === "number"
        ? defaultUserId
        : defaultUserId
          ? Number.parseInt(String(defaultUserId), 10)
          : req.user.id;
      
      if (!filePath) {
        return res.status(400).json({ 
          success: false,
          message: "filePath is required" 
        });
      }

      if (!Number.isInteger(targetUserId) || targetUserId <= 0) {
        return res.status(400).json({
          success: false,
          message: "Invalid default user"
        });
      }

      if (!req.school?.isPlatformOwner()) {
        if (req.user.role === "teacher" && targetUserId !== req.user.id) {
          return res.status(403).json({
            success: false,
            message: "Teachers can only import schedules for themselves"
          });
        }

        const targetUser = targetUserId === req.user.id ? req.user : await storage.getUser(targetUserId);
        if (!targetUser) {
          return res.status(404).json({
            success: false,
            message: "Import target user not found"
          });
        }

        if (!canAccessSchoolId(req, targetUser.schoolId)) {
          return res.status(403).json({
            success: false,
            message: "You don't have access to import schedules for this user"
          });
        }
      }

      // Security: Restrict file access to ./export directory only
      const normalizedPath = path.normalize(filePath);
      if (!normalizedPath.startsWith('export/') || normalizedPath.includes('../')) {
        return res.status(400).json({ 
          success: false,
          message: "Invalid file path. Only files in ./export directory are allowed" 
        });
      }

      // Check if file exists
      const fullPath = path.resolve(normalizedPath);
      if (!fs.existsSync(fullPath)) {
        return res.status(404).json({ 
          success: false,
          message: "Import file not found" 
        });
      }

      // Execute the import
      const result = await importSchedule(normalizedPath, targetUserId);
      
      res.json({
        success: true,
        message: "Schedule import completed",
        stats: {
          imported: result.imported,
          updated: result.updated,
          failed: result.failed,
          total: result.imported + result.updated + result.failed
        },
        errors: result.errors || []
      });

    } catch (error) {
      console.error("Error importing schedule:", error);
      res.status(500).json({ 
        success: false,
        message: "Import failed",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // CSV to JSON conversion endpoint
  app.post("/api/import/csv-convert", requireAuth, upload.fields([
    { name: 'songs', maxCount: 1 },
    { name: 'lessons', maxCount: 1 }
  ]), async (req: any, res: Response) => {
    try {
      const user = req.user as any;
      if (!user) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      
      if (!files || (!files.songs && !files.lessons)) {
        return res.status(400).json({ message: "At least one CSV file (songs or lessons) is required" });
      }

      let songsFile = files.songs ? files.songs[0].path : null;
      let lessonsFile = files.lessons ? files.lessons[0].path : null;
      
      // Prepare conversion command
      const args = ['python', 'scripts/convert_csv_to_json.py'];
      if (songsFile) args.push('--songs', songsFile);
      if (lessonsFile) args.push('--notatie', lessonsFile);
      args.push('--outdir', 'export');

      // Run CSV to JSON conversion
      try {
        execSync(args.join(' '), { 
          stdio: 'pipe',
          cwd: process.cwd(),
          timeout: 30000 // 30 second timeout
        });
      } catch (conversionError) {
        console.error('CSV conversion failed:', conversionError);
        return res.status(500).json({ 
          message: "CSV conversion failed", 
          details: conversionError instanceof Error ? conversionError.message : "Unknown error"
        });
      }

      // Read converted JSON files
      let songsData = [];
      let lessonsData = [];
      
      if (songsFile && fs.existsSync('export/musicdott2_songs.json')) {
        const songsJson = fs.readFileSync('export/musicdott2_songs.json', 'utf-8');
        songsData = JSON.parse(songsJson);
      }
      
      if (lessonsFile && fs.existsSync('export/musicdott2_lessons.json')) {
        const lessonsJson = fs.readFileSync('export/musicdott2_lessons.json', 'utf-8');
        lessonsData = JSON.parse(lessonsJson);
      }

      // Import using existing import utility
      const importUtil = new ImportUtility();
      let results = { songs: { success: 0, failed: 0 }, lessons: { success: 0, failed: 0 } };
      
      if (songsData.length > 0) {
        results.songs = await importUtil.batchImportSongs(user.id, songsData);
      }
      
      if (lessonsData.length > 0) {
        results.lessons = await importUtil.batchImportLessons(user.id, lessonsData);
      }

      // Clean up uploaded files
      if (songsFile) fs.unlinkSync(songsFile);
      if (lessonsFile) fs.unlinkSync(lessonsFile);

      res.json({
        message: "CSV import completed",
        results,
        converted: {
          songs: songsData.length,
          lessons: lessonsData.length
        }
      });

    } catch (error) {
      console.error("CSV import error:", error);
      res.status(500).json({ 
        message: "CSV import failed", 
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Import routes for migrating from old MusicDott system
  app.post("/api/import/preview", requireAuth, async (req: Request, res: Response) => {
    try {
      const { content } = req.body;
      
      if (!content) {
        return res.status(400).json({ message: "Content is required" });
      }

      const importUtil = new ImportUtility();
      
      const preview = importUtil.previewContentConversion(content);
      res.json(preview);
    } catch (error) {
      console.error("Error previewing content conversion:", error);
      res.status(500).json({ message: "Failed to preview content conversion" });
    }
  });

  // Complete import (students + schedule)
  app.post("/api/import/complete", requireAuth, async (req: Request, res: Response) => {
    try {
      const { studentsPath, schedulePath } = req.body;
      
      if (!studentsPath || !schedulePath) {
        return res.status(400).json({ message: "Both students and schedule file paths are required" });
      }

      const [{ importStudents }, { importSchedule }] = await Promise.all([
        import('./importStudents'),
        import('./importSchedule')
      ]);

      // Import students first, then schedule
      const studentsResult = await importStudents(studentsPath);
      const scheduleResult = await importSchedule(schedulePath);
      
      res.json({
        message: "Complete import finished",
        results: {
          students: studentsResult,
          schedule: scheduleResult
        }
      });
    } catch (error) {
      console.error("Error in complete import:", error);
      res.status(500).json({ message: "Failed to complete import" });
    }
  });

  app.post("/api/import/songs", requireAuth, async (req: Request, res: Response) => {
    try {
      const user = req.user as any;
      if (!user) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const { songs } = req.body;
      
      if (!Array.isArray(songs)) {
        return res.status(400).json({ message: "Songs data must be an array" });
      }

      const importUtil = new ImportUtility();
      
      const result = await importUtil.batchImportSongs(user.id, songs);
      res.json(result);
    } catch (error) {
      console.error("Error importing songs:", error);
      res.status(500).json({ message: "Failed to import songs" });
    }
  });

  app.post("/api/import/lessons", requireAuth, async (req: Request, res: Response) => {
    try {
      const user = req.user as any;
      if (!user) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const { lessons } = req.body;
      
      if (!Array.isArray(lessons)) {
        return res.status(400).json({ message: "Lessons data must be an array" });
      }

      const importUtil = new ImportUtility();
      
      const result = await importUtil.batchImportLessons(user.id, lessons);
      res.json(result);
    } catch (error) {
      console.error("Error importing lessons:", error);
      res.status(500).json({ message: "Failed to import lessons" });
    }
  });

  if (!minimal) {
    // Register subscription routes
    app.use("/api/subscriptions", (await import("./routes/subscriptions")).default);
  }
  
  const httpServer = server ?? createServer(app);

  // Admin debug endpoints
  app.get('/api/admin/storage-status', async (req, res) => {
    try {
      // Check if we're using database or memory storage
      const isDatabaseConnected = req.app.locals.databaseConnected || false;
      const currentUserId = req.user?.id || 1; // Default to user 1 (drumschoolstefanvandebrug)
      
      // Get current data statistics from storage
      let dataStats = {
        students: 0,
        lessons: 0,
        songs: 0,
        categories: 0
      };
      
      try {
        const students = await storage.getStudents(currentUserId);
        const lessons = await storage.getLessons(currentUserId);
        const songs = await storage.getSongs(currentUserId);
        const categories = await storage.getLessonCategories(currentUserId);
        
        dataStats = {
          students: students.length,
          lessons: lessons.length,
          songs: songs.length,
          categories: categories.length
        };
      } catch (error) {
        console.error('Error getting storage stats:', error);
      }
      
      const message = isDatabaseConnected 
        ? 'PostgreSQL database connection active - all data persisted permanently'
        : 'Database unavailable - using memory fallback with authentic Stefan van de Brug Drum School data';
      
      const recommendation = isDatabaseConnected 
        ? 'All changes are automatically saved to the database'
        : 'Data is preserved in memory during this session. Original MusicDott data from CSV imports remains available.';
      
      res.json({
        type: isDatabaseConnected ? 'database' : 'memory',
        connected: isDatabaseConnected,
        message,
        recommendation,
        userCount: 1,
        dataStats
      });
    } catch (error) {
      console.error('Storage status error:', error);
      res.json({
        type: 'memory',
        connected: false,
        message: 'Storage status check failed',
        recommendation: 'Please refresh the page or contact support if the issue persists',
        userCount: 1,
        dataStats: {
          students: 0,
          lessons: 0,
          songs: 0,
          categories: 0
        }
      });
    }
  });

  // Owner Login API Endpoint (separate from regular authentication)
  app.post("/api/owner/login", verifySameOrigin, ownerAuthRateLimit, async (req: Request, res: Response, next) => {
    try {
      const { username, password } = ownerLoginSchema.parse(req.body);

      // Verify platform owner credentials
      const user = await storage.getUserByUsernameForAuth(username);
      
      if (!user || user.role !== 'platform_owner') {
        return res.status(401).json({ message: "Invalid administrator credentials" });
      }

      const isValidPassword = await comparePasswords(password, user.password);
      
      if (!isValidPassword) {
        return res.status(401).json({ message: "Invalid administrator credentials" });
      }

      req.login(user, async (loginError) => {
        if (loginError) {
          return next(loginError);
        }

        try {
          await storage.updateUser(user.id!, { lastLoginAt: new Date() });
        } catch (updateError) {
          console.warn("Failed to update owner last login time", updateError);
        }

        res.json({ message: "Administrator authentication successful" });
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          message: "Invalid administrator login data",
          errors: error.errors,
        });
      }

      next(error);
    }
  });

  // Stripe webhook endpoint with signature verification
  app.post("/api/webhooks/stripe", async (req: Request, res: Response) => {
    try {
      const { enhancedStripeService } = require("./services/enhanced-stripe-service");
      const signature = req.headers['stripe-signature'] as string;
      const payload = JSON.stringify(req.body);
      
      // Verify webhook signature
      const isValid = enhancedStripeService.verifyWebhookSignature(payload, signature);
      if (!isValid) {
        return res.status(400).json({ error: "Invalid webhook signature" });
      }

      // Process the webhook event
      const event = req.body;
      console.log(`📨 Stripe webhook received: ${event.type}`);

      switch (event.type) {
        case 'payment_intent.succeeded':
          // Handle successful payment
          const paymentIntent = event.data.object;
          console.log(`✅ Payment succeeded: ${paymentIntent.id}`);
          break;
          
        case 'payment_intent.payment_failed':
          // Handle failed payment
          const failedPayment = event.data.object;
          console.log(`❌ Payment failed: ${failedPayment.id}`);
          break;
          
        case 'customer.subscription.updated':
          // Handle subscription changes
          const subscription = event.data.object;
          console.log(`🔄 Subscription updated: ${subscription.id}`);
          break;
          
        default:
          console.log(`🔔 Unhandled webhook type: ${event.type}`);
      }

      res.json({ received: true });
    } catch (error) {
      console.error("Error processing Stripe webhook:", error);
      res.status(500).json({ error: "Webhook processing failed" });
    }
  });

  // Test endpoint for billing calculation with audit tracking
  app.post("/api/test/billing-calculation", async (req: Request, res: Response) => {
    try {
      const { teachers, students, currentPlan } = req.body;
      
      // Mock billing calculation logic
      let plan = currentPlan === 'auto' ? (teachers > 1 ? 'pro' : 'standard') : currentPlan;
      let basePrice = plan === 'pro' ? 49.95 : 29.95;
      let includedStudents = plan === 'pro' ? 50 : 25;
      
      let extraStudents = Math.max(0, students - includedStudents);
      let extraBlocks = Math.ceil(extraStudents / 5);
      let extraCost = extraBlocks * 4.50;
      
      let total = basePrice + extraCost;
      
      const result = {
        basePlan: { name: plan, price: basePrice },
        additionalCosts: extraBlocks > 0 ? [{
          description: `${extraBlocks} extra student blocks (${extraStudents} students)`,
          price: extraCost
        }] : [],
        total: total
      };
      
      res.json(result);
    } catch (error) {
      console.error("Error calculating billing:", error);
      res.status(500).json({ message: "Failed to calculate billing" });
    }
  });

  // Educational Content Management API Routes
  app.get("/api/educational-content", async (req: Request, res: Response) => {
    try {
      const { db } = await import("./db");
      const { educationalContent } = await import("@shared/schema");
      const { desc } = await import("drizzle-orm");
      
      const content = await db.select().from(educationalContent).orderBy(desc(educationalContent.createdAt));
      res.json(content);
    } catch (error) {
      console.error("Error fetching educational content:", error);
      res.status(500).json({ message: "Failed to fetch content" });
    }
  });

  app.post("/api/educational-content", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || req.user?.role !== 'school') {
      return res.status(403).json({ message: "Only platform owners can create content" });
    }
    
    try {
      const { db } = await import("./db");
      const { educationalContent, insertEducationalContentSchema } = await import("@shared/schema");
      
      const validatedData = insertEducationalContentSchema.parse(req.body);
      
      const [newContent] = await db.insert(educationalContent).values({
        ...validatedData,
        authorId: req.user.id,
        contentBlocks: validatedData.contentBlocks || [],
      }).returning();
      
      res.status(201).json(newContent);
    } catch (error: any) {
      console.error("Error creating educational content:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid content data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create content" });
    }
  });

  app.put("/api/educational-content/:id", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || req.user?.role !== 'school') {
      return res.status(403).json({ message: "Only platform owners can update content" });
    }
    
    try {
      const { db } = await import("./db");
      const { educationalContent } = await import("@shared/schema");
      const { eq } = await import("drizzle-orm");
      
      const id = parseInt(req.params.id);
      const updateData = { 
        ...req.body, 
        updatedAt: new Date(),
        contentBlocks: req.body.contentBlocks || []
      };
      
      const [updatedContent] = await db.update(educationalContent)
        .set(updateData)
        .where(eq(educationalContent.id, id))
        .returning();
      
      if (!updatedContent) {
        return res.status(404).json({ message: "Content not found" });
      }
      
      res.json(updatedContent);
    } catch (error) {
      console.error("Error updating educational content:", error);
      res.status(500).json({ message: "Failed to update content" });
    }
  });

  app.delete("/api/educational-content/:id", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || req.user?.role !== 'school') {
      return res.status(403).json({ message: "Only platform owners can delete content" });
    }
    
    try {
      const { db } = await import("./db");
      const { educationalContent } = await import("@shared/schema");
      const { eq } = await import("drizzle-orm");
      
      const id = parseInt(req.params.id);
      
      const [deletedContent] = await db.delete(educationalContent)
        .where(eq(educationalContent.id, id))
        .returning();
      
      if (!deletedContent) {
        return res.status(404).json({ message: "Content not found" });
      }
      
      res.json({ message: "Content deleted successfully" });
    } catch (error) {
      console.error("Error deleting educational content:", error);
      res.status(500).json({ message: "Failed to delete content" });
    }
  });

  // Get content for the public resources page (published content only)
  app.get("/api/resources", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    
    try {
      const { db } = await import("./db");
      const { educationalContent } = await import("@shared/schema");
      const { eq, desc } = await import("drizzle-orm");
      
      const userRole = req.user?.role;
      let whereClause;
      
      if (userRole === 'school') {
        // Owners see all content
        whereClause = eq(educationalContent.isPublished, true);
      } else {
        // Teachers see content for teachers or both
        whereClause = eq(educationalContent.isPublished, true);
      }
      
      const content = await db.select().from(educationalContent)
        .where(whereClause)
        .orderBy(desc(educationalContent.isFeatured), desc(educationalContent.createdAt));
      
      // Filter by target audience on the application level
      const filteredContent = content.filter(item => {
        if (userRole === 'school') return true; // Owners see everything
        return item.targetAudience === 'teachers' || item.targetAudience === 'both';
      });
      
      res.json(filteredContent);
    } catch (error) {
      console.error("Error fetching resources:", error);
      res.status(500).json({ message: "Failed to fetch resources" });
    }
  });

  // NOTE: Registration endpoint is handled in server/auth.ts

  // Student authentication optimization for thousands of concurrent users
  app.post("/api/student/auth", async (req: Request, res: Response) => {
    try {
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ message: "Username and password required" });
      }

      // Use optimized student authentication
      const student = await storage.getStudentByUsername(username);
      
      if (!student) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      if (!student.password) {
        return res.status(401).json({ message: "Account not activated" });
      }

      // Verify password with bcrypt
      const bcrypt = await import('bcrypt');
      const passwordMatch = await bcrypt.compare(password, student.password);
      
      if (!passwordMatch) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Update last login time asynchronously
      storage.updateStudentLoginTime(student.id).catch(err => 
        console.error("Failed to update student login time:", err)
      );

      // Return student data for session
      res.json({
        success: true,
        student: {
          id: student.id,
          name: student.name,
          email: student.email,
          instrument: student.instrument,
          level: student.level,
          assignedTeacherId: student.assignedTeacherId
        }
      });

    } catch (error) {
      console.error("Student authentication error:", error);
      res.status(500).json({ message: "Authentication failed" });
    }
  });

  // Admin/Teacher password reset for students
  app.post("/api/admin/students/:id/reset-password", 
    requireAuth,
    loadSchoolContext,
    requireTeacherOrOwner(),
    async (req: Request, res: Response) => {
    try {
      const studentId = parseInt(req.params.id);
      
      if (isNaN(studentId)) {
        return res.status(400).json({ message: "Invalid student ID" });
      }

      // Verify student exists and belongs to the same school
      const student = await storage.getStudent(studentId);
      if (!student) {
        return res.status(404).json({ message: "Student not found" });
      }

      // Ensure student belongs to the same school for multi-tenant security
      if (!req.school?.isPlatformOwner() && !req.school?.canAccessSchool(student.schoolId)) {
        return res.status(403).json({ message: "Access denied - student not in your school" });
      }

      // Reset password using the service
      await resetStudentPassword(studentId);
      
      res.json({ 
        message: "Password reset successfully", 
        studentId,
        newPassword: "Drumles2025!", // Show default password to admin
        mustChangePassword: true 
      });

    } catch (error) {
      console.error("Error resetting student password:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      res.status(500).json({ message: `Failed to reset password: ${errorMessage}` });
    }
  });

  // Admin song data cleanup endpoint
  app.post("/api/admin/cleanup-songs",
    requireAuth,
    loadSchoolContext,
    requireTeacherOrOwner(),
    async (req: Request, res: Response) => {
    try {
      console.log(`Starting song cleanup for user ${req.user!.id} in school ${req.user!.schoolId}`);
      
      // Get the school ID from authenticated user context
      const schoolId = req.user!.schoolId;
      
      if (!schoolId) {
        return res.status(400).json({ 
          message: "No school context available for cleanup" 
        });
      }

      // Call the utility function to fix corrupted songs
      const fixedCount = await fixExistingCorruptedSongs(schoolId);
      
      console.log(`Song cleanup completed: ${fixedCount} songs fixed for school ${schoolId}`);
      
      res.json({
        success: true,
        message: "Song cleanup completed successfully",
        statistics: {
          songsFixed: fixedCount,
          schoolId: schoolId,
          processedAt: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error("Error during song cleanup:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      res.status(500).json({ 
        success: false,
        message: `Song cleanup failed: ${errorMessage}` 
      });
    }
  });

  // ========================================
  // SETTINGS API ENDPOINTS - CRITICAL PRODUCTION FIX FOR STEFAN
  // ========================================
  
  // User Profile Endpoints
  app.get("/api/user/profile", requireAuth, async (req: Request, res: Response) => {
    try {
      console.log("Getting user profile for user:", req.user!.id);
      
      const profile = await storage.getCurrentUserProfile(req.user!.id);
      
      if (!profile) {
        return res.status(404).json({ message: "User profile not found" });
      }

      // Return profile without sensitive fields
      const { password, ...safeProfile } = profile;
      res.json(safeProfile);
    } catch (error) {
      console.error("Error getting user profile:", error);
      res.status(500).json({ message: "Failed to get user profile" });
    }
  });

  app.put("/api/user/profile", requireAuth, async (req: Request, res: Response) => {
    try {
      console.log("Updating user profile for user:", req.user!.id);
      
      // Validate request body
      const validatedData = profileUpdateSchema.parse(req.body);
      
      const updatedProfile = await storage.updateCurrentUserProfile(req.user!.id, validatedData);
      
      // Return updated profile without sensitive fields
      const { password, ...safeProfile } = updatedProfile;
      res.json(safeProfile);
    } catch (error) {
      console.error("Error updating user profile:", error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Invalid profile data", 
          errors: error.errors 
        });
      }
      
      res.status(500).json({ message: "Failed to update user profile" });
    }
  });

  // PATCH alias for profile updates (supports avatar customization)
  app.patch("/api/user/profile", requireAuth, async (req: Request, res: Response) => {
    try {
      console.log("Patching user profile for user:", req.user!.id, "with:", Object.keys(req.body));
      
      // For PATCH, use partial validation - allow only valid profile fields
      const partialProfileSchema = profileUpdateSchema.partial();
      const validatedData = partialProfileSchema.parse(req.body);
      
      // Only update if there's valid data
      if (Object.keys(validatedData).length === 0) {
        return res.status(400).json({ message: "No valid profile fields provided" });
      }
      
      const updatedProfile = await storage.updateCurrentUserProfile(req.user!.id, validatedData);
      
      // Return updated profile without sensitive fields
      const { password, ...safeProfile } = updatedProfile;
      res.json(safeProfile);
    } catch (error) {
      console.error("Error patching user profile:", error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Invalid profile data", 
          errors: error.errors 
        });
      }
      
      res.status(500).json({ message: "Failed to update user profile" });
    }
  });

  // School Settings Endpoints
  app.get("/api/school/settings", requireAuth, loadSchoolContext, requireTeacherOrOwner(), async (req: Request, res: Response) => {
    try {
      console.log("Getting school settings for school:", req.user!.schoolId);
      
      if (!req.user!.schoolId) {
        return res.status(400).json({ message: "No school context available" });
      }
      
      const schoolSettings = await storage.getSchoolSettings(req.user!.schoolId);
      
      if (!schoolSettings) {
        return res.status(404).json({ message: "School settings not found" });
      }

      res.json(schoolSettings);
    } catch (error) {
      console.error("Error getting school settings:", error);
      res.status(500).json({ message: "Failed to get school settings" });
    }
  });

  // Only school owners can modify school settings
  app.put("/api/school/settings", requireAuth, loadSchoolContext, async (req: Request, res: Response) => {
    try {
      console.log("Updating school settings for school:", req.user!.schoolId, "by user:", req.user!.id);
      
      if (!req.user!.schoolId) {
        return res.status(400).json({ message: "No school context available" });
      }
      
      // Check if user is school owner (more restrictive than teacher for school settings)
      if (req.user!.role !== 'school_owner' && req.user!.role !== 'platform_owner') {
        return res.status(403).json({ 
          message: "Only school owners can modify school settings" 
        });
      }
      
      // Validate request body
      const validatedData = schoolSettingsUpdateSchema.parse(req.body);
      
      const updatedSettings = await storage.updateSchoolSettings(req.user!.schoolId, validatedData);
      
      res.json(updatedSettings);
    } catch (error) {
      console.error("Error updating school settings:", error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Invalid school settings data", 
          errors: error.errors 
        });
      }
      
      res.status(500).json({ message: "Failed to update school settings" });
    }
  });

  // User Notification Settings
  app.get("/api/user/notifications", requireAuth, async (req: Request, res: Response) => {
    try {
      console.log("Getting notification settings for user:", req.user!.id);
      
      const notifications = await storage.getUserNotifications(req.user!.id);
      
      // Return sensible defaults if no settings exist
      if (!notifications) {
        const defaultNotifications = {
          lessonReminders: true,
          assignmentDeadlines: true,
          practiceGoals: true,
          systemUpdates: false,
          marketingEmails: false
        };
        return res.json(defaultNotifications);
      }

      res.json(notifications.settings);
    } catch (error) {
      console.error("Error getting notification settings:", error);
      res.status(500).json({ message: "Failed to get notification settings" });
    }
  });

  app.put("/api/user/notifications", requireAuth, async (req: Request, res: Response) => {
    try {
      console.log("Updating notification settings for user:", req.user!.id);
      
      // Validate request body
      const validatedData = notificationSettingsSchema.parse(req.body);
      
      const updatedNotifications = await storage.upsertUserNotifications(req.user!.id, validatedData);
      
      res.json(updatedNotifications.settings);
    } catch (error) {
      console.error("Error updating notification settings:", error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Invalid notification settings data", 
          errors: error.errors 
        });
      }
      
      res.status(500).json({ message: "Failed to update notification settings" });
    }
  });

  // Get school dashboard stats
  app.get("/api/school/dashboard-stats", requireAuth, loadSchoolContext, requireTeacherOrOwner(), async (req: Request, res: Response) => {
    try {
      const schoolId = req.user!.schoolId;
      
      const result = await db.execute(sql`
        SELECT 
          COUNT(DISTINCT CASE WHEN u.role IN ('teacher', 'school_owner') THEN u.id END) as total_teachers,
          COUNT(DISTINCT st.id) as total_students,
          COUNT(DISTINCT l.id) as total_lessons,
          COUNT(DISTINCT sg.id) as total_songs,
          COUNT(DISTINCT sess.id) as total_sessions,
          COUNT(DISTINCT CASE WHEN st.created_at >= date_trunc('month', CURRENT_DATE) THEN st.id END) as new_students_this_month,
          COUNT(DISTINCT CASE WHEN sess.start_time >= date_trunc('month', CURRENT_DATE) THEN sess.id END) as sessions_this_month
        FROM users u
        LEFT JOIN students st ON u.id = st.user_id
        LEFT JOIN lessons l ON u.id = l.user_id
        LEFT JOIN songs sg ON u.id = sg.user_id
        LEFT JOIN sessions sess ON st.id = sess.student_id
        WHERE u.school_id = ${schoolId}
      `);

      res.json(result.rows[0]);
    } catch (error) {
      console.error("Error fetching school dashboard stats:", error);
      res.status(500).json({ message: "Failed to fetch school dashboard statistics" });
    }
  });

  // Get school student activity
  app.get("/api/school/student-activity", requireAuth, loadSchoolContext, requireTeacherOrOwner(), async (req: Request, res: Response) => {
    try {
      const schoolId = req.user!.schoolId;
      
      const result = await db.execute(sql`
        SELECT 
          st.id,
          st.name as student_name,
          COUNT(ps.id) as practice_count,
          SUM(ps.duration) as total_practice_time,
          MAX(ps.start_time) as last_practice_date,
          u.last_login_at
        FROM students st
        JOIN users u ON st.user_id = u.id
        LEFT JOIN practice_sessions ps ON st.id = ps.student_id
        WHERE u.school_id = ${schoolId}
        GROUP BY st.id, st.name, u.last_login_at
        ORDER BY last_practice_date DESC NULLS LAST
        LIMIT 10
      `);

      res.json(result.rows);
    } catch (error) {
      console.error("Error fetching student activity:", error);
      res.status(500).json({ message: "Failed to fetch student activity" });
    }
  });

  // Get school performance trends
  app.get("/api/school/performance-trends", requireAuth, loadSchoolContext, requireTeacherOrOwner(), async (req: Request, res: Response) => {
    try {
      const schoolId = req.user!.schoolId;
      
      const result = await db.execute(sql`
        WITH monthly_data AS (
          SELECT 
            TO_CHAR(DATE_TRUNC('month', ps.start_time), 'Mon YYYY') as month,
            COUNT(DISTINCT ps.student_id) as active_students,
            COUNT(ps.id) as total_sessions,
            SUM(ps.duration) as total_duration
          FROM practice_sessions ps
          JOIN students st ON ps.student_id = st.id
          JOIN users u ON st.user_id = u.id
          WHERE u.school_id = ${schoolId}
            AND ps.start_time >= CURRENT_DATE - interval '6 months'
          GROUP BY DATE_TRUNC('month', ps.start_time)
          ORDER BY DATE_TRUNC('month', ps.start_time)
        )
        SELECT * FROM monthly_data
      `);

      res.json(result.rows);
    } catch (error) {
      console.error("Error fetching performance trends:", error);
      res.status(500).json({ message: "Failed to fetch performance trends" });
    }
  });

  // User Preference Settings
  app.get("/api/user/preferences", requireAuth, async (req: Request, res: Response) => {
    try {
      console.log("Getting preference settings for user:", req.user!.id);
      
      const preferences = await storage.getUserPreferences(req.user!.id);
      
      // Return sensible defaults if no settings exist
      if (!preferences) {
        const defaultPreferences = {
          theme: 'system',
          language: 'en',
          timezone: 'Europe/Amsterdam',
          dateFormat: 'DD/MM/YYYY',
          timeFormat: '24h'
        };
        return res.json(defaultPreferences);
      }

      res.json(preferences.settings);
    } catch (error) {
      console.error("Error getting preference settings:", error);
      res.status(500).json({ message: "Failed to get preference settings" });
    }
  });

  app.put("/api/user/preferences", requireAuth, async (req: Request, res: Response) => {
    try {
      console.log("Updating preference settings for user:", req.user!.id);
      
      // Validate request body
      const validatedData = preferenceSettingsSchema.parse(req.body);
      
      const updatedPreferences = await storage.upsertUserPreferences(req.user!.id, validatedData);
      
      res.json(updatedPreferences.settings);
    } catch (error) {
      console.error("Error updating preference settings:", error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Invalid preference settings data", 
          errors: error.errors 
        });
      }
      
      res.status(500).json({ message: "Failed to update preference settings" });
    }
  });

  // Password Change Endpoint (with rate limiting for security)
  app.put("/api/user/password", requireAuth, verifySameOrigin, passwordChangeRateLimit, async (req: Request, res: Response) => {
    try {
      const validatedData = passwordChangeRequestSchema.parse(req.body);

      await changeAuthenticatedUserPassword(
        req.user!,
        validatedData.currentPassword,
        validatedData.newPassword,
      );
      
      res.json({ 
        message: "Password updated successfully",
        success: true 
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Invalid password data", 
          errors: error.errors 
        });
      }
      
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      // Return specific error messages for password validation
      if (errorMessage.includes("Current password is incorrect")) {
        return res.status(400).json({ message: "Current password is incorrect" });
      }
      
      if (errorMessage.includes("User not found")) {
        return res.status(404).json({ message: "User not found" });
      }
      
      console.error("Error changing password:", error);
      res.status(500).json({ message: "Failed to change password" });
    }
  });

  // ========================================
  // END SETTINGS API ENDPOINTS
  // ========================================

  // ========================================
  // CRON HEALTH MONITORING API ENDPOINTS
  // ========================================
  
  if (!minimal) {
    // Import cron health monitor
    const { cronHealthMonitor } = await import("./services/cron-health-monitor");

    // Public health check for cron jobs (minimal info) - NO AUTH
    app.get("/health/cron", async (req: Request, res: Response) => {
      try {
        const summary = await cronHealthMonitor.getHealthSummary();
        
        res.json({
          success: true,
          timestamp: new Date().toISOString(),
          stats: {
            totalJobs: summary.totalJobs,
            activeJobs: summary.activeJobs,
            healthyJobs: summary.healthyJobs,
            failingJobs: summary.failingJobs,
          },
          jobs: summary.jobs.map(job => ({
            name: job.jobName,
            status: job.lastRunStatus,
            nextRun: job.nextScheduledRun,
            lastRun: job.lastRunAt,
          })),
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        res.status(500).json({
          success: false,
          error: errorMessage,
        });
      }
    });

    // Admin endpoint: Get comprehensive health summary (with auth - platform/school owners only)
    app.get("/api/admin/cron-health", requireAuth, loadSchoolContext, authzRequireSchoolOwner(), async (req: Request, res: Response) => {
      try {
        const summary = await cronHealthMonitor.getHealthSummary();
        
        res.json({
          success: true,
          timestamp: new Date().toISOString(),
          summary,
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        res.status(500).json({
          success: false,
          error: errorMessage,
        });
      }
    });

    // Admin endpoint: Get specific job health (with auth - platform/school owners only)
    app.get("/api/admin/cron-health/:jobName", requireAuth, loadSchoolContext, authzRequireSchoolOwner(), async (req: Request, res: Response) => {
      try {
        const { jobName } = req.params;
        const jobHealth = await cronHealthMonitor.getJobHealth(jobName);
        
        if (!jobHealth) {
          return res.status(404).json({
            success: false,
            error: `Job '${jobName}' not found`,
          });
        }

        res.json({
          success: true,
          job: jobHealth,
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        res.status(500).json({
          success: false,
          error: errorMessage,
        });
      }
    });
  }

  // ========================================
  // END CRON HEALTH MONITORING API ENDPOINTS
  // ========================================

  // WebSocketManager removed - RealtimeBus is configured in index.ts and available as (app as any).realtimeBus
  // For backward compatibility, alias realtimeBus as wsManager
  (app as any).wsManager = (app as any).realtimeBus;

  return httpServer;
}
