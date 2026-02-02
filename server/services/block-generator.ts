/**
 * Block Generator Service
 *
 * Generates random or constrained drum patterns from drumblocks.
 * Features:
 * - Random block selection
 * - Constraint-based filtering (difficulty, tags, limb balance)
 * - Pattern concatenation
 * - Renderable output generation
 */

import { storage } from "../storage-wrapper";
import type {
  Drumblock,
  NotationEvent,
  ParsedNotation,
  GeneratorConstraints,
  GeneratedPattern,
} from "@shared/pos-schema";

const DEFAULT_TEMPO = 120;
const DEFAULT_TIME_SIGNATURE = { beats: 4, unit: 4 };
const DEFAULT_DIVISION = 16;

/**
 * Filter drumblocks based on constraints
 */
function filterBlocks(
  blocks: Drumblock[],
  constraints: GeneratorConstraints
): Drumblock[] {
  return blocks.filter((block) => {
    // Parse tags and events
    const tags: string[] = block.tags ? JSON.parse(block.tags) : [];
    const events: NotationEvent[] = block.events ? JSON.parse(block.events) : [];

    // Filter by max difficulty
    if (constraints.maxDifficulty !== undefined) {
      if (block.difficulty && block.difficulty > constraints.maxDifficulty) {
        return false;
      }
    }

    // Filter by required tags
    if (constraints.tags && constraints.tags.length > 0) {
      const hasRequiredTag = constraints.tags.some((tag) => tags.includes(tag));
      if (!hasRequiredTag) {
        return false;
      }
    }

    // Filter by excluded tags
    if (constraints.excludeTags && constraints.excludeTags.length > 0) {
      const hasExcludedTag = constraints.excludeTags.some((tag) => tags.includes(tag));
      if (hasExcludedTag) {
        return false;
      }
    }

    // Filter by limb balance
    if (constraints.limbBalance && events.length > 0) {
      const rightCount = events.filter((e) => e.limb === "R").length;
      const leftCount = events.filter((e) => e.limb === "L").length;
      const total = rightCount + leftCount;

      if (total > 0) {
        const rightRatio = rightCount / total;

        switch (constraints.limbBalance) {
          case "right-lead":
            if (rightRatio < 0.6) return false;
            break;
          case "left-lead":
            if (rightRatio > 0.4) return false;
            break;
          case "even":
            if (rightRatio < 0.4 || rightRatio > 0.6) return false;
            break;
        }
      }
    }

    // Filter by density
    if (constraints.density && events.length > 0) {
      const density = events.length / block.lengthSteps;

      switch (constraints.density) {
        case "sparse":
          if (density > 0.3) return false;
          break;
        case "medium":
          if (density < 0.2 || density > 0.6) return false;
          break;
        case "dense":
          if (density < 0.5) return false;
          break;
      }
    }

    return true;
  });
}

/**
 * Randomly select blocks from a pool
 */
function selectRandomBlocks(
  blocks: Drumblock[],
  count: number
): Drumblock[] {
  if (blocks.length === 0) return [];
  if (blocks.length <= count) return [...blocks];

  const selected: Drumblock[] = [];
  const available = [...blocks];

  for (let i = 0; i < count && available.length > 0; i++) {
    const index = Math.floor(Math.random() * available.length);
    selected.push(available[index]);
    available.splice(index, 1);
  }

  return selected;
}

/**
 * Concatenate multiple blocks into a single pattern
 */
function concatenateBlocks(blocks: Drumblock[]): {
  events: NotationEvent[];
  totalSteps: number;
} {
  const allEvents: NotationEvent[] = [];
  let currentStep = 0;

  for (const block of blocks) {
    const events: NotationEvent[] = block.events ? JSON.parse(block.events) : [];

    // Offset each event's step by the current position
    for (const event of events) {
      allEvents.push({
        ...event,
        step: event.step + currentStep,
      });
    }

    currentStep += block.lengthSteps;
  }

  return {
    events: allEvents,
    totalSteps: currentStep,
  };
}

/**
 * Create a renderable ParsedNotation from events
 */
function createRenderableNotation(
  events: NotationEvent[],
  totalSteps: number,
  tempo: number = DEFAULT_TEMPO
): ParsedNotation {
  const stepsPerMeasure = DEFAULT_DIVISION;
  const measures = Math.ceil(totalSteps / stepsPerMeasure);

  return {
    status: "ok",
    time_signature: DEFAULT_TIME_SIGNATURE,
    tempo,
    division: DEFAULT_DIVISION,
    measures,
    grid: {
      steps_per_measure: stepsPerMeasure,
      total_steps: measures * stepsPerMeasure,
    },
    events,
    meta: {
      parser_version: "generator-1.0.0",
      errors: [],
      warnings: [],
    },
  };
}

/**
 * Generate a random pattern from available drumblocks
 */
