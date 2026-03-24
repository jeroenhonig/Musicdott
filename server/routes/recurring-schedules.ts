import type { Express, Request, Response } from "express";
import { z } from "zod";
import { requireAuth } from "../auth";
import { loadSchoolContext } from "../middleware/authz";
import { storage } from "../storage-wrapper";
import { insertRecurringScheduleSchema } from "@shared/schema";

function normalizeRecurringFrequency(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const normalized = value.trim().toUpperCase();
  if (!normalized) return undefined;

  const map: Record<string, string> = {
    WEEKLY: "WEEKLY",
    BIWEEKLY: "BIWEEKLY",
    MONTHLY: "MONTHLY",
    ONCE: "ONCE",
    WEEK: "WEEKLY",
    BI_WEEKLY: "BIWEEKLY",
    "BI-WEEKLY": "BIWEEKLY",
  };

  return map[normalized] || normalized;
}

function normalizeRecurringSchedulePayload(
  raw: any,
  opts: { userId?: number; includeUserId?: boolean } = {}
) {
  const dayValue = raw?.dayOfWeek ?? raw?.day;
  const frequency = normalizeRecurringFrequency(raw?.frequency ?? raw?.recurrenceType);

  const payload: Record<string, any> = {};

  if (opts.includeUserId && opts.userId) payload.userId = opts.userId;
  if (raw?.studentId != null && raw?.studentId !== "") payload.studentId = Number(raw.studentId);
  if (dayValue != null && `${dayValue}`.trim() !== "") payload.dayOfWeek = String(dayValue);
  if (typeof raw?.startTime === "string") payload.startTime = raw.startTime;
  if (typeof raw?.endTime === "string") payload.endTime = raw.endTime;
  if (typeof raw?.location === "string") payload.location = raw.location;
  if (typeof raw?.notes === "string") payload.notes = raw.notes;
  if (typeof raw?.timezone === "string") payload.timezone = raw.timezone;
  if (typeof raw?.isActive === "boolean") payload.isActive = raw.isActive;
  if (typeof raw?.iCalDtStart === "string") payload.iCalDtStart = raw.iCalDtStart;
  if (typeof raw?.iCalRrule === "string") payload.iCalRrule = raw.iCalRrule;
  if (typeof raw?.iCalTzid === "string") payload.iCalTzid = raw.iCalTzid;
  if (frequency) payload.frequency = frequency;

  return payload;
}

