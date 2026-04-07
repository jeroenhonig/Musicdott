/**
 * SyncedYouTubePlayer
 *
 * YouTube player that syncs play/pause/seek between the teacher (controller)
 * and the display screen (receiver) via Socket.IO events.
 *
 * Uses the YouTube IFrame Player API directly — no extra npm dependency.
 * The API script is loaded once via a module-level singleton.
 */

import { useEffect, useRef, useCallback } from "react";
import { useYouTubeSync, YT_PLAYER_STATE } from "@/hooks/use-youtube-sync";
import type { DisplayEventName, DisplayYtSyncPayload } from "@shared/display-events";

// ---------------------------------------------------------------------------
// YouTube IFrame API loader (module-level singleton, loads once per page)
// ---------------------------------------------------------------------------

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: (() => void) | undefined;
  }
}

type YTReadyCallback = () => void;
const ytReadyCallbacks: YTReadyCallback[] = [];
let ytApiLoaded = false;
let ytApiLoading = false;

function loadYouTubeAPI(onReady: YTReadyCallback) {
  if (ytApiLoaded) {
    onReady();
    return;
  }
  ytReadyCallbacks.push(onReady);
  if (ytApiLoading) return;
  ytApiLoading = true;

  window.onYouTubeIframeAPIReady = () => {
    ytApiLoaded = true;
    ytReadyCallbacks.forEach((cb) => cb());
    ytReadyCallbacks.length = 0;
  };

  const tag = document.createElement("script");
  tag.src = "https://www.youtube.com/iframe_api";
  document.head.appendChild(tag);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface SyncedYouTubePlayerProps {
  videoId: string;
  role: "teacher" | "display";
  onEmit: (eventName: DisplayEventName, payload: Omit<DisplayYtSyncPayload, "sessionId">) => void;
  incomingEvent: { eventName: DisplayEventName; payload: DisplayYtSyncPayload } | null;
  onIncomingConsumed: () => void;
  className?: string;
}

export default function SyncedYouTubePlayer({
  videoId,
  role,
  onEmit,
  incomingEvent,
  onIncomingConsumed,
  className,
}: SyncedYouTubePlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);
  const playerReadyRef = useRef(false);

  const { emitPlay, emitPause, emitSeek } = useYouTubeSync(playerRef, {
    videoId,
    role,
    onEmit,
    incomingEvent,
    onIncomingConsumed,
  });

  const initPlayer = useCallback(() => {
    if (!containerRef.current || !window.YT?.Player) return;

    // Destroy existing player if videoId changed
    if (playerRef.current) {
      playerRef.current.destroy();
      playerRef.current = null;
      playerReadyRef.current = false;
    }

    playerRef.current = new window.YT.Player(containerRef.current, {
      height: "100%",
      width: "100%",
      videoId,
      playerVars: {
        enablejsapi: 1,
        origin: window.location.origin,
        rel: 0,
      },
      events: {
        onReady: () => {
          playerReadyRef.current = true;
        },
        onStateChange: (event: { data: number }) => {
          if (!playerReadyRef.current) return;

          if (event.data === YT_PLAYER_STATE.PLAYING) {
            emitPlay();
          } else if (event.data === YT_PLAYER_STATE.PAUSED) {
            emitPause();
          }
        },
      },
    });
  }, [videoId, emitPlay, emitPause]);

  useEffect(() => {
    loadYouTubeAPI(initPlayer);
  }, [initPlayer]);

  // Reinitialize when videoId changes
  useEffect(() => {
    if (ytApiLoaded && playerReadyRef.current) {
      initPlayer();
    }
  }, [videoId, initPlayer]);

  // Cleanup
  useEffect(() => {
    return () => {
      playerRef.current?.destroy();
      playerRef.current = null;
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ minHeight: 240 }}
    />
  );
}
