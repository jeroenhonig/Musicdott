-- Migration 002: Billing schema updates
-- Adds subscription_plans table, fixes all billing-related tables to match service expectations

SET search_path TO public;

-- ============================================================
-- 1. subscription_plans table (was a JS const, needs to be DB)
-- ============================================================
CREATE TABLE IF NOT EXISTS subscription_plans (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  price_monthly INTEGER NOT NULL, -- in cents
  teacher_licenses INTEGER NOT NULL DEFAULT 1, -- -1 = unlimited
  student_licenses INTEGER NOT NULL DEFAULT 25,
  features JSONB DEFAULT '[]',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

INSERT INTO subscription_plans (name, display_name, price_monthly, teacher_licenses, student_licenses, features)
VALUES
  ('standaard', 'Standaard', 2995, 1, 25, '["Tot 25 leerlingen", "1 leraar", "Basis lesplanning", "Voortgang bijhouden"]'),
  ('pro', 'Pro', 4995, -1, 50, '["Tot 50 leerlingen (uitbreidbaar)", "Onbeperkt leraren", "Geavanceerde analytics", "Eigen branding", "Prioriteitsondersteuning"]')
ON CONFLICT (name) DO NOTHING;

-- ============================================================
-- 2. subscriptions table: add missing columns
-- ============================================================
ALTER TABLE subscriptions
  ALTER COLUMN school_id DROP NOT NULL; -- allow NULL for teacher-only subscriptions

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='subscriptions' AND column_name='user_id') THEN
    ALTER TABLE subscriptions ADD COLUMN user_id INTEGER REFERENCES users(id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='subscriptions' AND column_name='plan_id') THEN
    ALTER TABLE subscriptions ADD COLUMN plan_id INTEGER REFERENCES subscription_plans(id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='subscriptions' AND column_name='trial_start_date') THEN
    ALTER TABLE subscriptions ADD COLUMN trial_start_date TIMESTAMP;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='subscriptions' AND column_name='trial_end_date') THEN
    ALTER TABLE subscriptions ADD COLUMN trial_end_date TIMESTAMP;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='subscriptions' AND column_name='total_student_licenses') THEN
    ALTER TABLE subscriptions ADD COLUMN total_student_licenses INTEGER DEFAULT 25;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='subscriptions' AND column_name='extra_student_licenses') THEN
    ALTER TABLE subscriptions ADD COLUMN extra_student_licenses INTEGER DEFAULT 0;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='subscriptions' AND column_name='current_teacher_count') THEN
    ALTER TABLE subscriptions ADD COLUMN current_teacher_count INTEGER DEFAULT 0;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='subscriptions' AND column_name='current_student_count') THEN
    ALTER TABLE subscriptions ADD COLUMN current_student_count INTEGER DEFAULT 0;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='subscriptions' AND column_name='billing_period_start') THEN
    ALTER TABLE subscriptions ADD COLUMN billing_period_start TIMESTAMP;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='subscriptions' AND column_name='billing_period_end') THEN
    ALTER TABLE subscriptions ADD COLUMN billing_period_end TIMESTAMP;
  END IF;
END $$;

-- Backfill plan_id from plan_type where possible
UPDATE subscriptions s
SET plan_id = sp.id
FROM subscription_plans sp
WHERE s.plan_id IS NULL
  AND (
    (s.plan_type = 'standard' AND sp.name = 'standaard')
    OR (s.plan_type = 'standaard' AND sp.name = 'standaard')
    OR (s.plan_type = 'pro' AND sp.name = 'pro')
  );

-- ============================================================
-- 3. payment_history: add missing columns + make school_id nullable
-- ============================================================
ALTER TABLE payment_history
  ALTER COLUMN school_id DROP NOT NULL;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='payment_history' AND column_name='user_id') THEN
    ALTER TABLE payment_history ADD COLUMN user_id INTEGER REFERENCES users(id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='payment_history' AND column_name='billing_month') THEN
    ALTER TABLE payment_history ADD COLUMN billing_month TEXT; -- format: 'yyyy-MM'
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='payment_history' AND column_name='stripe_invoice_id') THEN
    ALTER TABLE payment_history ADD COLUMN stripe_invoice_id TEXT;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='payment_history' AND column_name='payment_date') THEN
    ALTER TABLE payment_history ADD COLUMN payment_date TIMESTAMP;
  END IF;
END $$;

-- ============================================================
-- 4. billing_audit_log: add missing columns + make school_id nullable
-- ============================================================
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name='billing_audit_log' AND column_name='school_id'
    AND is_nullable='NO') THEN
    ALTER TABLE billing_audit_log ALTER COLUMN school_id DROP NOT NULL;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='billing_audit_log' AND column_name='user_id') THEN
    ALTER TABLE billing_audit_log ADD COLUMN user_id INTEGER REFERENCES users(id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='billing_audit_log' AND column_name='event_data') THEN
    ALTER TABLE billing_audit_log ADD COLUMN event_data JSONB;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='billing_audit_log' AND column_name='previous_amount') THEN
    ALTER TABLE billing_audit_log ADD COLUMN previous_amount NUMERIC(10,2);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='billing_audit_log' AND column_name='current_amount') THEN
    ALTER TABLE billing_audit_log ADD COLUMN current_amount NUMERIC(10,2);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='billing_audit_log' AND column_name='stripe_event_id') THEN
    ALTER TABLE billing_audit_log ADD COLUMN stripe_event_id TEXT;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='billing_audit_log' AND column_name='metadata') THEN
    ALTER TABLE billing_audit_log ADD COLUMN metadata JSONB;
  END IF;
END $$;

-- ============================================================
-- 5. billing_alerts: create if not exists with all required columns
-- ============================================================
CREATE TABLE IF NOT EXISTS billing_alerts (
  id SERIAL PRIMARY KEY,
  school_id INTEGER REFERENCES schools(id),
  alert_type TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  message TEXT NOT NULL,
  severity TEXT DEFAULT 'info',
  action_required BOOLEAN DEFAULT FALSE,
  is_read BOOLEAN DEFAULT FALSE,
  is_resolved BOOLEAN DEFAULT FALSE,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Add missing columns if table already existed with fewer columns
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='billing_alerts' AND column_name='title') THEN
    ALTER TABLE billing_alerts ADD COLUMN title TEXT NOT NULL DEFAULT '';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='billing_alerts' AND column_name='action_required') THEN
    ALTER TABLE billing_alerts ADD COLUMN action_required BOOLEAN DEFAULT FALSE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='billing_alerts' AND column_name='is_resolved') THEN
    ALTER TABLE billing_alerts ADD COLUMN is_resolved BOOLEAN DEFAULT FALSE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='billing_alerts' AND column_name='metadata') THEN
    ALTER TABLE billing_alerts ADD COLUMN metadata JSONB;
  END IF;
END $$;

-- Make school_id nullable if it was set NOT NULL before
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name='billing_alerts' AND column_name='school_id'
    AND is_nullable='NO') THEN
    ALTER TABLE billing_alerts ALTER COLUMN school_id DROP NOT NULL;
  END IF;
END $$;
