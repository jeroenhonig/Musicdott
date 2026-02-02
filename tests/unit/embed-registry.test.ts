import { describe, it, expect } from "vitest";
import { normalizeEmbedModule } from "@/shared/utils";
import { assertHardGuarantees } from "../utils/embed-test-helpers";
import fixturesData from "../fixtures/embed_registry_fixtures.json";

type FixtureCase = {
  id: string;
  input: { raw: string };
  expected: {
    provider?: "groovescribe" | "youtube" | "spotify" | "external" | "unknown";
    type?: "notation" | "video" | "external";
    status?: "embedded" | "fallback";
    embed_url_contains?: string;
    embed_url_equals?: string;
    embed_url_null?: boolean;
    fallback_url_equals_raw?: boolean;
    must_preserve_raw?: boolean;
  };
};

describe("normalizeEmbedModule fixtures", () => {
  const fixtures = (fixturesData as { cases: FixtureCase[] }).cases;

  it("enforces hard guarantees", () => {
    for (const fixture of fixtures) {
      const output = normalizeEmbedModule(fixture.input.raw);
      assertHardGuarantees(output, fixture.input.raw);
    }
  });

  it("matches fixture expectations", () => {
    for (const fixture of fixtures) {
      const output = normalizeEmbedModule(fixture.input.raw);
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

      if (expected.embed_url_contains) {
        expect(output.embed.embed_url).toBeTruthy();
        expect(output.embed.embed_url?.includes(expected.embed_url_contains)).toBe(true);
      }

      if (expected.embed_url_equals) {
        expect(output.embed.embed_url).toBe(expected.embed_url_equals);
      }

      if (expected.fallback_url_equals_raw) {
        expect(output.fallback?.url).toBe(fixture.input.raw);
      }

      if (expected.must_preserve_raw) {
        expect(output.embed.raw).toBe(fixture.input.raw);
      }
    }
  });
});
