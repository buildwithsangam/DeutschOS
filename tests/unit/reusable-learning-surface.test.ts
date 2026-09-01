import { describe, expect, it } from "vitest";

import { createGeminiHandoffPrompt } from "@/modules/ai/application/create-gemini-handoff";
import { lessonSectionsForDisplay, type A1Day } from "@/modules/curriculum/domain/a1-days-1-14";
import { createLocalProgress, isDayUnlocked, withDayProgress } from "@/modules/learning/domain/local-progress";
import { practiceTasksForDay } from "@/modules/learning/domain/practice-tasks";

const futureDayFixture: A1Day = {
  dayNumber: 26,
  weekNumber: 4,
  title: "Future day fixture",
  objective: "Fixture objective.",
  finalQaOverrides: "",
  finalQaNotices: [],
  sentenceBuilder: { prompt: "Arrange the canonical fixture tokens.", answer: "Ich übe heute.", tokens: ["Ich", "übe", "heute", "."] },
  sections: [
    { kind: "main_lesson", title: "Main lesson", markdown: "Fixture lesson context." },
    { kind: "vocabulary", title: "Vocabulary", markdown: "", isVocabularyProxy: true },
    { kind: "pronunciation", title: "Pronunciation", markdown: "Fixture pronunciation target." },
    { kind: "daily_german_core", title: "Daily German Core", markdown: "Fixture Core item." },
    { kind: "retrieval_review", title: "Retrieval", markdown: "Recall the fixture pattern." },
    { kind: "practical_task", title: "Practical task", markdown: "Use the fixture pattern in a scenario." },
    { kind: "grammar", title: "Empty optional grammar", markdown: "" },
  ],
};

describe("reusable learning surface", () => {
  it("represents a future arbitrary day without expanding the active curriculum", () => {
    expect(futureDayFixture.dayNumber).toBe(26);
    expect(futureDayFixture.weekNumber).toBe(4);
    expect(lessonSectionsForDisplay(futureDayFixture).map((section) => section.kind)).toEqual([
      "main_lesson",
      "pronunciation",
      "daily_german_core",
      "retrieval_review",
      "practical_task",
    ]);
    expect(practiceTasksForDay(futureDayFixture).map((task) => task.kind)).toEqual([
      "sentence_builder",
      "retrieval",
      "practical_response",
    ]);
  });

  it("keeps sequential unlocking for arbitrary day numbers", () => {
    const throughDayTwentyFive = withDayProgress(createLocalProgress(), 25, {
      lessonCompleted: true,
      practiceCompleted: true,
    });
    expect(isDayUnlocked(throughDayTwentyFive, 26)).toBe(true);
    expect(isDayUnlocked(throughDayTwentyFive, 27)).toBe(false);
  });

  it("creates a day-aware tutor handoff with pronunciation and practical context", () => {
    const prompt = createGeminiHandoffPrompt({
      mode: "Pronunciation Practice",
      day: futureDayFixture,
      curriculum: { learningScope: { firstDay: 1, lastDay: 14, canonicalTotalDays: 42 } },
    });
    expect(prompt).toContain("Day 26 (Week 4)");
    expect(prompt).toContain("Days 1–14");
    expect(prompt).toContain("Fixture pronunciation target.");
    expect(prompt).toContain("Use the fixture pattern in a scenario.");
    expect(prompt).toContain("A2/B1/B2");
    expect(prompt).toContain("3–5 connected examples/prompts");
    expect(prompt).toContain("reconstruction/retry");
  });
});
