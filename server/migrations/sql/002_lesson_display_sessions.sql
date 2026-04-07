-- Lesson display sessions: real-time "second screen" feature for teacher/student setups
-- The teacher controls what appears on the student's display screen via WebSocket.
CREATE TABLE IF NOT EXISTS lesson_display_sessions (
  id                 TEXT PRIMARY KEY,               -- UUID, generated server-side (not guessable in URL)
  lesson_id          INTEGER NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  teacher_id         INTEGER NOT NULL REFERENCES users(id),
  school_id          INTEGER NOT NULL,               -- denormalized for fast auth checks
  active_block_index INTEGER,                        -- index into lesson's contentBlocks array; NULL = no block pushed
  status             TEXT NOT NULL DEFAULT 'active', -- 'active' | 'closed'
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  closed_at          TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_lds_lesson_id   ON lesson_display_sessions(lesson_id);
CREATE INDEX IF NOT EXISTS idx_lds_teacher_id  ON lesson_display_sessions(teacher_id);
CREATE INDEX IF NOT EXISTS idx_lds_status      ON lesson_display_sessions(status);
