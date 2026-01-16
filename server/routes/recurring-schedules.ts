import { Router } from "express";
import { z } from "zod";
import { storage } from "../storage";
import { insertRecurringScheduleSchema } from "@shared/schema";

const router = Router();

// Get all recurring schedules for the authenticated user
router.get("/", async (req: any, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const schedules = await storage.getRecurringSchedules(userId);
    res.json(schedules);
  } catch (error) {
    console.error("Error fetching recurring schedules:", error);
    res.status(500).json({ message: "Failed to fetch recurring schedules" });
  }
});

// Get a specific recurring schedule
router.get("/:id", async (req: any, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const scheduleId = parseInt(req.params.id);
    if (isNaN(scheduleId)) {
      return res.status(400).json({ message: "Invalid schedule ID" });
    }

    const schedule = await storage.getRecurringSchedule(scheduleId);
    if (!schedule) {
      return res.status(404).json({ message: "Schedule not found" });
    }

    // Check if the schedule belongs to the user's students
    const userStudents = await storage.getStudents(userId);
    const studentIds = userStudents.map(s => s.id);
    
    if (!studentIds.includes(schedule.studentId)) {
      return res.status(403).json({ message: "Access denied" });
    }

    res.json(schedule);
  } catch (error) {
    console.error("Error fetching recurring schedule:", error);
    res.status(500).json({ message: "Failed to fetch recurring schedule" });
  }
});

// Create a new recurring schedule
router.post("/", async (req: any, res) => {
  try {
    const userId = req.user?.id;
    const schoolId = req.user?.schoolId;
    console.log(`Creating recurring schedule: userId=${userId}, schoolId=${schoolId}`);
    
    if (!userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    // Add userId to request body and validate
    const requestData = { ...req.body, userId };
    console.log("Schedule request data:", JSON.stringify(requestData));
    
    const validatedData = insertRecurringScheduleSchema.parse(requestData);
    console.log("Validated schedule data:", JSON.stringify(validatedData));

    // Check if the student belongs to the user's school
    let userStudents;
    if (schoolId) {
      userStudents = await storage.getStudentsBySchool(schoolId);
    } else {
      userStudents = await storage.getStudents(userId);
    }
    const studentIds = userStudents.map(s => s.id);
    console.log(`User students: ${studentIds.join(", ")}`);
    
    if (!studentIds.includes(validatedData.studentId)) {
      return res.status(403).json({ message: "Student does not belong to this user" });
    }

    // Check for time conflicts
    const existingSchedules = await storage.getRecurringSchedules(userId);
    const conflicts = detectTimeConflicts(validatedData, existingSchedules);
    
    if (conflicts.length > 0) {
      return res.status(409).json({ 
        message: "Schedule conflict detected",
        conflicts: conflicts.map(c => ({
          studentId: c.studentId,
          dayOfWeek: c.dayOfWeek,
          startTime: c.startTime,
          endTime: c.endTime
        }))
      });
    }

    const newSchedule = await storage.createRecurringSchedule(validatedData);
    console.log("Schedule created successfully:", newSchedule.id);
    res.status(201).json(newSchedule);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.log("Validation error:", JSON.stringify(error.errors));
      return res.status(400).json({ 
        message: "Invalid data", 
        errors: error.errors 
      });
    }
    console.error("Error creating recurring schedule:", error);
    res.status(500).json({ message: "Failed to create recurring schedule" });
  }
});

// Update a recurring schedule
router.put("/:id", async (req: any, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const scheduleId = parseInt(req.params.id);
    if (isNaN(scheduleId)) {
      return res.status(400).json({ message: "Invalid schedule ID" });
    }

    // Check if schedule exists and belongs to user
    const existingSchedule = await storage.getRecurringSchedule(scheduleId);
    if (!existingSchedule) {
      return res.status(404).json({ message: "Schedule not found" });
    }

    const userStudents = await storage.getStudents(userId);
    const studentIds = userStudents.map(s => s.id);
    
    if (!studentIds.includes(existingSchedule.studentId)) {
      return res.status(403).json({ message: "Access denied" });
    }

    // Validate update data
    const validatedData = insertRecurringScheduleSchema.partial().parse(req.body);

    // Check for conflicts if time/day is being changed
    if (validatedData.dayOfWeek !== undefined || validatedData.startTime || validatedData.endTime) {
      const scheduleToCheck = {
        ...existingSchedule,
        ...validatedData
      };
      
      const allSchedules = await storage.getRecurringSchedules(userId);
      const otherSchedules = allSchedules.filter(s => s.id !== scheduleId);
      const conflicts = detectTimeConflicts(scheduleToCheck, otherSchedules);
      
      if (conflicts.length > 0) {
        return res.status(409).json({ 
          message: "Schedule conflict detected",
          conflicts: conflicts.map(c => ({
            studentId: c.studentId,
            dayOfWeek: c.dayOfWeek,
            startTime: c.startTime,
            endTime: c.endTime
          }))
        });
      }
    }

    const updatedSchedule = await storage.updateRecurringSchedule(scheduleId, validatedData);
    res.json(updatedSchedule);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        message: "Invalid data", 
        errors: error.errors 
      });
    }
    console.error("Error updating recurring schedule:", error);
    res.status(500).json({ message: "Failed to update recurring schedule" });
  }
});

// Delete a recurring schedule
router.delete("/:id", async (req: any, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const scheduleId = parseInt(req.params.id);
    if (isNaN(scheduleId)) {
      return res.status(400).json({ message: "Invalid schedule ID" });
    }

    // Check if schedule exists and belongs to user
    const existingSchedule = await storage.getRecurringSchedule(scheduleId);
    if (!existingSchedule) {
      return res.status(404).json({ message: "Schedule not found" });
    }

    const userStudents = await storage.getStudents(userId);
    const studentIds = userStudents.map(s => s.id);
    
    if (!studentIds.includes(existingSchedule.studentId)) {
      return res.status(403).json({ message: "Access denied" });
    }

    const deleted = await storage.deleteRecurringSchedule(scheduleId);
    if (!deleted) {
      return res.status(404).json({ message: "Schedule not found" });
    }

    res.json({ message: "Schedule deleted successfully" });
  } catch (error) {
    console.error("Error deleting recurring schedule:", error);
    res.status(500).json({ message: "Failed to delete recurring schedule" });
  }
});

// Helper function to detect time conflicts
function detectTimeConflicts(newSchedule: any, existingSchedules: any[]) {
  const conflicts = [];
  
  for (const existing of existingSchedules) {
    if (existing.dayOfWeek === newSchedule.dayOfWeek) {
      const newStart = parseTime(newSchedule.startTime);
      const newEnd = parseTime(newSchedule.endTime);
      const existingStart = parseTime(existing.startTime);
      const existingEnd = parseTime(existing.endTime);

      // Check for overlap
      if (
        (newStart < existingEnd && newEnd > existingStart) ||
        (existingStart < newEnd && existingEnd > newStart)
      ) {
        conflicts.push(existing);
      }
    }
  }
  
  return conflicts;
}

function parseTime(timeString: string): number {
  const [hours, minutes] = timeString.split(':').map(Number);
  return hours * 60 + minutes;
}

export default router;