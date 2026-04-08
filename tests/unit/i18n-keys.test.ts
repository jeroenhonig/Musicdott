import { describe, it, expect } from "vitest";
import { translations, translate } from "../../client/src/lib/i18n";

const requiredKeys = [
  "nav.analytics",
  "nav.import",
  "nav.resources",
  "nav.schoolManagement",
  "nav.teachers",
  "nav.members",
  "nav.billing",
  "nav.schoolSettings",
  "nav.section.learningHub",
  "nav.section.schoolManagement",
  "progress.teacherNotes",
  "progress.studentNotes",
  "progress.timeSpent",
  "progress.noData",
  "progress.noDataDescription",
  "progress.translated",
  "aria.toggleMenu",
  "aria.userProfile",
];

describe("i18n required keys", () => {
  it("has all required keys with EN and NL translations", () => {
    const missing: string[] = [];
    for (const key of requiredKeys) {
      if (!translations[key]) missing.push(key);
    }
    expect(missing).toEqual([]);
  });

  it("translate() returns NL text for NL language", () => {
    expect(translate("nav.analytics", "nl")).toBe("Analyses & Rapporten");
  });

  it("translate() returns EN text for EN language", () => {
    expect(translate("nav.analytics", "en")).toBe("Analytics & Reports");
  });
});
