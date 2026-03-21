/**
 * DrumSchool Manager Sync Service
 *
 * Synchronizes students and agenda/schedule data from the DrumSchool Manager
 * (drumschoolstefanvandebrug.nl/manager) into the Musicdott platform.
 *
 * Supports two integration modes:
 *  1. REST API mode – when the manager exposes an API key-protected endpoint
 *  2. iCal mode     – when the manager exposes a calendar feed URL
 */

import { db } from "../db";
import { eq, and } from "drizzle-orm";
import { students, schools, recurringSchedules } from "@shared/schema";
import type { DrumSchoolManagerSettings } from "@shared/schema";
import { parseICalFile, convertICalToSchedules } from "../utils/ical-utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ExternalStudent = {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  birthdate?: string; // ISO date string YYYY-MM-DD
  instrument?: string;
  level?: string;
  notes?: string;
};

export type ExternalScheduleEntry = {
  id?: string;
  studentId?: string;
  studentName?: string;
  dayOfWeek: string; // "Monday", "Tuesday", …
  startTime: string; // "HH:MM"
  endTime: string;   // "HH:MM"
  location?: string;
  notes?: string;
};

export type SyncResult = {
  success: boolean;
  studentsAdded: number;
  studentsUpdated: number;
  schedulesAdded: number;
  schedulesUpdated: number;
  errors: string[];
  warnings: string[];
};

// ---------------------------------------------------------------------------
// Connection helpers
// ---------------------------------------------------------------------------

/**
 * Test whether the provided settings can reach the DrumSchool Manager.
 * Returns { ok: true } or { ok: false, error: "..." }
 */
export async function testConnection(
  settings: DrumSchoolManagerSettings
): Promise<{ ok: boolean; error?: string; mode?: "api" | "ical" }> {
  if (settings.apiKey) {
    try {
      const url = `${settings.baseUrl.replace(/\/$/, "")}/api/status`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${settings.apiKey}` },
        signal: AbortSignal.timeout(8000),
      });
      if (res.ok || res.status === 404) {
        // 404 is acceptable – server is reachable even if /api/status doesn't exist
        return { ok: true, mode: "api" };
      }
      return {
        ok: false,
        error: `Server responded with HTTP ${res.status}`,
      };
    } catch (err: any) {
      return { ok: false, error: err.message ?? "Network error" };
    }
  }

  if (settings.icalUrl) {
    try {
      const res = await fetch(settings.icalUrl, {
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) {
        return { ok: false, error: `iCal feed returned HTTP ${res.status}` };
      }
      const text = await res.text();
      if (!text.includes("BEGIN:VCALENDAR")) {
        return { ok: false, error: "URL does not appear to be a valid iCal feed" };
      }
      return { ok: true, mode: "ical" };
    } catch (err: any) {
      return { ok: false, error: err.message ?? "Network error" };
    }
  }

  return {
    ok: false,
    error: "No API key or iCal URL configured. Please supply at least one.",
  };
}

// ---------------------------------------------------------------------------
// Data fetching
// ---------------------------------------------------------------------------

async function fetchStudentsFromApi(
  settings: DrumSchoolManagerSettings
): Promise<ExternalStudent[]> {
  const base = settings.baseUrl.replace(/\/$/, "");
  const res = await fetch(`${base}/api/students`, {
    headers: { Authorization: `Bearer ${settings.apiKey}` },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch students: HTTP ${res.status}`);
  }
  const data = await res.json();
  // Normalise – the manager may return { students: [...] } or a direct array
  return Array.isArray(data) ? data : (data.students ?? data.data ?? []);
}

