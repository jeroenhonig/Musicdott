-- Add teacher_notes column to sessions for per-lesson teaching log
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS teacher_notes TEXT;

-- Add xp_awarded column to practice_sessions for tracking XP earned per log entry
ALTER TABLE practice_sessions ADD COLUMN IF NOT EXISTS xp_awarded INTEGER DEFAULT 0;
