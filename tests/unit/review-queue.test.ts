import { describe, expect, it } from "vitest";

import { buildReviewQueue } from "@/modules/learning/domain/review-queue";
import type { LocalLearningProgress } from "@/modules/learning/domain/local-progress";
import type { ReviewScheduleState } from "@/modules/learning/domain/srs";

const progress: LocalLearningProgress = {
  version: 1,
  currentDay: 2,
  days: {},
  attempts: [
    { id: "attempt-1", dayNumber: 1, exerciseId: "ex-1", correct: true, at: "2026-09-13T08:00:00.000Z" },
    { id: "attempt-2", dayNumber: 2, exerciseId: "ex-2", correct: false, at: "2026-09-13T08:30:00.000Z" },
  ],
};

const state = (exerciseId: string, dayNumber: number, dueAt: string, lapses = 0): ReviewScheduleState => ({
  learnerId: "learner-1",
  exerciseId,
  dayNumber,
  repetitions: 1,
  lapses,
  intervalDays: 1,
  easeFactor: 2.3,
  dueAt,
  lastReviewedAt: "2026-09-12T08:00:00.000Z",
});

describe("scheduled review queue", () => {
  it("uses due and overdue SRS states when available", () => {
    const queue = buildReviewQueue(progress, new Date("2026-09-13T10:00:00.000Z"), [
      state("future", 1, "2026-09-14T10:00:00.000Z"),
      state("due", 2, "2026-09-13T10:00:00.000Z"),
      state("overdue", 1, "2026-09-12T10:00:00.000Z", 2),
    ]);
    expect(queue.map((item) => item.exerciseId)).toEqual(["overdue", "due"]);
    expect(queue[0]?.reason).toBe("overdue");
    expect(queue[1]?.reason).toBe("due");
  });

  it("derives SRS state from local attempts when persistence is unavailable", () => {
    const queue = buildReviewQueue(progress, new Date("2026-09-13T08:45:00.000Z"));
    expect(queue[0]?.exerciseId).toBe("ex-2");
    expect(queue[0]?.reason).toBe("overdue");
  });
});
