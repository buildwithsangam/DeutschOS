import { execFileSync } from "node:child_process";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

type ImportSummary = {
  mode: "dry-run";
  sourceDocument: string;
  importedDays: number[];
  importedWeeks: number[];
  day15OrLaterImported: boolean;
  counts: {
    provenanceSources: number;
    releases: number;
    weeks: number;
    days: number;
    sections: number;
    exercises: number;
    masteryChecks: number;
  };
};

function dryRunImport(): ImportSummary {
  const output = execFileSync(process.execPath, ["scripts/import-a1-days-1-14.mjs", "--dry-run"], {
    cwd: resolve(process.cwd()),
    encoding: "utf8",
  });

  return JSON.parse(output) as ImportSummary;
}

describe("authoritative A1 Days 1–14 import plan", () => {
  it("imports exactly the first two weeks and no future days", () => {
    const summary = dryRunImport();

    expect(summary.sourceDocument).toBe("docs/curriculum/a1-final-42-day-curriculum.md");
    expect(summary.importedWeeks).toEqual([1, 2]);
    expect(summary.importedDays).toEqual(Array.from({ length: 14 }, (_, index) => index + 1));
    expect(summary.day15OrLaterImported).toBe(false);
  });

  it("creates provenance-aware, structured records for every imported day", () => {
    const summary = dryRunImport();

    expect(summary.counts).toEqual({
      provenanceSources: 1,
      releases: 1,
      weeks: 2,
      days: 14,
      sections: 196,
      exercises: 14,
      masteryChecks: 14,
    });
  });
});
