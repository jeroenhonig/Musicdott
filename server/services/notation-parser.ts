/**
 * Notation Parser Service
 *
 * Parses drum notation strings from POS_Notatie.csv into structured event data.
 * Follows strict rules for grid-based, lossless parsing.
 *
 * Parser Rules (Non-negotiable):
 * 1. Time is grid-based, never absolute
 * 2. Every hit = discrete event
 * 3. Velocity defaults to 0.7 if unknown
 * 4. Unknown tokens → logged, not fatal
 * 5. Critical element missing → status = "partial"
 * 6. No usable data → status = "failed"
 * 7. Original noNotatie always preserved externally
 */

import type { ParsedNotation, NotationEvent } from "@shared/pos-schema";

const PARSER_VERSION = "1.0.0";

// Default values
const DEFAULT_VELOCITY = 0.7;
const DEFAULT_TEMPO = 120;
const DEFAULT_TIME_SIGNATURE = { beats: 4, unit: 4 };
const DEFAULT_DIVISION = 16; // 16th notes

// Limb mappings
type Limb = "R" | "L" | "K" | "F";

// Instrument mappings from common notation symbols
const INSTRUMENT_MAP: Record<string, { instrument: NotationEvent["instrument"]; limb: Limb }> = {
  // Hi-hat symbols
  "x": { instrument: "hihat", limb: "R" },
  "X": { instrument: "hihat", limb: "R" },  // Accented
  "+": { instrument: "hihat", limb: "R" },  // Closed hi-hat
  "o": { instrument: "hihat", limb: "R" },  // Open hi-hat
  "O": { instrument: "hihat", limb: "R" },  // Open hi-hat accented

  // Snare symbols
  "s": { instrument: "snare", limb: "L" },
  "S": { instrument: "snare", limb: "L" },  // Accented
  "g": { instrument: "snare", limb: "L" },  // Ghost note
  "G": { instrument: "snare", limb: "L" },  // Ghost note accented
  "@": { instrument: "snare", limb: "L" },  // Rimshot

  // Kick symbols
  "k": { instrument: "kick", limb: "K" },
  "K": { instrument: "kick", limb: "K" },   // Accented
  "b": { instrument: "kick", limb: "K" },   // Bass drum
  "B": { instrument: "kick", limb: "K" },   // Bass drum accented

  // Hi-hat foot symbols
  "f": { instrument: "hihat", limb: "F" },  // Hi-hat foot
  "F": { instrument: "hihat", limb: "F" },  // Hi-hat foot accented

  // Tom symbols
  "t": { instrument: "tom", limb: "R" },
  "T": { instrument: "tom", limb: "R" },    // Accented
  "1": { instrument: "high_tom", limb: "R" },
  "2": { instrument: "tom", limb: "R" },    // Mid tom
  "3": { instrument: "floor_tom", limb: "R" },

  // Cymbal symbols
  "c": { instrument: "crash", limb: "R" },
  "C": { instrument: "crash", limb: "R" },  // Accented
  "r": { instrument: "ride", limb: "R" },
  "R": { instrument: "ride", limb: "R" },   // Accented ride bell

  // Rest symbols (no sound)
  "-": { instrument: "snare", limb: "R" },  // Will be filtered out
  ".": { instrument: "snare", limb: "R" },  // Will be filtered out
  " ": { instrument: "snare", limb: "R" },  // Will be filtered out
};

// Symbols that represent rests (no event generated)
const REST_SYMBOLS = new Set(["-", ".", " ", "_", "|"]);

// Symbols that represent accents (uppercase typically)
const ACCENT_SYMBOLS = new Set(["X", "S", "K", "B", "F", "T", "C", "R", "G", "O"]);

interface ParserOptions {
  defaultTempo?: number;
  defaultDivision?: number;
  defaultTimeSignature?: { beats: number; unit: number };
  strictMode?: boolean; // If true, unknown tokens cause parse failure
}

/**
 * Parse a line-based notation format (e.g., tablature style)
 */
