/**
 * DrumSchool Manager Integration Routes
 *
 * Endpoints for connecting and syncing data between
 * drumschoolstefanvandebrug.nl/manager and a Musicdott school profile.
 */

import { Router, Request, Response } from "express";
import { requireAuth } from "../auth";
import { loadSchoolContext, requireSchoolOwner } from "../middleware/authz";
import {
  testConnection,
  previewSync,
  runSync,
  saveIntegrationSettings,
  getIntegrationSettings,
} from "../services/drumschool-sync-service";
import type { DrumSchoolManagerSettings } from "@shared/schema";
import { z } from "zod";

const router = Router();

// Validation schema for connection settings
const integrationSettingsSchema = z.object({
  baseUrl: z
    .string()
    .url("Must be a valid URL")
    .default("https://drumschoolstefanvandebrug.nl/manager"),
  apiKey: z.string().optional(),
  icalUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  autoSync: z.boolean().default(false),
  syncIntervalHours: z.number().int().min(1).max(168).default(24),
  syncStudents: z.boolean().default(true),
  syncSchedule: z.boolean().default(true),
});

// ---- GET /api/drumschool-integration/settings ----------------------------
// Returns the current integration settings (API key is masked)
router.get(
  "/settings",
  requireAuth,
  loadSchoolContext,
  requireSchoolOwner(),
  async (req: Request, res: Response) => {
    try {
      const schoolId = req.school?.id ?? (req as any).user?.schoolId;
      if (!schoolId) {
        return res.status(400).json({ message: "School ID required" });
      }

      const settings = await getIntegrationSettings(schoolId);
      if (!settings) {
        return res.json({ configured: false });
      }

      // Mask the API key for security
      return res.json({
        configured: true,
        settings: {
          ...settings,
          apiKey: settings.apiKey ? "••••••••" : undefined,
        },
      });
    } catch (err: any) {
      console.error("DrumSchool integration – settings fetch error:", err);
      return res.status(500).json({ message: "Failed to fetch settings" });
    }
  }
);

// ---- POST /api/drumschool-integration/settings ---------------------------
// Save (or update) connection settings
router.post(
  "/settings",
  requireAuth,
  loadSchoolContext,
  requireSchoolOwner(),
  async (req: Request, res: Response) => {
    try {
      const schoolId = req.school?.id ?? (req as any).user?.schoolId;
      if (!schoolId) {
        return res.status(400).json({ message: "School ID required" });
      }

      const parsed = integrationSettingsSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          message: "Invalid settings",
          errors: parsed.error.errors,
        });
      }

      // Preserve existing API key if the placeholder was sent back
      if (parsed.data.apiKey === "••••••••") {
        const existing = await getIntegrationSettings(schoolId);
        parsed.data.apiKey = existing?.apiKey;
      }

      // Clean up empty icalUrl
      if (!parsed.data.icalUrl) {
        (parsed.data as any).icalUrl = undefined;
      }

      const settings: DrumSchoolManagerSettings = {
        ...parsed.data,
        icalUrl: parsed.data.icalUrl || undefined,
      };

      await saveIntegrationSettings(schoolId, settings);
      return res.json({ success: true });
    } catch (err: any) {
      console.error("DrumSchool integration – settings save error:", err);
      return res.status(500).json({ message: "Failed to save settings" });
    }
  }
);

// ---- POST /api/drumschool-integration/test --------------------------------
// Test the connection without saving or syncing
router.post(
  "/test",
  requireAuth,
  loadSchoolContext,
  requireSchoolOwner(),
  async (req: Request, res: Response) => {
    try {
      const schoolId = req.school?.id ?? (req as any).user?.schoolId;
      if (!schoolId) {
        return res.status(400).json({ message: "School ID required" });
      }

      const parsed = integrationSettingsSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          message: "Invalid settings",
          errors: parsed.error.errors,
        });
      }

      // If placeholder key was sent, use the stored one
      let apiKey = parsed.data.apiKey;
      if (apiKey === "••••••••") {
        const existing = await getIntegrationSettings(schoolId);
        apiKey = existing?.apiKey;
      }

      const settings: DrumSchoolManagerSettings = {
        ...parsed.data,
        apiKey,
        icalUrl: parsed.data.icalUrl || undefined,
      };

      const result = await testConnection(settings);
      return res.json(result);
    } catch (err: any) {
      console.error("DrumSchool integration – test error:", err);
      return res.status(500).json({ ok: false, error: err.message });
    }
  }
);

// ---- GET /api/drumschool-integration/preview -----------------------------
// Preview what would be synced (dry-run)
router.get(
  "/preview",
  requireAuth,
  loadSchoolContext,
  requireSchoolOwner(),
  async (req: Request, res: Response) => {
    try {
      const schoolId = req.school?.id ?? (req as any).user?.schoolId;
      const userId = (req as any).user?.id;
      if (!schoolId || !userId) {
        return res.status(400).json({ message: "School ID and user ID required" });
      }

      const settings = await getIntegrationSettings(schoolId);
      if (!settings) {
        return res
          .status(404)
          .json({ message: "No integration configured. Save settings first." });
      }

      const preview = await previewSync(schoolId, userId, settings);
      return res.json(preview);
    } catch (err: any) {
      console.error("DrumSchool integration – preview error:", err);
      return res.status(500).json({ message: "Preview failed", error: err.message });
    }
  }
);

// ---- POST /api/drumschool-integration/sync --------------------------------
// Run a full sync now
router.post(
  "/sync",
  requireAuth,
  loadSchoolContext,
  requireSchoolOwner(),
  async (req: Request, res: Response) => {
    try {
      const schoolId = req.school?.id ?? (req as any).user?.schoolId;
      const userId = (req as any).user?.id;
      if (!schoolId || !userId) {
        return res.status(400).json({ message: "School ID and user ID required" });
      }

      const settings = await getIntegrationSettings(schoolId);
      if (!settings) {
        return res
          .status(404)
          .json({ message: "No integration configured. Save settings first." });
      }

      const syncResult = await runSync(schoolId, userId, settings);

      // Update last sync metadata
      const updatedSettings: DrumSchoolManagerSettings = {
        ...settings,
        lastSyncAt: new Date().toISOString(),
        lastSyncStatus: syncResult.success
          ? "success"
          : syncResult.errors.length > 0 && syncResult.studentsAdded > 0
          ? "partial"
          : "error",
        lastSyncMessage: syncResult.success
          ? `Synced ${syncResult.studentsAdded + syncResult.studentsUpdated} students, ${syncResult.schedulesAdded + syncResult.schedulesUpdated} schedules`
          : syncResult.errors[0] ?? "Unknown error",
      };
      await saveIntegrationSettings(schoolId, updatedSettings);

      return res.json(syncResult);
    } catch (err: any) {
      console.error("DrumSchool integration – sync error:", err);
      return res.status(500).json({ message: "Sync failed", error: err.message });
    }
  }
);

// ---- DELETE /api/drumschool-integration/settings -------------------------
// Remove / disconnect the integration
router.delete(
  "/settings",
  requireAuth,
  loadSchoolContext,
  requireSchoolOwner(),
  async (req: Request, res: Response) => {
    try {
      const schoolId = req.school?.id ?? (req as any).user?.schoolId;
      if (!schoolId) {
        return res.status(400).json({ message: "School ID required" });
      }

      // Save null to remove the drumschool manager section
      await saveIntegrationSettings(schoolId, null as any);
      return res.json({ success: true });
    } catch (err: any) {
      console.error("DrumSchool integration – disconnect error:", err);
      return res.status(500).json({ message: "Failed to disconnect" });
    }
  }
);

export default router;
