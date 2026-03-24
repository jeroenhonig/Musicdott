import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseContentBlocks } from "../../client/src/utils/content-block-parser";
import { sanitizeContentBlocksForStorage } from "../../shared/content-blocks";

const canonicalFixture = JSON.parse(
  readFileSync(new URL("../fixtures/content_block_canonical_cases.json", import.meta.url), "utf8"),
) as { input: unknown[] };

describe("parseContentBlocks import compatibility", () => {
  it("normalizes GrooveScribe legacy nested data", () => {
    const [block] = parseContentBlocks([
      {
        type: "groove",
        title: "Half-time shuffle",
        data: {
          groove: "https://www.mikeslessons.com/gscribe?TimeSig=4/4&Tempo=88",
        },
      },
    ]);

    expect(block.type).toBe("groovescribe");
    expect(block.pattern).toContain("Tempo=88");
    expect(block.data.groove).toContain("Tempo=88");
    expect(block.data.groovescribe).toContain("Tempo=88");
  });

  it("normalizes legacy video iframe to youtube with videoId", () => {
    const [block] = parseContentBlocks([
      {
        type: "video",
        content: '<iframe src="https://www.youtube.com/embed/abc123XYZ89"></iframe>',
      },
    ]);

    expect(block.type).toBe("youtube");
    expect(block.videoId).toBe("abc123XYZ89");
    expect(block.data.video).toContain("youtube.com/watch?v=abc123XYZ89");
  });

  it("converts external_embed and apple_music variants into stable shapes", () => {
    const blocks = parseContentBlocks([
      {
        type: "external_embed",
        title: "MuseScore",
        content: '<iframe src="https://example.com/embed/notation-1"></iframe>',
      },
      {
        type: "apple_music",
        data: {
          apple_music: "https://music.apple.com/nl/album/foo/123456789",
        },
      },
    ]);

    expect(blocks[0].type).toBe("external_link");
    expect(blocks[0].data.external_link.url).toBe("https://example.com/embed/notation-1");
    expect(blocks[1].type).toBe("apple_music");
    expect(blocks[1].data.apple_music.url).toContain("/123456789");
  });

  it("preserves sync embeds from imported data", () => {
    const [block] = parseContentBlocks([
      {
        type: "sync-embed",
        url: "https://sync.musicdott.app/session/abc",
      },
    ]);

    expect(block.type).toBe("sync-embed");
    expect(block.data.sync).toBe("https://sync.musicdott.app/session/abc");
  });

  it("keeps import, storage and render semantics aligned for canonical fixture cases", () => {
    const storedBlocks = sanitizeContentBlocksForStorage(canonicalFixture.input);
    const renderedBlocks = parseContentBlocks(storedBlocks);

    expect(renderedBlocks.map((block) => block.type)).toEqual([
      "youtube",
      "groovescribe",
      "spotify",
      "pdf",
      "external_link",
      "sync-embed",
    ]);

    expect(renderedBlocks[0]).toMatchObject({
      type: "youtube",
      videoId: "abc123XYZ89",
      data: {
        youtube: "abc123XYZ89",
        videoId: "abc123XYZ89",
        video: "https://www.youtube.com/watch?v=abc123XYZ89",
      },
    });

    expect(renderedBlocks[1]).toMatchObject({
      type: "groovescribe",
      pattern: "https://www.mikeslessons.com/gscribe?TimeSig=4/4&Tempo=88",
      data: {
        groove: "https://www.mikeslessons.com/gscribe?TimeSig=4/4&Tempo=88",
        groovescribe: "https://www.mikeslessons.com/gscribe?TimeSig=4/4&Tempo=88",
      },
    });

    expect(renderedBlocks[2]).toMatchObject({
      type: "spotify",
      data: {
        spotify: "https://open.spotify.com/track/1234567890ABCDEFGHIJKL",
        spotifyId: "1234567890ABCDEFGHIJKL",
      },
    });

    expect(renderedBlocks[3]).toMatchObject({
      type: "pdf",
      data: {
        pdf: {
          url: "https://example.com/files/fill.pdf",
          filename: "fill.pdf",
          title: "Fill PDF",
        },
      },
    });

    expect(renderedBlocks[4]).toMatchObject({
      type: "external_link",
      data: {
        external_link: {
          url: "https://example.com/embed/notation-1",
          title: "MuseScore",
          description: "Notation preview",
        },
      },
    });

    expect(renderedBlocks[5]).toMatchObject({
      type: "sync-embed",
      data: {
        sync: "https://sync.musicdott.app/session/abc",
      },
    });
  });
});
