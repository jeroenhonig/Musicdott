-- Migration: 002_add_student_age
ALTER TABLE students ADD COLUMN IF NOT EXISTS age integer;
