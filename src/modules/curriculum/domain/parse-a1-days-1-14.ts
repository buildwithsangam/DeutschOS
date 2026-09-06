import type {
  A1Curriculum,
  A1LearningScope,
  A1SectionKind,
} from "./a1-days-1-14";
import {
  legacySentenceBuilderAnswers,
  verifyLegacyAnswer,
} from "./a1-sentence-builder-contract";
import { loadCurriculum, parseCurriculum } from "./curriculum-parser.mjs";
import type { ParsedDay, ParsedSection } from "./curriculum-parser.d.mts";

const sourceDocument =
  "docs/curriculum/a1-final-42-day-curriculum.md";

function primarySection(day: ParsedDay, kind: string) {
  return day.sections.find(
    (section) =>
      !section.isAdditional &&
      section.canonicalKey === kind,
  );
}

function sectionToLegacy(
  section: ParsedSection,
  kind: A1SectionKind,
  isVocabularyProxy = false,
) {
  return {
    id: section.id,
    kind,
    title: isVocabularyProxy
      ? "Vocabulary & patterns in today’s lesson"
      : section.heading,
    markdown: section.rawMarkdown,
    isVocabularyProxy,
  };
}

function sentenceBuilder(
  section: ParsedSection,
  dayNumber: number,
) {
  const canonicalAnswer =
    legacySentenceBuilderAnswers[dayNumber];

  if (!canonicalAnswer) {
    throw new Error(
      `Day ${dayNumber} has no legacy sentence-builder contract`,
    );
  }

  if (!verifyLegacyAnswer(dayNumber, section.rawMarkdown)) {
    throw new Error(
      `Day ${dayNumber} legacy sentence-builder answer is not present in the canonical source section`,
    );
  }

  const tokens =
    canonicalAnswer.match(
      /[\p{L}\p{N}]+(?:[-'][\p{L}\p{N}]+)*|[.,?!:;]/gu,
    ) ?? [];

  if (tokens.length < 2) {
    throw new Error(
      `Day ${dayNumber} sentence-builder answer has too few tokens`,
    );
  }

  return {
    prompt: section.rawMarkdown,
    answer: canonicalAnswer,
    tokens,
  };
}

function toLegacyDay(
  day: ParsedDay,
): A1Curriculum["days"][number] {
  const map: Array<
    [A1SectionKind, string, boolean?]
  > = [
    ["main_lesson", "lessonContent"],
    ["vocabulary", "lessonContent", true],
    ["grammar", "minimumTheory"],
    ["daily_german_core", "dailyCore"],
    ["pronunciation", "pronunciation"],
    ["listening", "listening"],
    ["speaking", "speaking"],
    ["reading", "reading"],
    ["writing", "writing"],
    ["sentence_builder", "sentenceBuilding"],
    ["retrieval_review", "retrieval"],
    ["practical_task", "practicalTask"],
    ["communication_repair", "repair"],
    ["realistic_interaction", "nativeInteraction"],
    ["mastery_check", "mastery"],
  ];

  const sections = map.map(
    ([legacyKind, canonicalKey, isVocabularyProxy]) => {
      const section = primarySection(
        day,
        canonicalKey,
      );

      if (!section) {
        throw new Error(
          `Day ${day.number} is missing ${canonicalKey}`,
        );
      }

      return sectionToLegacy(
        section,
        legacyKind,
        isVocabularyProxy,
      );
    },
  );

  const builder = primarySection(
    day,
    "sentenceBuilding",
  );

  if (!builder) {
    throw new Error(
      `Day ${day.number} is missing sentenceBuilding`,
    );
  }

  const weekQa = day.qaOverride;

  const weekQaStart =
    weekQa
      .split("\n\n")
      .find((block) => block.startsWith("## Week")) ??
    "";

  const legacyBuilder = sentenceBuilder(
    builder,
    day.number,
  );

  const sentenceBuilders = [
    {
      id: `${builder.id}.ex1`,
      type: "active_sentence" as const,
      prompt: builder.rawMarkdown,
      answer: legacyBuilder.answer,
      tokens: legacyBuilder.tokens,
    },
  ];

  return {
    dayNumber: day.number,
    weekNumber: day.weekNumber,
    title: day.title,
    objective:
      primarySection(day, "objective")?.rawMarkdown ?? "",
    sections,
    sentenceBuilder: legacyBuilder,
    sentenceBuilders,
    finalQaOverrides: [
      "# FINAL QA OVERRIDES — MUST TAKE PRECEDENCE OVER EARLIER WEEKLY DRAFT WORDING",
      weekQa,
    ]
      .filter(Boolean)
      .join("\n\n"),
    finalQaNotices: weekQaStart
      .split("\n")
      .filter((line) =>
        line.includes(`Day ${day.number}`),
      ),
  };
}

export function parseA1Curriculum(
  source: string,
  learningScope: A1LearningScope,
): A1Curriculum {
  const parsed = parseCurriculum(source);

  if (
    learningScope.firstDay < 1 ||
    learningScope.lastDay < learningScope.firstDay ||
    learningScope.lastDay > parsed.days.length
  ) {
    throw new Error(
      "Canonical A1 curriculum could not be read: invalid learning scope",
    );
  }

  if (
    learningScope.canonicalTotalDays !==
    parsed.days.length
  ) {
    throw new Error(
      "Canonical A1 curriculum could not be read: learning scope does not match canonical day count",
    );
  }

  const selected = parsed.days.filter(
    (day) =>
      day.number >= learningScope.firstDay &&
      day.number <= learningScope.lastDay,
  );

  if (
    selected.length !==
    learningScope.lastDay -
      learningScope.firstDay +
      1
  ) {
    throw new Error(
      "Canonical A1 curriculum could not be read: loaded day count does not match learning scope",
    );
  }

  return {
    sourceDocument,
    learningScope,
    days: selected.map(toLegacyDay),
  };
}

export function parseA1DaysOneToFourteen(
  source: string,
): A1Curriculum {
  return parseA1Curriculum(source, {
    firstDay: 1,
    lastDay: 14,
    canonicalTotalDays: 42,
  });
}

export function loadA1DaysOneToFourteen(): A1Curriculum {
  return parseA1DaysOneToFourteen(
    loadCurriculum().sourceText,
  );
}

export { legacySentenceBuilderAnswers };
