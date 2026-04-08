import { describe, it, expect, vi, beforeEach } from "vitest";
import { buildTranslateCache, translateText } from "../../server/routes/translate";

// Reset the singleton cache between tests to prevent state leakage
beforeEach(() => {
  const cache = buildTranslateCache();
  cache.clear();
});

describe("translateText", () => {
  it("returns translated text from DeepL", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        translations: [{ text: "Hello teacher" }],
      }),
    });

    const result = await translateText("Hallo docent", "EN", "test-api-key");
    expect(result).toBe("Hello teacher");
  });

  it("returns original text when DeepL call fails", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      json: async () => ({ message: "Quota exceeded" }),
    });

    const result = await translateText("Hallo docent", "EN", "test-api-key");
    expect(result).toBe("Hallo docent");
  });

  it("returns original text when fetch throws", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

    const result = await translateText("Hallo docent", "EN", "test-api-key");
    expect(result).toBe("Hallo docent");
  });
});

describe("buildTranslateCache", () => {
  it("returns same Map instance on each call", () => {
    const cache1 = buildTranslateCache();
    const cache2 = buildTranslateCache();
    expect(cache1).toBe(cache2);
  });

  it("stores and retrieves a cached translation", () => {
    const cache = buildTranslateCache();
    cache.set("EN:Hallo", "Hello");
    expect(cache.get("EN:Hallo")).toBe("Hello");
  });
});
