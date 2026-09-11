import { describe, expect, it } from "vitest";

import { buildReviewQueue, reviewReasonLabel } from "@/modules/learning/domain/review-queue";
import { createLocalProgress, withAttempt, withDayProgress } from "@/modules/learning/domain/local-progress";

function attempt(
  id: string,
  exerciseId: string,
  dayNumber: number,
  correct: boolean,
  at: string,
) {
  return { id, exerciseId, dayNumber, correct, at };
}

describe("buildReviewQueue", () => {
  it("prioritizes a recent failure over a recent exposure", () => {
    let progress = createLocalProgress();
    progress = withAttempt(progress, attempt("1", "exercise-a", 1, true, "2026-09-10T10:00:00.000Z"));
    progress = withAttempt(progress, attempt("2", "exercise-b", 1, false, "2026-09-10T11:00:00.000Z"));

    const queue = buildReviewQueue(progress, new Date("2026-09-10T12:00:00.000Z"));

    expect(queue.map((item) => item.exerciseId)).toEqual(["exercise-b", "exercise-a"]);
    expect(queue[0]?.reason).toBe("recent_failure");
  });

  it("detects repeated failures even when the latest attempt is correct", () => {
    let progress = createLocalProgress();
    progress = withAttempt(progress, attempt("1", "exercise-a", 2, false, "2026-08-01T10:00:00.000Z"));
    progress = withAttempt(progress, attempt("2", "exercise-a", 2, false, "2026-08-02T10:00:00.000Z"));
    progress = withAttempt(progress, attempt("3", "exercise-a", 2, true, "2026-08-03T10:00:00.000Z"));

    const queue = buildReviewQueue(progress, new Date("2026-09-10T12:00:00.000Z"));

    expect(queue[0]).toMatchObject({
      exerciseId: "exercise-a",
      reason: "repeated_failure",
      failureCount: 2,
    });
  });

  it("uses an explicit day review flag when no attempt is failing", () => {
    let progress = createLocalProgress();
    progress = withDayProgress(progress, 3, { needsReview: true });
    progress = withAttempt(progress, attempt("1", "exercise-a", 3, true, "2026-08-01T10:00:00.000Z"));

    const queue = buildReviewQueue(progress, new Date("2026-09-10T12:00:00.000Z"));

    expect(queue[0]?.reason).toBe("needs_review");
  });

  it("returns no stale candidates", () => {
    let progress = createLocalProgress();
    progress = withAttempt(progress, attempt("1", "exercise-a", 1, true, "2026-07-01T10:00:00.000Z"));

    expect(buildReviewQueue(progress, new Date("2026-09-10T12:00:00.000Z"))).toEqual([]);
  });
});

describe("reviewReasonLabel", () => {
  it("keeps review reasons learner-readable", () => {
    expect(reviewReasonLabel("recent_failure")).toBe("Recent mistake");
    expect(reviewReasonLabel("repeated_failure")).toBe("Repeated mistake");
    expect(reviewReasonLabel("needs_review")).toBe("Marked for review");
    expect(reviewReasonLabel("recent_exposure")).toBe("Recently practised");
  });
});
