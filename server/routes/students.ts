import { Express, Request, Response } from "express";
import { storage } from "../storage-wrapper";
import { USER_ROLES, createStudentWithAccountSchema } from "@shared/schema";
import { insertStudentSchema } from "@shared/schema";
import { z } from "zod";
import { requireAuth } from "../middleware/auth";
import { 
  loadSchoolContext, 
  requireTeacherOrOwner, 
  applySchoolFiltering 
} from "../middleware/authz";
import { setStorageContext } from "../middleware/storage-context";
import bcrypt from "bcrypt";

// Enhanced student access middleware using school context
// This replaces the old manual access control with proper school scoping
function requireStudentAccess(studentIdParam: string = 'id') {
  return async (req: Request, res: Response, next: Function) => {
    try {
      if (!req.isAuthenticated() || !req.user || !req.school) {
        return res.status(401).json({ message: "Not authenticated or missing school context" });
      }

      const studentId = parseInt(req.params[studentIdParam]);
      const student = await storage.getStudent(studentId);
      
      if (!student) {
        return res.status(404).json({ message: "Student not found" });
      }

      // Platform owners have access to all students
      if (req.school.isPlatformOwner()) {
        return next();
      }

      // School owners have access to students in their school
      if (req.school.isSchoolOwner()) {
        // Check if student belongs to this school through assigned teacher or creator
        if (student.assignedTeacherId) {
          const teacher = await storage.getUser(student.assignedTeacherId);
          if (teacher && teacher.schoolId === req.school.id) {
            return next();
          }
        }
        
        // Check if student creator belongs to this school
        if (student.userId) {
          const studentCreator = await storage.getUser(student.userId);
          if (studentCreator && studentCreator.schoolId === req.school.id) {
            return next();
          }
        }
      }

      // Teachers have access to students they created or are assigned to in their school
      if (req.school.isTeacher()) {
        const hasAccess = (
          student.assignedTeacherId === req.user.id || 
          student.userId === req.user.id
        );
        
        if (hasAccess) {
          // Additional check: ensure teacher and student are in same school
          if (student.assignedTeacherId) {
            const teacher = await storage.getUser(student.assignedTeacherId);
            if (teacher && teacher.schoolId === req.school.id) {
              return next();
            }
          }
          
          if (student.userId) {
            const studentCreator = await storage.getUser(student.userId);
            if (studentCreator && studentCreator.schoolId === req.school.id) {
              return next();
            }
          }
        }
      }

      // Students can access their own profile (separate endpoint should be used)
      if (req.school.isStudent() && req.user.id === student.accountId) {
        return next();
      }

      return res.status(403).json({ 
        message: "You don't have access to this student",
        reason: "Student not in your school or not assigned to you"
      });
    } catch (error) {
      console.error("Error in student access middleware:", error);
      return res.status(500).json({ message: "Failed to verify student access" });
    }
  };
}

// NOTE: Old requireStudentAccess middleware removed - replaced with enhanced version above

// NOTE: Old requireRole middleware removed - using gold standard security stack instead