async function fetchScheduleFromApi(
  settings: DrumSchoolManagerSettings
): Promise<ExternalScheduleEntry[]> {
  const base = settings.baseUrl.replace(/\/$/, "");
  const res = await fetch(`${base}/api/schedule`, {
    headers: { Authorization: `Bearer ${settings.apiKey}` },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch schedule: HTTP ${res.status}`);
  }
  const data = await res.json();
  return Array.isArray(data) ? data : (data.schedule ?? data.data ?? []);
}

async function fetchICalSchedule(
  icalUrl: string,
  userId: number
): Promise<ExternalScheduleEntry[]> {
  const res = await fetch(icalUrl, { signal: AbortSignal.timeout(15000) });
  if (!res.ok) {
    throw new Error(`Failed to fetch iCal feed: HTTP ${res.status}`);
  }
  const text = await res.text();
  const events = parseICalFile(text);
  const schedules = convertICalToSchedules(events, userId);

  return schedules.map((s) => ({
    dayOfWeek: [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ][Number(s.dayOfWeek)] ?? String(s.dayOfWeek),
    startTime: s.startTime,
    endTime: s.endTime,
    location: s.location ?? undefined,
    notes: s.notes ?? undefined,
  }));
}

// ---------------------------------------------------------------------------
// Preview – returns what WOULD happen without writing to the database
// ---------------------------------------------------------------------------

export async function previewSync(
  schoolId: number,
  userId: number,
  settings: DrumSchoolManagerSettings
): Promise<{
  studentsToAdd: ExternalStudent[];
  studentsToUpdate: ExternalStudent[];
  schedulesToAdd: ExternalScheduleEntry[];
  warnings: string[];
}> {
  const warnings: string[] = [];
  let externalStudents: ExternalStudent[] = [];
  let externalSchedule: ExternalScheduleEntry[] = [];

  if (settings.syncStudents && settings.apiKey) {
    try {
      externalStudents = await fetchStudentsFromApi(settings);
    } catch (err: any) {
      warnings.push(`Could not fetch students: ${err.message}`);
    }
  }

  if (settings.syncSchedule) {
    try {
      if (settings.icalUrl) {
        externalSchedule = await fetchICalSchedule(settings.icalUrl, userId);
      } else if (settings.apiKey) {
        externalSchedule = await fetchScheduleFromApi(settings);
      }
    } catch (err: any) {
      warnings.push(`Could not fetch schedule: ${err.message}`);
    }
  }

  // Determine which students are new vs existing
  const existingStudents = await db
    .select()
    .from(students)
    .where(eq(students.schoolId, schoolId));

  const existingByExternalId = new Map(
    existingStudents
      .filter((s) => s.externalId)
      .map((s) => [s.externalId!, s])
  );
  const existingByEmail = new Map(
    existingStudents
      .filter((s) => s.email)
      .map((s) => [s.email.toLowerCase(), s])
  );

  const studentsToAdd: ExternalStudent[] = [];
  const studentsToUpdate: ExternalStudent[] = [];

  for (const ext of externalStudents) {
    const byId = existingByExternalId.get(ext.id);
    const byEmail = ext.email
      ? existingByEmail.get(ext.email.toLowerCase())
      : undefined;
    if (byId || byEmail) {
      studentsToUpdate.push(ext);
    } else {
      studentsToAdd.push(ext);
    }
  }

  return {
    studentsToAdd,
    studentsToUpdate,
    schedulesToAdd: externalSchedule,
    warnings,
  };
}

// ---------------------------------------------------------------------------
// Full sync – writes to the database
// ---------------------------------------------------------------------------

export async function runSync(
  schoolId: number,
  userId: number,
  settings: DrumSchoolManagerSettings
): Promise<SyncResult> {
  const result: SyncResult = {
    success: false,
    studentsAdded: 0,
    studentsUpdated: 0,
    schedulesAdded: 0,
    schedulesUpdated: 0,
    errors: [],
    warnings: [],
  };

  // ---- Sync students -------------------------------------------------------
  if (settings.syncStudents && settings.apiKey) {
    try {
      const externalStudents = await fetchStudentsFromApi(settings);
      const existingStudents = await db
        .select()
        .from(students)
        .where(eq(students.schoolId, schoolId));

      const existingByExternalId = new Map(
        existingStudents
          .filter((s) => s.externalId)
          .map((s) => [s.externalId!, s])
      );
      const existingByEmail = new Map(
        existingStudents
          .filter((s) => s.email)
          .map((s) => [s.email.toLowerCase(), s])
      );

      for (const ext of externalStudents) {
        try {
          const existing =
            existingByExternalId.get(ext.id) ??
            (ext.email
              ? existingByEmail.get(ext.email.toLowerCase())
              : undefined);

          if (existing) {
            // Update existing student
            await db
              .update(students)
              .set({
                name: ext.name,
                email: ext.email ?? existing.email,
                phone: ext.phone ?? existing.phone,
                instrument: ext.instrument ?? existing.instrument,
                level: ext.level ?? existing.level,
                notes: ext.notes ?? existing.notes,
                externalId: ext.id,
                externalSource: "drumschool_manager",
                updatedAt: new Date(),
              })
              .where(eq(students.id, existing.id));
            result.studentsUpdated++;
          } else {
            // Insert new student
            await db.insert(students).values({
              schoolId,
              name: ext.name,
              email: ext.email ?? "",
              phone: ext.phone,
              birthdate: ext.birthdate ?? null,
              instrument: ext.instrument ?? "drums",
              level: ext.level ?? "beginner",
              notes: ext.notes,
              externalId: ext.id,
              externalSource: "drumschool_manager",
              isActive: true,
            });
            result.studentsAdded++;
          }
        } catch (err: any) {
          result.errors.push(
            `Failed to sync student "${ext.name}": ${err.message}`
          );
        }
      }
    } catch (err: any) {
      result.errors.push(`Student sync failed: ${err.message}`);
    }
  }

  // ---- Sync schedule -------------------------------------------------------
  if (settings.syncSchedule) {
    try {
      let externalSchedule: ExternalScheduleEntry[] = [];

      if (settings.icalUrl) {
        externalSchedule = await fetchICalSchedule(settings.icalUrl, userId);
      } else if (settings.apiKey) {
        externalSchedule = await fetchScheduleFromApi(settings);
      }

      // Fetch current students for matching by name
      const schoolStudents = await db
        .select()
        .from(students)
        .where(eq(students.schoolId, schoolId));

      const studentsByExternalId = new Map(
        schoolStudents
          .filter((s) => s.externalId)
          .map((s) => [s.externalId!, s])
      );
      const studentsByName = new Map(
        schoolStudents.map((s) => [s.name.toLowerCase(), s])
      );

      for (const entry of externalSchedule) {
        try {
          // Resolve which student this slot belongs to
          let studentId: number | null = null;
          if (entry.studentId) {
            studentId =
              studentsByExternalId.get(entry.studentId)?.id ?? null;
          }
          if (!studentId && entry.studentName) {
            studentId =
              studentsByName.get(entry.studentName.toLowerCase())?.id ?? null;
          }

          // dayOfWeek stored as "0"–"6" string or day name
          const DAY_MAP: Record<string, string> = {
            sunday: "0",
            monday: "1",
            tuesday: "2",
            wednesday: "3",
            thursday: "4",
            friday: "5",
            saturday: "6",
          };
          const dayOfWeek =
            DAY_MAP[entry.dayOfWeek.toLowerCase()] ?? entry.dayOfWeek;

          if (!studentId) {
            result.warnings.push(
              `Schedule entry on ${entry.dayOfWeek} ${entry.startTime}–${entry.endTime} could not be matched to a student. Add students first or map them manually.`
            );
            continue;
          }

          // Check for existing schedule for this student + day + time
          const existing = await db
            .select()
            .from(recurringSchedules)
            .where(
              and(
                eq(recurringSchedules.userId, userId),
                eq(recurringSchedules.studentId, studentId),
                eq(recurringSchedules.dayOfWeek, dayOfWeek)
              )
            );

          if (existing.length > 0) {
            await db
              .update(recurringSchedules)
              .set({
                startTime: entry.startTime,
                endTime: entry.endTime,
                location: entry.location,
                notes: entry.notes,
                updatedAt: new Date(),
              })
              .where(eq(recurringSchedules.id, existing[0].id));
            result.schedulesUpdated++;
          } else {
            await db.insert(recurringSchedules).values({
              userId,
              studentId,
              dayOfWeek,
              startTime: entry.startTime,
              endTime: entry.endTime,
              location: entry.location,
              notes: entry.notes,
              timezone: "Europe/Amsterdam",
              frequency: "WEEKLY",
              isActive: true,
            });
            result.schedulesAdded++;
          }
        } catch (err: any) {
          result.errors.push(
            `Failed to sync schedule entry: ${err.message}`
          );
        }
      }
    } catch (err: any) {
      result.errors.push(`Schedule sync failed: ${err.message}`);
    }
  }

  result.success = result.errors.length === 0;
  return result;
}

// ---------------------------------------------------------------------------
// Persist integration settings into the school record
// ---------------------------------------------------------------------------

export async function saveIntegrationSettings(
  schoolId: number,
  settings: DrumSchoolManagerSettings | null
): Promise<void> {
  // Read current integrations to merge (don't overwrite other future integrations)
  const [school] = await db
    .select({ externalIntegrations: schools.externalIntegrations })
    .from(schools)
    .where(eq(schools.id, schoolId));

  const current = (school?.externalIntegrations as Record<string, unknown>) ?? {};
  // If null is passed, remove the drumschoolManager key
  const updated =
    settings === null
      ? Object.fromEntries(
          Object.entries(current).filter(([k]) => k !== "drumschoolManager")
        )
      : { ...current, drumschoolManager: settings };

  await db
    .update(schools)
    .set({
      externalIntegrations: updated,
      updatedAt: new Date(),
    })
    .where(eq(schools.id, schoolId));
}

export async function getIntegrationSettings(
  schoolId: number
): Promise<DrumSchoolManagerSettings | null> {
  const [school] = await db
    .select({ externalIntegrations: schools.externalIntegrations })
    .from(schools)
    .where(eq(schools.id, schoolId));

  const integrations = school?.externalIntegrations as
    | { drumschoolManager?: DrumSchoolManagerSettings }
    | null;
  return integrations?.drumschoolManager ?? null;
}
