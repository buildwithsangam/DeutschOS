import type { A1Curriculum, A1LearningScope } from "./a1-days-1-14";
import { loadCurriculum, parseCurriculum } from "./curriculum-parser.mjs";

const learningScope: A1LearningScope = { firstDay: 1, lastDay: 14, canonicalTotalDays: 42 };

export function parseA1DaysOneToFourteen(source: string): A1Curriculum {
  const parsed = parseCurriculum(source, { documentPath: "docs/curriculum/a1-final-42-day-curriculum.md" });
  const days = parsed.days.filter((day) => day.number <= 14).map((day) => ({
    dayNumber: day.number,
    weekNumber: day.weekNumber,
    title: day.title,
    objective: day.objectiveMarkdown,
    sections: day.sections
      .filter((section) => section.canonicalKey !== "interestExposure")
      .map((section) => ({
        kind: section.canonicalKey === "lessonContent" ? "main_lesson" : section.canonicalKey === "minimumTheory" ? "grammar" : section.canonicalKey === "dailyCore" ? "daily_german_core" : section.canonicalKey === "sentenceBuilding" ? "sentence_builder" : section.canonicalKey === "retrieval" ? "retrieval_review" : section.canonicalKey === "practicalTask" ? "practical_task" : section.canonicalKey === "repair" ? "communication_repair" : section.canonicalKey === "nativeInteraction" ? "realistic_interaction" : section.canonicalKey === "mastery" ? "mastery_check" : section.canonicalKey ?? "main_lesson",
        title: section.heading,
        markdown: section.rawMarkdown,
        isVocabularyProxy: section.canonicalKey === "lessonContent" && !parsed.days.find((candidate) => candidate.number === day.number)?.sections.some((candidate) => candidate.canonicalKey === "vocabulary"),
      })),
    sentenceBuilder: {
      prompt: day.sections.find((section) => section.canonicalKey === "sentenceBuilding")?.rawMarkdown ?? "",
      answer: day.sections.find((section) => section.canonicalKey === "sentenceBuilding")?.rawMarkdown.split(/\r?\n/).find((line) => /→/.test(line))?.split("→")[1]?.trim() ?? "",
      tokens: (day.sections.find((section) => section.canonicalKey === "sentenceBuilding")?.rawMarkdown.match(/[\p{L}\p{N}]+/gu) ?? []).slice(0, 30),
    },
    finalQaOverrides: day.qaOverride,
    finalQaNotices: day.qaOverride.split("\n").filter((line) => line.includes(`Day ${day.number}`)),
  }));
  return { sourceDocument: "docs/curriculum/a1-final-42-day-curriculum.md", learningScope, days };
}

export function loadA1DaysOneToFourteen(): A1Curriculum {
  const parsed = loadCurriculum();
  return parseA1DaysOneToFourteen(parsed.sourceText);
}
