import { describe, expect, it } from "vitest";

import type { A1Curriculum } from "@/modules/curriculum/domain/a1-days-1-14";
import { createLocalProgress, withAttempt, withDayProgress } from "@/modules/learning/domain/local-progress";
import { buildProgressSummary } from "@/modules/learning/domain/progress-summary";

const curriculum = {
  sourceDocument: "test",
  learningScope: { firstDay: 1, lastDay: 3, canonicalTotalDays: 3 },
  days: [1, 2, 3].map((dayNumber) => ({
    dayNumber,
    weekNumber: 1,
    title: `Day ${dayNumber}`,
    objective: "Test",
    sections: [],
    sentenceBuilders: [],
    finalQaOverrides: "",
    finalQaNotices: [],
  })),
} as A1Curriculum;

describe("buildProgressSummary", () => {
  it("counts completed days and append-only evidence", () => {
    let progress = createLocalProgress();
    progress = withDayProgress(progress, 1, {
      lessonCompleted: true,
      practiceCompleted: true,
    });
    progress = withAttempt(progress, {
      id: "a1",
      dayNumber: 1,
      exerciseId: "ex-1",
      correct: true,
      skill: "grammar",
      at: "2026-09-10T10:00:00.000Z",
    });
    progress = withAttempt(progress, {
      id: "a2",
      dayNumber: 1,
      exerciseId: "ex-2",
      correct: false,
      skill: "grammar",
      at: "2026-09-10T11:00:00.000Z",
    });

    const summary = buildProgressSummary(
      curriculum,
      progress,
      new Date("2026-09-10T12:00:00.000Z"),
    );

    expect(summary.totalDays).toBe(3);
    expect(summary.completedDays).toBe(1);
    expect(summary.daysWithEvidence).toBe(1);
    expect(summary.skills.find((skill) => skill.skill === "grammar")).toMatchObject({
      attempts: 2,
      correct: 1,
      incorrect: 1,
      accuracy: 0.5,
    });
    expect(summary.reviewCount).toBe(2);
  });

  it("does not invent skill evidence when no skill-tagged attempts exist", () => {
    const summary = buildProgressSummary(
      curriculum,
      createLocalProgress(),
      new Date("2026-09-10T12:00:00.000Z"),
    );

    expect(summary.skills.every((skill) => skill.attempts === 0 && skill.accuracy === null)).toBe(true);
    expect(summary.reviewCount).toBe(0);
  });
});
