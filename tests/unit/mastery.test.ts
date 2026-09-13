import { describe, expect, it } from "vitest";

import {
  projectDayMastery,
  projectExerciseMastery,
  projectSkillMastery,
} from "@/modules/learning/domain/mastery";

const evidence = [
  {
    id: "1",
    learnerId: "learner",
    dayNumber: 1,
    exerciseId: "ex-1",
    correct: true,
    skill: "grammar" as const,
    occurredAt: "2026-09-13T08:00:00.000Z",
  },
  {
    id: "2",
    learnerId: "learner",
    dayNumber: 1,
    exerciseId: "ex-1",
    correct: true,
    skill: "grammar" as const,
    occurredAt: "2026-09-13T08:10:00.000Z",
  },
  {
    id: "3",
    learnerId: "learner",
    dayNumber: 1,
    exerciseId: "ex-1",
    correct: true,
    skill: "grammar" as const,
    occurredAt: "2026-09-13T08:20:00.000Z",
  },
];

describe("mastery projection", () => {
  it("projects strong evidence only after sufficient attempts", () => {
    expect(projectSkillMastery(evidence, "grammar")).toMatchObject({
      masteryStatus: "strong_evidence",
      attempts: 3,
      correctAttempts: 3,
      evidenceLevel: "sufficient",
    });
  });

  it("keeps low-evidence performance out of strong mastery", () => {
    expect(
      projectExerciseMastery(evidence.slice(0, 1), "ex-1"),
    ).toMatchObject({
      masteryStatus: "needs_practice",
      attempts: 1,
      evidenceLevel: "emerging",
    });
  });

  it("projects evidence at day scope independently", () => {
    expect(projectDayMastery(evidence, 1)).toMatchObject({
      scope: "day",
      scopeKey: "1",
      attempts: 3,
    });

    expect(projectDayMastery(evidence, 2)).toMatchObject({
      attempts: 0,
      masteryStatus: "not_assessed",
      evidenceLevel: "none",
    });
  });
});
