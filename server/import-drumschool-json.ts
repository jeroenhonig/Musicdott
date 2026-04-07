/**
 * Drumschool Export Import Script
 *
 * Imports a full drumschool-export-YYYY-MM-DD.json into Musicdott.
 * Phases (in FK dependency order):
 *   1. School
 *   2. Teachers (users + school_memberships)
 *   3. Students (users + students)
 *   4. Studios
 *   5. LessonSeries → recurring_schedules
 *   6. Lessons → sessions (non-cancelled only; vacation-blocked inline)
 *   7. Vacations → school_vacations
 *
 * Run with:
 *   npx tsx server/import-drumschool-json.ts [path-to-export.json]
 */

import fs from "fs/promises";
import bcrypt from "bcrypt";
import { Pool } from "pg";
import path from "path";

// ---------------------------------------------------------------------------
// Types (mirroring the drumschool export format)
// ---------------------------------------------------------------------------

type ExportStudio = {
  id: string;
  name: string;
  location?: string;
  description?: string;
  active?: boolean;
};

type ExportTeacher = {
  id: string;
  name: string;
  email: string;
  active?: boolean;
};

type ExportStudent = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  dateOfBirth?: string | null;
  notes?: string | null;
  level?: string | null;
  isActive?: boolean;
  isTestAccount?: boolean;
};

type ExportLessonSeries = {
  id: string;
  studentId: string;
  teacherId: string;
  studioId?: string | null;
  weekday: number; // 1=Monday … 7=Sunday
  startTime: string; // "HH:MM:SS"
  durationMin: number;
  frequency: "weekly" | "biweekly";
  referenceDate?: string | null;
  status: "active" | "cancelled" | "provisional";
  isActive: boolean;
};

type ExportLesson = {
  id: string;
  date: string; // "YYYY-MM-DD"
  startTime: string; // "HH:MM:SS"
  endTime: string; // "HH:MM:SS"
  teacherId: string;
  studioId?: string | null;
  studentId?: string | null;
  parentSeriesId?: string | null;
  type?: string;
  status: "scheduled" | "completed" | "cancelled" | "noshow" | "rescheduled" | "ntb";
  notes?: string | null;
};

type ExportVacation = {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  isActive?: boolean;
};