export async function generateRandomPattern(
  schoolId: number,
  blockCount: number = 4,
  constraints: GeneratorConstraints = {}
): Promise<GeneratedPattern> {
  // Get all drumblocks for the school
  const allBlocks = await storage.getDrumblocks(schoolId);

  if (allBlocks.length === 0) {
    return {
      blocks: [],
      total_steps: 0,
      renderable_notation: createRenderableNotation([], 0),
      playable: false,
      constraints_applied: constraints,
    };
  }

  // Filter blocks based on constraints
  const filteredBlocks = filterBlocks(allBlocks, constraints);

  if (filteredBlocks.length === 0) {
    return {
      blocks: [],
      total_steps: 0,
      renderable_notation: createRenderableNotation([], 0),
      playable: false,
      constraints_applied: constraints,
    };
  }

  // Select random blocks
  const selectedBlocks = selectRandomBlocks(filteredBlocks, blockCount);

  // Concatenate blocks
  const { events, totalSteps } = concatenateBlocks(selectedBlocks);

  // Determine tempo from constraints or default
  const tempo = constraints.tempoRange
    ? Math.floor(
        Math.random() * (constraints.tempoRange.max - constraints.tempoRange.min) +
          constraints.tempoRange.min
      )
    : DEFAULT_TEMPO;

  // Create renderable notation
  const renderableNotation = createRenderableNotation(events, totalSteps, tempo);

  return {
    blocks: selectedBlocks.map((b) => b.blockId),
    total_steps: totalSteps,
    renderable_notation: renderableNotation,
    playable: events.length > 0,
    constraints_applied: constraints,
  };
}

/**
 * Generate a pattern with specific block IDs
 */
export async function generatePatternFromBlocks(
  schoolId: number,
  blockIds: string[],
  tempo: number = DEFAULT_TEMPO
): Promise<GeneratedPattern> {
  const blocks: Drumblock[] = [];

  for (const blockId of blockIds) {
    const block = await storage.getDrumblockByBlockId(blockId, schoolId);
    if (block) {
      blocks.push(block);
    }
  }

  if (blocks.length === 0) {
    return {
      blocks: [],
      total_steps: 0,
      renderable_notation: createRenderableNotation([], 0),
      playable: false,
      constraints_applied: {},
    };
  }

  const { events, totalSteps } = concatenateBlocks(blocks);
  const renderableNotation = createRenderableNotation(events, totalSteps, tempo);

  return {
    blocks: blockIds,
    total_steps: totalSteps,
    renderable_notation: renderableNotation,
    playable: events.length > 0,
    constraints_applied: {},
  };
}

/**
 * Generate a pattern that builds progressively (for practice)
 * Starts simple and adds complexity
 */
export async function generateProgressivePattern(
  schoolId: number,
  startDifficulty: number = 1,
  endDifficulty: number = 3,
  blocksPerLevel: number = 2
): Promise<GeneratedPattern[]> {
  const patterns: GeneratedPattern[] = [];

  for (let difficulty = startDifficulty; difficulty <= endDifficulty; difficulty++) {
    const pattern = await generateRandomPattern(schoolId, blocksPerLevel, {
      maxDifficulty: difficulty,
    });

    if (pattern.playable) {
      patterns.push(pattern);
    }
  }

  return patterns;
}

/**
 * Analyze a pattern and return statistics
 */
export function analyzePattern(pattern: GeneratedPattern): {
  totalEvents: number;
  eventsByLimb: Record<string, number>;
  eventsByInstrument: Record<string, number>;
  density: number;
  hasAccents: boolean;
  averageVelocity: number;
} {
  const events = pattern.renderable_notation.events;
  const totalSteps = pattern.total_steps;

  const eventsByLimb: Record<string, number> = { R: 0, L: 0, K: 0, F: 0 };
  const eventsByInstrument: Record<string, number> = {};
  let accentCount = 0;
  let velocitySum = 0;

  for (const event of events) {
    eventsByLimb[event.limb] = (eventsByLimb[event.limb] || 0) + 1;
    eventsByInstrument[event.instrument] = (eventsByInstrument[event.instrument] || 0) + 1;
    if (event.accent) accentCount++;
    velocitySum += event.velocity;
  }

  return {
    totalEvents: events.length,
    eventsByLimb,
    eventsByInstrument,
    density: totalSteps > 0 ? events.length / totalSteps : 0,
    hasAccents: accentCount > 0,
    averageVelocity: events.length > 0 ? velocitySum / events.length : 0,
  };
}

/**
 * Get suggested blocks based on a seed block
 */
export async function getSuggestedBlocks(
  schoolId: number,
  seedBlockId: string,
  count: number = 4
): Promise<Drumblock[]> {
  const seedBlock = await storage.getDrumblockByBlockId(seedBlockId, schoolId);
  if (!seedBlock) return [];

  const seedTags: string[] = seedBlock.tags ? JSON.parse(seedBlock.tags) : [];
  const allBlocks = await storage.getDrumblocks(schoolId);

  // Score blocks based on similarity to seed
  const scoredBlocks = allBlocks
    .filter((b) => b.blockId !== seedBlockId)
    .map((block) => {
      const tags: string[] = block.tags ? JSON.parse(block.tags) : [];
      let score = 0;

      // Same difficulty = +2
      if (block.difficulty === seedBlock.difficulty) score += 2;

      // Similar difficulty = +1
      if (
        block.difficulty &&
        seedBlock.difficulty &&
        Math.abs(block.difficulty - seedBlock.difficulty) === 1
      ) {
        score += 1;
      }

      // Same length = +2
      if (block.lengthSteps === seedBlock.lengthSteps) score += 2;

      // Shared tags = +1 each
      for (const tag of tags) {
        if (seedTags.includes(tag)) score += 1;
      }

      return { block, score };
    })
    .sort((a, b) => b.score - a.score);

  return scoredBlocks.slice(0, count).map((s) => s.block);
}

export default {
  generateRandomPattern,
  generatePatternFromBlocks,
  generateProgressivePattern,
  analyzePattern,
  getSuggestedBlocks,
};