export function registerStudentRoutes(app: Express) {
  // Get a specific student
  app.get(
    "/api/students/:id",
    requireAuth,
    loadSchoolContext,
    requireTeacherOrOwner(),
    applySchoolFiltering(),
    requireStudentAccess(),
    async (req: Request, res: Response) => {
      try {
        const studentId = parseInt(req.params.id);
        const student = await storage.getStudent(studentId);
        
        if (!student) {
          return res.status(404).json({ message: "Student not found" });
        }
        
        res.json(student);
      } catch (error) {
        console.error("Error getting student:", error);
        res.status(500).json({ message: "Failed to get student" });
      }
    }
  );
  
  // Create a new student
  app.post(
    "/api/students",
    requireAuth,
    loadSchoolContext,
    requireTeacherOrOwner(),
    applySchoolFiltering(),
    setStorageContext,
    async (req: Request, res: Response) => {
      try {
        if (!req.user) {
          return res.status(401).json({ message: "Not authenticated" });
        }
        
        // CRITICAL SECURITY: Enforce school context for multi-tenant isolation
        if (!req.school || !req.school.id) {
          return res.status(400).json({ 
            message: "School context required for student creation",
            reason: "No school association found for authenticated user"
          });
        }
        
        // CRITICAL SECURITY: Validate that user has proper school membership
        if (req.school.role === 'student') {
          return res.status(403).json({ 
            message: "Students cannot create other students",
            reason: "Only teachers and school owners can create students"
          });
        }
        
        // Validate with extended schema that includes username/password/parent info
        const validatedData = createStudentWithAccountSchema.parse(req.body);
        
        // Ensure unique email: use provided email or generate unique placeholder
        const studentEmail = validatedData.email || `${validatedData.username}-${Date.now()}@student.musicdott.app`;
        
        console.log(`🔒 Creating student account for school ${req.school.id} by user ${req.user.id} (${req.school.role})`);
        
        let newUser;
        let student;
        
        try {
          // Step 1: Create user account with hashed password
          const hashedPassword = await bcrypt.hash(validatedData.password, 10);
          
          newUser = await storage.createUser({
            schoolId: req.school.id,
            username: validatedData.username,
            password: hashedPassword,
            name: validatedData.name,
            email: studentEmail,
            role: USER_ROLES.STUDENT,
            mustChangePassword: false,
          });
          
          // Step 2: Build notes with parent info and age if provided
          let notes = validatedData.notes || "";
          if (validatedData.age || validatedData.parentName || validatedData.parentEmail || validatedData.parentPhone) {
            const additionalInfo = [];
            if (validatedData.age) additionalInfo.push(`Age: ${validatedData.age}`);
            if (validatedData.parentName) additionalInfo.push(`Parent: ${validatedData.parentName}`);
            if (validatedData.parentEmail) additionalInfo.push(`Parent Email: ${validatedData.parentEmail}`);
            if (validatedData.parentPhone) additionalInfo.push(`Parent Phone: ${validatedData.parentPhone}`);
            
            notes = notes ? `${notes}\n\n${additionalInfo.join('\n')}` : additionalInfo.join('\n');
          }
          
          // Step 3: Create student record linked to user account
          student = await storage.createStudent({
            schoolId: req.school.id,
            userId: req.user.id, // Creator ID
            accountId: newUser.id, // Student's user account ID
            name: validatedData.name,
            email: studentEmail,
            phone: validatedData.phone || null,
            birthdate: validatedData.birthdate || null,
            instrument: validatedData.instrument,
            level: validatedData.level,
            assignedTeacherId: validatedData.assignedTeacherId || null,
            notes: notes,
          });
          
          console.log(`✅ Student account created: ${validatedData.username} (user ID: ${newUser.id}, student ID: ${student.id})`);
          
          res.status(201).json(student);
        } catch (error) {
          // Rollback: delete user account if student creation failed
          if (newUser && !student) {
            try {
              await storage.deleteUser(newUser.id);
              console.log(`🔄 Rolled back user account ${newUser.id} after student creation failure`);
            } catch (rollbackError) {
              console.error("Failed to rollback user account:", rollbackError);
            }
          }
          throw error; // Re-throw to be caught by outer catch block
        }
      } catch (error) {
        if (error instanceof z.ZodError) {
          return res.status(400).json({ 
            message: "Invalid student data", 
            errors: error.errors 
          });
        }
        console.error("Error creating student:", error);
        res.status(500).json({ message: "Failed to create student" });
      }
    }
  );
  
  // Update a student
  app.put(
    "/api/students/:id",
    requireAuth,
    loadSchoolContext,
    requireTeacherOrOwner(),
    applySchoolFiltering(),
    requireStudentAccess(),
    setStorageContext,
    async (req: Request, res: Response) => {
      try {
        const studentId = parseInt(req.params.id);
        
        // Handle "unassigned" teacher value from frontend before validation
        const bodyData = { ...req.body };
        if (bodyData.assignedTeacherId === "unassigned") {
          bodyData.assignedTeacherId = null;
        }
        
        // Use partial schema validation for updates
        const updateStudentSchema = insertStudentSchema.partial();
        const validatedData = updateStudentSchema.parse(bodyData);
        
        const updatedStudent = await storage.updateStudent(studentId, validatedData);
        
        if (!updatedStudent) {
          return res.status(404).json({ message: "Student not found" });
        }
        
        res.json(updatedStudent);
      } catch (error) {
        if (error instanceof z.ZodError) {
          return res.status(400).json({ 
            message: "Invalid student data", 
            errors: error.errors 
          });
        }
        console.error("Error updating student:", error);
        res.status(500).json({ message: "Failed to update student" });
      }
    }
  );
  
  // Delete a student
  app.delete(
    "/api/students/:id",
    requireAuth,
    loadSchoolContext,
    requireTeacherOrOwner(),
    applySchoolFiltering(),
    requireStudentAccess(),
    setStorageContext,
    async (req: Request, res: Response) => {
      try {
        const studentId = parseInt(req.params.id);
        
        const success = await storage.deleteStudent(studentId);
        
        if (!success) {
          return res.status(404).json({ message: "Student not found" });
        }
        
        res.status(200).json({ message: "Student deleted successfully" });
      } catch (error) {
        console.error("Error deleting student:", error);
        res.status(500).json({ message: "Failed to delete student" });
      }
    }
  );
  
  // Get student's practice sessions
  app.get(
    "/api/students/:id/practice-sessions",
    requireAuth,
    loadSchoolContext,
    requireTeacherOrOwner(),
    applySchoolFiltering(),
    requireStudentAccess(),
    async (req: Request, res: Response) => {
      try {
        const studentId = parseInt(req.params.id);
        
        const practiceSessions = await storage.getStudentPracticeSessions(studentId);
        res.json(practiceSessions);
      } catch (error) {
        console.error("Error getting practice sessions:", error);
        res.status(500).json({ message: "Failed to get practice sessions" });
      }
    }
  );
  
  // Get student's sessions (scheduled lessons)
  app.get(
    "/api/students/:id/sessions",
    requireAuth,
    loadSchoolContext,
    requireTeacherOrOwner(),
    applySchoolFiltering(),
    requireStudentAccess(),
    async (req: Request, res: Response) => {
      try {
        const studentId = parseInt(req.params.id);
        
        const sessions = await storage.getStudentSessions(studentId);
        res.json(sessions);
      } catch (error) {
        console.error("Error getting sessions:", error);
        res.status(500).json({ message: "Failed to get sessions" });
      }
    }
  );
  
  // Get student's assignments
  app.get(
    "/api/students/:id/assignments",
    requireAuth,
    loadSchoolContext,
    requireTeacherOrOwner(),
    applySchoolFiltering(),
    requireStudentAccess(),
    async (req: Request, res: Response) => {
      try {
        const studentId = parseInt(req.params.id);
        
        const assignments = await storage.getStudentAssignments(studentId);
        res.json(assignments);
      } catch (error) {
        console.error("Error getting assignments:", error);
        res.status(500).json({ message: "Failed to get assignments" });
      }
    }
  );
  
  // Get student's achievements
  app.get(
    "/api/students/:id/achievements",
    requireAuth,
    loadSchoolContext,
    requireTeacherOrOwner(),
    applySchoolFiltering(),
    requireStudentAccess(),
    async (req: Request, res: Response) => {
      try {
        const studentId = parseInt(req.params.id);
        
        const achievements = await storage.getStudentAchievements(studentId);
        res.json(achievements);
      } catch (error) {
        console.error("Error getting achievements:", error);
        res.status(500).json({ message: "Failed to get achievements" });
      }
    }
  );
  
  // Mark achievement as seen
  app.put(
    "/api/students/:studentId/achievements/:achievementId/seen",
    requireAuth,
    loadSchoolContext,
    requireTeacherOrOwner(),
    applySchoolFiltering(),
    requireStudentAccess('studentId'),
    async (req: Request, res: Response) => {
      try {
        const achievementId = parseInt(req.params.achievementId);
        
        const updatedAchievement = await storage.markAchievementAsSeen(achievementId);
        
        if (!updatedAchievement) {
          return res.status(404).json({ message: "Achievement not found" });
        }
        
        res.json(updatedAchievement);
      } catch (error) {
        console.error("Error marking achievement as seen:", error);
        res.status(500).json({ message: "Failed to mark achievement as seen" });
      }
    }
  );
  
  // Get student's lesson progress
  app.get(
    "/api/students/:id/lesson-progress",
    requireAuth,
    loadSchoolContext,
    requireTeacherOrOwner(),
    applySchoolFiltering(),
    requireStudentAccess(),
    async (req: Request, res: Response) => {
      try {
        const studentId = parseInt(req.params.id);
        const lessonProgress = await storage.getStudentLessonProgress(studentId);
        res.json(lessonProgress);
      } catch (error) {
        console.error("Error getting student lesson progress:", error);
        res.status(500).json({ message: "Failed to get lesson progress" });
      }
    }
  );
  
  // Get student's song progress
  app.get(
    "/api/students/:id/song-progress",
    requireAuth,
    loadSchoolContext,
    requireTeacherOrOwner(),
    applySchoolFiltering(),
    requireStudentAccess(),
    async (req: Request, res: Response) => {
      try {
        const studentId = parseInt(req.params.id);
        const songProgress = await storage.getStudentSongProgress(studentId);
        res.json(songProgress);
      } catch (error) {
        console.error("Error getting student song progress:", error);
        res.status(500).json({ message: "Failed to get song progress" });
      }
    }
  );
  
  // Get student's recurring schedules
  app.get(
    "/api/students/:id/recurring-schedules",
    requireAuth,
    loadSchoolContext,
    requireTeacherOrOwner(),
    applySchoolFiltering(),
    requireStudentAccess(),
    async (req: Request, res: Response) => {
      try {
        const studentId = parseInt(req.params.id);
        const schedules = await storage.getStudentRecurringSchedules(studentId);
        res.json(schedules);
      } catch (error) {
        console.error("Error getting student recurring schedules:", error);
        res.status(500).json({ message: "Failed to get recurring schedules" });
      }
    }
  );
  
  // Post student achievement check (for awarding new achievements)
  app.post(
    "/api/students/:id/achievements/check",
    requireAuth,
    loadSchoolContext,
    requireTeacherOrOwner(),
    applySchoolFiltering(),
    requireStudentAccess(),
    async (req: Request, res: Response) => {
      try {
        const studentId = parseInt(req.params.id);
        const newAchievements = await storage.checkAndAwardAchievements(studentId);
        res.json(newAchievements);
      } catch (error) {
        console.error("Error checking for new achievements:", error);
        res.status(500).json({ message: "Failed to check for new achievements" });
      }
    }
  );
}