type ExportBlackout = {
  id: string;
  name?: string;
  date: string;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toHHMM(time: string): string {
  // "14:30:00" → "14:30"
  return time.substring(0, 5);
}

function addMinutes(time: string, minutes: number): string {
  const [h, m] = toHHMM(time).split(":").map(Number);
  const total = h * 60 + m + minutes;
  return `${String(Math.floor(total / 60) % 24).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

// weekday 1=Monday…7=Sunday → "1"–"6"/"0" (JS: 0=Sunday)
function exportWeekdayToJs(weekday: number): string {
  // Export: 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat, 7=Sun
  // JS: 0=Sun, 1=Mon, … 6=Sat
  const map: Record<number, string> = { 1: "1", 2: "2", 3: "3", 4: "4", 5: "5", 6: "6", 7: "0" };
  return map[weekday] ?? String(weekday);
}

function buildUsername(firstName: string, lastName: string): string {
  return (firstName + lastName)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // strip diacritics
    .replace(/[^a-z0-9]/g, "");
}

function extractMusicdottId(notes: string | null | undefined): number | null {
  if (!notes) return null;
  const match = notes.match(/Musicdott\s+ID:\s*(\d+)/i);
  return match ? parseInt(match[1], 10) : null;
}

function isOnVacation(
  dateStr: string,
  vacations: Array<{ startDate: string; endDate: string }>
): boolean {
  for (const v of vacations) {
    if (dateStr >= v.startDate && dateStr <= v.endDate) return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// Main import function
// ---------------------------------------------------------------------------

export async function importDrumschoolJson(
  exportFilePath: string,
  pool: Pool
): Promise<void> {
  console.log(`\n📂 Reading export file: ${exportFilePath}`);
  const raw = await fs.readFile(exportFilePath, "utf-8");
  const exportData = JSON.parse(raw);
  const d = exportData.data as Record<string, any[]>;

  const teachers: ExportTeacher[] = d.teachers ?? [];
  const students: ExportStudent[] = d.students ?? [];
  const studioList: ExportStudio[] = d.studios ?? [];
  const lessonSeries: ExportLessonSeries[] = d.lessonSeries ?? [];
  const lessons: ExportLesson[] = d.lessons ?? [];
  const vacations: ExportVacation[] = d.customVacations ?? [];
  const blackouts: ExportBlackout[] = d.blackoutDates ?? [];

  console.log(`\n📊 Export summary:`);
  console.log(`   Teachers:      ${teachers.length}`);
  console.log(`   Students:      ${students.length}`);
  console.log(`   Studios:       ${studioList.length}`);
  console.log(`   LessonSeries:  ${lessonSeries.length}`);
  console.log(`   Lessons:       ${lessons.length}`);
  console.log(`   Vacations:     ${vacations.length}`);
  console.log(`   Blackouts:     ${blackouts.length}`);

  // Pre-hash the shared passwords once
  const studentPassword = await bcrypt.hash("Drumles2026!", 10);
  const teacherPassword = await bcrypt.hash("Leraar2026!", 10);

  // ---------------------------------------------------------------------------
  // Phase 1: School
  // ---------------------------------------------------------------------------
  console.log("\n🏫 Phase 1: School");

  const SCHOOL_NAME = "Drumschool Stefan van de Brug";
  const SCHOOL_SLUG = "drumschoolstefanvandebrug";

  const schoolRes = await pool.query<{ id: number }>(
    `INSERT INTO schools (name, created_at, updated_at)
     VALUES ($1, NOW(), NOW())
     ON CONFLICT (name) DO UPDATE SET updated_at = NOW()
     RETURNING id`,
    [SCHOOL_NAME]
  );
  const schoolId = schoolRes.rows[0].id;
  console.log(`   School ID: ${schoolId} — "${SCHOOL_NAME}"`);

  // Upsert slug alias
  await pool.query(
    `INSERT INTO school_aliases (school_id, slug, created_at, updated_at)
     VALUES ($1, $2, NOW(), NOW())
     ON CONFLICT (slug) DO NOTHING`,
    [schoolId, SCHOOL_SLUG]
  );

  // ---------------------------------------------------------------------------
  // Phase 2: Teachers
  // ---------------------------------------------------------------------------
  console.log("\n👩‍🏫 Phase 2: Teachers");

  const STEFAN_EMAIL = "mail@drumschoolstefanvandebrug.nl";
  const teacherMap = new Map<string, number>(); // exportUUID → users.id
  let stefanUserId: number | null = null;
  const usernamesSeen = new Set<string>();

  for (const teacher of teachers) {
    const isOwner = teacher.email.toLowerCase() === STEFAN_EMAIL.toLowerCase();
    const role = isOwner ? "school_owner" : "teacher";

    // Build unique username
    const [firstName, ...rest] = teacher.name.split(" ");
    const lastName = rest.join(" ");
    let username = buildUsername(firstName, lastName);
    let suffix = 1;
    while (usernamesSeen.has(username)) {
      username = buildUsername(firstName, lastName) + String(++suffix);
    }
    usernamesSeen.add(username);

    const res = await pool.query<{ id: number }>(
      `INSERT INTO users (school_id, username, password, name, email, role, must_change_password)
       VALUES ($1, $2, $3, $4, $5, $6, TRUE)
       ON CONFLICT (email) DO UPDATE
         SET name = EXCLUDED.name,
             school_id = $1
       RETURNING id`,
      [schoolId, username, teacherPassword, teacher.name, teacher.email.toLowerCase(), role]
    );
    const userId = res.rows[0].id;
    teacherMap.set(teacher.id, userId);

    if (isOwner) {
      stefanUserId = userId;
      await pool.query(
        `UPDATE schools SET owner_id = $1 WHERE id = $2`,
        [userId, schoolId]
      );
    }

    await pool.query(
      `INSERT INTO school_memberships (school_id, user_id, role, created_at, updated_at)
       VALUES ($1, $2, $3, NOW(), NOW())
       ON CONFLICT (school_id, user_id) DO NOTHING`,
      [schoolId, userId, isOwner ? "owner" : "teacher"]
    );

    console.log(`   ✓ ${teacher.name} (${role}) → user #${userId}`);
  }

  if (!stefanUserId) {
    console.warn("   ⚠️  Stefan van de Brug not found by email — school owner not set");
  }

  // ---------------------------------------------------------------------------
  // Phase 3: Students
  // ---------------------------------------------------------------------------
  console.log("\n🎓 Phase 3: Students");

  const studentMap = new Map<string, number>(); // exportUUID → students.id
  let studentsCreated = 0;
  let studentsUpdated = 0;
  let studentsFailed = 0;

  for (const student of students) {
    if (student.isTestAccount) continue;

    try {
      // Build username, dedup with suffix
      let username = buildUsername(student.firstName, student.lastName);
      let suffix = 1;
      while (usernamesSeen.has(username)) {
        username = buildUsername(student.firstName, student.lastName) + String(++suffix);
      }
      usernamesSeen.add(username);

      const fullName = `${student.firstName} ${student.lastName}`.trim();
      const musicdottId = extractMusicdottId(student.notes);

      // Upsert user account
      const userRes = await pool.query<{ id: number }>(
        `INSERT INTO users (school_id, username, password, name, email, role, must_change_password)
         VALUES ($1, $2, $3, $4, $5, 'student', TRUE)
         ON CONFLICT (email) DO UPDATE
           SET name = EXCLUDED.name,
               school_id = $1
         RETURNING id`,
        [schoolId, username, studentPassword, fullName, student.email.toLowerCase()]
      );
      const userId = userRes.rows[0].id;

      // Upsert student record
      const studentRes = await pool.query<{ id: number }>(
        `INSERT INTO students (
           school_id, user_id, name, email, phone, birthdate,
           level, notes, external_id, external_source, account_id,
           is_active, created_at, updated_at
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'drumschool_export', $10, $11, NOW(), NOW())
         ON CONFLICT (school_id, external_id) DO UPDATE
           SET name         = EXCLUDED.name,
               email        = EXCLUDED.email,
               user_id      = EXCLUDED.user_id,
               phone        = EXCLUDED.phone,
               birthdate    = EXCLUDED.birthdate,
               level        = EXCLUDED.level,
               is_active    = EXCLUDED.is_active,
               updated_at   = NOW()
         RETURNING id`,
        [
          schoolId,
          userId,
          fullName,
          student.email.toLowerCase(),
          student.phone ?? null,
          student.dateOfBirth ?? null,
          student.level ?? "beginner",
          student.notes ?? null,
          student.id,
          musicdottId,
          student.isActive ?? true,
        ]
      );
      const studentId = studentRes.rows[0].id;
      studentMap.set(student.id, studentId);
      studentsCreated++;
    } catch (err: any) {
      studentsFailed++;
      console.error(`   ✗ ${student.firstName} ${student.lastName} (${student.id}): ${err.message}`);
    }
  }

  console.log(`   Created/updated: ${studentsCreated}, Failed: ${studentsFailed}`);

  // ---------------------------------------------------------------------------
  // Phase 4: Studios
  // ---------------------------------------------------------------------------
  console.log("\n🎸 Phase 4: Studios");

  const studioMap = new Map<string, number>(); // exportUUID → studios.id

  for (const studio of studioList) {
    const res = await pool.query<{ id: number }>(
      `INSERT INTO studios (school_id, name, location, description, is_active, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
       ON CONFLICT (school_id, name) DO UPDATE
         SET location    = EXCLUDED.location,
             description = EXCLUDED.description,
             is_active   = EXCLUDED.is_active,
             updated_at  = NOW()
       RETURNING id`,
      [schoolId, studio.name, studio.location ?? null, studio.description ?? null, studio.active ?? true]
    );
    studioMap.set(studio.id, res.rows[0].id);
    console.log(`   ✓ ${studio.name} (${studio.location ?? "?"}) → studio #${res.rows[0].id}`);
  }

  // ---------------------------------------------------------------------------
  // Phase 5: LessonSeries → recurring_schedules
  // ---------------------------------------------------------------------------
  console.log("\n📅 Phase 5: LessonSeries → recurring_schedules");

  const seriesMap = new Map<string, number>(); // exportUUID → recurring_schedules.id
  let seriesCreated = 0;
  let seriesFailed = 0;

  for (const series of lessonSeries) {
    const teacherUserId = teacherMap.get(series.teacherId);
    const studentId = studentMap.get(series.studentId);

    if (!teacherUserId) {
      console.warn(`   ⚠️  Series ${series.id}: teacher ${series.teacherId} not found`);
      seriesFailed++;
      continue;
    }
    if (!studentId) {
      console.warn(`   ⚠️  Series ${series.id}: student ${series.studentId} not found`);
      seriesFailed++;
      continue;
    }

    const studioId = series.studioId ? (studioMap.get(series.studioId) ?? null) : null;
    const dayOfWeek = exportWeekdayToJs(series.weekday);
    const startTime = toHHMM(series.startTime);
    const endTime = addMinutes(series.startTime, series.durationMin);
    const frequency = series.frequency === "biweekly" ? "BIWEEKLY" : "WEEKLY";

    try {
      const res = await pool.query<{ id: number }>(
        `INSERT INTO recurring_schedules (
           user_id, student_id, school_id, studio_id,
           day_of_week, start_time, end_time, duration_min,
           frequency, reference_date, status, is_active,
           timezone, location, external_id, created_at, updated_at
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'Europe/Amsterdam', $13, $14, NOW(), NOW())
         ON CONFLICT (external_id) DO UPDATE
           SET status     = EXCLUDED.status,
               is_active  = EXCLUDED.is_active,
               updated_at = NOW()
         RETURNING id`,
        [
          teacherUserId,
          studentId,
          schoolId,
          studioId,
          dayOfWeek,
          startTime,
          endTime,
          series.durationMin,
          frequency,
          series.referenceDate ?? null,
          series.status,
          series.isActive && series.status !== "cancelled",
          studioId ? null : null, // location stored via studio name lookup if needed
          series.id,
        ]
      );
      seriesMap.set(series.id, res.rows[0].id);
      seriesCreated++;
    } catch (err: any) {
      seriesFailed++;
      console.error(`   ✗ Series ${series.id}: ${err.message}`);
    }
  }

  console.log(`   Created/updated: ${seriesCreated}, Failed: ${seriesFailed}`);

  // ---------------------------------------------------------------------------
  // Phase 6: Lessons → sessions (skip cancelled)
  // ---------------------------------------------------------------------------
  console.log("\n📖 Phase 6: Lessons → sessions");

  // Pre-load vacation date ranges into memory for fast inline checks
  const vacationRanges = [
    ...vacations.filter(v => v.isActive !== false).map(v => ({ startDate: v.startDate, endDate: v.endDate })),
    ...blackouts.map(b => ({ startDate: b.date, endDate: b.date })),
  ];

  const SKIP_STATUSES = new Set(["cancelled"]);
  const STATUS_MAP: Record<string, string> = {
    scheduled: "scheduled",
    completed: "completed",
    noshow: "noshow",
    rescheduled: "rescheduled",
    ntb: "scheduled", // "nog te bepalen" → scheduled
  };

  let sessionsCreated = 0;
  let sessionsSkipped = 0;
  let sessionsFailed = 0;
  let sessionsVacationBlocked = 0;

  for (const lesson of lessons) {
    if (SKIP_STATUSES.has(lesson.status)) {
      sessionsSkipped++;
      continue;
    }

    const teacherUserId = teacherMap.get(lesson.teacherId);
    if (!teacherUserId) {
      sessionsFailed++;
      continue;
    }

    // Resolve student: prefer lesson.studentId, fallback to series
    let studentId: number | null = null;
    if (lesson.studentId) {
      studentId = studentMap.get(lesson.studentId) ?? null;
    }
    if (!studentId && lesson.parentSeriesId) {
      const seriesEntry = lessonSeries.find(s => s.id === lesson.parentSeriesId);
      if (seriesEntry?.studentId) {
        studentId = studentMap.get(seriesEntry.studentId) ?? null;
      }
    }
    if (!studentId) {
      sessionsFailed++;
      continue;
    }

    const seriesId = lesson.parentSeriesId ? (seriesMap.get(lesson.parentSeriesId) ?? null) : null;
    const studioId = lesson.studioId ? (studioMap.get(lesson.studioId) ?? null) : null;
    const startTimeHHMM = toHHMM(lesson.startTime);
    const endTimeHHMM = toHHMM(lesson.endTime);
    const startTimestamp = `${lesson.date} ${startTimeHHMM}:00`;
    const endTimestamp = `${lesson.date} ${endTimeHHMM}:00`;

    // Inline vacation check
    let finalStatus = STATUS_MAP[lesson.status] ?? "scheduled";
    if (isOnVacation(lesson.date, vacationRanges)) {
      finalStatus = "vacation_blocked";
      sessionsVacationBlocked++;
    }

    // Duration from start/end times
    const [sh, sm] = startTimeHHMM.split(":").map(Number);
    const [eh, em] = endTimeHHMM.split(":").map(Number);
    const durationMin = (eh * 60 + em) - (sh * 60 + sm);

    try {
      await pool.query(
        `INSERT INTO sessions (
           school_id, user_id, student_id, parent_series_id,
           title, start_time, end_time, duration_min,
           status, lesson_type, studio_id, notes, external_id
         )
         VALUES ($1, $2, $3, $4, $5, $6::timestamp, $7::timestamp, $8, $9, $10, $11, $12, $13)
         ON CONFLICT (external_id) DO UPDATE
           SET status = EXCLUDED.status`,
        [
          schoolId,
          teacherUserId,
          studentId,
          seriesId,
          "Drumles",
          startTimestamp,
          endTimestamp,
          durationMin > 0 ? durationMin : 45,
          finalStatus,
          lesson.type ?? "individual",
          studioId,
          lesson.notes ?? null,
          lesson.id,
        ]
      );
      sessionsCreated++;
    } catch (err: any) {
      sessionsFailed++;
      if (sessionsFailed <= 5) {
        console.error(`   ✗ Lesson ${lesson.id}: ${err.message}`);
      }
    }
  }

  console.log(`   Created/updated: ${sessionsCreated}, Skipped (cancelled): ${sessionsSkipped}`);
  console.log(`   Vacation-blocked: ${sessionsVacationBlocked}, Failed: ${sessionsFailed}`);

  // ---------------------------------------------------------------------------
  // Phase 7: Vacations → school_vacations
  // ---------------------------------------------------------------------------
  console.log("\n🏖️  Phase 7: Vacations → school_vacations");

  for (const vacation of vacations) {
    if (vacation.isActive === false) continue;
    await pool.query(
      `INSERT INTO school_vacations (school_id, title, start_date, end_date, is_blackout, created_at, updated_at)
       VALUES ($1, $2, $3, $4, FALSE, NOW(), NOW())
       ON CONFLICT (school_id, start_date, end_date) DO UPDATE
         SET title      = EXCLUDED.title,
             updated_at = NOW()`,
      [schoolId, vacation.name, vacation.startDate, vacation.endDate]
    );
    console.log(`   ✓ ${vacation.name}: ${vacation.startDate} → ${vacation.endDate}`);
  }

  for (const blackout of blackouts) {
    const title = (blackout as any).name ?? `Blackout ${blackout.date}`;
    await pool.query(
      `INSERT INTO school_vacations (school_id, title, start_date, end_date, is_blackout, created_at, updated_at)
       VALUES ($1, $2, $3, $3, TRUE, NOW(), NOW())
       ON CONFLICT (school_id, start_date, end_date) DO NOTHING`,
      [schoolId, title, blackout.date]
    );
  }

  // ---------------------------------------------------------------------------
  // Summary
  // ---------------------------------------------------------------------------
  console.log("\n╔══════════════════════════════════════════════╗");
  console.log("║        IMPORT COMPLETE — SUMMARY              ║");
  console.log("╚══════════════════════════════════════════════╝");
  console.log(`School:          "${SCHOOL_NAME}" (ID: ${schoolId})`);
  console.log(`Teachers:        ${teacherMap.size} imported`);
  console.log(`Students:        ${studentsCreated} imported, ${studentsFailed} failed`);
  console.log(`Studios:         ${studioMap.size} imported`);
  console.log(`LessonSeries:    ${seriesCreated} imported, ${seriesFailed} failed`);
  console.log(`Sessions:        ${sessionsCreated} imported, ${sessionsSkipped} cancelled skipped`);
  console.log(`                 ${sessionsVacationBlocked} vacation-blocked, ${sessionsFailed} failed`);
  console.log(`Vacations:       ${vacations.length} imported`);
  console.log();
  console.log("🔑 Default passwords:");
  console.log("   Teachers:  Leraar2026!  (must change on first login)");
  console.log("   Students:  Drumles2026! (must change on first login)");
  console.log();
  console.log("📋 Teacher usernames:");
  for (const teacher of teachers) {
    const [fn, ...ln] = teacher.name.split(" ");
    console.log(`   ${buildUsername(fn, ln.join(" "))} — ${teacher.name} (${teacher.email})`);
  }
}
