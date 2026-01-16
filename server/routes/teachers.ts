import { Express, Request, Response } from "express";
import { storage } from "../storage-wrapper";
import { USER_ROLES } from "@shared/schema";
import { insertUserSchema } from "@shared/schema";
import { z } from "zod";

// Helper function to safely check if user has access to a teacher
function hasTeacherAccess(req: Request, teacherId: number): boolean {
  if (!req.isAuthenticated() || !req.user) return false;
  if (req.user.role === USER_ROLES.ADMIN) return true;
  if (req.user.role === USER_ROLES.SCHOOL_OWNER) return true;
  return req.user.id === teacherId;
}

// Middleware to verify teacher access
function requireTeacherAccess(teacherIdParam: string = 'id') {
  return async (req: Request, res: Response, next: Function) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    const teacherId = parseInt(req.params[teacherIdParam]);
    
    // If admin or school owner, they have access
    if (req.user && (req.user.role === USER_ROLES.ADMIN || req.user.role === USER_ROLES.SCHOOL_OWNER)) {
      return next();
    }
    
    // Otherwise, check if the user is the teacher they're trying to access
    if (!req.user || req.user.id !== teacherId) {
      return res.status(403).json({ message: "You don't have access to this teacher" });
    }
    
    next();
  };
}

// Authorization middleware for teacher routes
function requireRole(roles: string[]) {
  return (req: Request, res: Response, next: Function) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Unauthorized role" });
    }
    
    next();
  };
}

