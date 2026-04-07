/**
 * Lesson Display Page — /lesson-display/:sessionId
 *
 * Read-only student display screen. No navigation, no sidebar.
 * Designed to run full-screen on the student's second monitor.
 *
 * Modes: idle | block | timer | pause | metronome
 * Student can click "Klaar" to signal the teacher without speaking.
 */

import { useParams } from "wouter";
import { useLessonDisplay } from "@/hooks/use-lesson-display";
import DisplayBlockRenderer from "@/components/lesson-display/display-block-renderer";
import TimerDisplay from "@/components/lesson-display/timer-display";
import MetronomeDisplay from "@/components/lesson-display/metronome-display";
import PauseDisplay from "@/components/lesson-display/pause-display";
import { Button } from "@/components/ui/button";
import { Hand, Tv2 } from "lucide-react";
import { useState, useCallback } from "react";
import type {
  TimerDisplayState,
  MetronomeDisplayState,
  PauseDisplayState,
} from "@shared/display-events";

export default function LessonDisplayPage() {
  const { sessionId } = useParams<{ sessionId: string }>();

  const {
    isLoading,
    isSessionActive,
    sessionClosed,
    lesson,
    activeBlock,
    displayMode,
    displayState,
    ytSyncEvent,
    clearYtSyncEvent,
    emitYtSync,
    emitStudentReaction,
  } = useLessonDisplay(sessionId ?? "");

  const [reactionSent, setReactionSent] = useState(false);

  const handleReaction = useCallback(() => {
    emitStudentReaction();
    setReactionSent(true);
    setTimeout(() => setReactionSent(false), 3000);
  }, [emitStudentReaction]);

  // Session ended by teacher
  if (sessionClosed) {
    return (
      <DisplayShell>
        <div className="flex flex-col items-center justify-center text-center">
          <Tv2 className="h-16 w-16 text-gray-600 mb-6" />
          <h1 className="text-3xl font-bold text-gray-300 mb-2">Les afgerond</h1>
          <p className="text-gray-500">De docent heeft het scherm gesloten.</p>
        </div>
      </DisplayShell>
    );
  }

  // Loading initial state
  if (isLoading || !isSessionActive) {
    return (
      <DisplayShell>
        <div className="flex flex-col items-center justify-center text-center">
          <div className="w-8 h-8 border-2 border-gray-500 border-t-white rounded-full animate-spin mb-6" />
          <p className="text-gray-400">Verbinden met lesscherm…</p>
          {lesson && (
            <p className="text-gray-500 text-sm mt-2">{lesson.title}</p>
          )}
        </div>
      </DisplayShell>
    );
  }

  return (
    <DisplayShell lessonTitle={lesson?.title}>
      <div className="w-full h-full flex items-center justify-center px-8 py-6">
        {/* Main content area */}
        <div className="w-full max-w-5xl">
          {displayMode === "block" && activeBlock ? (
            <DisplayBlockRenderer
              block={activeBlock}
              role="display"
              onEmit={emitYtSync}
              incomingYtEvent={ytSyncEvent}
              onIncomingConsumed={clearYtSyncEvent}
            />
          ) : displayMode === "timer" && displayState ? (
            <TimerDisplay state={displayState as TimerDisplayState} />
          ) : displayMode === "pause" && displayState ? (
            <PauseDisplay state={displayState as PauseDisplayState} />
          ) : displayMode === "metronome" && displayState ? (
            <MetronomeDisplay state={displayState as MetronomeDisplayState} />
          ) : (
            /* idle — waiting for teacher */
            <div className="flex flex-col items-center justify-center text-center">
              <Tv2 className="h-16 w-16 text-gray-700 mb-6" />
              <p className="text-gray-500 text-xl">Wachten op de docent…</p>
            </div>
          )}
        </div>
      </div>

      {/* Student reaction button — floating bottom-right */}
      {isSessionActive && (
        <div className="fixed bottom-6 right-6">
          <Button
            size="lg"
            onClick={handleReaction}
            disabled={reactionSent}
            className={`rounded-full shadow-2xl px-6 py-5 text-base font-semibold transition-all ${
              reactionSent
                ? "bg-green-600 hover:bg-green-600 scale-95 cursor-default"
                : "bg-gray-700 hover:bg-gray-600 active:scale-95"
            }`}
          >
            <Hand className="h-5 w-5 mr-2" />
            {reactionSent ? "Verzonden!" : "Klaar"}
          </Button>
        </div>
      )}
    </DisplayShell>
  );
}

// ---------------------------------------------------------------------------
// Shell layout — full-screen, dark, no navigation
// ---------------------------------------------------------------------------

function DisplayShell({
  children,
  lessonTitle,
}: {
  children: React.ReactNode;
  lessonTitle?: string | null;
}) {
  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      {lessonTitle && (
        <header className="px-6 py-3 border-b border-gray-800 flex-shrink-0">
          <p className="text-gray-400 text-sm font-medium">{lessonTitle}</p>
        </header>
      )}
      <main className="flex-1 flex items-center justify-center relative">{children}</main>
    </div>
  );
}
