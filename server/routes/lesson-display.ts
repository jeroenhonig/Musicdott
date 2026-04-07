/**
 * Lesson Display Routes
 *
 * REST endpoints for the real-time "second screen" (lesscherm) feature.
 * The Socket.IO streaming is handled by LessonDisplayService; these routes
 * cover session lifecycle and initial state hydration.
 *
 * POST   /api/lesson-display/sessions            — teacher creates a session
 * GET    /api/lesson-display/sessions/:sessionId — fetch session + lesson blocks (reload recovery)
 * DELETE /api/lesson-display/sessions/:sessionId — close session
 */

import { Express, Request, Response } from "express";
import { db } from "../db";
import { eq } from "drizzle-orm";
import { lessons, lessonDisplaySessions } from "@shared/schema";
import { requireAuth } from "../auth";
import { loadSchoolContext, requireTeacherOrOwner } from "../middleware/authz";
import type { LessonDisplayService } from "../services/lesson-display-service";
import { z } from "zod";

const createSessionSchema = z.object({
  lessonId: z.number().int().positive(),
});

export function registerLessonDisplayRoutes(
  app: Express,
  lessonDisplayService: LessonDisplayService
) {
  /**
   * POST /api/lesson-display/sessions
   * Teacher starts a display session for the given lesson.
   * Returns { sessionId, displayUrl } for window.open().
   */
  app.post(
    "/api/lesson-display/sessions",
    requireAuth,
    loadSchoolContext,
    requireTeacherOrOwner(),
    async (req: Request, res: Response) => {
      try {
        const parsed = createSessionSchema.safeParse(req.body);
        if (!parsed.success) {
          return res.status(400).json({ error: "lessonId is required" });
        }

        const { lessonId } = parsed.data;
        const teacherId = req.user!.id;
        const schoolId = req.user!.schoolId;

        if (!schoolId) {
          return res.status(400).json({ error: "User has no associated school" });
        }

        // Verify the lesson exists and belongs to this school
        const [lesson] = await db
          .select()
          .from(lessons)
          .where(eq(lessons.id, lessonId));

        if (!lesson) {
          return res.status(404).json({ error: "Lesson not found" });
        }

        // Cross-school ownership check: a teacher may only display lessons from their own school
        if (
          lesson.schoolId &&
          lesson.schoolId !== schoolId &&
          req.user!.role !== "platform_owner"
        ) {
          return res.status(403).json({ error: "Lesson does not belong to your school" });
        }

        const session = await lessonDisplayService.createSession(
          teacherId,
          lessonId,
          schoolId
        );

        res.json({
          sessionId: session.id,
          displayUrl: `/lesson-display/${session.id}`,
        });
      } catch (error) {
        console.error("[lesson-display] Error creating session:", error);
        res.status(500).json({ error: "Failed to create display session" });
      }
    }
  );

  /**
   * GET /api/lesson-display/sessions/:sessionId
   * Fetch session state + lesson content blocks.
   * Used by the display screen on load/reload to hydrate initial state.
   */
  app.get(
    "/api/lesson-display/sessions/:sessionId",
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        const { sessionId } = req.params;
        const session = await lessonDisplayService.getSession(sessionId);

        if (!session || session.status !== "active") {
          return res.status(404).json({ error: "Display session not found or closed" });
        }

        // School-scope check: user must belong to the same school (or be platform_owner)
        if (
          req.user!.role !== "platform_owner" &&
          session.schoolId !== req.user!.schoolId
        ) {
          return res.status(403).json({ error: "Not authorized for this session" });
        }

        // Fetch lesson content blocks so the display screen can restore state on reload
        const [lesson] = await db
          .select()
          .from(lessons)
          .where(eq(lessons.id, session.lessonId));

        let contentBlocks: any[] = [];
        if (lesson?.contentBlocks) {
          try {
            contentBlocks = JSON.parse(lesson.contentBlocks);
          } catch {
            contentBlocks = [];
          }
        }

        const activeBlock =
          session.activeBlockIndex !== null &&
          session.activeBlockIndex !== undefined
            ? (contentBlocks[session.activeBlockIndex] ?? null)
            : null;

        res.json({
          session,
          lesson: lesson
            ? { id: lesson.id, title: lesson.title, description: lesson.description }
            : null,
          contentBlocks,
          activeBlock,
          displayMode: session.displayMode ?? "idle",
          displayState: session.displayState ?? null,
        });
      } catch (error) {
        console.error("[lesson-display] Error fetching session:", error);
        res.status(500).json({ error: "Failed to fetch display session" });
      }
    }
  );

  /**
   * DELETE /api/lesson-display/sessions/:sessionId
   * Teacher closes a display session.
   */
  app.delete(
    "/api/lesson-display/sessions/:sessionId",
    requireAuth,
    loadSchoolContext,
    requireTeacherOrOwner(),
    async (req: Request, res: Response) => {
      try {
        const { sessionId } = req.params;
        const session = await lessonDisplayService.getSession(sessionId);

        if (!session) {
          return res.status(404).json({ error: "Display session not found" });
        }

        if (
          session.teacherId !== req.user!.id &&
          req.user!.role !== "platform_owner"
        ) {
          return res.status(403).json({ error: "Not authorized to close this session" });
        }

        await lessonDisplayService.closeSession(sessionId, req.user!.id);
        res.json({ success: true });
      } catch (error) {
        console.error("[lesson-display] Error closing session:", error);
        res.status(500).json({ error: "Failed to close display session" });
      }
    }
  );
}
