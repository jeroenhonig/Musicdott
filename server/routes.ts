import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage-wrapper";
import { setupAuth, requireAuth, enforcePasswordChange, sessionMiddleware } from "./auth";
// WebSocketManager removed - using RealtimeBus instead (set up in index.ts)
import { db, executeQuery } from "./db";
import { eq, and, desc, or, inArray, ne, not, sql } from "drizzle-orm";
import { EmailNotificationService } from "./services/email-notifications";
import { notificationService } from "./services/notification-service";
import { registerSchoolRoutes } from "./routes/schools";
import { registerTeacherRoutes } from "./routes/teachers";
import { registerStudentRoutes } from "./routes/students";
import { registerSongRoutes } from "./routes/songs";
import { registerNotificationRoutes } from "./routes/notifications";
import recurringSchedulesRouter from "./routes/recurring-schedules";
import subscriptionsRouter from "./routes/subscriptions";
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
  studentMessages,
  messageReplies,
  students,
  sessions,
  users,
  profileUpdateSchema,
  schoolSettingsUpdateSchema,
  notificationSettingsSchema,
  preferenceSettingsSchema,
  passwordChangeSchema
} from "@shared/schema";
import { authRateLimit } from "./middleware/security";
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

export async function registerRoutes(app: Express): Promise<Server> {
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
        storage: {
          mode: isDatabaseAvailable ? "database" : "memory",
          fallback: "memory"
        },
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
        storage: { mode: "memory", fallback: "memory" },
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

  // Apply password change enforcement to all API routes
  app.use('/api', enforcePasswordChange);
  
  // Register role-based routes
  registerSchoolRoutes(app);
  registerTeacherRoutes(app);
  registerStudentRoutes(app);
  registerSongRoutes(app);
  registerNotificationRoutes(app);
  
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
  
  // Register subscription routes with billing alias for compatibility
  app.use("/api/billing", subscriptionsRouter);
  
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
  
  // Teachers endpoint for teacher assignment
  app.get("/api/teachers", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    
    try {
      const teachers = await storage.getUsersByRole('teacher');
      res.json(teachers);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch teachers" });
    }
  });

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

  // Teachers endpoint for school owners/admins
  app.get("/api/teachers", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    
    try {
      // For now, return users with teacher role from the same school
      const teachers = await storage.getUsersByRole("teacher");
      const schoolTeachers = teachers.filter(teacher => teacher.schoolId === req.user!.schoolId);
      res.json(schoolTeachers);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch teachers" });
    }
  });


  // Recurring schedule endpoints
  app.get("/api/recurring-schedules", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    try {
      const user = req.user!;
      let schedules;
      
      console.log(`User accessing recurring schedules: ${user.id}, role: ${user.role}, schoolId: ${user.schoolId}`);
      
      // School owners can see all schedules in their school
      if (user.role === 'school_owner' && user.schoolId) {
        console.log(`Fetching schedules for school: ${user.schoolId}`);
        schedules = await storage.getRecurringSchedulesBySchool(user.schoolId);
      } else {
        // Regular users only see their own schedules
        console.log(`Fetching schedules for user: ${user.id}`);
        schedules = await storage.getRecurringSchedules(user.id);
      }
      
      console.log(`Found ${schedules.length} recurring schedules`);
      console.log(`Sample schedule data:`, schedules[0] ? JSON.stringify(schedules[0], null, 2) : 'No schedules found');
      
      // Ensure proper camelCase property names for frontend
      const transformedSchedules = schedules.map(schedule => ({
        ...schedule,
        // Ensure we have the camelCase properties the frontend expects
        dayOfWeek: schedule.dayOfWeek,
        userId: schedule.userId,
        studentId: schedule.studentId,
        startTime: schedule.startTime,
        endTime: schedule.endTime,
        schoolId: schedule.schoolId || req.user!.schoolId, // Use schoolId from schedule or fallback to user's schoolId
        recurrenceType: schedule.frequency || 'weekly' // Map frequency to recurrenceType for backward compatibility
      }));
      
      res.json(transformedSchedules);
    } catch (error) {
      console.error("Error in recurring schedules endpoint:", error);
      res.status(500).json({ message: "Failed to fetch recurring schedules" });
    }
  });
  
  // NOTE: Student recurring schedules route moved to server/routes/students.ts with proper security
  
  app.post("/api/recurring-schedules", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    try {
      // Ensure userId is set to the authenticated user
      const scheduleData = {
        ...req.body,
        userId: req.user!.id
      };
      
      console.log("Creating recurring schedule:", JSON.stringify(scheduleData, null, 2));
      
      // Validate required fields
      if (!scheduleData.studentId || !scheduleData.dayOfWeek || !scheduleData.startTime || !scheduleData.endTime) {
        return res.status(400).json({ 
          message: "Missing required fields",
          required: ["studentId", "dayOfWeek", "startTime", "endTime"]
        });
      }
      
      const schedule = await storage.createRecurringSchedule(scheduleData);
      console.log("Recurring schedule created:", schedule.id);
      res.status(201).json(schedule);
    } catch (error) {
      console.error("Error creating recurring schedule:", error);
      res.status(500).json({ message: "Failed to create recurring schedule", details: String(error) });
    }
  });
  
  app.put("/api/recurring-schedules/:id", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    try {
      const scheduleId = parseInt(req.params.id);
      // Verify the schedule belongs to this teacher
      const schedule = await storage.getRecurringSchedule(scheduleId);
      if (!schedule || schedule.userId !== req.user!.id) {
        return res.status(403).json({ message: "Not authorized" });
      }
      
      const updatedSchedule = await storage.updateRecurringSchedule(scheduleId, req.body);
      res.json(updatedSchedule);
    } catch (error) {
      res.status(500).json({ message: "Failed to update recurring schedule" });
    }
  });
  
  app.delete("/api/recurring-schedules/:id", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    try {
      const scheduleId = parseInt(req.params.id);
      // Verify the schedule belongs to this teacher
      const schedule = await storage.getRecurringSchedule(scheduleId);
      if (!schedule || schedule.userId !== req.user!.id) {
        return res.status(403).json({ message: "Not authorized" });
      }
      
      const success = await storage.deleteRecurringSchedule(scheduleId);
      if (success) {
        res.status(204).end();
      } else {
        res.status(404).json({ message: "Schedule not found" });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to delete recurring schedule" });
    }
  });
  
  app.post("/api/recurring-schedules/generate", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    try {
      const userId = req.user!.id;
      const { startDate, endDate } = req.body;
      
      if (!startDate || !endDate) {
        return res.status(400).json({ message: "Start date and end date are required" });
      }
      
      const sessions = await storage.generateSessionsFromRecurringSchedules(
        userId,
        new Date(startDate),
        new Date(endDate)
      );
      
      res.status(201).json(sessions);
    } catch (error) {
      res.status(500).json({ message: "Failed to generate sessions from recurring schedules" });
    }
  });
  
  // Session rescheduling endpoints
  app.post("/api/sessions/:id/reschedule/request", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    try {
      const sessionId = parseInt(req.params.id);
      const { newStartTime, newEndTime } = req.body;
      
      if (!newStartTime || !newEndTime) {
        return res.status(400).json({ message: "New start time and end time are required" });
      }
      
      // Verify the session belongs to this teacher or the student belongs to this teacher
      const session = await storage.getSession(sessionId);
      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }
      
      const isTeacher = session.userId === req.user!.id;
      const isStudent = req.user!.role === 'student' && await storage.getStudent(session.studentId) !== undefined;
      
      if (!isTeacher && !isStudent) {
        return res.status(403).json({ message: "Not authorized" });
      }
      
      const updatedSession = await storage.requestReschedule(
        sessionId,
        new Date(newStartTime),
        new Date(newEndTime)
      );
      
      // If it's a student requesting the reschedule, notify the teacher
      if (isStudent) {
        const wsManager = (app as any).wsManager;
        wsManager.sendRescheduleRequest(session.studentId, {
          sessionId,
          title: session.title,
          originalStartTime: session.startTime,
          originalEndTime: session.endTime,
          newStartTime,
          newEndTime,
          studentId: session.studentId
        });
      }
      
      res.json(updatedSession);
    } catch (error) {
      res.status(500).json({ message: "Failed to request session reschedule" });
    }
  });
  
  app.post("/api/sessions/:id/reschedule/approve", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    try {
      const sessionId = parseInt(req.params.id);
      
      // Verify the session belongs to this teacher
      const session = await storage.getSession(sessionId);
      if (!session || session.userId !== req.user!.id) {
        return res.status(403).json({ message: "Not authorized" });
      }
      
      const updatedSession = await storage.approveReschedule(sessionId);
      
      res.json(updatedSession);
    } catch (error) {
      res.status(500).json({ message: "Failed to approve session reschedule" });
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
  app.post("/api/import/students", requireAuth, async (req: any, res: Response) => {
    try {
      // Only allow teachers and school owners to import students
      if (!['teacher', 'school_owner', 'platform_owner'].includes(req.user.role)) {
        return res.status(403).json({ 
          success: false,
          message: "Only teachers and school owners can import students" 
        });
      }

      // Validate request body
      const { filePath, schoolId } = req.body;
      
      if (!filePath) {
        return res.status(400).json({ 
          success: false,
          message: "filePath is required" 
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

      // Use the authenticated user's school ID if not provided
      const targetSchoolId = schoolId || req.user.schoolId || 1;

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
  app.post("/api/import/schedule", requireAuth, async (req: any, res: Response) => {
    try {
      // Only allow teachers and school owners to import schedules
      if (!['teacher', 'school_owner', 'platform_owner'].includes(req.user.role)) {
        return res.status(403).json({ 
          success: false,
          message: "Only teachers and school owners can import schedules" 
        });
      }

      // Validate request body
      const { filePath, defaultUserId } = req.body;
      
      if (!filePath) {
        return res.status(400).json({ 
          success: false,
          message: "filePath is required" 
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

      // Use the authenticated user's ID as default teacher
      const targetUserId = defaultUserId || req.user.id;

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
  app.post("/api/import/preview", async (req: Request, res: Response) => {
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

  // Import students from JSON
  app.post("/api/import/students", async (req: Request, res: Response) => {
    try {
      const { filePath } = req.body;
      
      if (!filePath) {
        return res.status(400).json({ message: "File path is required" });
      }

      const { importStudents } = await import('./importStudents');
      const result = await importStudents(filePath);
      
      res.json({
        message: "Student import completed",
        result
      });
    } catch (error) {
      console.error("Error importing students:", error);
      res.status(500).json({ message: "Failed to import students" });
    }
  });

  // Import schedule from JSON
  app.post("/api/import/schedule", async (req: Request, res: Response) => {
    try {
      const { filePath } = req.body;
      
      if (!filePath) {
        return res.status(400).json({ message: "File path is required" });
      }

      const { importSchedule } = await import('./importSchedule');
      const result = await importSchedule(filePath);
      
      res.json({
        message: "Schedule import completed", 
        result
      });
    } catch (error) {
      console.error("Error importing schedule:", error);
      res.status(500).json({ message: "Failed to import schedule" });
    }
  });

  // Complete import (students + schedule)
  app.post("/api/import/complete", async (req: Request, res: Response) => {
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

  app.post("/api/import/songs", async (req: Request, res: Response) => {
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

  app.post("/api/import/lessons", async (req: Request, res: Response) => {
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

  // Register subscription routes
  app.use("/api/subscriptions", subscriptionsRouter);
  
  const httpServer = createServer(app);
  
  // Initialize WebSocket server for real-time communication
  // Teacher Messages API routes - removed duplicate, using enhanced version below

  app.patch("/api/teacher/respond-message/:messageId", requireAuth, async (req: any, res) => {
    try {
      const messageId = parseInt(req.params.messageId);
      const { response } = req.body;
      const teacherId = req.user.id;
      
      const [updatedMessage] = await db.update(studentMessages)
        .set({
          response,
          respondedAt: new Date(),
          updatedAt: new Date()
        })
        .where(and(
          eq(studentMessages.id, messageId),
          eq(studentMessages.teacherId, teacherId)
        ))
        .returning();
        
      if (!updatedMessage) {
        return res.status(404).json({ message: "Message not found" });
      }
      
      res.json(updatedMessage);
    } catch (error) {
      console.error("Error responding to message:", error);
      res.status(500).json({ message: "Failed to respond to message" });
    }
  });

  app.patch("/api/teacher/mark-message-read/:messageId", requireAuth, async (req: any, res) => {
    try {
      const messageId = parseInt(req.params.messageId);
      const teacherId = req.user.id;
      
      const [updatedMessage] = await db.update(studentMessages)
        .set({
          isRead: true,
          updatedAt: new Date()
        })
        .where(and(
          eq(studentMessages.id, messageId),
          eq(studentMessages.teacherId, teacherId)
        ))
        .returning();
        
      if (!updatedMessage) {
        return res.status(404).json({ message: "Message not found" });
      }
      
      res.json(updatedMessage);
    } catch (error) {
      console.error("Error marking message as read:", error);
      res.status(500).json({ message: "Failed to mark message as read" });
    }
  });

  // Unified Messages API routes
  app.get("/api/messages", requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const userRole = req.user.role;
      
      // Get messages for this user (both sent and received) using storage interface
      const userMessages = await storage.getMessages(userId, userRole);
      
      res.json(userMessages);
    } catch (error) {
      console.error("Error fetching messages:", error);
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  app.post("/api/messages", requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const userRole = req.user.role;
      const { recipientId, subject, message } = req.body;
      
      // Determine recipient type
      const recipient = await db.select()
        .from(users)
        .where(eq(users.id, recipientId))
        .limit(1);
        
      if (!recipient.length) {
        return res.status(404).json({ message: "Recipient not found" });
      }
      
      const recipientRole = recipient[0].role;
      
      // Create message using storage interface
      const messageData = {
        senderId: userId,
        recipientId: recipientId,
        senderType: userRole,
        recipientType: recipientRole,
        subject: subject,
        content: message,
        isRead: false
      };
      
      const newMessage = await storage.createMessage(messageData);
      
      res.status(201).json(newMessage);
    } catch (error) {
      console.error("Error sending message:", error);
      res.status(500).json({ message: "Failed to send message" });
    }
  });

  app.patch("/api/messages/:id/read", requireAuth, async (req: any, res) => {
    try {
      const messageId = parseInt(req.params.id);
      const userId = req.user.id;
      
      // Mark message as read using Drizzle ORM
      const [updatedMessage] = await db.update(messages)
        .set({ isRead: true })
        .where(and(
          eq(messages.id, messageId),
          eq(messages.recipientId, userId)
        ))
        .returning();
      
      if (!updatedMessage) {
        return res.status(404).json({ message: "Message not found or unauthorized" });
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error marking message as read:", error);
      res.status(500).json({ message: "Failed to mark message as read" });
    }
  });

  // Get users for messaging (students and teachers)
  app.get("/api/users", requireAuth, async (req: any, res) => {
    try {
      const currentUserId = req.user.id;
      const currentUserRole = req.user.role;
      
      // Get all users that can be messaged (exclude current user)
      const messagingUsers = await db.select({
        id: users.id,
        name: users.name,
        role: users.role,
        username: users.username
      })
        .from(users)
        .where(
          and(
            ne(users.id, currentUserId),
            inArray(users.role, ['teacher', 'student', 'school_owner'])
          )
        )
        .orderBy(users.name);
      
      res.json(messagingUsers);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.post("/api/student/ask-teacher", requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { subject, message } = req.body;
      
      // Find the student record that corresponds to this user
      const student = await db.select({
        id: students.id,
        userId: students.userId,
        assignedTeacherId: students.assignedTeacherId,
        name: students.name
      })
        .from(students)
        .where(eq(students.userId, userId))
        .limit(1);
        
      if (!student.length) {
        return res.status(404).json({ message: "Student not found" });
      }
      
      const studentRecord = student[0];
      let teacherId;
      
      // Use the assigned teacher from the student record
      if (studentRecord.assignedTeacherId) {
        teacherId = studentRecord.assignedTeacherId;
      } else {
        // Fallback: find any teacher/school owner as default
        const defaultTeacher = await db.select()
          .from(users)
          .where(or(
            eq(users.role, 'teacher'),
            eq(users.role, 'school_owner')
          ))
          .limit(1);
          
        if (!defaultTeacher.length) {
          return res.status(400).json({ message: "No teacher available to receive messages" });
        }
        teacherId = defaultTeacher[0].id;
      }
      
      const [newMessage] = await db.insert(studentMessages)
        .values({
          studentId: studentRecord.id,
          teacherId,
          subject,
          message,
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();

      res.json(newMessage);
    } catch (error) {
      console.error("Error creating student message:", error);
      res.status(500).json({ message: "Failed to send message" });
    }
  });

  app.patch("/api/student/mark-response-read/:id", requireAuth, async (req: any, res) => {
    try {
      const messageId = parseInt(req.params.id);
      const userId = req.user.id;
      
      // Find the student record that corresponds to this user account
      const student = await db.select({
        id: students.id,
        userId: students.userId,
        name: students.name
      })
        .from(students)
        .where(eq(students.userId, userId))
        .limit(1);
        
      if (!student.length) {
        return res.status(404).json({ message: "Student not found" });
      }
      
      const studentRecord = student[0];
      
      const [updatedMessage] = await db.update(studentMessages)
        .set({ 
          responseRead: true,
          updatedAt: new Date()
        })
        .where(and(
          eq(studentMessages.id, messageId),
          eq(studentMessages.studentId, studentRecord.id)
        ))
        .returning();

      if (!updatedMessage) {
        return res.status(404).json({ message: "Message not found" });
      }

      res.json(updatedMessage);
    } catch (error) {
      console.error("Error marking response as read:", error);
      res.status(500).json({ message: "Failed to mark response as read" });
    }
  });

  // Student reply to message thread
  app.post("/api/student/reply-message/:messageId", requireAuth, async (req: any, res) => {
    try {
      const messageId = parseInt(req.params.messageId);
      const userId = req.user.id;
      const { reply } = req.body;

      if (!reply || !reply.trim()) {
        return res.status(400).json({ message: "Reply content is required" });
      }

      // Find the student record that corresponds to this user account
      const student = await db.select({
        id: students.id,
        userId: students.userId,
        name: students.name
      })
        .from(students)
        .where(eq(students.userId, userId))
        .limit(1);
        
      if (!student.length) {
        return res.status(404).json({ message: "Student not found" });
      }

      // Verify the message exists and belongs to this student
      const message = await db.select()
        .from(studentMessages)
        .where(or(
          and(eq(studentMessages.id, messageId), eq(studentMessages.studentId, student[0].id)),
          and(eq(studentMessages.id, messageId), eq(studentMessages.studentId, userId))
        ))
        .limit(1);

      if (!message.length) {
        return res.status(404).json({ message: "Message not found or access denied" });
      }

      // Create the threaded reply
      const newReply = await db.insert(messageReplies)
        .values({
          messageId: messageId,
          senderId: userId,
          senderType: "student",
          reply: reply.trim(),
          isRead: false
        })
        .returning();

      res.json(newReply[0]);
    } catch (error) {
      console.error("Error creating message reply:", error);
      res.status(500).json({ message: "Failed to send reply" });
    }
  });

  app.get("/api/teacher/messages", requireAuth, loadSchoolContext, requireTeacherOrOwner(), async (req: any, res) => {
    try {
      const teacherId = req.user.id;
      
      // Get all messages for this teacher with explicit select using camelCase columns
      const messages = await db.select({ 
        id: studentMessages.id, 
        studentId: studentMessages.studentId, 
        studentName: students.name, 
        subject: studentMessages.subject, 
        message: studentMessages.message, 
        response: studentMessages.response, 
        isRead: studentMessages.isRead, 
        responseRead: studentMessages.responseRead, 
        createdAt: studentMessages.createdAt, 
        respondedAt: studentMessages.respondedAt 
      })
        .from(studentMessages)
        .leftJoin(students, eq(studentMessages.studentId, students.id))
        .where(eq(studentMessages.teacherId, teacherId))
        .orderBy(desc(studentMessages.createdAt))
        .catch(error => {
          console.error('Teacher messages query failed:', error);
          return [];
        });

      // Get all replies for these messages with explicit select using camelCase columns
      const messageIds = messages.map(m => m.id).filter(Boolean);
      const replies = messageIds.length > 0 ? await db.select({
        id: messageReplies.id,
        messageId: messageReplies.messageId,
        senderId: messageReplies.senderId,
        senderType: messageReplies.senderType,
        content: messageReplies.content,
        isRead: messageReplies.isRead,
        createdAt: messageReplies.createdAt
      })
        .from(messageReplies)
        .where(inArray(messageReplies.messageId, messageIds))
        .orderBy(messageReplies.createdAt)
        .catch(error => {
          console.error('Message replies query failed:', error);
          return [];
        }) : [];

      // Format messages with replies using correct field names from the schema
      const messagesWithReplies = messages.map(row => ({
        id: row.id,
        studentId: row.studentId,
        studentName: row.studentName || 'Unknown',
        subject: row.subject,
        message: row.message,
        response: row.response,
        isRead: row.isRead,
        responseRead: row.responseRead,
        createdAt: row.createdAt,
        respondedAt: row.respondedAt,
        replies: replies.filter(reply => reply.messageId === row.id)
      })).filter(msg => msg.id); // Filter out empty results
      
      res.json(messagesWithReplies);
    } catch (error) {
      console.error("Error fetching teacher messages:", error);
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  app.patch("/api/teacher/respond-message/:id", requireAuth, async (req: any, res) => {
    try {
      const messageId = parseInt(req.params.id);
      const teacherId = req.user.id;
      const { response } = req.body;
      
      const [updatedMessage] = await db.update(studentMessages)
        .set({ 
          response,
          isRead: true,
          responseRead: false,
          respondedAt: new Date(),
          updatedAt: new Date()
        })
        .where(and(
          eq(studentMessages.id, messageId),
          eq(studentMessages.teacherId, teacherId)
        ))
        .returning();

      if (!updatedMessage) {
        return res.status(404).json({ message: "Message not found" });
      }

      res.json(updatedMessage);
    } catch (error) {
      console.error("Error responding to message:", error);
      res.status(500).json({ message: "Failed to respond to message" });
    }
  });

  app.patch("/api/teacher/mark-message-read/:id", requireAuth, async (req: any, res) => {
    try {
      const messageId = parseInt(req.params.id);
      const teacherId = req.user.id;
      
      const [updatedMessage] = await db.update(studentMessages)
        .set({ 
          isRead: true,
          updatedAt: new Date()
        })
        .where(and(
          eq(studentMessages.id, messageId),
          eq(studentMessages.teacherId, teacherId)
        ))
        .returning();

      if (!updatedMessage) {
        return res.status(404).json({ message: "Message not found" });
      }

      res.json(updatedMessage);
    } catch (error) {
      console.error("Error marking message as read:", error);
      res.status(500).json({ message: "Failed to mark message as read" });
    }
  });

  // Send new message from teacher to student or teacher
  app.post("/api/teacher/send-message", requireAuth, async (req: any, res) => {
    try {
      const senderId = req.user.id;
      const { recipientType, recipientId, subject, message } = req.body;
      
      if (!recipientType || !recipientId || !subject || !message) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      if (recipientType === "student") {
        // Sending to a student - use existing studentMessages table
        const student = await db.select({
          id: students.id,
          name: students.name,
          userId: students.userId,
          schoolId: students.schoolId
        })
          .from(students)
          .where(eq(students.id, recipientId))
          .limit(1);
          
        if (!student.length) {
          return res.status(404).json({ message: "Student not found" });
        }
        
        const [newMessage] = await db.insert(studentMessages)
          .values({
            studentId: recipientId,
            teacherId: senderId,
            subject,
            message,
            isRead: false,
            createdAt: new Date(),
            updatedAt: new Date()
          })
          .returning();
        
        // Send notification to student about new message
        try {
          if (student[0].userId && student[0].schoolId) {
            await notificationService.sendNotification({
              userId: student[0].userId,
              schoolId: student[0].schoolId,
              type: 'message',
              title: 'New Message from Teacher',
              message: subject,
              link: `/messages/${newMessage.id}`,
              metadata: { messageId: newMessage.id, senderId: senderId }
            });
          }
        } catch (notifError) {
          console.error('Failed to send message notification:', notifError);
        }
          
        res.status(201).json(newMessage);
      } else if (recipientType === "teacher") {
        // Sending to a teacher - for now, we'll create a system message using studentMessages
        // In the future, we could create a separate teachers messaging table
        const teacher = await db.select()
          .from(users)
          .where(and(
            eq(users.id, recipientId),
            or(eq(users.role, 'teacher'), eq(users.role, 'school_owner'))
          ))
          .limit(1);
          
        if (!teacher.length) {
          return res.status(404).json({ message: "Teacher not found" });
        }
        
        // For teacher-to-teacher messages, we'll use studentId: 0 as a flag for system/teacher messages
        const [newMessage] = await db.insert(studentMessages)
          .values({
            studentId: 0, // Special value to indicate teacher-to-teacher message
            teacherId: recipientId, // The recipient teacher
            subject: `From Teacher: ${subject}`,
            message: `Message from ${req.user.name}: ${message}`,
            isRead: false,
            createdAt: new Date(),
            updatedAt: new Date()
          })
          .returning();
          
        res.status(201).json(newMessage);
      } else {
        return res.status(400).json({ message: "Invalid recipient type" });
      }
    } catch (error) {
      console.error("Error sending message:", error);
      res.status(500).json({ message: "Failed to send message" });
    }
  });

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

  app.get('/api/admin/debug/stats', requireAuth, async (req, res) => {
    try {
      const currentUserId = req.user?.id;
      const isDatabaseConnected = false; // Memory storage fallback active
      
      // Get counts from storage
      const students = await storage.getStudents(currentUserId);
      const lessons = await storage.getLessons(currentUserId);
      const songs = await storage.getSongs(currentUserId);
      const categories = await storage.getLessonCategories(currentUserId);
      
      res.json({
        currentUserId,
        storageType: 'memory',
        connected: false,
        counts: {
          students: students.length,
          lessons: lessons.length,
          songs: songs.length,
          categories: categories.length,
          users: 1 // Current implementation has single user
        }
      });
    } catch (error) {
      console.error('Debug stats error:', error);
      res.status(500).json({ error: 'Failed to get debug stats' });
    }
  });

  app.post('/api/admin/debug/reset-demo-data', requireAuth, async (req, res) => {
    try {
      // This would reset the in-memory storage to clean state
      // Implementation depends on storage architecture
      res.json({ message: 'Demo data reset functionality ready for implementation' });
    } catch (error) {
      console.error('Reset demo data error:', error);
      res.status(500).json({ error: 'Failed to reset demo data' });
    }
  });

  // Automated Billing Management Endpoints
  app.get("/api/admin/billing/status", requireAuth, async (req: any, res) => {
    try {
      // Only allow school owners and admins to check billing status
      if (req.user.role !== 'school_owner' && req.user.role !== 'platform_owner') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { billingScheduler } = require('../services/billing-scheduler');
      const nextRun = billingScheduler.getNextScheduledRun();
      
      res.json({
        automatedBilling: {
          isActive: true,
          nextScheduledRun: nextRun ? nextRun.toISOString() : null,
          schedule: "Monthly on 1st day at 2:00 AM UTC",
          status: "running"
        }
      });
    } catch (error) {
      console.error("Error checking billing status:", error);
      res.status(500).json({ message: "Failed to get billing status" });
    }
  });

  app.post("/api/admin/billing/trigger", requireAuth, async (req: any, res) => {
    try {
      // Only allow school owners and admins to manually trigger billing
      if (req.user.role !== 'school_owner' && req.user.role !== 'platform_owner') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { billingScheduler } = require('../services/billing-scheduler');

      // Trigger manual billing (for testing or emergency use)
      await billingScheduler.triggerManualBilling();
      
      res.json({ 
        message: "Manual billing process completed successfully",
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error("Error triggering manual billing:", error);
      res.status(500).json({ message: "Failed to trigger billing process" });
    }
  });

  // Owner Login API Endpoint (separate from regular authentication)
  app.post("/api/owner/login", async (req: Request, res: Response) => {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        return res.status(400).json({ message: "Username and password required" });
      }

      // Verify platform owner credentials
      const user = await storage.getUserByUsername(username);
      
      if (!user || user.role !== 'platform_owner') {
        return res.status(401).json({ message: "Invalid administrator credentials" });
      }

      // Verify password
      const bcrypt = await import('bcrypt');
      const isValidPassword = await bcrypt.compare(password, user.password);
      
      if (!isValidPassword) {
        return res.status(401).json({ message: "Invalid administrator credentials" });
      }

      // Log the access attempt for security
      console.log(`[SECURITY] Platform owner login: ${username} at ${new Date().toISOString()}`);

      // Set session for platform owner
      (req as any).session.user = {
        id: user.id,
        username: user.username,
        name: user.name,
        email: user.email,
        role: user.role
      };

      res.json({ message: "Administrator authentication successful" });
    } catch (error) {
      console.error("Error in owner login:", error);
      res.status(500).json({ message: "Authentication failed" });
    }
  });

  // Platform Owners Dashboard API Endpoints
  // Require platform owner role for access
  const requirePlatformOwner = (req: any, res: any, next: any) => {
    // Check both Passport session (req.user) and direct session (req.session.user)
    const user = req.user || req.session?.user;
    if (!user) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    if (user.role !== 'platform_owner') {
      return res.status(403).json({ message: "Access denied. Platform owner role required." });
    }
    next();
  };

  // Helper function to log admin actions for audit trail
  const logAdminAction = async (req: any, action: string, targetType: string, targetId: number | null, metadata: any = {}) => {
    try {
      // Get user from Passport session (req.user) or direct session (req.session.user)
      const user = req.user || req.session?.user;
      if (!user?.id) {
        console.warn("No user found for audit log");
        return;
      }

      await storage.executeQuery(`
        INSERT INTO admin_actions (actor_id, target_type, target_id, action, metadata, ip_address, user_agent)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [
        user.id,
        targetType,
        targetId,
        action,
        JSON.stringify(metadata),
        req.ip || req.connection?.remoteAddress,
        req.get('user-agent')
      ]);
    } catch (error) {
      console.error("Failed to log admin action:", error);
    }
  };

  // Get platform-wide statistics
  app.get("/api/owners/platform-stats", requirePlatformOwner, async (req: Request, res: Response) => {
    try {
      // Get comprehensive platform statistics
      const [
        totalUsers,
        totalSchools,
        totalStudents,
        totalTeachers,
        totalLessons,
        totalSongs,
        totalSessions,
        activeSubscriptions,
        monthlyRevenue
      ] = await Promise.all([
        storage.executeQuery("SELECT COUNT(*) as count FROM users"),
        storage.executeQuery("SELECT COUNT(*) as count FROM schools"),
        storage.executeQuery("SELECT COUNT(*) as count FROM students"),
        storage.executeQuery("SELECT COUNT(*) as count FROM users WHERE role IN ('teacher', 'school_owner')"),
        storage.executeQuery("SELECT COUNT(*) as count FROM lessons"),
        storage.executeQuery("SELECT COUNT(*) as count FROM songs"),
        storage.executeQuery("SELECT COUNT(*) as count FROM sessions"),
        storage.executeQuery("SELECT COUNT(*) as count FROM school_subscriptions WHERE status = 'active'"),
        storage.executeQuery("SELECT COALESCE(SUM(amount), 0) as total FROM payment_history WHERE status = 'paid' AND billing_month = date_trunc('month', CURRENT_DATE)")
      ]);

      // Calculate new users this month
      const newUsersThisMonth = await storage.executeQuery(
        "SELECT COUNT(*) as count FROM users WHERE created_at >= date_trunc('month', CURRENT_DATE)"
      );

      // Calculate growth rate (simplified)
      const lastMonthRevenue = await storage.executeQuery(
        "SELECT COALESCE(SUM(amount), 0) as total FROM payment_history WHERE status = 'paid' AND billing_month = date_trunc('month', CURRENT_DATE - interval '1 month')"
      );

      const currentRevenue = monthlyRevenue.rows[0]?.total || 0;
      const previousRevenue = lastMonthRevenue.rows[0]?.total || 1;
      const growthRate = Math.round(((currentRevenue - previousRevenue) / previousRevenue) * 100);

      const stats = {
        totalUsers: parseInt(totalUsers.rows[0]?.count || 0),
        totalSchools: parseInt(totalSchools.rows[0]?.count || 0),
        totalStudents: parseInt(totalStudents.rows[0]?.count || 0),
        totalTeachers: parseInt(totalTeachers.rows[0]?.count || 0),
        totalLessons: parseInt(totalLessons.rows[0]?.count || 0),
        totalSongs: parseInt(totalSongs.rows[0]?.count || 0),
        totalSessions: parseInt(totalSessions.rows[0]?.count || 0),
        monthlyRecurringRevenue: parseInt(currentRevenue),
        activeSubscriptions: parseInt(activeSubscriptions.rows[0]?.count || 0),
        newUsersThisMonth: parseInt(newUsersThisMonth.rows[0]?.count || 0),
        growthRate: growthRate || 0,
        churnRate: 5 // Placeholder - would calculate from subscription cancellations
      };

      res.json(stats);
    } catch (error) {
      console.error("Error fetching platform stats:", error);
      res.status(500).json({ message: "Failed to fetch platform statistics" });
    }
  });

  // Get revenue analytics over time
  app.get("/api/owners/revenue-analytics", requirePlatformOwner, async (req: Request, res: Response) => {
    try {
      const revenueData = await storage.executeQuery(`
        SELECT 
          TO_CHAR(billing_month, 'Mon YYYY') as month,
          COALESCE(SUM(amount), 0) as revenue,
          COUNT(DISTINCT school_id) as subscriptions
        FROM payment_history 
        WHERE status = 'paid' 
          AND billing_month >= CURRENT_DATE - interval '12 months'
        GROUP BY billing_month
        ORDER BY billing_month ASC
      `);

      res.json(revenueData.rows);
    } catch (error) {
      console.error("Error fetching revenue analytics:", error);
      res.status(500).json({ message: "Failed to fetch revenue analytics" });
    }
  });

  // Get user growth analytics
  app.get("/api/owners/user-growth", requirePlatformOwner, async (req: Request, res: Response) => {
    try {
      const userGrowthData = await storage.executeQuery(`
        WITH monthly_users AS (
          SELECT 
            DATE_TRUNC('month', created_at) as month,
            COUNT(*) as new_users
          FROM users 
          WHERE created_at >= CURRENT_DATE - interval '12 months'
          GROUP BY DATE_TRUNC('month', created_at)
        ),
        monthly_schools AS (
          SELECT 
            DATE_TRUNC('month', created_at) as month,
            COUNT(*) as new_schools
          FROM schools 
          WHERE created_at >= CURRENT_DATE - interval '12 months'
          GROUP BY DATE_TRUNC('month', created_at)
        ),
        running_totals AS (
          SELECT 
            generate_series(
              DATE_TRUNC('month', CURRENT_DATE - interval '12 months'), 
              DATE_TRUNC('month', CURRENT_DATE), 
              interval '1 month'
            ) as month
        )
        SELECT 
          TO_CHAR(rt.month, 'Mon YYYY') as month,
          (SELECT COUNT(*) FROM users WHERE created_at <= rt.month + interval '1 month' - interval '1 day') as totalUsers,
          COALESCE(mu.new_users, 0) as newUsers,
          (SELECT COUNT(*) FROM schools WHERE created_at <= rt.month + interval '1 month' - interval '1 day') as schools
        FROM running_totals rt
        LEFT JOIN monthly_users mu ON rt.month = mu.month
        LEFT JOIN monthly_schools ms ON rt.month = ms.month
        ORDER BY rt.month ASC
      `);

      res.json(userGrowthData.rows);
    } catch (error) {
      console.error("Error fetching user growth analytics:", error);
      res.status(500).json({ message: "Failed to fetch user growth analytics" });
    }
  });

  // Get top performing schools
  app.get("/api/owners/top-schools", requirePlatformOwner, async (req: Request, res: Response) => {
    try {
      const topSchools = await storage.executeQuery(`
        SELECT 
          s.id,
          s.name,
          s.city,
          COUNT(DISTINCT u.id) as teacher_count,
          COUNT(DISTINCT st.id) as student_count,
          COUNT(DISTINCT l.id) as lessons_count,
          COALESCE(ss.status, 'inactive') as subscription_status,
          COALESCE(ph.total_revenue, 0) as monthly_revenue,
          COALESCE(TO_CHAR(MAX(u.last_login_at), 'DD Mon YYYY'), 'Never') as last_activity
        FROM schools s
        LEFT JOIN users u ON s.id = u.school_id
        LEFT JOIN students st ON u.id = st.user_id
        LEFT JOIN lessons l ON u.id = l.user_id
        LEFT JOIN school_subscriptions ss ON s.id = ss.school_id AND ss.status = 'active'
        LEFT JOIN (
          SELECT 
            school_id, 
            SUM(amount) as total_revenue
          FROM payment_history 
          WHERE billing_month = DATE_TRUNC('month', CURRENT_DATE)
            AND status = 'paid'
          GROUP BY school_id
        ) ph ON s.id = ph.school_id
        GROUP BY s.id, s.name, s.city, ss.status, ph.total_revenue
        ORDER BY monthly_revenue DESC, student_count DESC
        LIMIT 10
      `);

      // Map database field names to camelCase
      const mappedSchools = topSchools.rows.map(school => ({
        id: school.id,
        name: school.name,
        city: school.city,
        teacherCount: parseInt(school.teacher_count) || 0,
        studentCount: parseInt(school.student_count) || 0,
        lessonsCount: parseInt(school.lessons_count) || 0,
        subscriptionStatus: school.subscription_status,
        monthlyRevenue: parseInt(school.monthly_revenue) || 0,
        lastActivity: school.last_activity
      }));

      res.json(mappedSchools);
    } catch (error) {
      console.error("Error fetching top schools:", error);
      res.status(500).json({ message: "Failed to fetch top schools" });
    }
  });

  // Get recent platform activities
  app.get("/api/owners/recent-activities", requirePlatformOwner, async (req: Request, res: Response) => {
    try {
      // Get recent registrations and activities from database
      const activities = await storage.executeQuery(`
        SELECT 
          'user_registration' as type,
          users.name || ' (' || users.role || ')' as description,
          COALESCE(schools.name, 'No School') as school,
          users.created_at as timestamp
        FROM users 
        LEFT JOIN schools ON users.school_id = schools.id
        WHERE users.created_at >= NOW() - INTERVAL '30 days'
        ORDER BY users.created_at DESC
        LIMIT 20
      `);

      const formattedActivities = activities.rows.map(activity => ({
        description: `New registration: ${activity.description}`,
        school: activity.school,
        timestamp: new Date(activity.timestamp).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })
      }));

      res.json(formattedActivities);
    } catch (error) {
      console.error("Error fetching recent activities:", error);
      res.status(500).json({ message: "Failed to fetch recent activities" });
    }
  });

  // Get all schools with detailed information
  app.get("/api/owners/schools", requirePlatformOwner, async (req: Request, res: Response) => {
    try {
      const schoolsData = await storage.executeQuery(`
        SELECT 
          s.*,
          COUNT(DISTINCT u.id) as total_users,
          COUNT(DISTINCT CASE WHEN u.role = 'teacher' THEN u.id END) as total_teachers,
          COUNT(DISTINCT st.id) as total_students,
          COUNT(DISTINCT l.id) as total_lessons,
          COUNT(DISTINCT sg.id) as total_songs,
          COALESCE(ss.status, 'inactive') as subscription_status,
          ss.plan_type,
          ss.monthly_price,
          ss.created_at as subscription_start
        FROM schools s
        LEFT JOIN users u ON s.id = u.school_id
        LEFT JOIN students st ON u.id = st.user_id
        LEFT JOIN lessons l ON u.id = l.user_id
        LEFT JOIN songs sg ON u.id = sg.user_id
        LEFT JOIN school_subscriptions ss ON s.id = ss.school_id
        GROUP BY s.id, ss.status, ss.plan_type, ss.monthly_price, ss.created_at
        ORDER BY s.created_at DESC
      `);

      res.json({
        schools: schoolsData.rows
      });
    } catch (error) {
      console.error("Error fetching schools data:", error);
      res.status(500).json({ message: "Failed to fetch schools data" });
    }
  });

  // Get detailed information for a specific school
  app.get("/api/owners/schools/:id", requirePlatformOwner, async (req: Request, res: Response) => {
    try {
      const schoolId = parseInt(req.params.id);
      
      // Get school basic info
      const schoolData = await storage.getSchool(schoolId);
      if (!schoolData) {
        return res.status(404).json({ message: "School not found" });
      }

      // Get school users (teachers and school owners)
      const users = await storage.executeQuery(`
        SELECT id, username, name, email, role, instruments, created_at, last_login_at
        FROM users 
        WHERE school_id = $1
        ORDER BY role, name
      `, [schoolId]);

      // Get school students
      const students = await storage.executeQuery(`
        SELECT s.*, u.username, u.email, u.last_login_at
        FROM students s
        LEFT JOIN users u ON s.user_id = u.id
        WHERE u.school_id = $1
        ORDER BY s.name
      `, [schoolId]);

      // Get subscription info
      const subscription = await storage.executeQuery(`
        SELECT * FROM school_subscriptions 
        WHERE school_id = $1 
        ORDER BY created_at DESC 
        LIMIT 1
      `, [schoolId]);

      // Get usage statistics
      const stats = await storage.executeQuery(`
        SELECT 
          COUNT(DISTINCT l.id) as total_lessons,
          COUNT(DISTINCT sg.id) as total_songs,
          COUNT(DISTINCT sess.id) as total_sessions,
          COUNT(DISTINCT CASE WHEN sess.start_time >= NOW() - INTERVAL '30 days' THEN sess.id END) as sessions_last_month
        FROM users u
        LEFT JOIN lessons l ON u.id = l.user_id
        LEFT JOIN songs sg ON u.id = sg.user_id
        LEFT JOIN sessions sess ON u.id = sess.user_id
        WHERE u.school_id = $1
      `, [schoolId]);

      res.json({
        school: schoolData,
        users: users.rows,
        students: students.rows,
        subscription: subscription.rows[0] || null,
        statistics: stats.rows[0]
      });
    } catch (error) {
      console.error("Error fetching school details:", error);
      res.status(500).json({ message: "Failed to fetch school details" });
    }
  });

  // Update school information
  app.put("/api/owners/schools/:id", requirePlatformOwner, async (req: Request, res: Response) => {
    try {
      const schoolId = parseInt(req.params.id);
      const updates = req.body;

      const updatedSchool = await storage.updateSchool(schoolId, updates);
      
      // Send notification about school update
      await EmailNotificationService.notifyPlatformAlert({
        message: `School information updated: ${updatedSchool.name}`,
        severity: 'Low',
        component: 'School Management',
        details: updates
      });

      res.json(updatedSchool);
    } catch (error) {
      console.error("Error updating school:", error);
      res.status(500).json({ message: "Failed to update school" });
    }
  });

  // Get all platform users with filtering
  app.get("/api/owners/users", requirePlatformOwner, async (req: Request, res: Response) => {
    try {
      const { role, school_id, search } = req.query;
      
      let whereConditions = [];
      let params = [];
      let paramCount = 0;

      if (role) {
        paramCount++;
        whereConditions.push(`u.role = $${paramCount}`);
        params.push(role);
      }

      if (school_id) {
        paramCount++;
        whereConditions.push(`u.school_id = $${paramCount}`);
        params.push(school_id);
      }

      if (search) {
        paramCount++;
        whereConditions.push(`(u.name ILIKE $${paramCount} OR u.username ILIKE $${paramCount} OR u.email ILIKE $${paramCount})`);
        params.push(`%${search}%`);
      }

      const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

      const usersData = await storage.executeQuery(`
        SELECT 
          u.*,
          s.name as school_name,
          COUNT(DISTINCT st.id) as student_count,
          COUNT(DISTINCT l.id) as lesson_count,
          COUNT(DISTINCT sg.id) as song_count
        FROM users u
        LEFT JOIN schools s ON u.school_id = s.id
        LEFT JOIN students st ON u.id = st.user_id
        LEFT JOIN lessons l ON u.id = l.user_id
        LEFT JOIN songs sg ON u.id = sg.user_id
        ${whereClause}
        GROUP BY u.id, s.name
        ORDER BY u.created_at DESC
      `, params);

      res.json({
        users: usersData.rows.map(user => {
          const { password, ...userWithoutPassword } = user;
          return userWithoutPassword;
        })
      });
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  // Get all schools as array (for dashboard)
  app.get("/api/owners/all-schools", requirePlatformOwner, async (req: Request, res: Response) => {
    try {
      const schoolsData = await executeQuery(`
        SELECT
          s.id,
          s.name,
          s.city,
          s.address,
          s.phone,
          s.website,
          s.owner_id,
          owner.name as owner_name,
          s.created_at,
          COUNT(DISTINCT CASE WHEN u.role IN ('teacher', 'school_owner') THEN u.id END) as total_teachers,
          COUNT(DISTINCT CASE WHEN u.role = 'student' THEN u.id END) as total_students,
          COUNT(DISTINCT l.id) as total_lessons,
          COUNT(DISTINCT sg.id) as total_songs,
          COALESCE(ss.status, 'inactive') as subscription_status
        FROM schools s
        LEFT JOIN users owner ON s.owner_id = owner.id
        LEFT JOIN users u ON s.id = u.school_id
        LEFT JOIN lessons l ON u.id = l.user_id
        LEFT JOIN songs sg ON u.id = sg.user_id
        LEFT JOIN school_subscriptions ss ON s.id = ss.school_id
        GROUP BY s.id, owner.name, ss.status
        ORDER BY s.created_at DESC
      `);

      res.json(schoolsData.rows);
    } catch (error) {
      console.error("Error fetching all schools:", error);
      res.status(500).json({ message: "Failed to fetch schools" });
    }
  });

  // Get all users as array (for dashboard)
  app.get("/api/owners/all-users", requirePlatformOwner, async (req: Request, res: Response) => {
    try {
      const usersData = await executeQuery(`
        SELECT 
          u.id,
          u.username,
          u.name,
          u.email,
          u.role,
          u.school_id,
          u.created_at,
          u.last_login_at,
          s.name as school_name
        FROM users u
        LEFT JOIN schools s ON u.school_id = s.id
        ORDER BY u.created_at DESC
        LIMIT 500
      `);

      res.json(usersData.rows);
    } catch (error) {
      console.error("Error fetching all users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  // Platform Owner Customer Service Endpoints
  
  // Reset password for any user (customer service)
  app.post("/api/platform/users/:id/reset-password", requirePlatformOwner, async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.id);
      const { newPassword, reason } = req.body;

      if (!newPassword || newPassword.length < 8) {
        return res.status(400).json({ message: "Password must be at least 8 characters" });
      }

      // Get user details for logging
      const userResult = await storage.executeQuery(`
        SELECT id, username, email, role FROM users WHERE id = $1
      `, [userId]);

      if (!userResult.rows.length) {
        return res.status(404).json({ message: "User not found" });
      }

      const user = userResult.rows[0];

      // Hash the new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Update password and set must_change_password flag
      await storage.executeQuery(`
        UPDATE users 
        SET password = $1, must_change_password = true, updated_at = NOW()
        WHERE id = $2
      `, [hashedPassword, userId]);

      // Log admin action
      await logAdminAction(req, 'password_reset', 'user', userId, {
        username: user.username,
        email: user.email,
        role: user.role,
        reason: reason || 'Customer service password reset'
      });

      res.json({ 
        message: "Password reset successfully. User must change password on next login.",
        userId: userId,
        username: user.username
      });
    } catch (error) {
      console.error("Error resetting user password:", error);
      res.status(500).json({ message: "Failed to reset password" });
    }
  });

  // Update user details (customer service)
  app.put("/api/platform/users/:id", requirePlatformOwner, async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.id);
      const updates = req.body;

      // Get current user data for audit
      const currentUserResult = await storage.executeQuery(`
        SELECT * FROM users WHERE id = $1
      `, [userId]);

      if (!currentUserResult.rows.length) {
        return res.status(404).json({ message: "User not found" });
      }

      const currentUser = currentUserResult.rows[0];

      // Build update query dynamically
      const allowedFields = ['name', 'email', 'username', 'role', 'school_id', 'instruments', 'bio'];
      const updateFields = [];
      const updateValues = [];
      let paramCount = 0;

      for (const [key, value] of Object.entries(updates)) {
        if (allowedFields.includes(key)) {
          paramCount++;
          updateFields.push(`${key} = $${paramCount}`);
          updateValues.push(value);
        }
      }

      if (updateFields.length === 0) {
        return res.status(400).json({ message: "No valid fields to update" });
      }

      paramCount++;
      updateValues.push(userId);

      await storage.executeQuery(`
        UPDATE users 
        SET ${updateFields.join(', ')}, updated_at = NOW()
        WHERE id = $${paramCount}
      `, updateValues);

      // Log admin action
      await logAdminAction(req, 'user_update', 'user', userId, {
        username: currentUser.username,
        updates: updates,
        oldValues: Object.keys(updates).reduce((acc, key) => {
          acc[key] = currentUser[key];
          return acc;
        }, {} as any)
      });

      res.json({ message: "User updated successfully" });
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  // Create new user (school owner or other roles) - Platform owner only
  app.post("/api/platform/users", requirePlatformOwner, async (req: Request, res: Response) => {
    try {
      const { username, email, name, password, role, schoolId } = req.body;

      // Validate required fields
      if (!username || !email || !name || !password) {
        return res.status(400).json({ message: "Username, email, name, and password are required" });
      }

      // Validate role
      const validRoles = ['school_owner', 'teacher', 'student'];
      if (role && !validRoles.includes(role)) {
        return res.status(400).json({ message: "Invalid role. Must be one of: school_owner, teacher, student" });
      }

      // Check if username already exists
      const existingUserByUsername = await storage.executeQuery(
        'SELECT id FROM users WHERE username = $1',
        [username]
      );
      if (existingUserByUsername.rows.length > 0) {
        return res.status(400).json({ message: "Username already exists" });
      }

      // Check if email already exists
      const existingUserByEmail = await storage.executeQuery(
        'SELECT id FROM users WHERE email = $1',
        [email]
      );
      if (existingUserByEmail.rows.length > 0) {
        return res.status(400).json({ message: "Email already exists" });
      }

      // Hash the password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create the user
      const result = await storage.executeQuery(`
        INSERT INTO users (username, email, name, password, role, school_id, must_change_password)
        VALUES ($1, $2, $3, $4, $5, $6, true)
        RETURNING id, username, email, name, role, school_id
      `, [username, email, name, hashedPassword, role || 'school_owner', schoolId || null]);

      const newUser = result.rows[0];

      // If schoolId is provided and user is school_owner, create school membership
      if (schoolId && (role === 'school_owner' || role === 'teacher')) {
        await storage.executeQuery(`
          INSERT INTO school_memberships (school_id, user_id, role)
          VALUES ($1, $2, $3)
          ON CONFLICT DO NOTHING
        `, [schoolId, newUser.id, role === 'school_owner' ? 'owner' : 'teacher']);
      }

      // Log admin action
      await logAdminAction(req, 'user_create', 'user', newUser.id, {
        username: newUser.username,
        email: newUser.email,
        role: newUser.role,
        schoolId: newUser.school_id
      });

      res.status(201).json({
        message: "User created successfully",
        user: newUser
      });
    } catch (error) {
      console.error("Error creating user:", error);
      res.status(500).json({ message: "Failed to create user" });
    }
  });

  // Create new school - Platform owner only
  app.post("/api/platform/schools", requirePlatformOwner, async (req: Request, res: Response) => {
    try {
      const { name, ownerId, city, address, phone, website, instruments, description } = req.body;

      // Validate required fields
      if (!name) {
        return res.status(400).json({ message: "School name is required" });
      }

      // If ownerId is provided, validate it exists and is a school_owner
      if (ownerId) {
        const ownerResult = await storage.executeQuery(
          'SELECT id, role FROM users WHERE id = $1',
          [ownerId]
        );
        if (ownerResult.rows.length === 0) {
          return res.status(400).json({ message: "Owner user not found" });
        }
        if (ownerResult.rows[0].role !== 'school_owner') {
          return res.status(400).json({ message: "Assigned owner must have school_owner role" });
        }
      }

      // Create the school
      const result = await storage.executeQuery(`
        INSERT INTO schools (name, owner_id, city, address, phone, website, instruments, description, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
        RETURNING *
      `, [name, ownerId || null, city || null, address || null, phone || null, website || null, instruments || null, description || null]);

      const newSchool = result.rows[0];

      // If ownerId is provided, create school membership and update user's schoolId
      if (ownerId) {
        await storage.executeQuery(`
          INSERT INTO school_memberships (school_id, user_id, role)
          VALUES ($1, $2, 'owner')
          ON CONFLICT DO NOTHING
        `, [newSchool.id, ownerId]);

        // Update the owner's schoolId
        await storage.executeQuery(`
          UPDATE users SET school_id = $1 WHERE id = $2 AND school_id IS NULL
        `, [newSchool.id, ownerId]);
      }

      // Log admin action
      await logAdminAction(req, 'school_create', 'school', newSchool.id, {
        name: newSchool.name,
        ownerId: newSchool.owner_id,
        city: newSchool.city
      });

      res.status(201).json({
        message: "School created successfully",
        school: newSchool
      });
    } catch (error) {
      console.error("Error creating school:", error);
      res.status(500).json({ message: "Failed to create school" });
    }
  });

  // Assign owner to school - Platform owner only
  app.post("/api/platform/schools/:id/assign-owner", requirePlatformOwner, async (req: Request, res: Response) => {
    try {
      const schoolId = parseInt(req.params.id);
      const { ownerId } = req.body;

      if (isNaN(schoolId)) {
        return res.status(400).json({ message: "Invalid school ID" });
      }

      if (!ownerId) {
        return res.status(400).json({ message: "Owner ID is required" });
      }

      // Validate school exists
      const schoolResult = await storage.executeQuery(
        'SELECT * FROM schools WHERE id = $1',
        [schoolId]
      );
      if (schoolResult.rows.length === 0) {
        return res.status(404).json({ message: "School not found" });
      }

      // Validate owner exists and is school_owner
      const ownerResult = await storage.executeQuery(
        'SELECT id, role, name FROM users WHERE id = $1',
        [ownerId]
      );
      if (ownerResult.rows.length === 0) {
        return res.status(400).json({ message: "Owner user not found" });
      }
      if (ownerResult.rows[0].role !== 'school_owner') {
        return res.status(400).json({ message: "Assigned user must have school_owner role" });
      }

      // Update school's owner_id
      await storage.executeQuery(`
        UPDATE schools SET owner_id = $1, updated_at = NOW() WHERE id = $2
      `, [ownerId, schoolId]);

      // Create school membership for the owner
      await storage.executeQuery(`
        INSERT INTO school_memberships (school_id, user_id, role)
        VALUES ($1, $2, 'owner')
        ON CONFLICT DO NOTHING
      `, [schoolId, ownerId]);

      // Update owner's schoolId if not set
      await storage.executeQuery(`
        UPDATE users SET school_id = $1 WHERE id = $2 AND school_id IS NULL
      `, [schoolId, ownerId]);

      const owner = ownerResult.rows[0];

      // Log admin action
      await logAdminAction(req, 'school_assign_owner', 'school', schoolId, {
        schoolName: schoolResult.rows[0].name,
        newOwnerId: ownerId,
        newOwnerName: owner.name
      });

      res.json({
        message: "Owner assigned to school successfully",
        schoolId,
        ownerId,
        ownerName: owner.name
      });
    } catch (error) {
      console.error("Error assigning owner to school:", error);
      res.status(500).json({ message: "Failed to assign owner" });
    }
  });

  // Delete user - Platform owner only
  app.delete("/api/platform/users/:id", requirePlatformOwner, async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.id);

      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }

      // Get user details for logging
      const userResult = await storage.executeQuery(
        'SELECT id, username, email, role FROM users WHERE id = $1',
        [userId]
      );
      if (userResult.rows.length === 0) {
        return res.status(404).json({ message: "User not found" });
      }

      const user = userResult.rows[0];

      // Prevent deleting platform owners
      if (user.role === 'platform_owner') {
        return res.status(403).json({ message: "Cannot delete platform owner accounts" });
      }

      // Delete user (cascades will handle related records)
      await storage.executeQuery('DELETE FROM users WHERE id = $1', [userId]);

      // Log admin action
      await logAdminAction(req, 'user_delete', 'user', userId, {
        username: user.username,
        email: user.email,
        role: user.role
      });

      res.json({ message: "User deleted successfully" });
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ message: "Failed to delete user" });
    }
  });

  // Delete school - Platform owner only
  app.delete("/api/platform/schools/:id", requirePlatformOwner, async (req: Request, res: Response) => {
    try {
      const schoolId = parseInt(req.params.id);

      if (isNaN(schoolId)) {
        return res.status(400).json({ message: "Invalid school ID" });
      }

      // Get school details for logging
      const schoolResult = await storage.executeQuery(
        'SELECT id, name FROM schools WHERE id = $1',
        [schoolId]
      );
      if (schoolResult.rows.length === 0) {
        return res.status(404).json({ message: "School not found" });
      }

      const school = schoolResult.rows[0];

      // Delete school (cascades will handle related records)
      await storage.executeQuery('DELETE FROM schools WHERE id = $1', [schoolId]);

      // Log admin action
      await logAdminAction(req, 'school_delete', 'school', schoolId, {
        schoolName: school.name
      });

      res.json({ message: "School deleted successfully" });
    } catch (error) {
      console.error("Error deleting school:", error);
      res.status(500).json({ message: "Failed to delete school" });
    }
  });

  // Get billing/invoices overview
  app.get("/api/platform/billing", requirePlatformOwner, async (req: Request, res: Response) => {
    try {
      const { status, school_id } = req.query;

      let whereConditions = [];
      let params = [];
      let paramCount = 0;

      if (status) {
        paramCount++;
        whereConditions.push(`sbs.payment_status = $${paramCount}`);
        params.push(status);
      }

      if (school_id) {
        paramCount++;
        whereConditions.push(`sbs.school_id = $${paramCount}`);
        params.push(school_id);
      }

      const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

      const billingData = await storage.executeQuery(`
        SELECT 
          sbs.*,
          s.name as school_name,
          s.city,
          s.email as school_email,
          COUNT(DISTINCT u.id) as user_count
        FROM school_billing_summary sbs
        LEFT JOIN schools s ON sbs.school_id = s.id
        LEFT JOIN users u ON s.id = u.school_id
        ${whereClause}
        GROUP BY sbs.id, s.name, s.city, s.email
        ORDER BY sbs.next_billing_date ASC
      `, params);

      res.json({ invoices: billingData.rows });
    } catch (error) {
      console.error("Error fetching billing data:", error);
      res.status(500).json({ message: "Failed to fetch billing data" });
    }
  });

  // Update billing/payment status
  app.put("/api/platform/billing/:id/status", requirePlatformOwner, async (req: Request, res: Response) => {
    try {
      const billingId = parseInt(req.params.id);
      const { status, notes } = req.body;

      const validStatuses = ['current', 'overdue', 'suspended', 'canceled'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ message: "Invalid payment status" });
      }

      // Get current billing data
      const currentBilling = await storage.executeQuery(`
        SELECT * FROM school_billing_summary WHERE id = $1
      `, [billingId]);

      if (!currentBilling.rows.length) {
        return res.status(404).json({ message: "Billing record not found" });
      }

      // Update status
      await storage.executeQuery(`
        UPDATE school_billing_summary 
        SET payment_status = $1, updated_at = NOW()
        WHERE id = $2
      `, [status, billingId]);

      // Log admin action
      await logAdminAction(req, 'billing_status_update', 'billing', billingId, {
        schoolId: currentBilling.rows[0].school_id,
        oldStatus: currentBilling.rows[0].payment_status,
        newStatus: status,
        notes: notes || 'Status updated by platform admin'
      });

      res.json({ message: "Billing status updated successfully" });
    } catch (error) {
      console.error("Error updating billing status:", error);
      res.status(500).json({ message: "Failed to update billing status" });
    }
  });

  // Get admin action audit log
  app.get("/api/platform/audit-log", requirePlatformOwner, async (req: Request, res: Response) => {
    try {
      const { target_type, limit = 100 } = req.query;

      let whereClause = '';
      let params = [];

      if (target_type) {
        whereClause = 'WHERE aa.target_type = $1';
        params.push(target_type);
      }

      const auditLog = await storage.executeQuery(`
        SELECT 
          aa.*,
          u.username as actor_username,
          u.name as actor_name
        FROM admin_actions aa
        LEFT JOIN users u ON aa.actor_id = u.id
        ${whereClause}
        ORDER BY aa.created_at DESC
        LIMIT $${params.length + 1}
      `, [...params, limit]);

      res.json({ auditLog: auditLog.rows });
    } catch (error) {
      console.error("Error fetching audit log:", error);
      res.status(500).json({ message: "Failed to fetch audit log" });
    }
  });

  // Test endpoint to demonstrate billing calculations
  // Enhanced billing API endpoints with audit tracking
  app.get("/api/admin/billing/health", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || req.user!.role !== 'platform_owner') {
      return res.status(403).json({ message: "Platform owner access required" });
    }

    try {
      const { enhancedStripeService } = require("./services/enhanced-stripe-service");
      const health = await enhancedStripeService.getBillingHealthStatus();
      res.json(health);
    } catch (error) {
      console.error("Error getting billing health:", error);
      res.status(500).json({ message: "Failed to get billing health status" });
    }
  });

  app.get("/api/admin/billing/alerts", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || req.user!.role !== 'platform_owner') {
      return res.status(403).json({ message: "Platform owner access required" });
    }

    try {
      const { BillingAuditService } = require("./services/billing-audit-service");
      const limit = parseInt(req.query.limit as string) || 50;
      const unreadOnly = req.query.unread === 'true';
      const alerts = await BillingAuditService.getBillingAlerts(limit, unreadOnly);
      res.json(alerts);
    } catch (error) {
      console.error("Error getting billing alerts:", error);
      res.status(500).json({ message: "Failed to get billing alerts" });
    }
  });

  app.post("/api/admin/billing/alerts/:id/resolve", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || req.user!.role !== 'platform_owner') {
      return res.status(403).json({ message: "Platform owner access required" });
    }

    try {
      const { BillingAuditService } = require("./services/billing-audit-service");
      const alertId = parseInt(req.params.id);
      await BillingAuditService.resolveBillingAlert(alertId, req.user!.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error resolving billing alert:", error);
      res.status(500).json({ message: "Failed to resolve billing alert" });
    }
  });

  app.get("/api/admin/billing/audit/:schoolId", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || req.user!.role !== 'platform_owner') {
      return res.status(403).json({ message: "Platform owner access required" });
    }

    try {
      const { BillingAuditService } = require("./services/billing-audit-service");
      const schoolId = parseInt(req.params.schoolId);
      const limit = parseInt(req.query.limit as string) || 100;
      const audit = await BillingAuditService.getSchoolBillingAudit(schoolId, limit);
      res.json(audit);
    } catch (error) {
      console.error("Error getting billing audit:", error);
      res.status(500).json({ message: "Failed to get billing audit trail" });
    }
  });

  app.post("/api/admin/billing/manual-trigger/:schoolId", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || req.user!.role !== 'platform_owner') {
      return res.status(403).json({ message: "Platform owner access required" });
    }

    try {
      const { enhancedStripeService } = require("./services/enhanced-stripe-service");
      const schoolId = parseInt(req.params.schoolId);
      const result = await enhancedStripeService.triggerSchoolBilling(schoolId, req.user!.id);
      res.json(result);
    } catch (error) {
      console.error("Error triggering manual billing:", error);
      res.status(500).json({ message: "Failed to trigger manual billing" });
    }
  });

  app.post("/api/admin/billing/process-monthly", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || req.user!.role !== 'platform_owner') {
      return res.status(403).json({ message: "Platform owner access required" });
    }

    try {
      const { enhancedStripeService } = require("./services/enhanced-stripe-service");
      const result = await enhancedStripeService.processMonthlyBilling();
      res.json(result);
    } catch (error) {
      console.error("Error processing monthly billing:", error);
      res.status(500).json({ message: "Failed to process monthly billing" });
    }
  });

  // 3. Usage Summary per School (Backend) - Get comprehensive school usage data
  app.get("/api/admin/billing/usage-summary/:schoolId", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || req.user!.role !== 'platform_owner') {
      return res.status(403).json({ message: "Platform owner access required" });
    }

    try {
      const { enhancedStripeService } = require("./services/enhanced-stripe-service");
      const schoolId = parseInt(req.params.schoolId);
      const summary = await enhancedStripeService.getSchoolUsageSummary(schoolId);
      res.json(summary);
    } catch (error) {
      console.error("Error getting usage summary:", error);
      res.status(500).json({ message: "Failed to get usage summary" });
    }
  });

  app.get("/api/admin/billing/usage-summary", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || req.user!.role !== 'platform_owner') {
      return res.status(403).json({ message: "Platform owner access required" });
    }

    try {
      const { enhancedStripeService } = require("./services/enhanced-stripe-service");
      
      // Get summaries for all schools (1-5 for testing)
      const summaries = [];
      for (let schoolId = 1; schoolId <= 3; schoolId++) {
        try {
          const summary = await enhancedStripeService.getSchoolUsageSummary(schoolId);
          summaries.push(summary);
        } catch (error) {
          console.error(`Failed to get summary for school ${schoolId}:`, error);
        }
      }
      
      res.json(summaries);
    } catch (error) {
      console.error("Error getting usage summaries:", error);
      res.status(500).json({ message: "Failed to get usage summaries" });
    }
  });

  // 4. Pre-billing Warning Logic - Check for usage increases before billing
  app.post("/api/admin/billing/check-warnings", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || req.user!.role !== 'platform_owner') {
      return res.status(403).json({ message: "Platform owner access required" });
    }

    try {
      const { enhancedStripeService } = require("./services/enhanced-stripe-service");
      const warnings = await enhancedStripeService.checkPreBillingWarnings();
      res.json({ warnings, count: warnings.length, checkedAt: new Date().toISOString() });
    } catch (error) {
      console.error("Error checking pre-billing warnings:", error);
      res.status(500).json({ message: "Failed to check pre-billing warnings" });
    }
  });

  // ==================== INVOICE MANAGEMENT ENDPOINTS ====================

  app.get("/api/admin/billing/invoices", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || req.user!.role !== 'platform_owner') {
      return res.status(403).json({ message: "Platform owner access required" });
    }

    try {
      const { enhancedStripeService } = require("./services/enhanced-stripe-service");
      const schoolId = req.query.schoolId ? parseInt(req.query.schoolId as string) : undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const invoices = await enhancedStripeService.listInvoices(schoolId, limit);
      res.json({ invoices });
    } catch (error: any) {
      console.error("Error listing invoices:", error);
      res.status(500).json({ message: error.message || "Failed to list invoices" });
    }
  });

  app.post("/api/admin/billing/invoices", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || req.user!.role !== 'platform_owner') {
      return res.status(403).json({ message: "Platform owner access required" });
    }

    try {
      const { enhancedStripeService } = require("./services/enhanced-stripe-service");
      const { schoolId, items, dueDate } = req.body;

      if (!schoolId || !items || !Array.isArray(items)) {
        return res.status(400).json({ message: "schoolId and items array required" });
      }

      const invoice = await enhancedStripeService.createInvoice(
        schoolId,
        items,
        dueDate ? new Date(dueDate) : undefined
      );
      res.json({ success: true, invoice });
    } catch (error: any) {
      console.error("Error creating invoice:", error);
      res.status(500).json({ message: error.message || "Failed to create invoice" });
    }
  });

  app.get("/api/admin/billing/invoices/:invoiceId/pdf", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || req.user!.role !== 'platform_owner') {
      return res.status(403).json({ message: "Platform owner access required" });
    }

    try {
      const { enhancedStripeService } = require("./services/enhanced-stripe-service");
      const pdfUrl = await enhancedStripeService.getInvoicePdfUrl(req.params.invoiceId);
      res.json({ pdfUrl });
    } catch (error: any) {
      console.error("Error getting invoice PDF:", error);
      res.status(500).json({ message: error.message || "Failed to get invoice PDF" });
    }
  });

  app.post("/api/admin/billing/invoices/:invoiceId/send", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || req.user!.role !== 'platform_owner') {
      return res.status(403).json({ message: "Platform owner access required" });
    }

    try {
      const { enhancedStripeService } = require("./services/enhanced-stripe-service");
      const invoice = await enhancedStripeService.sendInvoice(req.params.invoiceId);
      res.json({ success: true, invoice });
    } catch (error: any) {
      console.error("Error sending invoice:", error);
      res.status(500).json({ message: error.message || "Failed to send invoice" });
    }
  });

  app.post("/api/admin/billing/invoices/:invoiceId/finalize", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || req.user!.role !== 'platform_owner') {
      return res.status(403).json({ message: "Platform owner access required" });
    }

    try {
      const { enhancedStripeService } = require("./services/enhanced-stripe-service");
      const invoice = await enhancedStripeService.finalizeInvoice(req.params.invoiceId);
      res.json({ success: true, invoice });
    } catch (error: any) {
      console.error("Error finalizing invoice:", error);
      res.status(500).json({ message: error.message || "Failed to finalize invoice" });
    }
  });

  app.post("/api/admin/billing/invoices/:invoiceId/void", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || req.user!.role !== 'platform_owner') {
      return res.status(403).json({ message: "Platform owner access required" });
    }

    try {
      const { enhancedStripeService } = require("./services/enhanced-stripe-service");
      const { reason } = req.body;
      const invoice = await enhancedStripeService.voidInvoice(req.params.invoiceId, reason || 'No reason provided');
      res.json({ success: true, invoice });
    } catch (error: any) {
      console.error("Error voiding invoice:", error);
      res.status(500).json({ message: error.message || "Failed to void invoice" });
    }
  });

  // ==================== PRICING CONTROL ENDPOINTS ====================

  app.get("/api/admin/billing/pricing", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || req.user!.role !== 'platform_owner') {
      return res.status(403).json({ message: "Platform owner access required" });
    }

    try {
      const { enhancedStripeService } = require("./services/enhanced-stripe-service");
      const pricing = await enhancedStripeService.listAllSchoolPricing();
      res.json({ pricing });
    } catch (error: any) {
      console.error("Error listing pricing:", error);
      res.status(500).json({ message: error.message || "Failed to list pricing" });
    }
  });

  app.get("/api/admin/billing/pricing/:schoolId", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || req.user!.role !== 'platform_owner') {
      return res.status(403).json({ message: "Platform owner access required" });
    }

    try {
      const { enhancedStripeService } = require("./services/enhanced-stripe-service");
      const schoolId = parseInt(req.params.schoolId);
      const pricing = await enhancedStripeService.getSchoolPricing(schoolId);
      if (!pricing) {
        return res.status(404).json({ message: "School pricing not found" });
      }
      res.json(pricing);
    } catch (error: any) {
      console.error("Error getting school pricing:", error);
      res.status(500).json({ message: error.message || "Failed to get school pricing" });
    }
  });

  app.put("/api/admin/billing/pricing/:schoolId", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || req.user!.role !== 'platform_owner') {
      return res.status(403).json({ message: "Platform owner access required" });
    }

    try {
      const { enhancedStripeService } = require("./services/enhanced-stripe-service");
      const schoolId = parseInt(req.params.schoolId);
      const { monthlyPrice, reason } = req.body;

      if (typeof monthlyPrice !== 'number' || monthlyPrice < 0) {
        return res.status(400).json({ message: "Valid monthlyPrice required" });
      }

      const result = await enhancedStripeService.updateSchoolPrice(schoolId, monthlyPrice, reason || 'Price update');
      res.json(result);
    } catch (error: any) {
      console.error("Error updating school pricing:", error);
      res.status(500).json({ message: error.message || "Failed to update school pricing" });
    }
  });

  app.post("/api/admin/billing/pricing/:schoolId/credit", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || req.user!.role !== 'platform_owner') {
      return res.status(403).json({ message: "Platform owner access required" });
    }

    try {
      const { enhancedStripeService } = require("./services/enhanced-stripe-service");
      const schoolId = parseInt(req.params.schoolId);
      const { amount, reason } = req.body;

      if (typeof amount !== 'number' || amount <= 0) {
        return res.status(400).json({ message: "Valid positive amount required" });
      }

      const result = await enhancedStripeService.applyCredit(schoolId, amount, reason || 'Credit applied');
      res.json(result);
    } catch (error: any) {
      console.error("Error applying credit:", error);
      res.status(500).json({ message: error.message || "Failed to apply credit" });
    }
  });

  // ==================== REFUND PROCESSING ENDPOINTS ====================

  app.get("/api/admin/billing/payments", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || req.user!.role !== 'platform_owner') {
      return res.status(403).json({ message: "Platform owner access required" });
    }

    try {
      const { enhancedStripeService } = require("./services/enhanced-stripe-service");
      const schoolId = req.query.schoolId ? parseInt(req.query.schoolId as string) : undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const payments = await enhancedStripeService.listPayments(schoolId, limit);
      res.json({ payments });
    } catch (error: any) {
      console.error("Error listing payments:", error);
      res.status(500).json({ message: error.message || "Failed to list payments" });
    }
  });

  app.get("/api/admin/billing/payments/:paymentIntentId", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || req.user!.role !== 'platform_owner') {
      return res.status(403).json({ message: "Platform owner access required" });
    }

    try {
      const { enhancedStripeService } = require("./services/enhanced-stripe-service");
      const payment = await enhancedStripeService.getPaymentDetails(req.params.paymentIntentId);
      res.json(payment);
    } catch (error: any) {
      console.error("Error getting payment details:", error);
      res.status(500).json({ message: error.message || "Failed to get payment details" });
    }
  });

  app.get("/api/admin/billing/refunds", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || req.user!.role !== 'platform_owner') {
      return res.status(403).json({ message: "Platform owner access required" });
    }

    try {
      const { enhancedStripeService } = require("./services/enhanced-stripe-service");
      const schoolId = req.query.schoolId ? parseInt(req.query.schoolId as string) : undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const refunds = await enhancedStripeService.getRefundHistory(schoolId, limit);
      res.json({ refunds });
    } catch (error: any) {
      console.error("Error listing refunds:", error);
      res.status(500).json({ message: error.message || "Failed to list refunds" });
    }
  });

  app.post("/api/admin/billing/refunds", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || req.user!.role !== 'platform_owner') {
      return res.status(403).json({ message: "Platform owner access required" });
    }

    try {
      const { enhancedStripeService } = require("./services/enhanced-stripe-service");
      const { paymentIntentId, amount, reason, schoolId } = req.body;

      if (!paymentIntentId) {
        return res.status(400).json({ message: "paymentIntentId required" });
      }

      if (!reason) {
        return res.status(400).json({ message: "reason required" });
      }

      const result = await enhancedStripeService.issueRefund(
        paymentIntentId,
        amount || null,
        reason,
        schoolId
      );
      res.json(result);
    } catch (error: any) {
      console.error("Error issuing refund:", error);
      res.status(500).json({ message: error.message || "Failed to issue refund" });
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

  app.post("/api/test/billing-calculation", async (req: Request, res: Response) => {
    try {
      const { teachers, students, currentPlan } = req.body;
      
      // Simulate billing calculation
      const standardPlanPrice = 2995; // €29.95 in cents
      const proPlanPrice = 4995; // €49.95 in cents
      const extraStudentBlock = 450; // €4.50 per 5 students in cents
      
      let breakdown = {
        scenario: `${teachers} teachers, ${students} students`,
        basePlan: {},
        additionalCosts: [],
        total: 0
      };
      
      // Determine plan based on teacher count
      if (teachers > 1) {
        // Auto-upgrade to Pro
        breakdown.basePlan = {
          name: 'Pro',
          price: proPlanPrice / 100,
          includedTeachers: 'Unlimited',
          includedStudents: 50,
          reason: `Auto-upgrade: ${teachers} teachers exceed Standard limit (1)`
        };
        
        // Calculate extra students beyond Pro plan (50 included)
        const extraStudents = Math.max(0, students - 50);
        if (extraStudents > 0) {
          const blocks = Math.ceil(extraStudents / 5);
          const extraCost = blocks * extraStudentBlock;
          breakdown.additionalCosts.push({
            type: 'extra_students',
            description: `${extraStudents} extra students (${blocks} blocks of 5)`,
            calculation: `${blocks} × €4.50`,
            price: extraCost / 100
          });
        }
        breakdown.total = (proPlanPrice + (breakdown.additionalCosts[0]?.price * 100 || 0)) / 100;
        
      } else {
        // Standard plan
        breakdown.basePlan = {
          name: 'Standard',
          price: standardPlanPrice / 100,
          includedTeachers: 1,
          includedStudents: 25
        };
        
        // Calculate extra students beyond Standard plan (25 included)
        const extraStudents = Math.max(0, students - 25);
        if (extraStudents > 0) {
          const blocks = Math.ceil(extraStudents / 5);
          const extraCost = blocks * extraStudentBlock;
          breakdown.additionalCosts.push({
            type: 'extra_students',
            description: `${extraStudents} extra students (${blocks} blocks of 5)`,
            calculation: `${blocks} × €4.50`,
            price: extraCost / 100
          });
        }
        breakdown.total = (standardPlanPrice + (breakdown.additionalCosts[0]?.price * 100 || 0)) / 100;
      }
      
      // Add billing timeline
      breakdown.billingInfo = {
        nextBillingDate: '2025-08-01',
        billingCycle: 'Monthly',
        currency: 'EUR',
        paymentMethod: 'Stripe automatic billing'
      };
      
      res.json(breakdown);
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

  // Enhanced messaging endpoints for scale
  app.post("/api/messages/send", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const { receiverId, receiverType, subject, content } = req.body;
      const senderId = req.user.id;
      const senderType = req.user.role === "student" ? "student" : "teacher";

      if (!receiverId || !receiverType || !subject || !content) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      const result = await storage.createMessage({
        senderId,
        receiverId,
        senderType,
        receiverType,
        subject,
        content,
        isRead: false
      });

      res.json({ 
        success: true, 
        messageId: result.id,
        message: "Message sent successfully" 
      });

    } catch (error) {
      console.error("Error sending message:", error);
      res.status(500).json({ message: "Failed to send message" });
    }
  });

  app.get("/api/messages/unread-count", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const userId = req.user.id;
      const userType = req.user.role === "student" ? "student" : "teacher";
      
      const count = await storage.getUnreadMessageCount(userId, userType);
      
      res.json({ unreadCount: count });

    } catch (error) {
      console.error("Error fetching unread count:", error);
      res.status(500).json({ unreadCount: 0 });
    }
  });

  // Platform monitoring for thousands of users
  app.get("/api/admin/platform-stats", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated() || req.user.role !== "platform_owner") {
        return res.status(403).json({ message: "Platform admin access required" });
      }

      const messageStats = await storage.getMessageStats();
      const practiceStats = await storage.getStudentPracticeStats('1h');
      
      res.json({
        messaging: messageStats,
        practice: {
          activeStudentsLastHour: Number(practiceStats.active_students) || 0,
          sessionsLastHour: Number(practiceStats.total_sessions) || 0,
          avgSessionMinutes: Math.round(Number(practiceStats.avg_session_minutes) || 0)
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error("Error fetching platform stats:", error);
      res.status(500).json({ message: "Failed to fetch platform statistics" });
    }
  });

  // Admin/Teacher password reset for students
  app.post("/api/admin/students/:id/reset-password", 
    requireAuth,
    loadSchoolContext,
    requireTeacherOrOwner,
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
      if (req.user?.role !== "platform_owner" && student.schoolId !== req.user?.schoolId) {
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

  // School Members Endpoints - Simplified: No complex middleware, direct query
  app.get("/api/school/members", requireAuth, async (req: Request, res: Response) => {
    try {
      const user = req.user!;
      console.log("GET /api/school/members - user object:", JSON.stringify(user, null, 2));
      
      // Check role - only teachers and school owners can view members
      if (user.role !== 'teacher' && user.role !== 'school_owner' && user.role !== 'platform_owner') {
        return res.status(403).json({ message: "Access denied" });
      }
      
      // Get schoolId directly from user
      const schoolId = user.schoolId;
      console.log("GET /api/school/members - schoolId:", schoolId, "type:", typeof schoolId);
      
      if (!schoolId) {
        return res.status(400).json({ 
          message: "No school context available",
          debug: { userId: user.id, role: user.role, schoolId: user.schoolId }
        });
      }
      
      // Get all users (teachers and school owners) in this school
      const result = await db.select({
        id: users.id,
        firstName: users.name,
        lastName: sql`''`.as('lastName'),
        email: users.email,
        role: users.role,
        isActive: sql`true`.as('isActive'),
        joinedAt: users.createdAt,
        lastActive: users.lastLoginAt,
        avatar: users.avatar
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
        )
        .orderBy(users.name);

      res.json(result);
    } catch (error) {
      console.error("Error fetching school members:", error);
      res.status(500).json({ message: "Failed to fetch school members" });
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

  // School Owner Dashboard API Endpoints
  // Note: Using the local requireSchoolOwner middleware defined earlier for backwards compatibility
  // FIXED: Now properly uses req.user from Passport instead of req.session.user
  const requireSchoolOwnerDashboard = (req: any, res: any, next: any) => {
    if (!req.user) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    if (req.user.role !== 'school_owner' && req.user.role !== 'teacher') {
      return res.status(403).json({ message: "Access denied. School owner or teacher role required." });
    }
    next();
  };

  // Get school dashboard stats
  app.get("/api/school/dashboard-stats", requireAuth, requireSchoolOwnerDashboard, async (req: Request, res: Response) => {
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
  app.get("/api/school/student-activity", requireAuth, requireSchoolOwnerDashboard, async (req: Request, res: Response) => {
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
  app.get("/api/school/performance-trends", requireAuth, requireSchoolOwnerDashboard, async (req: Request, res: Response) => {
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
  app.put("/api/user/password", requireAuth, authRateLimit, async (req: Request, res: Response) => {
    try {
      console.log("Password change request for user:", req.user!.id);
      
      // Validate request body
      const validatedData = passwordChangeSchema.parse(req.body);
      
      await storage.changeUserPassword(
        req.user!.id, 
        validatedData.currentPassword, 
        validatedData.newPassword
      );
      
      res.json({ 
        message: "Password updated successfully",
        success: true 
      });
    } catch (error) {
      console.error("Error changing password:", error);
      
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
      
      res.status(500).json({ message: "Failed to change password" });
    }
  });

  // ========================================
  // END SETTINGS API ENDPOINTS
  // ========================================

  // ========================================
  // CRON HEALTH MONITORING API ENDPOINTS
  // ========================================
  
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
  app.get("/api/admin/cron-health", requireAuth, authzRequireSchoolOwner(), async (req: Request, res: Response) => {
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
  app.get("/api/admin/cron-health/:jobName", requireAuth, authzRequireSchoolOwner(), async (req: Request, res: Response) => {
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

  // ========================================
  // END CRON HEALTH MONITORING API ENDPOINTS
  // ========================================

  // WebSocketManager removed - RealtimeBus is configured in index.ts and available as (app as any).realtimeBus
  // For backward compatibility, alias realtimeBus as wsManager
  (app as any).wsManager = (app as any).realtimeBus;

  return httpServer;
}
