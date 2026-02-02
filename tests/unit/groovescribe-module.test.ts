import { describe, it, expect } from "vitest";
import { normalizeGroovescribeEmbed } from "@/shared/utils";
import fixturesData from "../fixtures/groovescribe-module-fixtures.json";

type FixtureCase = {
  id: string;
  input: {
    raw: string;
  };
  expected: {
    type?: "notation";
    provider?: "groovescribe" | "external";
    provider_any_of?: Array<"groovescribe" | "external">;
    status?: "embedded" | "fallback";
    status_any_of?: Array<"embedded" | "fallback">;
    embed_url_contains?: string;
    embed_url_contains_any_of?: string[];
    embed_url_equals_raw?: boolean;
    embed_url_null?: boolean;
    fallback_url_equals_raw?: boolean;
    must_preserve_raw?: boolean;
  };
};

describe("Groovescribe module fixtures", () => {
  const fixtures = (fixturesData as { cases: FixtureCase[] }).cases;

  it("enforces hard guarantees and status invariants", () => {
    for (const fixture of fixtures) {
      const module = normalizeGroovescribeEmbed(fixture.input.raw);

      expect(module).toBeTruthy();
      expect(module.type).toBe("notation");
      expect(module.status).toBeTruthy();
      expect(module.embed).toBeTruthy();
      expect(module.embed.raw).toBe(fixture.input.raw);

      expect(["embedded", "fallback"]).toContain(module.status);

      if (module.status === "embedded") {
        expect(typeof module.embed.embed_url).toBe("string");
        expect(module.embed.embed_url?.length ?? 0).toBeGreaterThan(0);
        expect(module.embed.embed_url?.startsWith("http")).toBe(true);
      }

      if (module.status === "fallback") {
        expect(module.embed.embed_url == null).toBe(true);
        expect(module.fallback?.url).toBe(fixture.input.raw);
      }
    }
  });

  it("matches fixture expectations", () => {
    for (const fixture of fixtures) {
      const output = normalizeGroovescribeEmbed(fixture.input.raw);
      const expected = fixture.expected;

      if (expected.type) {
        expect(output.type).toBe(expected.type);
      }

      if (expected.provider) {
        expect(output.provider).toBe(expected.provider);
      }

      if (expected.provider_any_of) {
        expect(expected.provider_any_of).toContain(output.provider);
      }

      if (expected.status) {
        expect(output.status).toBe(expected.status);
      }

      if (expected.status_any_of) {
        expect(expected.status_any_of).toContain(output.status);
      }

      if (expected.embed_url_null) {
        expect(output.embed.embed_url).toBeNull();
      }

      if (expected.embed_url_contains) {
        expect(output.embed.embed_url).toBeTruthy();
        expect(output.embed.embed_url?.includes(expected.embed_url_contains)).toBe(true);
      }

      if (expected.embed_url_contains_any_of) {
        expect(output.embed.embed_url).toBeTruthy();
        const matched = expected.embed_url_contains_any_of.some((needle) =>
          output.embed.embed_url?.includes(needle)
        );
        expect(matched).toBe(true);
      }

      if (expected.embed_url_equals_raw) {
        expect(output.embed.embed_url).toBe(fixture.input.raw);
      }

      if (expected.fallback_url_equals_raw) {
        expect(output.fallback.url).toBe(fixture.input.raw);
      }

      if (expected.must_preserve_raw) {
        expect(output.embed.raw).toBe(fixture.input.raw);
      }
    }
  });
});
