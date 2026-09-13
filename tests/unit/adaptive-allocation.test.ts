import { describe, expect, it } from "vitest";
import { buildAdaptiveExerciseQueue } from "@/modules/learning/domain/adaptive-allocation";
import { createLocalProgress, withAttempt } from "@/modules/learning/domain/local-progress";
import type { ErrorMemory } from "@/modules/learning/domain/error-memory";

const errorMemory: ErrorMemory = {
  learnerId: "local",
  exerciseId: "weak",
  dayNumber: 1,
  category: "grammar",
  skill: "grammar",
  occurrences: 2,
  recentOccurrences: 2,
  resolvedStreak: 0,
  lastOccurredAt: "2026-09-13T08:00:00.000Z",
  lastResolvedAt: null,
  influence: 80,
};

describe("adaptive allocation", () => {
  it("prioritizes a repeated weak exercise over a new exercise", () => {
    let progress = createLocalProgress();
    progress = withAttempt(progress, { id: "a1", dayNumber: 1, exerciseId: "weak", correct: false, skill: "grammar", at: "2026-09-13T08:00:00.000Z" });
    const queue = buildAdaptiveExerciseQueue(progress, [
      { exerciseId: "new", dayNumber: 1, skill: "vocabulary" },
      { exerciseId: "weak", dayNumber: 1, skill: "grammar" },
    ], { now: new Date("2026-09-13T10:00:00.000Z"), errorMemory: [errorMemory], limit: 2 });

    expect(queue[0].exerciseId).toBe("weak");
    expect(queue[0].reasons).toContain("repeated error");
  });

  it("does not over-penalize recently successful practice", () => {
    const progress = withAttempt(createLocalProgress(), { id: "a1", dayNumber: 1, exerciseId: "recovered", correct: true, at: "2026-09-13T09:30:00.000Z" });
    const queue = buildAdaptiveExerciseQueue(progress, [
      { exerciseId: "recovered", dayNumber: 1 },
      { exerciseId: "new", dayNumber: 1 },
    ], { now: new Date("2026-09-13T10:00:00.000Z"), limit: 2 });

    expect(queue.find((item) => item.exerciseId === "recovered")?.score).toBeLessThan(queue.find((item) => item.exerciseId === "new")?.score ?? 0);
  });
});
