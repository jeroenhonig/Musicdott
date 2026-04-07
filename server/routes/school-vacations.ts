/**
 * School Vacations CRUD API
 * Manages vacation periods and blackout dates per school.
 * Vacation periods automatically block sessions in the agenda.
 *
 * GET  /api/school/vacations      — list all vacations (accessible by all school members)
 * POST /api/school/vacations      — create a vacation period (school_owner only)
 * PUT  /api/school/vacations/:id  — update a vacation period (school_owner only)
 * DELETE /api/school/vacations/:id — delete a vacation period (school_owner only)
 */

import { Router, Request, Response } from "express";
import { z } from "zod";
import { db } from "../db";
import { schoolVacations } from "@shared/schema";
import { eq, and, asc } from "drizzle-orm";
import { requireAuth } from "../auth";
import { loadSchoolContext, requireSchoolOwner } from "../middleware/authz";

const router = Router();

const vacationBodySchema = z.object({
  title: z.string().min(1).max(100),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD format"),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD format"),
  isBlackout: z.boolean().optional().default(false),
}).refine(data => data.startDate <= data.endDate, {
  message: "startDate must be before or equal to endDate",
  path: ["endDate"],
});

// GET /api/school/vacations — readable by all authenticated school members
router.get("/", requireAuth, loadSchoolContext, async (req: Request, res: Response) => {
  try {
    const schoolId = (req as any).schoolId as number;
    const rows = await db
      .select()
      .from(schoolVacations)
      .where(eq(schoolVacations.schoolId, schoolId))
      .orderBy(asc(schoolVacations.startDate));
    res.json(rows);
  } catch (err) {
    console.error("GET /api/school/vacations error:", err);
    res.status(500).json({ error: "Failed to fetch vacations" });
  }
});

// POST /api/school/vacations
router.post("/", requireAuth, loadSchoolContext, requireSchoolOwner, async (req: Request, res: Response) => {
  try {
    const schoolId = (req as any).schoolId as number;
    const body = vacationBodySchema.parse(req.body);
    const [created] = await db
      .insert(schoolVacations)
      .values({ ...body, schoolId })
      .returning();
    res.status(201).json(created);
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors });
    }
    console.error("POST /api/school/vacations error:", err);
    res.status(500).json({ error: "Failed to create vacation" });
  }
});

// PUT /api/school/vacations/:id
router.put("/:id", requireAuth, loadSchoolContext, requireSchoolOwner, async (req: Request, res: Response) => {
  try {
    const schoolId = (req as any).schoolId as number;
    const id = parseInt(req.params.id, 10);
    const body = vacationBodySchema.parse(req.body);

    const [updated] = await db
      .update(schoolVacations)
      .set({ ...body, updatedAt: new Date() })
      .where(and(eq(schoolVacations.id, id), eq(schoolVacations.schoolId, schoolId)))
      .returning();

    if (!updated) return res.status(404).json({ error: "Vacation not found" });
    res.json(updated);
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors });
    }
    console.error("PUT /api/school/vacations/:id error:", err);
    res.status(500).json({ error: "Failed to update vacation" });
  }
});

// DELETE /api/school/vacations/:id
router.delete("/:id", requireAuth, loadSchoolContext, requireSchoolOwner, async (req: Request, res: Response) => {
  try {
    const schoolId = (req as any).schoolId as number;
    const id = parseInt(req.params.id, 10);

    const deleted = await db
      .delete(schoolVacations)
      .where(and(eq(schoolVacations.id, id), eq(schoolVacations.schoolId, schoolId)))
      .returning();

    if (!deleted.length) return res.status(404).json({ error: "Vacation not found" });
    res.json({ ok: true });
  } catch (err) {
    console.error("DELETE /api/school/vacations/:id error:", err);
    res.status(500).json({ error: "Failed to delete vacation" });
  }
});

export default router;
