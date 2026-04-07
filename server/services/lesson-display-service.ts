/**
 * LessonDisplayService
 *
 * Manages real-time "second screen" display sessions between a teacher (controller)
 * and a student display screen (receiver). Each session has its own Socket.IO room
 * `display-session:{sessionId}` and lives independently from the school-wide RealtimeBus.
 *
 * The service is attached to the Socket.IO server via RealtimeBus.setLessonDisplayService()
 * and is called once per socket connection inside setupConnectionHandlers.
 */

import { Server as SocketIOServer, Socket } from "socket.io";
import { randomUUID } from "crypto";
import { db } from "../db";
import { and, eq } from "drizzle-orm";
import { lessonDisplaySessions, lessonDisplayEvents } from "@shared/schema";
import { DISPLAY_EVENTS } from "@shared/display-events";
import type {
  LessonDisplaySession,
  InsertLessonDisplaySession,
} from "@shared/schema";
import type {
  DisplayMode,
  DisplayModeState,
  DisplaySessionOpenPayload,
  DisplaySessionClosePayload,
  DisplayPushBlockPayload,
  DisplayClearScreenPayload,
  DisplayYtSyncPayload,
  DisplayScreenUpdatedPayload,
  DisplaySessionJoinedPayload,
  DisplaySessionClosedPayload,
  DisplayPushTimerPayload,
  DisplayPushPausePayload,
  DisplayPushMetronomePayload,
  DisplayStudentReactionPayload,
} from "@shared/display-events";

interface AuthenticatedSocket extends Socket {
  user?: {
    id: number;
    username: string;
    role: string;
    schoolId?: number;
  };
}

const TEACHER_ROLES = new Set(["teacher", "school_owner", "platform_owner"]);
const DISPLAY_ROOM = (sessionId: string) => `display-session:${sessionId}`;

export class LessonDisplayService {
  private io: SocketIOServer;
  // Track which session each display-role socket is in (socketId → sessionId)
  private displaySockets = new Map<string, string>();

  constructor(io: SocketIOServer) {
    this.io = io;
  }

  // ---------------------------------------------------------------------------
  // REST-facing methods (called from route handlers)
  // ---------------------------------------------------------------------------

  async createSession(
    teacherId: number,
    lessonId: number,
    schoolId: number
  ): Promise<LessonDisplaySession> {
    // Close any existing active session for this teacher to avoid orphans
    await db
      .update(lessonDisplaySessions)
      .set({ status: "closed", closedAt: new Date() })
      .where(
        and(
          eq(lessonDisplaySessions.teacherId, teacherId),
          eq(lessonDisplaySessions.status, "active")
        )
      );

    const id = randomUUID();
    const expiresAt = new Date(Date.now() + 4 * 60 * 60 * 1000); // 4 hours

    const [session] = await db
      .insert(lessonDisplaySessions)
      .values({ id, lessonId, teacherId, schoolId, expiresAt } satisfies InsertLessonDisplaySession)
      .returning();

    return session;
  }

  async getSession(sessionId: string): Promise<LessonDisplaySession | undefined> {
    const [session] = await db
      .select()
      .from(lessonDisplaySessions)
      .where(eq(lessonDisplaySessions.id, sessionId));

    if (!session) return undefined;

    // Auto-close expired sessions on access
    if (session.status === "active" && session.expiresAt && session.expiresAt < new Date()) {
      await db
        .update(lessonDisplaySessions)
        .set({ status: "closed", closedAt: new Date() })
        .where(eq(lessonDisplaySessions.id, sessionId));

      const payload: DisplaySessionClosedPayload = { sessionId };
      this.io.to(DISPLAY_ROOM(sessionId)).emit(DISPLAY_EVENTS.SESSION_CLOSED, payload);

      return { ...session, status: "closed" };
    }

    return session;
  }

