/**
 * PauseDisplay
 *
 * Full-screen pause indicator for the student display screen.
 * Shown when the teacher pushes a pause.
 */

import type { PauseDisplayState } from "@shared/display-events";

interface PauseDisplayProps {
  state: PauseDisplayState;
}

export default function PauseDisplay({ state }: PauseDisplayProps) {
  return (
    <div className="flex flex-col items-center justify-center w-full h-full select-none">
      <div className="flex gap-6 mb-10">
        <div className="w-10 h-28 rounded-md bg-gray-500" />
        <div className="w-10 h-28 rounded-md bg-gray-500" />
      </div>
      <p className="text-5xl font-semibold text-gray-300 mb-4">
        {state.message || "Pauze"}
      </p>
    </div>
  );
}
