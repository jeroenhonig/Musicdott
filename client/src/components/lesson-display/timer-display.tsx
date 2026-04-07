/**
 * TimerDisplay
 *
 * Full-screen countdown timer for the student display screen.
 * Calculates remaining seconds from `startedAt` so it survives page reloads.
 */

import { useEffect, useState } from "react";
import type { TimerDisplayState } from "@shared/display-events";

interface TimerDisplayProps {
  state: TimerDisplayState;
}

function calcRemaining(state: TimerDisplayState): number {
  const elapsed = (Date.now() - Date.parse(state.startedAt)) / 1000;
  return Math.max(0, state.seconds - elapsed);
}

function formatTime(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = Math.floor(totalSeconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function TimerDisplay({ state }: TimerDisplayProps) {
  const [remaining, setRemaining] = useState(() => calcRemaining(state));
  const isDone = remaining === 0;

  // Recalculate when state changes (new timer pushed)
  useEffect(() => {
    setRemaining(calcRemaining(state));
  }, [state]);

  useEffect(() => {
    if (isDone) return;

    const interval = setInterval(() => {
      const r = calcRemaining(state);
      setRemaining(r);
      if (r === 0) clearInterval(interval);
    }, 250);

    return () => clearInterval(interval);
  }, [state, isDone]);

  const total = state.seconds;
  const progress = total > 0 ? remaining / total : 0;

  // Color shifts red in the last 20%
  const isWarning = progress < 0.2;

  return (
    <div className="flex flex-col items-center justify-center w-full h-full select-none">
      {state.label && (
        <p className="text-gray-400 text-xl mb-8 tracking-wide">{state.label}</p>
      )}

      {/* Circular progress ring */}
      <div className="relative flex items-center justify-center mb-8" style={{ width: 280, height: 280 }}>
        <svg
          width="280"
          height="280"
          className="absolute inset-0 -rotate-90"
          viewBox="0 0 280 280"
        >
          {/* Background ring */}
          <circle cx="140" cy="140" r="120" fill="none" stroke="#1f2937" strokeWidth="12" />
          {/* Progress ring */}
          <circle
            cx="140"
            cy="140"
            r="120"
            fill="none"
            stroke={isDone ? "#4b5563" : isWarning ? "#ef4444" : "#3b82f6"}
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={`${2 * Math.PI * 120}`}
            strokeDashoffset={`${2 * Math.PI * 120 * (1 - progress)}`}
            style={{ transition: "stroke-dashoffset 0.25s linear, stroke 0.5s ease" }}
          />
        </svg>

        <span
          className={`text-7xl font-mono font-bold tabular-nums ${
            isDone ? "text-gray-500" : isWarning ? "text-red-400" : "text-white"
          }`}
        >
          {formatTime(remaining)}
        </span>
      </div>

      {isDone && (
        <p className="text-gray-400 text-2xl animate-pulse">Tijd!</p>
      )}
    </div>
  );
}
