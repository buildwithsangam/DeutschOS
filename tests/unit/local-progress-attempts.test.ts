import { describe, expect, it } from "vitest";

import {
  createLocalProgress,
  readLocalProgress,
  withAttempt,
} from "@/modules/learning/domain/local-progress";

describe("local progress attempts", () => {
  it("appends retries without replacing previous attempts", () => {
    let progress = createLocalProgress();
    progress = withAttempt(progress, {
      id: "attempt-1",
      dayNumber: 1,
      exerciseId: "exercise-1",
      correct: false,
      at: "2026-09-10T10:00:00.000Z",
    });
    progress = withAttempt(progress, {
      id: "attempt-2",
      dayNumber: 1,
      exerciseId: "exercise-1",
      correct: true,
      at: "2026-09-10T10:01:00.000Z",
    });

    expect(progress.attempts).toHaveLength(2);
    expect(progress.attempts.map((item) => item.correct)).toEqual([false, true]);
  });

  it("keeps old version-1 progress readable when attempts are absent", () => {
    const progress = readLocalProgress(
      JSON.stringify({
        version: 1,
        currentDay: 3,
        days: {
          1: {
            lessonCompleted: true,
            practiceCompleted: true,
            sentenceBuilderCompleted: true,
            completedPracticeTaskIds: [],
            needsReview: false,
            masteryStatus: "developing",
          },
        },
      }),
    );

    expect(progress.currentDay).toBe(3);
    expect(progress.attempts).toEqual([]);
  });
});
