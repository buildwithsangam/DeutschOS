import { describe, expect, it } from "vitest";
import { projectErrorMemory } from "@/modules/learning/domain/error-memory";
import type { LearnerEvidenceRecord } from "@/modules/learning/domain/learner-evidence";

const evidence = (correct: boolean, occurredAt: string): LearnerEvidenceRecord => ({
  id: `${occurredAt}-${correct}`,
  learnerId: "learner-1",
  dayNumber: 1,
  exerciseId: "ex-1",
  correct,
  skill: "grammar",
  occurredAt,
});

describe("error memory", () => {
  it("classifies repeated errors and reduces influence after recovery", () => {
    const memory = projectErrorMemory([
      evidence(false, "2026-09-01T10:00:00.000Z"),
      evidence(false, "2026-09-02T10:00:00.000Z"),
      evidence(true, "2026-09-03T10:00:00.000Z"),
      evidence(true, "2026-09-04T10:00:00.000Z"),
    ], new Date("2026-09-04T12:00:00.000Z"));

    expect(memory?.category).toBe("grammar");
    expect(memory?.occurrences).toBe(2);
    expect(memory?.resolvedStreak).toBe(2);
    expect(memory?.influence).toBeLessThan(60);
  });

  it("returns no memory for an exercise with no error", () => {
    expect(projectErrorMemory([evidence(true, "2026-09-01T10:00:00.000Z")])).toBeNull();
  });
});
