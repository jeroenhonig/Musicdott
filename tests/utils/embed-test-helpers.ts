import { expect } from "vitest";

export function assertHardGuarantees(module: any, raw: string) {
  expect(module).toBeTruthy();
  expect(module.status).toBeTruthy();
  expect(["embedded", "fallback"]).toContain(module.status);
  expect(module.embed).toBeTruthy();
  expect(module.embed.raw).toBe(raw);

  if (module.status === "embedded") {
    expect(typeof module.embed.embed_url).toBe("string");
    expect(module.embed.embed_url.length).toBeGreaterThan(0);
    expect(module.embed.embed_url.startsWith("http")).toBe(true);
  } else {
    expect(module.embed.embed_url == null).toBe(true);
    expect(module.fallback?.url).toBe(raw);
  }
}
