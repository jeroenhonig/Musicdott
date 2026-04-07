-- Migration 003: Lesson display extensions
-- Adds session expiry, special display modes (timer/pause/metronome),
-- and a push-history log table for analytics.

-- Session expiry + display mode state
ALTER TABLE lesson_display_sessions
  ADD COLUMN IF NOT EXISTS expires_at    TIMESTAMPTZ DEFAULT NOW() + INTERVAL '4 hours',
  ADD COLUMN IF NOT EXISTS display_mode  TEXT NOT NULL DEFAULT 'idle',
  ADD COLUMN IF NOT EXISTS display_state JSONB;

-- Push history log (one row per teacher push action)
CREATE TABLE IF NOT EXISTS lesson_display_events (
  id         BIGSERIAL PRIMARY KEY,
  session_id TEXT        NOT NULL REFERENCES lesson_display_sessions(id) ON DELETE CASCADE,
  event_type TEXT        NOT NULL, -- push_block | push_timer | push_pause | push_metronome | clear_screen | student_reaction
  payload    JSONB,
  pushed_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lde_session_id ON lesson_display_events(session_id);
CREATE INDEX IF NOT EXISTS idx_lde_pushed_at  ON lesson_display_events(pushed_at);
