import { describe, expect, it } from "vitest";

import { createLocalProgress, isDayUnlocked, readLocalProgress, withDayProgress } from "@/modules/learning/domain/local-progress";

describe("local learning progress", () => {
  it("unlocks a next day only when the preceding lesson and practice are complete", () => {
    const fresh = createLocalProgress();
    expect(isDayUnlocked(fresh, 1)).toBe(true);
    expect(isDayUnlocked(fresh, 2)).toBe(false);

    const lessonOnly = withDayProgress(fresh, 1, { lessonCompleted: true });
    expect(isDayUnlocked(lessonOnly, 2)).toBe(false);

    const complete = withDayProgress(lessonOnly, 1, { practiceCompleted: true });
    expect(isDayUnlocked(complete, 2)).toBe(true);
  });

  it("does not use mastery status as an unlock condition and restores valid local data", () => {
    const masteryOnly = withDayProgress(createLocalProgress(), 1, { masteryStatus: "strong_evidence" });
    expect(isDayUnlocked(masteryOnly, 2)).toBe(false);
    expect(readLocalProgress(JSON.stringify({ version: 1, currentDay: 1, days: { 1: { lessonCompleted: true, practiceCompleted: true, sentenceBuilderCompleted: true, needsReview: false, masteryStatus: "developing" } } }))).toEqual(expect.objectContaining({ currentDay: 1 }));
  });
});
