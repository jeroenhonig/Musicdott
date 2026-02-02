import { describe, it, expect } from "vitest";
import { normalizeSpotifyEmbed } from "@/shared/utils";
import { assertHardGuarantees } from "../utils/embed-test-helpers";
import fixturesData from "../fixtures/spotify_embed_fixtures.json";

type FixtureCase = {
  id: string;
  input: { raw: string };
  expected: {
    provider?: "spotify";
    type?: "video";
    status?: "embedded" | "fallback";
    embed_url_equals?: string;
    embed_url_null?: boolean;
    must_preserve_raw?: boolean;
  };
};

describe("normalizeSpotifyEmbed fixtures", () => {
  const fixtures = (fixturesData as { cases: FixtureCase[] }).cases;

  it("enforces hard guarantees", () => {
    for (const fixture of fixtures) {
      const output = normalizeSpotifyEmbed(fixture.input.raw);
      assertHardGuarantees(output, fixture.input.raw);
    }
  });

  it("matches fixture expectations", () => {
    for (const fixture of fixtures) {
      const output = normalizeSpotifyEmbed(fixture.input.raw);
      const expected = fixture.expected;

      if (expected.provider) {
        expect(output.provider).toBe(expected.provider);
      }

      if (expected.type) {
        expect(output.type).toBe(expected.type);
      }

      if (expected.status) {
        expect(output.status).toBe(expected.status);
      }

      if (expected.embed_url_null) {
        expect(output.embed.embed_url).toBeNull();
      }

      if (expected.embed_url_equals) {
        expect(output.embed.embed_url).toBe(expected.embed_url_equals);
      }

      if (expected.must_preserve_raw) {
        expect(output.embed.raw).toBe(fixture.input.raw);
      }
    }
  });
});
