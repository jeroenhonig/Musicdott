/**
 * Lesson Display Screen — Shared Event Contract
 *
 * Socket.IO event names and payload types for the real-time "second screen" feature.
 * These events flow within a session-scoped room `display-session:{sessionId}` and
 * are distinct from the school-wide RealtimeBus event bus.
 *
 * Event directions:
 *   Teacher  → Server → Display screen : PUSH_BLOCK, CLEAR_SCREEN, SESSION_OPEN/CLOSE, YT sync
 *   Server   → Room                    : SCREEN_UPDATED, SESSION_JOINED/CLOSED, YT relay
 *   Display  → Server → Teacher        : YT sync (bidirectional for seek/pause feedback)
 */

import type { ContentBlockContract } from "./content-blocks";
export type { ContentBlockContract };

// ---------------------------------------------------------------------------
// Event name constants
// ---------------------------------------------------------------------------

export const DISPLAY_EVENTS = {
  // Session lifecycle (teacher ↔ server)
  SESSION_OPEN:     "display.session_open",    // join the socket room
  SESSION_CLOSE:    "display.session_close",   // close session gracefully

  // Block control (teacher → server → display)
  PUSH_BLOCK:       "display.push_block",
  CLEAR_SCREEN:     "display.clear_screen",

  // Special display modes (teacher → server → display)
  PUSH_TIMER:       "display.push_timer",      // countdown timer
  PUSH_PAUSE:       "display.push_pause",      // pause screen
  PUSH_METRONOME:   "display.push_metronome",  // visual metronome

  // Student interaction (display → server → teacher)
  STUDENT_REACTION: "display.student_reaction", // student clicks "Klaar"

  // YouTube sync (teacher ↔ server ↔ display, bidirectional relay)
  YT_PLAY:          "display.yt_play",
  YT_PAUSE:         "display.yt_pause",
  YT_SEEK:          "display.yt_seek",
  YT_RATE:          "display.yt_rate",

  // Server → clients (confirmations / state broadcasts)
  SCREEN_UPDATED:   "display.screen_updated",  // after push/clear/timer/pause/metronome
  SESSION_JOINED:   "display.session_joined",  // display screen connected
  SESSION_LEFT:     "display.session_left",    // display screen disconnected
  SESSION_CLOSED:   "display.session_closed",  // teacher ended session
} as const;

export type DisplayEventName = typeof DISPLAY_EVENTS[keyof typeof DISPLAY_EVENTS];

// ---------------------------------------------------------------------------
// Payload types
// ---------------------------------------------------------------------------

export interface DisplaySessionOpenPayload {
  sessionId: string;
  role: "teacher" | "display";
}

export interface DisplaySessionClosePayload {
  sessionId: string;
}

export interface DisplayPushBlockPayload {
  sessionId: string;
  blockIndex: number;
  block: ContentBlockContract;
}

export interface DisplayClearScreenPayload {
  sessionId: string;
}

/** YouTube sync payload — sent by teacher or display, relayed to the rest of the room */
export interface DisplayYtSyncPayload {
  sessionId: string;
  videoId: string;
  currentTime: number;  // seconds (float)
  rate?: number;        // only used with YT_RATE
}

// ---------------------------------------------------------------------------
// Special display mode types
// ---------------------------------------------------------------------------

export type DisplayMode = "idle" | "block" | "timer" | "pause" | "metronome";

export interface TimerDisplayState {
  seconds: number;
  label?: string;
  /** ISO timestamp of when the timer was started — used for reload recovery */
  startedAt: string;
}

export interface MetronomeDisplayState {
  bpm: number;
  beatsPerMeasure: number;
  label?: string;
}

export interface PauseDisplayState {
  message?: string;
}

export type DisplayModeState = TimerDisplayState | MetronomeDisplayState | PauseDisplayState;

// ---------------------------------------------------------------------------
// Push payloads for special modes
// ---------------------------------------------------------------------------

export interface DisplayPushTimerPayload {
  sessionId: string;
  seconds: number;
  label?: string;
}

export interface DisplayPushPausePayload {
  sessionId: string;
  message?: string;
}

export interface DisplayPushMetronomePayload {
  sessionId: string;
  bpm: number;
  beatsPerMeasure?: number;
  label?: string;
}

export interface DisplayStudentReactionPayload {
  sessionId: string;
}

/** Broadcast to the whole room when the active block or display mode changes */
export interface DisplayScreenUpdatedPayload {
  sessionId: string;
  // Content block mode
  activeBlockIndex: number | null;
  block: ContentBlockContract | null;
  // Special mode (timer / pause / metronome / idle)
  displayMode: DisplayMode;
  displayState: DisplayModeState | null;
}

export interface DisplaySessionJoinedPayload {
  sessionId: string;
  /** How many display-role clients are currently in the room */
  displayCount: number;
}

export interface DisplaySessionClosedPayload {
  sessionId: string;
}
