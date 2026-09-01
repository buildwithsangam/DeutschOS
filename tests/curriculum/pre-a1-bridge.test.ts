import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const source = readFileSync(resolve(process.cwd(), "docs/curriculum/pre-a1-15-day-bridge-v1.md"), "utf8");

describe("optional Pre-A1 bridge boundary", () => {
  it("contains exactly 15 lightweight sessions and preserves optional A1 entry", () => {
    const sessions = [...source.matchAll(/^### Session (\d+) —/gm)].map((match) => Number(match[1]));
    expect(sessions).toEqual(Array.from({ length: 15 }, (_, index) => index + 1));
    expect(source).toContain("not an A1 curriculum");
    expect(source).toContain("does not change A1 Day 1 unlocking");
    expect(source).toContain("Start A1 Day 1");
  });

  it("defers A1 grammar and practical domains rather than reintroducing them", () => {
    expect(source).toContain("no article/gender system");
    expect(source).toContain("no present-tense tables");
    expect(source).toContain("no family/home/routine/shopping/city/transport/work/appointment curriculum");
    expect(source).toContain("no numbers, dates, time, price vocabulary");
  });
});