function parseLineBasedNotation(
  lines: string[],
  options: ParserOptions
): { events: NotationEvent[]; errors: string[]; warnings: string[] } {
  const events: NotationEvent[] = [];
  const errors: string[] = [];
  const warnings: string[] = [];

  // Common line prefixes and their mappings
  const linePrefixMap: Record<string, { instrument: NotationEvent["instrument"]; limb: Limb }> = {
    "HH": { instrument: "hihat", limb: "R" },
    "H": { instrument: "hihat", limb: "R" },
    "CC": { instrument: "crash", limb: "R" },
    "RC": { instrument: "ride", limb: "R" },
    "RD": { instrument: "ride", limb: "R" },
    "T1": { instrument: "high_tom", limb: "R" },
    "T2": { instrument: "tom", limb: "R" },
    "T3": { instrument: "floor_tom", limb: "R" },
    "FT": { instrument: "floor_tom", limb: "R" },
    "SN": { instrument: "snare", limb: "L" },
    "S": { instrument: "snare", limb: "L" },
    "SD": { instrument: "snare", limb: "L" },
    "BD": { instrument: "kick", limb: "K" },
    "B": { instrument: "kick", limb: "K" },
    "K": { instrument: "kick", limb: "K" },
    "HF": { instrument: "hihat", limb: "F" },
  };

  for (const line of lines) {
    const trimmedLine = line.trim();
    if (!trimmedLine) continue;

    // Find matching prefix
    let foundPrefix = "";
    let mapping: { instrument: NotationEvent["instrument"]; limb: Limb } | null = null;

    for (const [prefix, m] of Object.entries(linePrefixMap)) {
      if (trimmedLine.toUpperCase().startsWith(prefix + "|") ||
          trimmedLine.toUpperCase().startsWith(prefix + ":") ||
          trimmedLine.toUpperCase().startsWith(prefix + " ")) {
        foundPrefix = prefix;
        mapping = m;
        break;
      }
    }

    if (!mapping) {
      // Try to parse as a generic pattern line
      continue;
    }

    // Extract the pattern part (after the prefix)
    const patternPart = trimmedLine.substring(foundPrefix.length).replace(/^[|:\s]+/, "");

    // Parse each character in the pattern
    let step = 0;
    for (const char of patternPart) {
      if (char === "|" || char === " ") {
        // Measure separator or space - don't increment step for separators
        continue;
      }

      if (!REST_SYMBOLS.has(char)) {
        const charMapping = INSTRUMENT_MAP[char];
        if (charMapping) {
          events.push({
            step,
            limb: mapping.limb,
            instrument: mapping.instrument,
            velocity: ACCENT_SYMBOLS.has(char) ? 1.0 : DEFAULT_VELOCITY,
            accent: ACCENT_SYMBOLS.has(char),
          });
        } else if (char !== "-" && char !== ".") {
          warnings.push(`Unknown symbol '${char}' at step ${step} on ${foundPrefix} line`);
        }
      }

      step++;
    }
  }

  return { events, errors, warnings };
}

/**
 * Parse a compact notation format (e.g., "RLRR LRLL")
 */
function parseCompactNotation(
  notation: string,
  options: ParserOptions
): { events: NotationEvent[]; errors: string[]; warnings: string[] } {
  const events: NotationEvent[] = [];
  const errors: string[] = [];
  const warnings: string[] = [];

  let step = 0;

  // Remove any line breaks and normalize spaces
  const cleanNotation = notation.replace(/\n/g, " ").replace(/\s+/g, " ").trim();

  for (const char of cleanNotation) {
    if (char === " " || char === "|") {
      // Space or measure separator - might be a beat boundary
      continue;
    }

    if (REST_SYMBOLS.has(char)) {
      step++;
      continue;
    }

    const mapping = INSTRUMENT_MAP[char];
    if (mapping) {
      events.push({
        step,
        limb: mapping.limb,
        instrument: mapping.instrument,
        velocity: ACCENT_SYMBOLS.has(char) ? 1.0 : DEFAULT_VELOCITY,
        accent: ACCENT_SYMBOLS.has(char),
      });
      step++;
    } else {
      warnings.push(`Unknown symbol '${char}' at step ${step}`);
      step++;
    }
  }

  return { events, errors, warnings };
}

/**
 * Parse GrooveScribe-style notation (URL-encoded format)
 */
