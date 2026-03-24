import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { sanitizeContentBlocksForStorage } from "../../shared/content-blocks";

const canonicalFixture = JSON.parse(
  readFileSync(new URL("../fixtures/content_block_canonical_cases.json", import.meta.url), "utf8"),
) as { input: unknown[] };

describe("sanitizeContentBlocksForStorage", () => {
  it("returns empty array for non-array input", () => {
    expect(sanitizeContentBlocksForStorage(null)).toEqual([]);
    expect(sanitizeContentBlocksForStorage({})).toEqual([]);
  });

  it("filters invalid entries and guarantees object data", () => {
    const result = sanitizeContentBlocksForStorage([
      null,
      "bad",
      { type: "text", content: "Hello" },
      { type: "youtube", data: "not-an-object", url: "https://youtu.be/dQw4w9WgXcQ" },
      { id: "missing-type" },
    ]);

    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({ type: "text", data: {} });
    expect(result[1]).toMatchObject({ type: "youtube", data: {} });
  });

  it("falls back to minimal safe shape for malformed blocks", () => {
    const result = sanitizeContentBlocksForStorage([
      { type: "", data: [] },
      { type: "custom-block", data: [] },
    ]);

    expect(result).toHaveLength(1);
    expect(result[0].type).toBe("custom-block");
    expect(result[0].data).toEqual({});
  });

  it("canonicalizes legacy and mixed embeds into stable storage shapes", () => {
    const result = sanitizeContentBlocksForStorage(canonicalFixture.input);

    expect(result.map((block) => block.type)).toEqual([
      "youtube",
      "groovescribe",
      "spotify",
      "pdf",
      "external_link",
      "sync-embed",
    ]);

    expect(result[0]).toMatchObject({
      type: "youtube",
      videoId: "abc123XYZ89",
      data: {
        youtube: "abc123XYZ89",
        videoId: "abc123XYZ89",
      },
    });

    expect(result[1]).toMatchObject({
      type: "groovescribe",
      data: {
        pattern: "https://www.mikeslessons.com/gscribe?TimeSig=4/4&Tempo=88",
        groovescribe: "https://www.mikeslessons.com/gscribe?TimeSig=4/4&Tempo=88",
      },
    });
    expect(result[1].data).not.toHaveProperty("groove");

    expect(result[2]).toMatchObject({
      type: "spotify",
      data: {
        spotify: "1234567890ABCDEFGHIJKL",
      },
    });

    expect(result[3]).toMatchObject({
      type: "pdf",
      url: "https://example.com/files/fill.pdf",
      data: {
        pdf: {
          url: "https://example.com/files/fill.pdf",
          filename: "fill.pdf",
          title: "Fill PDF",
        },
      },
    });

    expect(result[4]).toMatchObject({
      type: "external_link",
      url: "https://example.com/embed/notation-1",
      data: {
        external_link: {
          url: "https://example.com/embed/notation-1",
          title: "MuseScore",
          description: "Notation preview",
        },
      },
    });

    expect(result[5]).toMatchObject({
      type: "sync-embed",
      url: "https://sync.musicdott.app/session/abc",
      data: {
        sync: "https://sync.musicdott.app/session/abc",
      },
    });
  });
});
