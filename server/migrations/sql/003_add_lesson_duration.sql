-- Migration: 003_add_lesson_duration
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS duration_min integer;
