import { describe, expect, it } from "vitest";
import {
  normalizeGrooveSingle,
  normalizeRichContent,
  normalizeYouTube,
} from "../../shared/utils/richContentNormalizer";

describe("richContentNormalizer", () => {
  it("normalizes youtube urls to a stable iframe", () => {
    const normalized = normalizeYouTube("https://youtu.be/abc123XYZ89");
    expect(normalized).toContain("https://www.youtube.com/embed/abc123XYZ89");
    expect(normalized).toContain("<iframe");
  });

  it("normalizes groovescribe queries to the preferred host iframe", () => {
    const normalized = normalizeGrooveSingle("?TimeSig=4/4&Tempo=88");
    expect(normalized).toContain("https://musicdott.app/groovescribe/GrooveEmbed.html?TimeSig=4/4&Tempo=88");
    expect(normalized).toContain("<iframe");
  });

  it("normalizes mixed rich content consistently", () => {
    const normalized = normalizeRichContent(
      [
        "Intro text",
        "https://youtu.be/abc123XYZ89",
        "?TimeSig=4/4&Tempo=88",
      ].join("\n"),
    );

    expect(normalized).toContain("https://www.youtube.com/embed/abc123XYZ89");
    expect(normalized).toContain("https://musicdott.app/groovescribe/GrooveEmbed.html?TimeSig=4/4&Tempo=88");
  });
});
