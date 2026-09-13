import { describe, expect, it } from "vitest";

import {
  buildScheduledReviewQueue,
  initialReviewState,
  interleaveReviewQueue,
  scheduleReview,
} from "@/modules/learning/domain/srs";

describe("SRS scheduler", () => {
  it("puts a first successful retrieval one day out", () => {
    const state = initialReviewState({
      learnerId: "learner-1",
      exerciseId: "ex-1",
      dayNumber: 1,
      reviewedAt: "2026-09-13T10:00:00.000Z",
      correct: true,
    });

    expect(state.repetitions).toBe(1);
    expect(state.intervalDays).toBe(1);
    expect(state.dueAt).toBe("2026-09-14T10:00:00.000Z");
  });

  it("expands intervals after consecutive successful retrievals", () => {
    const first = initialReviewState({
      learnerId: "learner-1",
      exerciseId: "ex-1",
      dayNumber: 1,
      reviewedAt: "2026-09-13T10:00:00.000Z",
      correct: true,
    });
    const second = scheduleReview(first, "correct", "2026-09-14T10:00:00.000Z");
    const third = scheduleReview(second, "correct", "2026-09-17T10:00:00.000Z");

    expect(second.intervalDays).toBe(3);
    expect(third.intervalDays).toBeGreaterThan(second.intervalDays);
    expect(third.repetitions).toBe(3);
  });

  it("resets retrieval interval after a failure and records a lapse", () => {
    const state = initialReviewState({
      learnerId: "learner-1",
      exerciseId: "ex-1",
      dayNumber: 1,
      reviewedAt: "2026-09-13T10:00:00.000Z",
      correct: true,
    });
    const recovered = scheduleReview(state, "correct", "2026-09-14T10:00:00.000Z");
    const failed = scheduleReview(recovered, "incorrect", "2026-09-17T10:00:00.000Z");

    expect(failed.repetitions).toBe(0);
    expect(failed.lapses).toBe(1);
    expect(failed.intervalDays).toBe(0);
    expect(failed.dueAt).toBe("2026-09-17T10:10:00.000Z");
  });

  it("returns only due items and prioritizes overdue struggling items", () => {
    const states = [
      {
        ...initialReviewState({
          learnerId: "learner-1",
          exerciseId: "due",
          dayNumber: 1,
          reviewedAt: "2026-09-12T10:00:00.000Z",
          correct: true,
        }),
        dueAt: "2026-09-13T10:00:00.000Z",
      },
      {
        ...initialReviewState({
          learnerId: "learner-1",
          exerciseId: "future",
          dayNumber: 2,
          reviewedAt: "2026-09-13T10:00:00.000Z",
          correct: true,
        }),
        dueAt: "2026-09-15T10:00:00.000Z",
      },
      {
        ...initialReviewState({
          learnerId: "learner-1",
          exerciseId: "overdue",
          dayNumber: 3,
          reviewedAt: "2026-09-10T10:00:00.000Z",
          correct: false,
        }),
        dueAt: "2026-09-12T10:00:00.000Z",
        lapses: 2,
      },
    ];

    const queue = buildScheduledReviewQueue(
      states,
      new Date("2026-09-13T10:00:00.000Z"),
    );

    expect(queue.map((item) => item.exerciseId)).toEqual(["overdue", "due"]);
  });

  it("interleaves candidates from different learning days", () => {
    const candidates = [
      { ...initialReviewState({ learnerId: "l", exerciseId: "a", dayNumber: 1, reviewedAt: "2026-09-13T10:00:00.000Z", correct: true }), overdueDays: 2, priority: 50 },
      { ...initialReviewState({ learnerId: "l", exerciseId: "b", dayNumber: 1, reviewedAt: "2026-09-13T10:00:00.000Z", correct: true }), overdueDays: 1, priority: 40 },
      { ...initialReviewState({ learnerId: "l", exerciseId: "c", dayNumber: 2, reviewedAt: "2026-09-13T10:00:00.000Z", correct: true }), overdueDays: 1, priority: 45 },
    ];

    const result = interleaveReviewQueue(candidates);

    expect(result.map((item) => item.exerciseId)).toEqual(["a", "c", "b"]);
  });
});