export function registerTeacherRoutes(app: Express) {
  // Get all teachers
  app.get(
    "/api/teachers", 
    requireRole([USER_ROLES.ADMIN, USER_ROLES.SCHOOL_OWNER]), 
    async (req: Request, res: Response) => {
      try {
        // If school owner, only get teachers in their school
        if (req.user.role === USER_ROLES.SCHOOL_OWNER && req.user.schoolId) {
          const teachers = await storage.getUsersBySchool(req.user.schoolId);
          return res.json(teachers.filter(user => user.role === USER_ROLES.TEACHER));
        }
        
        // Admin gets all teachers
        const teachers = await storage.getUsersByRole(USER_ROLES.TEACHER);
        res.json(teachers);
      } catch (error) {
        console.error("Error getting teachers:", error);
        res.status(500).json({ message: "Failed to get teachers" });
      }
    }
  );
  
  // Get a specific teacher
  app.get(
    "/api/teachers/:id", 
    requireRole([USER_ROLES.ADMIN, USER_ROLES.SCHOOL_OWNER, USER_ROLES.TEACHER]),
    requireTeacherAccess(), 
    async (req: Request, res: Response) => {
      try {
        const teacherId = parseInt(req.params.id);
        const teacher = await storage.getUser(teacherId);
        
        if (!teacher || teacher.role !== USER_ROLES.TEACHER) {
          return res.status(404).json({ message: "Teacher not found" });
        }
        
        // Don't return the password
        const { password, ...teacherWithoutPassword } = teacher;
        res.json(teacherWithoutPassword);
      } catch (error) {
        console.error("Error getting teacher:", error);
        res.status(500).json({ message: "Failed to get teacher" });
      }
    }
  );
  
  // Create a new teacher (admin or school owner only)
  app.post(
    "/api/teachers", 
    requireRole([USER_ROLES.ADMIN, USER_ROLES.SCHOOL_OWNER]), 
    async (req: Request, res: Response) => {
      try {
        // Extend with role and set defaults
        const teacherSchema = insertUserSchema.extend({
          role: z.literal(USER_ROLES.TEACHER).default(USER_ROLES.TEACHER),
          username: z.string().min(3).max(50),
          password: z.string().min(6).max(100),
          name: z.string().min(2).max(100),
          email: z.string().email(),
          instruments: z.string().optional(),
          bio: z.string().optional(),
        });
        
        let teacherData = teacherSchema.parse(req.body);
        
        // School owners can only create teachers for their own school
        if (req.user?.role === USER_ROLES.SCHOOL_OWNER) {
          teacherData = {
            ...teacherData,
            schoolId: req.user?.schoolId,
          };
        }
        
        // Check if username already exists
        const existingUser = await storage.getUserByUsername(teacherData.username);
        if (existingUser) {
          return res.status(400).json({ message: "Username already exists" });
        }
        
        // Hash the password
        const crypto = require('crypto');
        const { scrypt, randomBytes } = crypto;
        const { promisify } = require('util');
        const scryptAsync = promisify(scrypt);
        
        const salt = randomBytes(16).toString("hex");
        const buf = (await scryptAsync(teacherData.password, salt, 64)) as Buffer;
        const hashedPassword = `${buf.toString("hex")}.${salt}`;
        
        const teacher = await storage.createUser({
          ...teacherData,
          password: hashedPassword,
        });
        
        // Don't return the password
        const { password, ...teacherWithoutPassword } = teacher;
        res.status(201).json(teacherWithoutPassword);
      } catch (error) {
        if (error instanceof z.ZodError) {
          return res.status(400).json({ 
            message: "Invalid teacher data", 
            errors: error.errors 
          });
        }
        console.error("Error creating teacher:", error);
        res.status(500).json({ message: "Failed to create teacher" });
      }
    }
  );
  
  // Update a teacher
  app.put(
    "/api/teachers/:id", 
    requireRole([USER_ROLES.ADMIN, USER_ROLES.SCHOOL_OWNER, USER_ROLES.TEACHER]),
    requireTeacherAccess(),
    async (req: Request, res: Response) => {
      try {
        const teacherId = parseInt(req.params.id);
        const teacher = await storage.getUser(teacherId);
        
        if (!teacher || teacher.role !== USER_ROLES.TEACHER) {
          return res.status(404).json({ message: "Teacher not found" });
        }
        
        // Can't update role, username, or password this way
        const updateTeacherSchema = insertUserSchema.partial().omit({ 
          role: true, 
          username: true, 
          password: true 
        });
        
        // Parse and validate the update data
        const teacherData = updateTeacherSchema.parse(req.body);
        
        // School owners can't change school ID
        if (req.user.role === USER_ROLES.SCHOOL_OWNER) {
          delete teacherData.schoolId;
        }
        
        const updatedTeacher = await storage.updateUser(teacherId, teacherData);
        
        // Don't return the password
        const { password, ...teacherWithoutPassword } = updatedTeacher;
        res.json(teacherWithoutPassword);
      } catch (error) {
        if (error instanceof z.ZodError) {
          return res.status(400).json({ 
            message: "Invalid teacher data", 
            errors: error.errors 
          });
        }
        console.error("Error updating teacher:", error);
        res.status(500).json({ message: "Failed to update teacher" });
      }
    }
  );
  
  // Delete a teacher (admin only)
  app.delete(
    "/api/teachers/:id", 
    requireRole([USER_ROLES.ADMIN, USER_ROLES.SCHOOL_OWNER]),
    requireTeacherAccess(),
    async (req: Request, res: Response) => {
      try {
        const teacherId = parseInt(req.params.id);
        const teacher = await storage.getUser(teacherId);
        
        if (!teacher || teacher.role !== USER_ROLES.TEACHER) {
          return res.status(404).json({ message: "Teacher not found" });
        }
        
        // TODO: Handle students assigned to this teacher before deletion
        // Should either reassign them or prevent deletion if they have students
        
        const success = await storage.deleteUser(teacherId);
        
        if (!success) {
          return res.status(404).json({ message: "Teacher not found" });
        }
        
        res.status(200).json({ message: "Teacher deleted successfully" });
      } catch (error) {
        console.error("Error deleting teacher:", error);
        res.status(500).json({ message: "Failed to delete teacher" });
      }
    }
  );
  
  // Get teacher's students
  app.get(
    "/api/teachers/:id/students", 
    requireRole([USER_ROLES.ADMIN, USER_ROLES.SCHOOL_OWNER, USER_ROLES.TEACHER]), 
    requireTeacherAccess(),
    async (req: Request, res: Response) => {
      try {
        const teacherId = parseInt(req.params.id);
        const teacher = await storage.getUser(teacherId);
        
        if (!teacher || teacher.role !== USER_ROLES.TEACHER) {
          return res.status(404).json({ message: "Teacher not found" });
        }
        
        const students = await storage.getStudents(teacherId);
        res.json(students);
      } catch (error) {
        console.error("Error getting teacher's students:", error);
        res.status(500).json({ message: "Failed to get students" });
      }
    }
  );
  
  // Assign a student to a teacher
  app.post(
    "/api/teachers/:id/assign-student", 
    requireRole([USER_ROLES.ADMIN, USER_ROLES.SCHOOL_OWNER, USER_ROLES.TEACHER]),
    requireTeacherAccess(),
    async (req: Request, res: Response) => {
      try {
        const teacherId = parseInt(req.params.id);
        const teacher = await storage.getUser(teacherId);
        
        if (!teacher || teacher.role !== USER_ROLES.TEACHER) {
          return res.status(404).json({ message: "Teacher not found" });
        }
        
        // Validate request body
        const assignSchema = z.object({
          studentId: z.number()
        });
        
        const { studentId } = assignSchema.parse(req.body);
        const student = await storage.getStudent(studentId);
        
        if (!student) {
          return res.status(404).json({ message: "Student not found" });
        }
        
        // Verify student permissions
        // Only admin, school owner, or the student's current teacher can reassign
        if (
          req.user?.role === USER_ROLES.TEACHER && 
          req.user?.id !== student.userId
        ) {
          return res.status(403).json({ message: "You don't have permission to assign this student" });
        }
        
        // Update the student's assigned teacher
        const updatedStudent = await storage.updateStudent(studentId, {
          assignedTeacherId: teacherId
        });
        
        res.json(updatedStudent);
      } catch (error) {
        if (error instanceof z.ZodError) {
          return res.status(400).json({ 
            message: "Invalid request data", 
            errors: error.errors 
          });
        }
        console.error("Error assigning student to teacher:", error);
        res.status(500).json({ message: "Failed to assign student" });
      }
    }
  );
}