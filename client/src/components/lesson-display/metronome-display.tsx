/**
 * MetronomeDisplay
 *
 * Full-screen visual metronome for the student display screen.
 * No audio — purely visual flash on each beat.
 * Uses requestAnimationFrame for smooth, display-rate-synced rendering.
 */

import { useEffect, useRef, useState } from "react";
import type { MetronomeDisplayState } from "@shared/display-events";

interface MetronomeDisplayProps {
  state: MetronomeDisplayState;
}

export default function MetronomeDisplay({ state }: MetronomeDisplayProps) {
  const { bpm, beatsPerMeasure, label } = state;
  const [beat, setBeat] = useState(0);       // current beat index (0-based)
  const [flash, setFlash] = useState(false); // visual flash trigger
  const rafRef = useRef<number | null>(null);
  const lastBeatRef = useRef<number>(performance.now());
  const beatRef = useRef(0);

  const beatInterval = 60_000 / bpm; // ms per beat

  useEffect(() => {
    // Reset on bpm/meter change
    beatRef.current = 0;
    setBeat(0);
    lastBeatRef.current = performance.now();

    function tick(now: number) {
      const elapsed = now - lastBeatRef.current;
      if (elapsed >= beatInterval) {
        lastBeatRef.current = now - (elapsed % beatInterval); // keep phase
        beatRef.current = (beatRef.current + 1) % beatsPerMeasure;
        setBeat(beatRef.current);
        setFlash(true);
        setTimeout(() => setFlash(false), Math.min(80, beatInterval * 0.3));
      }
      rafRef.current = requestAnimationFrame(tick);
    }

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [bpm, beatsPerMeasure, beatInterval]);

  const isDownbeat = beat === 0;

  return (
    <div className="flex flex-col items-center justify-center w-full h-full select-none">
      {label && (
        <p className="text-gray-400 text-xl mb-10 tracking-wide">{label}</p>
      )}

      {/* BPM display */}
      <p className="text-gray-500 text-lg mb-6 tracking-widest uppercase">
        {bpm} BPM · {beatsPerMeasure}/4
      </p>

      {/* Beat dots */}
      <div className="flex gap-6 mb-12">
        {Array.from({ length: beatsPerMeasure }).map((_, i) => {
          const isActive = i === beat && flash;
          const isDownBeatDot = i === 0;
          return (
            <div
              key={i}
              className={`rounded-full transition-all duration-75 ${
                isActive
                  ? isDownBeatDot
                    ? "bg-white scale-125"
                    : "bg-blue-400 scale-110"
                  : isDownBeatDot
                  ? "bg-gray-500"
                  : "bg-gray-700"
              }`}
              style={{ width: isDownBeatDot ? 48 : 36, height: isDownBeatDot ? 48 : 36 }}
            />
          );
        })}
      </div>

      {/* Large flash indicator */}
      <div
        className={`rounded-full transition-all duration-75 ${
          flash
            ? isDownbeat
              ? "bg-white opacity-90"
              : "bg-blue-500 opacity-70"
            : "bg-gray-800 opacity-20"
        }`}
        style={{ width: 200, height: 200 }}
      />
    </div>
  );
}
