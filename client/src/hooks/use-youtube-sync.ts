/**
 * useYouTubeSync
 *
 * Bridges the YouTube IFrame Player API with Socket.IO sync events.
 * Used by SyncedYouTubePlayer on both the teacher (controller) side and
 * the display screen (receiver) side.
 *
 * Loop prevention: when applying a remote command we set isApplyingRemote=true
 * for 750ms so that the resulting player state change does NOT echo back.
 *
 * Seek rate limiting: only emits a seek event if the position differs by
 * >2 seconds from the last emitted position, and at most once per 300ms.
 */

import { useEffect, useRef, useCallback } from "react";
import { DISPLAY_EVENTS } from "@shared/display-events";
import type { DisplayYtSyncPayload, DisplayEventName } from "@shared/display-events";

interface YTPlayer {
  playVideo(): void;
  pauseVideo(): void;
  seekTo(seconds: number, allowSeekAhead?: boolean): void;
  setPlaybackRate(rate: number): void;
  getCurrentTime(): number;
  getPlayerState(): number;
  destroy(): void;
}

export const YT_PLAYER_STATE = {
  UNSTARTED: -1,
  ENDED: 0,
  PLAYING: 1,
  PAUSED: 2,
  BUFFERING: 3,
  CUED: 5,
} as const;

interface UseYouTubeSyncOptions {
  videoId: string;
  role: "teacher" | "display";
  onEmit: (eventName: DisplayEventName, payload: Omit<DisplayYtSyncPayload, "sessionId">) => void;
  incomingEvent: { eventName: DisplayEventName; payload: DisplayYtSyncPayload } | null;
  onIncomingConsumed: () => void;
}

export function useYouTubeSync(
  playerRef: React.RefObject<YTPlayer | null>,
  options: UseYouTubeSyncOptions
) {
  const { videoId, role, onEmit, incomingEvent, onIncomingConsumed } = options;

  const isApplyingRemoteRef = useRef(false);
  const applyingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastEmitTimeRef = useRef(0);
  const lastEmitPositionRef = useRef(-1);

  // Apply incoming remote events to the player
  useEffect(() => {
    if (!incomingEvent || !playerRef.current) return;

    const { eventName, payload } = incomingEvent;

    // Mark that we are applying a remote command so we don't echo it back
    isApplyingRemoteRef.current = true;
    if (applyingTimerRef.current) clearTimeout(applyingTimerRef.current);
    applyingTimerRef.current = setTimeout(() => {
      isApplyingRemoteRef.current = false;
    }, 750);

    try {
      if (eventName === DISPLAY_EVENTS.YT_PLAY) {
        playerRef.current.seekTo(payload.currentTime, true);
        playerRef.current.playVideo();
      } else if (eventName === DISPLAY_EVENTS.YT_PAUSE) {
        playerRef.current.seekTo(payload.currentTime, true);
        playerRef.current.pauseVideo();
      } else if (eventName === DISPLAY_EVENTS.YT_SEEK) {
        playerRef.current.seekTo(payload.currentTime, true);
      } else if (eventName === DISPLAY_EVENTS.YT_RATE && payload.rate !== undefined) {
        playerRef.current.setPlaybackRate(payload.rate);
      }
    } catch (e) {
      console.warn("[useYouTubeSync] Failed to apply remote command:", e);
    }

    onIncomingConsumed();
  }, [incomingEvent, playerRef, onIncomingConsumed]);

  // Teacher-side emit helpers — should be called from player state change callbacks
  const emitPlay = useCallback(() => {
    if (role !== "teacher" || isApplyingRemoteRef.current || !playerRef.current) return;
    const currentTime = playerRef.current.getCurrentTime();
    onEmit(DISPLAY_EVENTS.YT_PLAY, { videoId, currentTime });
  }, [role, videoId, onEmit, playerRef]);

  const emitPause = useCallback(() => {
    if (role !== "teacher" || isApplyingRemoteRef.current || !playerRef.current) return;
    const currentTime = playerRef.current.getCurrentTime();
    onEmit(DISPLAY_EVENTS.YT_PAUSE, { videoId, currentTime });
  }, [role, videoId, onEmit, playerRef]);

  const emitSeek = useCallback(
    (newTime: number) => {
      if (role !== "teacher" || isApplyingRemoteRef.current) return;

      const now = Date.now();
      const timeSinceLast = now - lastEmitTimeRef.current;
      const positionDelta = Math.abs(newTime - lastEmitPositionRef.current);

      // Rate limit: max once per 300ms AND only if position changed >2s
      if (timeSinceLast < 300 || positionDelta < 2) return;

      lastEmitTimeRef.current = now;
      lastEmitPositionRef.current = newTime;
      onEmit(DISPLAY_EVENTS.YT_SEEK, { videoId, currentTime: newTime });
    },
    [role, videoId, onEmit]
  );

  const emitRate = useCallback(
    (rate: number) => {
      if (role !== "teacher" || isApplyingRemoteRef.current) return;
      onEmit(DISPLAY_EVENTS.YT_RATE, { videoId, currentTime: 0, rate });
    },
    [role, videoId, onEmit]
  );

  // Cleanup
  useEffect(() => {
    return () => {
      if (applyingTimerRef.current) clearTimeout(applyingTimerRef.current);
    };
  }, []);

  return { emitPlay, emitPause, emitSeek, emitRate };
}
