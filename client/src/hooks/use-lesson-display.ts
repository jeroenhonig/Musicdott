/**
 * useLessonDisplay
 *
 * Display-screen-side hook for the lesson display screen (lesscherm) feature.
 * Fetches initial session state (for reload recovery), connects to the Socket.IO
 * session room, and returns the currently active block + display mode + YouTube sync events.
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { useQuery } from "@tanstack/react-query";
import { DISPLAY_EVENTS } from "@shared/display-events";
import type {
  ContentBlockContract,
  DisplayMode,
  DisplayModeState,
  DisplayScreenUpdatedPayload,
  DisplayYtSyncPayload,
  DisplayEventName,
} from "@shared/display-events";

interface SessionData {
  session: {
    id: string;
    lessonId: number;
    teacherId: number;
    schoolId: number;
    activeBlockIndex: number | null;
    status: string;
    displayMode: string;
    displayState: Record<string, unknown> | null;
  };
  lesson: { id: number; title: string; description: string | null } | null;
  contentBlocks: ContentBlockContract[];
  activeBlock: ContentBlockContract | null;
  displayMode: DisplayMode;
  displayState: DisplayModeState | null;
}

export interface UseLessonDisplayReturn {
  isLoading: boolean;
  isSessionActive: boolean;
  sessionClosed: boolean;
  lesson: SessionData["lesson"];
  activeBlock: ContentBlockContract | null;
  displayMode: DisplayMode;
  displayState: DisplayModeState | null;
  ytSyncEvent: { eventName: DisplayEventName; payload: DisplayYtSyncPayload } | null;
  clearYtSyncEvent: () => void;
  emitYtSync: (eventName: DisplayEventName, payload: Omit<DisplayYtSyncPayload, "sessionId">) => void;
  emitStudentReaction: () => void;
}

export function useLessonDisplay(sessionId: string): UseLessonDisplayReturn {
  const [activeBlock, setActiveBlock] = useState<ContentBlockContract | null>(null);
  const [displayMode, setDisplayMode] = useState<DisplayMode>("idle");
  const [displayState, setDisplayState] = useState<DisplayModeState | null>(null);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [sessionClosed, setSessionClosed] = useState(false);
  const [ytSyncEvent, setYtSyncEvent] = useState<{
    eventName: DisplayEventName;
    payload: DisplayYtSyncPayload;
  } | null>(null);

  const socketRef = useRef<Socket | null>(null);

  // Fetch initial session state (reload recovery)
  const { data: sessionData, isLoading } = useQuery<SessionData>({
    queryKey: [`/api/lesson-display/sessions/${sessionId}`],
    enabled: !!sessionId,
    retry: false,
  });

  // Apply initial state from REST when it loads
  useEffect(() => {
    if (sessionData) {
      if (sessionData.session.status === "active") {
        setIsSessionActive(true);
        setActiveBlock(sessionData.activeBlock);
        setDisplayMode((sessionData.displayMode ?? "idle") as DisplayMode);
        setDisplayState(sessionData.displayState ?? null);
      } else {
        setSessionClosed(true);
      }
    }
  }, [sessionData]);

  // Connect to Socket.IO display room
  useEffect(() => {
    if (!sessionId) return;

    const socket = io({
      path: "/ws",
      transports: ["websocket", "polling"],
      withCredentials: true,
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      socket.emit(DISPLAY_EVENTS.SESSION_OPEN, { sessionId, role: "display" });
    });

    socket.on(DISPLAY_EVENTS.SCREEN_UPDATED, (payload: DisplayScreenUpdatedPayload) => {
      setActiveBlock(payload.block);
      setDisplayMode(payload.displayMode ?? "idle");
      setDisplayState(payload.displayState ?? null);
    });

    socket.on(DISPLAY_EVENTS.SESSION_CLOSED, () => {
      setIsSessionActive(false);
      setSessionClosed(true);
    });

    // YouTube sync relay events
    for (const ytEvent of [
      DISPLAY_EVENTS.YT_PLAY,
      DISPLAY_EVENTS.YT_PAUSE,
      DISPLAY_EVENTS.YT_SEEK,
      DISPLAY_EVENTS.YT_RATE,
    ] as DisplayEventName[]) {
      socket.on(ytEvent, (payload: DisplayYtSyncPayload) => {
        setYtSyncEvent({ eventName: ytEvent, payload });
      });
    }

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [sessionId]);

  const clearYtSyncEvent = useCallback(() => {
    setYtSyncEvent(null);
  }, []);

  const emitYtSync = useCallback(
    (eventName: DisplayEventName, payload: Omit<DisplayYtSyncPayload, "sessionId">) => {
      if (!socketRef.current?.connected) return;
      socketRef.current.emit(eventName, { ...payload, sessionId });
    },
    [sessionId]
  );

  const emitStudentReaction = useCallback(() => {
    if (!socketRef.current?.connected) return;
    socketRef.current.emit(DISPLAY_EVENTS.STUDENT_REACTION, { sessionId });
  }, [sessionId]);

  return {
    isLoading,
    isSessionActive,
    sessionClosed,
    lesson: sessionData?.lesson ?? null,
    activeBlock,
    displayMode,
    displayState,
    ytSyncEvent,
    clearYtSyncEvent,
    emitYtSync,
    emitStudentReaction,
  };
}
