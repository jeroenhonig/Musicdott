export type GrooveEvent = {
  step: number;
  instrument: "hihat" | "snare" | "kick" | "tom" | "cymbal" | string;
  velocity?: number;
  accent?: boolean;
};

export type GrooveGrid = {
  steps_per_measure: number;
  total_steps: number;
};

export type DrumBlock = {
  block_id: string;
  length_steps: number;
  events: GrooveEvent[];
  tags: string[];
  difficulty: number;
  source: {
    type: "groovescribe";
    url: string;
  };
  meta?: Record<string, unknown>;
};

export type GroovescribeToBlocksInput = {
  events: GrooveEvent[];
  grid: GrooveGrid;
  rawUrl: string;
};

function clampDifficulty(value: number): number {
  if (value < 1) return 1;
  if (value > 5) return 5;
  return value;
}

function isStrongBeat(step: number, stepsPerMeasure: number): boolean {
  const stepsPerBeat = stepsPerMeasure / 4;
  if (!Number.isFinite(stepsPerBeat) || stepsPerBeat <= 0) return false;
  return (step - 1) % stepsPerBeat === 0;
}

function computeDifficulty(events: GrooveEvent[], stepsPerMeasure: number): number {
  if (!stepsPerMeasure) return 1;

  const density = events.length / stepsPerMeasure;
  const instruments = new Set(events.map((event) => event.instrument));
  const accents = events.filter((event) => event.accent).length;
  const syncopationHits = events.filter((event) => !isStrongBeat(event.step, stepsPerMeasure)).length;

  let score = 1;
  score += density * 2;
  score += instruments.size * 0.5;
  score += syncopationHits / stepsPerMeasure;
  if (accents > 0) score += 0.5;

  return clampDifficulty(Math.round(score));
}

export default function groovescribeToBlocks(input: GroovescribeToBlocksInput): DrumBlock[] {
  const { events, grid, rawUrl } = input;
  const stepsPerMeasure = grid.steps_per_measure || 0;
  if (!stepsPerMeasure || !grid.total_steps) return [];

  const blocks: DrumBlock[] = [];
  const measures = Math.ceil(grid.total_steps / stepsPerMeasure);

  for (let measureIndex = 0; measureIndex < measures; measureIndex += 1) {
    const startStep = measureIndex * stepsPerMeasure + 1;
    const endStep = startStep + stepsPerMeasure - 1;
    const blockEvents = events.filter((event) => event.step >= startStep && event.step <= endStep);

    const normalizedEvents = blockEvents.map((event) => ({
      ...event,
      step: event.step - startStep + 1
    }));

    const difficulty = computeDifficulty(blockEvents, stepsPerMeasure);

    blocks.push({
      block_id: `GS-${String(measureIndex + 1).padStart(3, "0")}`,
      length_steps: stepsPerMeasure,
      events: normalizedEvents,
      tags: ["groove", "groovescribe", "external"],
      difficulty,
      source: {
        type: "groovescribe",
        url: rawUrl
      },
      meta: {
        measure_index: measureIndex + 1
      }
    });
  }

  return blocks;
}