function parseGrooveScribeNotation(
  notation: string,
  options: ParserOptions
): { events: NotationEvent[]; errors: string[]; warnings: string[]; metadata: Record<string, any> } {
  const events: NotationEvent[] = [];
  const errors: string[] = [];
  const warnings: string[] = [];
  const metadata: Record<string, any> = {};

  // Parse URL-encoded parameters
  const params = new URLSearchParams(notation);

  // Extract metadata
  if (params.has("Tempo")) metadata.tempo = parseInt(params.get("Tempo")!, 10);
  if (params.has("TimeSig")) metadata.timeSignature = params.get("TimeSig");
  if (params.has("Div")) metadata.division = parseInt(params.get("Div")!, 10);
  if (params.has("Measures")) metadata.measures = parseInt(params.get("Measures")!, 10);

  // Instrument lines
  const instrumentLines: Record<string, string> = {};
  const instrumentMapping: Record<string, { instrument: NotationEvent["instrument"]; limb: Limb }> = {
    "H": { instrument: "hihat", limb: "R" },
    "S": { instrument: "snare", limb: "L" },
    "K": { instrument: "kick", limb: "K" },
    "T1": { instrument: "high_tom", limb: "R" },
    "T2": { instrument: "tom", limb: "R" },
    "T3": { instrument: "floor_tom", limb: "R" },
  };

  for (const [key, line] of instrumentMapping) {
    const pattern = params.get(key);
    if (pattern) {
      instrumentLines[key] = pattern;
    }
  }

  // Parse each instrument line
  for (const [key, pattern] of Object.entries(instrumentLines)) {
    const mapping = instrumentMapping[key];
    if (!mapping) continue;

    let step = 0;
    for (const char of pattern) {
      if (char === "|") {
        // Measure separator
        continue;
      }

      if (!REST_SYMBOLS.has(char) && char !== "-") {
        const isAccent = char === char.toUpperCase() && char !== char.toLowerCase();
        events.push({
          step,
          limb: mapping.limb,
          instrument: mapping.instrument,
          velocity: isAccent ? 1.0 : DEFAULT_VELOCITY,
          accent: isAccent,
        });
      }

      if (char !== "|") {
        step++;
      }
    }
  }

  return { events, errors, warnings, metadata };
}

/**
 * Detect the notation format
 */
function detectNotationFormat(notation: string): "line-based" | "compact" | "groovescribe" | "unknown" {
  const trimmed = notation.trim();

  // Check for GrooveScribe format (URL-encoded parameters)
  if (trimmed.includes("TimeSig=") || trimmed.includes("Tempo=") || trimmed.includes("Div=")) {
    return "groovescribe";
  }

  // Check for line-based format (has line prefixes like HH|, S|, etc.)
  if (/^(HH|SN|SD|BD|RC|CC|T[123]|FT|HF)[|:\s]/m.test(trimmed)) {
    return "line-based";
  }

  // Check if it has multiple lines with patterns
  const lines = trimmed.split("\n");
  if (lines.length > 1 && lines.some(line => /[|:]/.test(line))) {
    return "line-based";
  }

  // Default to compact notation
  return "compact";
}

/**
 * Main notation parser function
 */
export function parseNotation(
  notation: string,
  options: ParserOptions = {}
): ParsedNotation {
  const {
    defaultTempo = DEFAULT_TEMPO,
    defaultDivision = DEFAULT_DIVISION,
    defaultTimeSignature = DEFAULT_TIME_SIGNATURE,
    strictMode = false,
  } = options;

  const errors: string[] = [];
  const warnings: string[] = [];

  // Handle empty input
  if (!notation || notation.trim().length === 0) {
    return {
      status: "failed",
      time_signature: defaultTimeSignature,
      tempo: defaultTempo,
      division: defaultDivision,
      measures: 0,
      grid: {
        steps_per_measure: defaultDivision,
        total_steps: 0,
      },
      events: [],
      meta: {
        parser_version: PARSER_VERSION,
        errors: ["Empty notation string"],
        warnings: [],
        raw_notation: notation,
      },
    };
  }

  // Detect format and parse
  const format = detectNotationFormat(notation);
  let events: NotationEvent[] = [];
  let metadata: Record<string, any> = {};

  switch (format) {
    case "groovescribe": {
      const result = parseGrooveScribeNotation(notation, options);
      events = result.events;
      errors.push(...result.errors);
      warnings.push(...result.warnings);
      metadata = result.metadata;
      break;
    }
    case "line-based": {
      const lines = notation.split("\n");
      const result = parseLineBasedNotation(lines, options);
      events = result.events;
      errors.push(...result.errors);
      warnings.push(...result.warnings);
      break;
    }
    case "compact": {
      const result = parseCompactNotation(notation, options);
      events = result.events;
      errors.push(...result.errors);
      warnings.push(...result.warnings);
      break;
    }
    default:
      errors.push(`Unknown notation format`);
  }

  // Sort events by step
  events.sort((a, b) => a.step - b.step);

  // Calculate grid information
  const maxStep = events.length > 0 ? Math.max(...events.map(e => e.step)) + 1 : 0;
  const division = metadata.division || defaultDivision;
  const stepsPerMeasure = division; // Assuming 4/4 time
  const measures = metadata.measures || (maxStep > 0 ? Math.ceil(maxStep / stepsPerMeasure) : 1);
  const totalSteps = measures * stepsPerMeasure;

  // Determine parse status
  let status: "ok" | "partial" | "failed";
  if (errors.length > 0 && events.length === 0) {
    status = "failed";
  } else if (errors.length > 0 || warnings.length > 0) {
    status = "partial";
  } else {
    status = events.length > 0 ? "ok" : "partial";
  }

  // In strict mode, any warnings become errors
  if (strictMode && warnings.length > 0) {
    errors.push(...warnings);
    warnings.length = 0;
    if (status === "ok") status = "partial";
  }

  return {
    status,
    time_signature: metadata.timeSignature
      ? parseTimeSignature(metadata.timeSignature)
      : defaultTimeSignature,
    tempo: metadata.tempo || defaultTempo,
    division,
    measures,
    grid: {
      steps_per_measure: stepsPerMeasure,
      total_steps: totalSteps,
    },
    events,
    meta: {
      parser_version: PARSER_VERSION,
      errors,
      warnings,
      raw_notation: notation,
    },
  };
}

