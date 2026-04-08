import { describe, it, expect } from "vitest";
import { buildCacheKey, shouldSkipTranslation } from "../../client/src/hooks/use-translate-text";

describe("buildCacheKey", () => {
  it("builds key from lang and text", () => {
    expect(buildCacheKey("EN", "Hallo")).toBe("EN:Hallo");
  });
});

describe("shouldSkipTranslation", () => {
  it("returns true for empty string", () => {
    expect(shouldSkipTranslation("")).toBe(true);
  });

  it("returns true for whitespace-only string", () => {
    expect(shouldSkipTranslation("   ")).toBe(true);
  });

  it("returns false for non-empty string", () => {
    expect(shouldSkipTranslation("Hallo docent")).toBe(false);
  });

  it("returns true for null", () => {
    expect(shouldSkipTranslation(null)).toBe(true);
  });

  it("returns true for undefined", () => {
    expect(shouldSkipTranslation(undefined)).toBe(true);
  });
});
