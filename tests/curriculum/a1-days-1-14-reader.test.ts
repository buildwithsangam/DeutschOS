import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { parseA1DaysOneToFourteen } from "@/modules/curriculum/domain/parse-a1-days-1-14";

const source = readFileSync(resolve(process.cwd(), "docs/curriculum/a1-final-42-day-curriculum.md"), "utf8");
const curriculum = parseA1DaysOneToFourteen(source);

describe("A1 Days 1–14 learner curriculum reader", () => {
  it("exposes only ordered Days 1–14 across Weeks 1–2", () => {
    expect(curriculum.sourceDocument).toBe("docs/curriculum/a1-final-42-day-curriculum.md");
    expect(curriculum.days.map((day) => day.dayNumber)).toEqual(Array.from({ length: 14 }, (_, index) => index + 1));
    expect(curriculum.days.slice(0, 7).every((day) => day.weekNumber === 1)).toBe(true);
    expect(curriculum.days.slice(7).every((day) => day.weekNumber === 2)).toBe(true);
  });

  it("keeps structured source content, canonical builder answers, and final QA precedence", () => {
    for (const day of curriculum.days) {
      expect(day.sections).toHaveLength(15);
      expect(day.sentenceBuilder.answer.length).toBeGreaterThan(1);
      expect(day.sentenceBuilder.tokens.length).toBeGreaterThan(1);
      expect(day.finalQaOverrides).toContain("MUST TAKE PRECEDENCE");
    }
    expect(curriculum.days[12].finalQaOverrides).toContain("Day 13 must NOT require future Core item");
    expect(curriculum.days[12].finalQaNotices).toContain("- Day 13 must NOT require future Core item “die Verspätung”. Use already introduced repair/apology language such as “Entschuldigung!” / “Es tut mir leid!” with already available language.");
  });
});