/**
 * Parse a time signature string like "4/4" into components
 */
function parseTimeSignature(ts: string): { beats: number; unit: number } {
  const parts = ts.split("/");
  if (parts.length === 2) {
    const beats = parseInt(parts[0], 10);
    const unit = parseInt(parts[1], 10);
    if (!isNaN(beats) && !isNaN(unit)) {
      return { beats, unit };
    }
  }
  return DEFAULT_TIME_SIGNATURE;
}

/**
 * Extract drumblocks from a parsed notation
 */
export function extractDrumblocks(
  parsed: ParsedNotation,
  blockLength: number = 16
): Array<{
  blockId: string;
  lengthSteps: number;
  events: NotationEvent[];
  startStep: number;
}> {
  const blocks: Array<{
    blockId: string;
    lengthSteps: number;
    events: NotationEvent[];
    startStep: number;
  }> = [];

  if (parsed.events.length === 0) return blocks;

  const totalSteps = parsed.grid.total_steps || Math.max(...parsed.events.map(e => e.step)) + 1;
  const numBlocks = Math.ceil(totalSteps / blockLength);

  for (let i = 0; i < numBlocks; i++) {
    const startStep = i * blockLength;
    const endStep = startStep + blockLength;

    const blockEvents = parsed.events
      .filter(e => e.step >= startStep && e.step < endStep)
      .map(e => ({
        ...e,
        step: e.step - startStep, // Normalize step to block-relative
      }));

    if (blockEvents.length > 0) {
      blocks.push({
        blockId: `B${i + 1}`,
        lengthSteps: blockLength,
        events: blockEvents,
        startStep,
      });
    }
  }

  return blocks;
}

/**
 * Validate a notation string without full parsing
 */
export function validateNotation(notation: string): {
  isValid: boolean;
  format: string;
  estimatedEvents: number;
  issues: string[];
} {
  const issues: string[] = [];

  if (!notation || notation.trim().length === 0) {
    return {
      isValid: false,
      format: "unknown",
      estimatedEvents: 0,
      issues: ["Empty notation string"],
    };
  }

  const format = detectNotationFormat(notation);

  // Quick validation based on format
  let estimatedEvents = 0;
  const chars = notation.replace(/[\s|:\n]/g, "");

  for (const char of chars) {
    if (!REST_SYMBOLS.has(char) && INSTRUMENT_MAP[char]) {
      estimatedEvents++;
    } else if (!REST_SYMBOLS.has(char) && !/[a-zA-Z0-9=&]/.test(char)) {
      issues.push(`Unknown symbol: '${char}'`);
    }
  }

  return {
    isValid: issues.length === 0,
    format,
    estimatedEvents,
    issues,
  };
}

/**
 * Convert parsed notation to a simple text representation for display
 */
export function notationToText(parsed: ParsedNotation): string {
  if (parsed.events.length === 0) {
    return "No events";
  }

  const lines: string[] = [];
  const instruments = new Set(parsed.events.map(e => e.instrument));

  for (const instrument of instruments) {
    const instrumentEvents = parsed.events.filter(e => e.instrument === instrument);
    let line = `${instrument.toUpperCase().padEnd(8)}|`;

    for (let step = 0; step < parsed.grid.total_steps; step++) {
      const event = instrumentEvents.find(e => e.step === step);
      if (event) {
        line += event.accent ? "X" : "x";
      } else {
        line += "-";
      }

      // Add measure separator
      if ((step + 1) % parsed.grid.steps_per_measure === 0 && step < parsed.grid.total_steps - 1) {
        line += "|";
      }
    }

    lines.push(line);
  }

  return lines.join("\n");
}

export default {
  parseNotation,
  extractDrumblocks,
  validateNotation,
  notationToText,
  PARSER_VERSION,
};
