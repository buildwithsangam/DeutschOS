import { describe, expect, it } from "vitest";

import { localAttemptToEvidence } from "@/modules/learning/domain/learner-evidence";

describe("learner evidence adapter", () => {
  it("maps local append-only attempts into durable learner evidence", () => {
    const evidence = localAttemptToEvidence("learner-1", {
      id: "attempt-1",
      dayNumber: 1,
      exerciseId: "greetings-1",
      correct: true,
      result: "correct",
      skill: "grammar",
      response: "Ich bin Anna.",
      at: "2026-09-13T09:00:00.000Z",
    });

    expect(evidence).toEqual({
      id: "attempt-1",
      learnerId: "learner-1",
      dayNumber: 1,
      exerciseId: "greetings-1",
      correct: true,
      result: "correct",
      skill: "grammar",
      response: "Ich bin Anna.",
      occurredAt: "2026-09-13T09:00:00.000Z",
    });
  });
});
