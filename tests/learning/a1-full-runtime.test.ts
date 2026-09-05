import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { parseFullA1Curriculum } from "@/modules/learning/domain/a1-full-runtime";
import { parseA1DaysOneToFourteen } from "@/modules/curriculum/domain/parse-a1-days-1-14";
import { legacySentenceBuilderAnswers } from "@/modules/curriculum/domain/a1-sentence-builder-contract";
import { parseCurriculum } from "@/modules/curriculum/domain/curriculum-parser.mjs";

const source = readFileSync(
  resolve(process.cwd(), "docs/curriculum/a1-final-42-day-curriculum.md"),
  "utf8",
);

const fullRuntime = parseFullA1Curriculum(source);
const legacyDaysOneToFourteen = parseA1DaysOneToFourteen(source);
const parsedCurriculum = parseCurriculum(source, {
  documentPath: "docs/curriculum/a1-final-42-day-curriculum.md",
});

describe("Full A1 learning runtime", () => {
  it("loads exactly 42 days in order", () => {
    expect(fullRuntime.days).toHaveLength(42);
    expect(fullRuntime.days.map((d) => d.dayNumber)).toEqual(
      Array.from({ length: 42 }, (_, i) => i + 1),
    );
  });

  it("assigns correct week numbers", () => {
    const expectedWeeks = [
      ...Array(7).fill(1),
      ...Array(7).fill(2),
      ...Array(7).fill(3),
      ...Array(7).fill(4),
      ...Array(7).fill(5),
      ...Array(7).fill(6),
    ];

    expect(fullRuntime.days.map((d) => d.weekNumber)).toEqual(expectedWeeks);
  });

  it("preserves Days 1–14 sentence-builder answers exactly", () => {
    for (let i = 1; i <= 14; i++) {
      const day = fullRuntime.days.find((d) => d.dayNumber === i)!;

      expect(day.sentenceBuilder).toBeDefined();
      expect(day.sentenceBuilder!.answer).toBe(
        legacySentenceBuilderAnswers[i],
      );
      expect(day.sentenceBuilders).toHaveLength(1);
      expect(day.sentenceBuilders[0].answer).toBe(
        legacySentenceBuilderAnswers[i],
      );
      expect(day.sentenceBuilders[0].type).toBe("active_sentence");
    }
  });

  it("Days 1–14 runtime output is compatible with legacy output", () => {
    for (let i = 1; i <= 14; i++) {
      const newDay = fullRuntime.days.find((d) => d.dayNumber === i)!;
      const legacyDay = legacyDaysOneToFourteen.days.find(
        (d) => d.dayNumber === i,
      )!;

      expect(newDay.title).toBe(legacyDay.title);
      expect(newDay.objective).toBe(legacyDay.objective);
      expect(newDay.sections.map((s) => s.kind)).toEqual(
        legacyDay.sections.map((s) => s.kind),
      );
      expect(newDay.sections).toHaveLength(legacyDay.sections.length);
      expect(newDay.sentenceBuilder?.answer).toBe(
        legacyDay.sentenceBuilder?.answer,
      );
      expect(newDay.sentenceBuilder?.tokens).toEqual(
        legacyDay.sentenceBuilder?.tokens,
      );
    }
  });

  it("Days 15–42 sentence-builder exercises are source-grounded", () => {
    for (let dayNumber = 15; dayNumber <= 42; dayNumber++) {
      const runtimeDay = fullRuntime.days.find(
        (d) => d.dayNumber === dayNumber,
      )!;

      const parsedDay = parsedCurriculum.days.find(
        (d) => d.number === dayNumber,
      )!;

      const section = parsedDay.sections.find(
        (s) => !s.isAdditional && s.canonicalKey === "sentenceBuilding",
      )!;

      for (const exercise of runtimeDay.sentenceBuilders) {
        if (exercise.type === "active_sentence") {
          expect(exercise.answer).not.toBe("");
          expect(exercise.tokens.length).toBeGreaterThanOrEqual(2);
          expect(
            section.rawMarkdown
              .replace(/\s+/g, " ")
              .toLowerCase()
              .includes(exercise.answer.replace(/\s+/g, " ").toLowerCase()),
          ).toBe(true);
        }

        if (exercise.type === "active_synthesis") {
          expect(exercise.tokens).toEqual([]);
          expect(typeof exercise.answer).toBe("string");
        }

        if (exercise.type === "receptive_example") {
          expect(exercise.tokens).toEqual([]);
          expect(exercise.answer).not.toBe("");
        }

        if (exercise.type === "dialogue_synthesis") {
          expect(exercise.tokens).toEqual([]);
          expect(exercise.answer).toBe("");
        }
      }
    }
  });

  it("preserves interest-driven sections for Days 36–42", () => {
    for (let dayNumber = 36; dayNumber <= 42; dayNumber++) {
      const day = fullRuntime.days.find((d) => d.dayNumber === dayNumber)!;

      expect(
        day.sections.some((s) => s.kind === "interest_driven"),
      ).toBe(true);
    }
  });

  it("preserves retrieval and practical-task sections for all days", () => {
    for (const day of fullRuntime.days) {
      expect(
        day.sections.some((s) => s.kind === "retrieval_review"),
      ).toBe(true);

      expect(
        day.sections.some((s) => s.kind === "practical_task"),
      ).toBe(true);
    }
  });

  it("preserves additional sections as 'other' kind", () => {
    const day7 = fullRuntime.days.find((d) => d.dayNumber === 7)!;

    expect(day7.sections.some((s) => s.kind === "other")).toBe(true);
  });

  it("does not mutate the canonical source text", () => {
    const before = source;

    parseFullA1Curriculum(before);

    expect(before).toBe(source);
  });
});