  async closeSession(sessionId: string, teacherId: number): Promise<boolean> {
    const result = await db
      .update(lessonDisplaySessions)
      .set({ status: "closed", closedAt: new Date() })
      .where(eq(lessonDisplaySessions.id, sessionId))
      .returning();

    if (result.length === 0) return false;

    const payload: DisplaySessionClosedPayload = { sessionId };
    this.io
      .to(DISPLAY_ROOM(sessionId))
      .emit(DISPLAY_EVENTS.SESSION_CLOSED, payload);

    return true;
  }

  // ---------------------------------------------------------------------------
  // Socket attachment — called once per connected socket
  // ---------------------------------------------------------------------------

  attachToSocket(socket: AuthenticatedSocket): void {
    socket.on(DISPLAY_EVENTS.SESSION_OPEN, (data: DisplaySessionOpenPayload) => {
      this.handleSessionOpen(socket, data).catch(console.error);
    });

    socket.on(DISPLAY_EVENTS.SESSION_CLOSE, (data: DisplaySessionClosePayload) => {
      this.handleSessionClose(socket, data).catch(console.error);
    });

    socket.on(DISPLAY_EVENTS.PUSH_BLOCK, (data: DisplayPushBlockPayload) => {
      this.handlePushBlock(socket, data).catch(console.error);
    });

    socket.on(DISPLAY_EVENTS.CLEAR_SCREEN, (data: DisplayClearScreenPayload) => {
      this.handleClearScreen(socket, data).catch(console.error);
    });

    socket.on(DISPLAY_EVENTS.PUSH_TIMER, (data: DisplayPushTimerPayload) => {
      this.handlePushTimer(socket, data).catch(console.error);
    });

    socket.on(DISPLAY_EVENTS.PUSH_PAUSE, (data: DisplayPushPausePayload) => {
      this.handlePushPause(socket, data).catch(console.error);
    });

    socket.on(DISPLAY_EVENTS.PUSH_METRONOME, (data: DisplayPushMetronomePayload) => {
      this.handlePushMetronome(socket, data).catch(console.error);
    });

    socket.on(DISPLAY_EVENTS.STUDENT_REACTION, (data: DisplayStudentReactionPayload) => {
      this.handleStudentReaction(socket, data).catch(console.error);
    });

    // YouTube sync events are bidirectional relays — no DB write needed
    for (const ytEvent of [
      DISPLAY_EVENTS.YT_PLAY,
      DISPLAY_EVENTS.YT_PAUSE,
      DISPLAY_EVENTS.YT_SEEK,
      DISPLAY_EVENTS.YT_RATE,
    ] as const) {
      socket.on(ytEvent, (data: DisplayYtSyncPayload) => {
        this.handleYtSync(socket, ytEvent, data);
      });
    }

    // Clean up on disconnect
    socket.on("disconnect", () => {
      if (TEACHER_ROLES.has(socket.user?.role ?? "")) {
        this.handleTeacherDisconnect(socket).catch(console.error);
      }
      const sessionId = this.displaySockets.get(socket.id);
      if (sessionId) {
        this.displaySockets.delete(socket.id);
        const displayCount = this.countDisplayClients(sessionId);
        this.io
          .to(DISPLAY_ROOM(sessionId))
          .emit(DISPLAY_EVENTS.SESSION_LEFT, { sessionId, displayCount });
      }
    });
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private buildScreenUpdated(
    sessionId: string,
    session: Partial<LessonDisplaySession> & { displayMode?: string; displayState?: unknown; activeBlockIndex?: number | null },
    block: import("@shared/display-events").ContentBlockContract | null
  ): DisplayScreenUpdatedPayload {
    return {
      sessionId,
      activeBlockIndex: session.activeBlockIndex ?? null,
      block,
      displayMode: (session.displayMode ?? "idle") as DisplayMode,
      displayState: (session.displayState as DisplayModeState | null) ?? null,
    };
  }

  private async logEvent(
    sessionId: string,
    eventType: string,
    payload: Record<string, unknown>
  ): Promise<void> {
    try {
      await db
        .insert(lessonDisplayEvents)
        .values({ sessionId, eventType, payload });
    } catch (err) {
      console.warn("[Display] Failed to log event:", err);
    }
  }

  // ---------------------------------------------------------------------------
  // Private handlers
  // ---------------------------------------------------------------------------

  private async handleSessionOpen(
    socket: AuthenticatedSocket,
    data: DisplaySessionOpenPayload
  ) {
    const { sessionId, role } = data;
    if (!sessionId) return;

    const session = await this.getSession(sessionId);
    if (!session || session.status !== "active") {
      socket.emit("error", { message: "Display session not found or closed" });
      return;
    }

    // Authorization: teacher must own the session; display clients just need same school
    if (role === "teacher") {
      if (session.teacherId !== socket.user!.id) {
        socket.emit("error", { message: "Not authorized for this display session" });
        return;
      }
    } else {
      if (
        socket.user!.role !== "platform_owner" &&
        session.schoolId !== socket.user!.schoolId
      ) {
        socket.emit("error", { message: "Not authorized for this display session" });
        return;
      }
    }

    await socket.join(DISPLAY_ROOM(sessionId));
    console.log(
      `[Display] ${socket.user!.username} (${role}) joined session ${sessionId}`
    );

    if (role === "display") {
      this.displaySockets.set(socket.id, sessionId);

      const displayCount = this.countDisplayClients(sessionId);
      const payload: DisplaySessionJoinedPayload = { sessionId, displayCount };
      this.io.to(DISPLAY_ROOM(sessionId)).emit(DISPLAY_EVENTS.SESSION_JOINED, payload);
    }
  }

  private countDisplayClients(sessionId: string): number {
    let count = 0;
    for (const [, sid] of this.displaySockets) {
      if (sid === sessionId) count++;
    }
    return count;
  }

  private async handleSessionClose(
    socket: AuthenticatedSocket,
    data: DisplaySessionClosePayload
  ) {
    if (!TEACHER_ROLES.has(socket.user?.role ?? "")) {
      socket.emit("error", { message: "Only teachers can close display sessions" });
      return;
    }
    await this.closeSession(data.sessionId, socket.user!.id);
  }

  private async handlePushBlock(
    socket: AuthenticatedSocket,
    data: DisplayPushBlockPayload
  ) {
    if (!TEACHER_ROLES.has(socket.user?.role ?? "")) {
      socket.emit("error", { message: "Only teachers can push to display screens" });
      return;
    }

    const { sessionId, blockIndex, block } = data;

    await db
      .update(lessonDisplaySessions)
      .set({ activeBlockIndex: blockIndex, displayMode: "block", displayState: null })
      .where(eq(lessonDisplaySessions.id, sessionId));

    await this.logEvent(sessionId, "push_block", { blockIndex, blockType: block.type });

    const payload: DisplayScreenUpdatedPayload = {
      sessionId,
      activeBlockIndex: blockIndex,
      block,
      displayMode: "block",
      displayState: null,
    };
    this.io.to(DISPLAY_ROOM(sessionId)).emit(DISPLAY_EVENTS.SCREEN_UPDATED, payload);
  }

  private async handleClearScreen(
    socket: AuthenticatedSocket,
    data: DisplayClearScreenPayload
  ) {
    if (!TEACHER_ROLES.has(socket.user?.role ?? "")) return;

    const { sessionId } = data;
    await db
      .update(lessonDisplaySessions)
      .set({ activeBlockIndex: null, displayMode: "idle", displayState: null })
      .where(eq(lessonDisplaySessions.id, sessionId));

    await this.logEvent(sessionId, "clear_screen", {});

    const payload: DisplayScreenUpdatedPayload = {
      sessionId,
      activeBlockIndex: null,
      block: null,
      displayMode: "idle",
      displayState: null,
    };
    this.io.to(DISPLAY_ROOM(sessionId)).emit(DISPLAY_EVENTS.SCREEN_UPDATED, payload);
  }

  private async handlePushTimer(
    socket: AuthenticatedSocket,
    data: DisplayPushTimerPayload
  ) {
    if (!TEACHER_ROLES.has(socket.user?.role ?? "")) {
      socket.emit("error", { message: "Only teachers can push to display screens" });
      return;
    }

    const { sessionId, seconds, label } = data;
    const startedAt = new Date().toISOString();
    const displayState = { seconds, label, startedAt };

    await db
      .update(lessonDisplaySessions)
      .set({ activeBlockIndex: null, displayMode: "timer", displayState })
      .where(eq(lessonDisplaySessions.id, sessionId));

    await this.logEvent(sessionId, "push_timer", { seconds, label });

    const payload: DisplayScreenUpdatedPayload = {
      sessionId,
      activeBlockIndex: null,
      block: null,
      displayMode: "timer",
      displayState,
    };
    this.io.to(DISPLAY_ROOM(sessionId)).emit(DISPLAY_EVENTS.SCREEN_UPDATED, payload);
  }

  private async handlePushPause(
    socket: AuthenticatedSocket,
    data: DisplayPushPausePayload
  ) {
    if (!TEACHER_ROLES.has(socket.user?.role ?? "")) {
      socket.emit("error", { message: "Only teachers can push to display screens" });
      return;
    }

    const { sessionId, message } = data;
    const displayState = { message: message ?? "" };

    await db
      .update(lessonDisplaySessions)
      .set({ activeBlockIndex: null, displayMode: "pause", displayState })
      .where(eq(lessonDisplaySessions.id, sessionId));

    await this.logEvent(sessionId, "push_pause", { message });

    const payload: DisplayScreenUpdatedPayload = {
      sessionId,
      activeBlockIndex: null,
      block: null,
      displayMode: "pause",
      displayState,
    };
    this.io.to(DISPLAY_ROOM(sessionId)).emit(DISPLAY_EVENTS.SCREEN_UPDATED, payload);
  }

  private async handlePushMetronome(
    socket: AuthenticatedSocket,
    data: DisplayPushMetronomePayload
  ) {
    if (!TEACHER_ROLES.has(socket.user?.role ?? "")) {
      socket.emit("error", { message: "Only teachers can push to display screens" });
      return;
    }

    const { sessionId, bpm, beatsPerMeasure = 4, label } = data;
    const displayState = { bpm, beatsPerMeasure, label };

    await db
      .update(lessonDisplaySessions)
      .set({ activeBlockIndex: null, displayMode: "metronome", displayState })
      .where(eq(lessonDisplaySessions.id, sessionId));

    await this.logEvent(sessionId, "push_metronome", { bpm, beatsPerMeasure, label });

    const payload: DisplayScreenUpdatedPayload = {
      sessionId,
      activeBlockIndex: null,
      block: null,
      displayMode: "metronome",
      displayState,
    };
    this.io.to(DISPLAY_ROOM(sessionId)).emit(DISPLAY_EVENTS.SCREEN_UPDATED, payload);
  }

  private async handleStudentReaction(
    socket: AuthenticatedSocket,
    data: DisplayStudentReactionPayload
  ) {
    const { sessionId } = data;
    if (!sessionId) return;

    await this.logEvent(sessionId, "student_reaction", {
      socketId: socket.id,
    });

    // Relay to everyone in the room — teacher will show a notification
    socket.to(DISPLAY_ROOM(sessionId)).emit(DISPLAY_EVENTS.STUDENT_REACTION, data);
  }

  private handleYtSync(
    socket: AuthenticatedSocket,
    eventName: string,
    data: DisplayYtSyncPayload
  ) {
    const { sessionId } = data;
    if (!sessionId) return;
    socket.to(DISPLAY_ROOM(sessionId)).emit(eventName, data);
  }

  private async handleTeacherDisconnect(socket: AuthenticatedSocket) {
    const activeSessions = await db
      .select()
      .from(lessonDisplaySessions)
      .where(eq(lessonDisplaySessions.teacherId, socket.user!.id));

    for (const session of activeSessions) {
      if (session.status === "active") {
        await this.closeSession(session.id, socket.user!.id);
      }
    }
  }
}
