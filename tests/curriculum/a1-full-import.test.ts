import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(process.cwd());
const sourcePath = resolve(root, "docs/curriculum/a1-final-42-day-curriculum.md");
const duplicatePath = resolve(root, "docs/curriculum/a1-final-42-day-curriculum copy.md");

function runDryRun() {
  const output = execFileSync(process.execPath, ["scripts/import-a1-curriculum.mjs", "--dry-run"], { cwd: root, encoding: "utf8" });
  return JSON.parse(output) as {
    mode: string;
    sourceDocument: string;
    weeks: number;
    days: number;
    phases: number;
    validation: string;
    databaseWrites: number;
    sourceModified: boolean;
    counts: Record<string, number>;
  };
}

describe("full A1 curriculum foundation", () => {
  it("parses and validates the complete 42-day curriculum", () => {
    const summary = runDryRun();
    expect(summary.mode).toBe("dry-run");
    expect(summary.sourceDocument).toBe("docs/curriculum/a1-final-42-day-curriculum.md");
    expect(summary.weeks).toBe(6);
    expect(summary.days).toBe(42);
    expect(summary.phases).toBe(3);
    expect(summary.validation).toBe("PASS");
  });

  it("never writes to the database or source document", () => {
    const before = readFileSync(sourcePath, "utf8");
    const summary = runDryRun();
    const after = readFileSync(sourcePath, "utf8");
    expect(summary.databaseWrites).toBe(0);
    expect(summary.sourceModified).toBe(false);
    expect(after).toBe(before);
  });

  it("preserves the duplicate as non-authoritative input", () => {
    expect(readFileSync(duplicatePath, "utf8")).toBe(readFileSync(sourcePath, "utf8"));
  });

  it("rejects an apply attempt in P0.2", () => {
    expect(() => execFileSync(process.execPath, ["scripts/import-a1-curriculum.mjs", "--apply"], { cwd: root, encoding: "utf8", stdio: "pipe" })).toThrow();
  });

  it("produces deterministic counts across repeated dry runs", () => {
    expect(runDryRun().counts).toEqual(runDryRun().counts);
  });
});
