import type { A1Curriculum, A1LearningScope, A1SectionKind } from "./a1-days-1-14";
import { loadCurriculum, parseCurriculum } from "./curriculum-parser.mjs";

const sourceDocument = "docs/curriculum/a1-final-42-day-curriculum.md";
const learningScope: A1LearningScope = { firstDay: 1, lastDay: 14, canonicalTotalDays: 42 };

const legacyKindByCanonicalKey: Record<string, A1SectionKind> = {
  lessonContent: "main_lesson",
  minimumTheory: "grammar",
  dailyCore: "daily_german_core",
  pronunciation: "pronunciation",
  listening: "listening",
  speaking: "speaking",
  reading: "reading",
  writing: "writing",
  sentenceBuilding: "sentence_builder",
  retrieval: "retrieval_review",
  practicalTask: "practical_task",
  repair: "communication_repair",
  nativeInteraction: "realistic_interaction",
  mastery: "mastery_check",
};

function toLegacy(source: string): A1Curriculum {
  const parsed = parseCurriculum(source, { documentPath: sourceDocument });
  return {
    sourceDocument,
    learningScope,
    days: parsed.days.filter((day) => day.number <= 14).map((day) => ({
      dayNumber: day.number,
      weekNumber: day.weekNumber,
      title: day.title,
      objective: day.objectiveMarkdown,
      sections: day.sections
        .filter((section) => section.canonicalKey !== "objective" && section.canonicalKey !== "interestExposure")
        .map((section) => ({
          kind: legacyKindByCanonicalKey[section.canonicalKey ?? ""] ?? "main_lesson",
          title: section.heading,
          markdown: section.rawMarkdown,
          isVocabularyProxy: section.canonicalKey === "lessonContent",
        })),
      sentenceBuilder: {
        prompt: day.sections.find((section) => section.canonicalKey === "sentenceBuilding")?.rawMarkdown ?? "",
        answer: day.sections.find((section) => section.canonicalKey === "sentenceBuilding")?.rawMarkdown.match(/→\s*(.+)/)?.[1]?.trim() ?? "",
        tokens: day.sections.find((section) => section.canonicalKey === "sentenceBuilding")?.rawMarkdown.match(/[\p{L}\p{N}]+/gu) ?? [],
      },
      finalQaOverrides: day.qaOverride,
      finalQaNotices: day.qaOverride.split("\n").filter((line) => line.includes(`Day ${day.number}`)),
    })),
  };
}

export function parseA1DaysOneToFourteen(source: string): A1Curriculum {
  return toLegacy(source);
}

export function loadA1DaysOneToFourteen(): A1Curriculum {
  return toLegacy(loadCurriculum().sourceText);
}
