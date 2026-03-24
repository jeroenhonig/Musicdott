import { describe, expect, it } from "vitest";
import { resolveStorageMode } from "../../server/storage-wrapper";

describe("resolveStorageMode", () => {
  it("prefers database storage when auto mode has a healthy database", () => {
    expect(resolveStorageMode({
      requestedMode: "auto",
      databaseAvailable: true,
      allowDegradedStorage: false,
    })).toBe("database");
  });

  it("allows explicit in-memory mode without a database", () => {
    expect(resolveStorageMode({
      requestedMode: "memory",
      databaseAvailable: false,
      allowDegradedStorage: false,
    })).toBe("memory");
  });

  it("falls back to memory only when degraded mode is allowed", () => {
    expect(resolveStorageMode({
      requestedMode: "auto",
      databaseAvailable: false,
      allowDegradedStorage: true,
    })).toBe("memory");
  });

  it("rejects database mode when the database is unavailable", () => {
    expect(() => resolveStorageMode({
      requestedMode: "database",
      databaseAvailable: false,
      allowDegradedStorage: true,
    })).toThrow(/database storage was requested/i);
  });

  it("rejects implicit fallback when degraded mode is disabled", () => {
    expect(() => resolveStorageMode({
      requestedMode: "auto",
      databaseAvailable: false,
      allowDegradedStorage: false,
    })).toThrow(/degraded storage mode is disabled/i);
  });
});
