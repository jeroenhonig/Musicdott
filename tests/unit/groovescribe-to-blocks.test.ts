import { describe, it, expect } from "vitest";
import { groovescribeToBlocks } from "@/shared/utils";

const RAW_URL = "https://teacher.musicdott.com/groovescribe/?TimeSig=4/4&Div=16&Tempo=90";

const baseInput = {
  rawUrl: RAW_URL,
  grid: {
    steps_per_measure: 16,
    total_steps: 32
  },
  events: [
    { step: 1, instrument: "kick" },
    { step: 5, instrument: "snare", accent: true },
    { step: 9, instrument: "kick" },
    { step: 13, instrument: "snare", accent: true },
    { step: 17, instrument: "kick" },
    { step: 21, instrument: "snare" },
    { step: 25, instrument: "kick" },
    { step: 29, instrument: "snare" }
  ]
};

describe("groovescribeToBlocks", () => {
  it("splits into one block per measure", () => {
    const blocks = groovescribeToBlocks(baseInput);
    expect(blocks).toHaveLength(2);
    expect(blocks[0].length_steps).toBe(16);
    expect(blocks[1].length_steps).toBe(16);
  });

  it("is deterministic for the same input", () => {
    const blocksA = groovescribeToBlocks(baseInput);
    const blocksB = groovescribeToBlocks(baseInput);
    expect(blocksA).toEqual(blocksB);
  });

  it("preserves raw url on each block", () => {
    const blocks = groovescribeToBlocks(baseInput);
    for (const block of blocks) {
      expect(block.source.url).toBe(RAW_URL);
      expect(block.tags).toContain("groovescribe");
    }
  });
});
