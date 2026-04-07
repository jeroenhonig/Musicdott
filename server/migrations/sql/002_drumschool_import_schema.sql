-- Migration 002: Drumschool import schema extensions
-- Adds studios, school_vacations tables and extends recurring_schedules and sessions
-- All statements are idempotent (safe to run multiple times)

SET search_path TO public;

-- ============================================================
-- NEW TABLE: school_aliases (if not already created)
-- ============================================================
CREATE TABLE IF NOT EXISTS school_aliases (
  id SERIAL PRIMARY KEY,
  school_id INTEGER NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  slug TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- ============================================================
-- NEW TABLE: studios
-- ============================================================
CREATE TABLE IF NOT EXISTS studios (
  id SERIAL PRIMARY KEY,
  school_id INTEGER NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  location TEXT,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  UNIQUE (school_id, name)
);

-- ============================================================
-- NEW TABLE: school_vacations
-- ============================================================
CREATE TABLE IF NOT EXISTS school_vacations (
  id SERIAL PRIMARY KEY,
  school_id INTEGER NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_blackout BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  UNIQUE (school_id, start_date, end_date)
);

-- ============================================================
-- EXTEND: schools — add external_integrations if missing
-- ============================================================
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'schools' AND column_name = 'external_integrations'
  ) THEN
    ALTER TABLE schools ADD COLUMN external_integrations JSONB;
  END IF;
END $$;

-- ============================================================
-- EXTEND: students — add external tracking columns if missing
-- ============================================================
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'students' AND column_name = 'external_id'
  ) THEN
    ALTER TABLE students ADD COLUMN external_id TEXT;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'students' AND column_name = 'external_source'
  ) THEN
    ALTER TABLE students ADD COLUMN external_source TEXT;
  END IF;
END $$;

-- ============================================================
-- EXTEND: recurring_schedules — agenda improvements
-- ============================================================
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'recurring_schedules' AND column_name = 'school_id'
  ) THEN
    ALTER TABLE recurring_schedules ADD COLUMN school_id INTEGER REFERENCES schools(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'recurring_schedules' AND column_name = 'studio_id'
  ) THEN
    ALTER TABLE recurring_schedules ADD COLUMN studio_id INTEGER REFERENCES studios(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'recurring_schedules' AND column_name = 'duration_min'
  ) THEN
    ALTER TABLE recurring_schedules ADD COLUMN duration_min INTEGER DEFAULT 30;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'recurring_schedules' AND column_name = 'reference_date'
  ) THEN
    ALTER TABLE recurring_schedules ADD COLUMN reference_date DATE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'recurring_schedules' AND column_name = 'status'
  ) THEN
    ALTER TABLE recurring_schedules ADD COLUMN status TEXT DEFAULT 'active';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'recurring_schedules' AND column_name = 'external_id'
  ) THEN
    ALTER TABLE recurring_schedules ADD COLUMN external_id TEXT;
  END IF;
END $$;

-- ============================================================
-- EXTEND: sessions — agenda status + series linkage
-- ============================================================
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sessions' AND column_name = 'parent_series_id'
  ) THEN
    ALTER TABLE sessions ADD COLUMN parent_series_id INTEGER REFERENCES recurring_schedules(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sessions' AND column_name = 'status'
  ) THEN
    ALTER TABLE sessions ADD COLUMN status TEXT DEFAULT 'scheduled';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sessions' AND column_name = 'lesson_type'
  ) THEN
    ALTER TABLE sessions ADD COLUMN lesson_type TEXT DEFAULT 'individual';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sessions' AND column_name = 'studio_id'
  ) THEN
    ALTER TABLE sessions ADD COLUMN studio_id INTEGER REFERENCES studios(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sessions' AND column_name = 'external_id'
  ) THEN
    ALTER TABLE sessions ADD COLUMN external_id TEXT;
  END IF;
END $$;

-- ============================================================
-- INDEXES for performance and idempotency
-- ============================================================
CREATE UNIQUE INDEX IF NOT EXISTS uq_recurring_schedules_external_id
  ON recurring_schedules(external_id)
  WHERE external_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_sessions_external_id
  ON sessions(external_id)
  WHERE external_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_students_school_external_id
  ON students(school_id, external_id)
  WHERE external_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_sessions_parent_series_id
  ON sessions(parent_series_id);

CREATE INDEX IF NOT EXISTS idx_sessions_status
  ON sessions(status);

CREATE INDEX IF NOT EXISTS idx_sessions_start_time
  ON sessions(start_time);

CREATE INDEX IF NOT EXISTS idx_school_vacations_school_dates
  ON school_vacations(school_id, start_date, end_date);

CREATE INDEX IF NOT EXISTS idx_recurring_schedules_school_id
  ON recurring_schedules(school_id);

CREATE INDEX IF NOT EXISTS idx_studios_school_id
  ON studios(school_id);
