/**
 * Studios CRUD API
 * Manages physical teaching/practice rooms per school.
 *
 * All endpoints require: school_owner role
 * GET /api/studios      — list all studios for the current school
 * POST /api/studios     — create a studio
 * PUT /api/studios/:id  — update a studio
 * DELETE /api/studios/:id — soft-delete (set is_active = false)
 */

import { Router, Request, Response } from "express";
import { z } from "zod";
import { db } from "../db";
import { studios } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../auth";
import { loadSchoolContext, requireSchoolOwner } from "../middleware/authz";

const router = Router();

const studioBodySchema = z.object({
  name: z.string().min(1).max(100),
  location: z.string().max(200).optional().nullable(),
  description: z.string().max(1000).optional().nullable(),
  isActive: z.boolean().optional(),
});

// GET /api/studios
router.get("/", requireAuth, loadSchoolContext, async (req: Request, res: Response) => {
  try {
    const schoolId = (req as any).schoolId as number;
    const rows = await db
      .select()
      .from(studios)
      .where(eq(studios.schoolId, schoolId))
      .orderBy(studios.name);
    res.json(rows);
  } catch (err) {
    console.error("GET /api/studios error:", err);
    res.status(500).json({ error: "Failed to fetch studios" });
  }
});

// POST /api/studios
router.post("/", requireAuth, loadSchoolContext, requireSchoolOwner, async (req: Request, res: Response) => {
  try {
    const schoolId = (req as any).schoolId as number;
    const body = studioBodySchema.parse(req.body);
    const [created] = await db
      .insert(studios)
      .values({ ...body, schoolId })
      .returning();
    res.status(201).json(created);
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors });
    }
    console.error("POST /api/studios error:", err);
    res.status(500).json({ error: "Failed to create studio" });
  }
});

// PUT /api/studios/:id
router.put("/:id", requireAuth, loadSchoolContext, requireSchoolOwner, async (req: Request, res: Response) => {
  try {
    const schoolId = (req as any).schoolId as number;
    const id = parseInt(req.params.id, 10);
    const body = studioBodySchema.parse(req.body);

    const [updated] = await db
      .update(studios)
      .set({ ...body, updatedAt: new Date() })
      .where(and(eq(studios.id, id), eq(studios.schoolId, schoolId)))
      .returning();

    if (!updated) return res.status(404).json({ error: "Studio not found" });
    res.json(updated);
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors });
    }
    console.error("PUT /api/studios/:id error:", err);
    res.status(500).json({ error: "Failed to update studio" });
  }
});

// DELETE /api/studios/:id — soft-delete
router.delete("/:id", requireAuth, loadSchoolContext, requireSchoolOwner, async (req: Request, res: Response) => {
  try {
    const schoolId = (req as any).schoolId as number;
    const id = parseInt(req.params.id, 10);

    const [updated] = await db
      .update(studios)
      .set({ isActive: false, updatedAt: new Date() })
      .where(and(eq(studios.id, id), eq(studios.schoolId, schoolId)))
      .returning();

    if (!updated) return res.status(404).json({ error: "Studio not found" });
    res.json({ ok: true });
  } catch (err) {
    console.error("DELETE /api/studios/:id error:", err);
    res.status(500).json({ error: "Failed to delete studio" });
  }
});

export default router;
