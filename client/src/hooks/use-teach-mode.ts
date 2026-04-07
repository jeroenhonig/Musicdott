/**
 * useTeachMode
 *
 * Teacher-side hook for the lesson display screen (lesscherm) feature.
 * Creates a display session via REST, opens the student display window,
 * and manages the Socket.IO connection to the session room.
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { apiRequest } from "@/lib/queryClient";
import { DISPLAY_EVENTS } from "@shared/display-events";
import type {
  ContentBlockContract,
  DisplayYtSyncPayload,
  DisplaySessionJoinedPayload,
  DisplayEventName,
  DisplayPushTimerPayload,
  DisplayPushPausePayload,
  DisplayPushMetronomePayload,
  DisplayStudentReactionPayload,
} from "@shared/display-events";

// Re-export the ContentBlockContract so teach-panel can use it from here
export type { ContentBlockContract };

export interface UseTeachModeReturn {
  sessionId: string | null;
  isSessionOpen: boolean;
  displayCount: number;
  studentReactionCount: number;
  openSession: (lessonId: number) => Promise<void>;
  closeSession: () => Promise<void>;
  pushBlock: (blockIndex: number, block: ContentBlockContract) => void;
  clearScreen: () => void;
  pushTimer: (seconds: number, label?: string) => void;
  pushPause: (message?: string) => void;
  pushMetronome: (bpm: number, beatsPerMeasure?: number, label?: string) => void;
  emitYtSync: (eventName: DisplayEventName, payload: Omit<DisplayYtSyncPayload, "sessionId">) => void;
}

export function useTeachMode(): UseTeachModeReturn {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isSessionOpen, setIsSessionOpen] = useState(false);
  const [displayCount, setDisplayCount] = useState(0);
  const [studentReactionCount, setStudentReactionCount] = useState(0);

  const socketRef = useRef<Socket | null>(null);
  const sessionIdRef = useRef<string | null>(null);

  // Keep ref in sync with state for use in socket callbacks
  useEffect(() => {
    sessionIdRef.current = sessionId;
  }, [sessionId]);

  const connectSocket = useCallback((sid: string) => {
    if (socketRef.current) {
      socketRef.current.disconnect();
    }

    const socket = io({
      path: "/ws",
      transports: ["websocket", "polling"],
      withCredentials: true,
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      socket.emit(DISPLAY_EVENTS.SESSION_OPEN, { sessionId: sid, role: "teacher" });
    });

    socket.on(DISPLAY_EVENTS.SESSION_JOINED, (payload: DisplaySessionJoinedPayload) => {
      setDisplayCount(payload.displayCount);
    });

    socket.on(DISPLAY_EVENTS.SESSION_LEFT, (payload: { sessionId: string; displayCount: number }) => {
      setDisplayCount(payload.displayCount);
    });

    socket.on(DISPLAY_EVENTS.SESSION_CLOSED, () => {
      setIsSessionOpen(false);
      setDisplayCount(0);
    });

    socket.on(DISPLAY_EVENTS.STUDENT_REACTION, (_payload: DisplayStudentReactionPayload) => {
      setStudentReactionCount((n) => n + 1);
    });

    socket.on("disconnect", () => {
      setDisplayCount(0);
    });
  }, []);

  const openSession = useCallback(async (lessonId: number) => {
    const res = await apiRequest("POST", "/api/lesson-display/sessions", { lessonId });
    const { sessionId: sid, displayUrl } = await res.json() as { sessionId: string; displayUrl: string };

    setSessionId(sid);
    setIsSessionOpen(true);
    setStudentReactionCount(0);

    connectSocket(sid);

    window.open(displayUrl, "lessonDisplay", "noopener,width=1280,height=800");
  }, [connectSocket]);

  const closeSession = useCallback(async () => {
    const sid = sessionIdRef.current;
    if (!sid) return;

    socketRef.current?.emit(DISPLAY_EVENTS.SESSION_CLOSE, { sessionId: sid });

    try {
      await apiRequest("DELETE", `/api/lesson-display/sessions/${sid}`);
    } catch {
      // Best-effort cleanup
    }

    socketRef.current?.disconnect();
    socketRef.current = null;
    setSessionId(null);
    setIsSessionOpen(false);
    setDisplayCount(0);
    setStudentReactionCount(0);
  }, []);

  const pushBlock = useCallback((blockIndex: number, block: ContentBlockContract) => {
    const sid = sessionIdRef.current;
    if (!sid || !socketRef.current?.connected) return;

    socketRef.current.emit(DISPLAY_EVENTS.PUSH_BLOCK, {
      sessionId: sid,
      blockIndex,
      block,
    });
  }, []);

  const clearScreen = useCallback(() => {
    const sid = sessionIdRef.current;
    if (!sid || !socketRef.current?.connected) return;

    socketRef.current.emit(DISPLAY_EVENTS.CLEAR_SCREEN, { sessionId: sid });
  }, []);

  const pushTimer = useCallback((seconds: number, label?: string) => {
    const sid = sessionIdRef.current;
    if (!sid || !socketRef.current?.connected) return;

    const payload: Omit<DisplayPushTimerPayload, never> = { sessionId: sid, seconds, label };
    socketRef.current.emit(DISPLAY_EVENTS.PUSH_TIMER, payload);
  }, []);

  const pushPause = useCallback((message?: string) => {
    const sid = sessionIdRef.current;
    if (!sid || !socketRef.current?.connected) return;

    const payload: DisplayPushPausePayload = { sessionId: sid, message };
    socketRef.current.emit(DISPLAY_EVENTS.PUSH_PAUSE, payload);
  }, []);

  const pushMetronome = useCallback((bpm: number, beatsPerMeasure = 4, label?: string) => {
    const sid = sessionIdRef.current;
    if (!sid || !socketRef.current?.connected) return;

    const payload: DisplayPushMetronomePayload = { sessionId: sid, bpm, beatsPerMeasure, label };
    socketRef.current.emit(DISPLAY_EVENTS.PUSH_METRONOME, payload);
  }, []);

  const emitYtSync = useCallback(
    (eventName: DisplayEventName, payload: Omit<DisplayYtSyncPayload, "sessionId">) => {
      const sid = sessionIdRef.current;
      if (!sid || !socketRef.current?.connected) return;

      socketRef.current.emit(eventName, { ...payload, sessionId: sid });
    },
    []
  );

  // Clean up on unmount
  useEffect(() => {
    return () => {
      const sid = sessionIdRef.current;
      if (sid && socketRef.current?.connected) {
        socketRef.current.emit(DISPLAY_EVENTS.SESSION_CLOSE, { sessionId: sid });
      }
      socketRef.current?.disconnect();
    };
  }, []);

  return {
    sessionId,
    isSessionOpen,
    displayCount,
    studentReactionCount,
    openSession,
    closeSession,
    pushBlock,
    clearScreen,
    pushTimer,
    pushPause,
    pushMetronome,
    emitYtSync,
  };
}