export function registerRecurringScheduleRoutes(app: Express) {
  app.get("/api/recurring-schedules", requireAuth, loadSchoolContext, async (req: Request, res: Response) => {
    try {
      const user = req.user!;
      let schedules;

      if (req.school?.isSchoolOwner() && user.schoolId) {
        schedules = await storage.getRecurringSchedulesBySchool(user.schoolId);
      } else {
        schedules = await storage.getRecurringSchedules(user.id);
      }

      const transformedSchedules = schedules.map((schedule) => ({
        ...schedule,
        dayOfWeek: schedule.dayOfWeek,
        userId: schedule.userId,
        studentId: schedule.studentId,
        startTime: schedule.startTime,
        endTime: schedule.endTime,
        schoolId: schedule.schoolId || user.schoolId,
        recurrenceType: String(schedule.frequency || "WEEKLY").toLowerCase(),
      }));

      res.json(transformedSchedules);
    } catch (error) {
      console.error("Error in recurring schedules endpoint:", error);
      res.status(500).json({ message: "Failed to fetch recurring schedules" });
    }
  });

  app.post("/api/recurring-schedules", requireAuth, loadSchoolContext, async (req: Request, res: Response) => {
    try {
      const scheduleData = normalizeRecurringSchedulePayload(req.body, {
        userId: req.user!.id,
        includeUserId: true,
      });

      if (
        !scheduleData.studentId ||
        scheduleData.dayOfWeek == null ||
        `${scheduleData.dayOfWeek}`.trim() === "" ||
        !scheduleData.startTime ||
        !scheduleData.endTime
      ) {
        return res.status(400).json({
          message: "Missing required fields",
          required: ["studentId", "dayOfWeek", "startTime", "endTime"],
        });
      }

      const validatedScheduleData = insertRecurringScheduleSchema.parse(scheduleData);
      const schedule = await storage.createRecurringSchedule(validatedScheduleData);
      res.status(201).json(schedule);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          message: "Invalid recurring schedule data",
          code: "RECURRING_SCHEDULE_VALIDATION_ERROR",
          errors: error.errors,
        });
      }
      console.error("Error creating recurring schedule:", error);
      res.status(500).json({ message: "Failed to create recurring schedule", details: String(error) });
    }
  });

  app.put("/api/recurring-schedules/:id", requireAuth, loadSchoolContext, async (req: Request, res: Response) => {
    try {
      const scheduleId = parseInt(req.params.id, 10);
      if (Number.isNaN(scheduleId)) {
        return res.status(400).json({ message: "Invalid recurring schedule ID" });
      }

      const schedule = await storage.getRecurringSchedule(scheduleId);
      if (!schedule || schedule.userId !== req.user!.id) {
        return res.status(403).json({ message: "Not authorized" });
      }

      const validatedUpdateData = insertRecurringScheduleSchema
        .partial()
        .parse(normalizeRecurringSchedulePayload(req.body));
      const updatedSchedule = await storage.updateRecurringSchedule(scheduleId, validatedUpdateData);
      res.json(updatedSchedule);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          message: "Invalid recurring schedule update",
          code: "RECURRING_SCHEDULE_UPDATE_VALIDATION_ERROR",
          errors: error.errors,
        });
      }
      res.status(500).json({ message: "Failed to update recurring schedule" });
    }
  });

  app.delete("/api/recurring-schedules/:id", requireAuth, loadSchoolContext, async (req: Request, res: Response) => {
    try {
      const scheduleId = parseInt(req.params.id, 10);
      if (Number.isNaN(scheduleId)) {
        return res.status(400).json({ message: "Invalid recurring schedule ID" });
      }

      const schedule = await storage.getRecurringSchedule(scheduleId);
      if (!schedule || schedule.userId !== req.user!.id) {
        return res.status(403).json({ message: "Not authorized" });
      }

      const success = await storage.deleteRecurringSchedule(scheduleId);
      if (!success) {
        return res.status(404).json({ message: "Schedule not found" });
      }

      res.status(204).end();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete recurring schedule" });
    }
  });

  app.post(
    "/api/recurring-schedules/generate",
    requireAuth,
    loadSchoolContext,
    async (req: Request, res: Response) => {
      try {
        const parsedGenerateRequest = z
          .object({
            startDate: z.string().min(1),
            endDate: z.string().min(1),
          })
          .safeParse(req.body);

        if (!parsedGenerateRequest.success) {
          return res.status(400).json({
            message: "Invalid generate request",
            code: "RECURRING_SCHEDULE_GENERATE_VALIDATION_ERROR",
            errors: parsedGenerateRequest.error.errors,
          });
        }

        const { startDate, endDate } = parsedGenerateRequest.data;
        const start = new Date(startDate);
        const end = new Date(endDate);
        if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
          return res.status(400).json({ message: "Invalid startDate or endDate" });
        }

        const sessions = await storage.generateSessionsFromRecurringSchedules(req.user!.id, start, end);
        res.status(201).json(sessions);
      } catch (error) {
        res.status(500).json({ message: "Failed to generate sessions from recurring schedules" });
      }
    }
  );

  app.post(
    "/api/sessions/:id/reschedule/request",
    requireAuth,
    loadSchoolContext,
    async (req: Request, res: Response) => {
      try {
        const sessionId = parseInt(req.params.id, 10);
        const { newStartTime, newEndTime } = req.body;

        if (!newStartTime || !newEndTime) {
          return res.status(400).json({ message: "New start time and end time are required" });
        }

        const session = await storage.getSession(sessionId);
        if (!session) {
          return res.status(404).json({ message: "Session not found" });
        }

        const isTeacher = session.userId === req.user!.id;
        const isStudent = req.user!.role === "student" && (await storage.getStudent(session.studentId)) !== undefined;

        if (!isTeacher && !isStudent) {
          return res.status(403).json({ message: "Not authorized" });
        }

        const updatedSession = await storage.requestReschedule(
          sessionId,
          new Date(newStartTime),
          new Date(newEndTime)
        );

        if (isStudent) {
          const wsManager = (app as any).wsManager;
          wsManager?.sendRescheduleRequest(session.studentId, {
            sessionId,
            title: session.title,
            originalStartTime: session.startTime,
            originalEndTime: session.endTime,
            newStartTime,
            newEndTime,
            studentId: session.studentId,
          });
        }

        res.json(updatedSession);
      } catch (error) {
        res.status(500).json({ message: "Failed to request session reschedule" });
      }
    }
  );

  app.post(
    "/api/sessions/:id/reschedule/approve",
    requireAuth,
    loadSchoolContext,
    async (req: Request, res: Response) => {
      try {
        const sessionId = parseInt(req.params.id, 10);
        const session = await storage.getSession(sessionId);

        if (!session || session.userId !== req.user!.id) {
          return res.status(403).json({ message: "Not authorized" });
        }

        const updatedSession = await storage.approveReschedule(sessionId);
        res.json(updatedSession);
      } catch (error) {
        res.status(500).json({ message: "Failed to approve session reschedule" });
      }
    }
  );
}
