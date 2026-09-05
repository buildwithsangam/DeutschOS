import type {
  A1Curriculum,
  A1Day,
  A1LessonSection,
  A1SectionKind,
  SentenceBuilderExercise,
  SentenceBuilderExerciseType,
} from "@/modules/curriculum/domain/a1-days-1-14";
import {
  legacySentenceBuilderAnswers,
  normalizeForVerification,
} from "@/modules/curriculum/domain/a1-sentence-builder-contract";
import { parseCurriculum } from "@/modules/curriculum/domain/curriculum-parser.mjs";
import type {
  ParsedCurriculum,
  ParsedDay,
  ParsedSection,
  DaySectionKey,
} from "@/modules/curriculum/domain/curriculum-parser.d.mts";

const SOURCE_DOCUMENT =
  "docs/curriculum/a1-final-42-day-curriculum.md";

// ------------------------------------------------------------
// Section mapping
// ------------------------------------------------------------

const sectionMapping: Array<
  [DaySectionKey, A1SectionKind, boolean?]
> = [
  ["lessonContent", "main_lesson"],
  ["lessonContent", "vocabulary", true],
  ["minimumTheory", "grammar"],
  ["dailyCore", "daily_german_core"],
  ["pronunciation", "pronunciation"],
  ["listening", "listening"],
  ["speaking", "speaking"],
  ["reading", "reading"],
  ["writing", "writing"],
  ["sentenceBuilding", "sentence_builder"],
  ["retrieval", "retrieval_review"],
  ["practicalTask", "practical_task"],
  ["repair", "communication_repair"],
  ["nativeInteraction", "realistic_interaction"],
  ["mastery", "mastery_check"],
  ["interestExposure", "interest_driven"],
];

function primarySection(
  day: ParsedDay,
  canonicalKey: DaySectionKey | string,
): ParsedSection | undefined {
  return day.sections.find(
    (section) =>
      !section.isAdditional &&
      section.canonicalKey === canonicalKey,
  );
}

function mapSectionToRuntime(
  section: ParsedSection,
  kind: A1SectionKind,
  isVocabularyProxy = false,
): A1LessonSection {
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

// ------------------------------------------------------------
// Sentence-builder extraction
// ------------------------------------------------------------

function tokenizeAnswer(answer: string): string[] {
  return (
    answer.match(
      /[\p{L}\p{N}]+(?:[-'][\p{L}\p{N}]+)*|[.,?!:;]/gu,
    ) ?? []
  );
}

function countSentences(text: string): number {
  const matches = text.match(/[.!?](?=\s|$)/g);
  return matches ? matches.length : 0;
}

function extractFinalSegment(line: string): string {
  const parts = line.split(/\\rightarrow|→/);
  const last = parts[parts.length - 1]
    .replace(/\\\(|\\\)|\\\[|\\\]/g, "")
    .replace(/\[[^\]]*\]/g, "")
    .trim();
  return last;
}

function classifyExercise(
  line: string,
  answer: string,
): SentenceBuilderExerciseType {
  if (/\(Receptive\)/i.test(line)) {
    return "receptive_example";
  }
  if (countSentences(answer) > 1) {
    return "active_synthesis";
  }
  return "active_sentence";
}

function buildExercise(
  id: string,
  type: SentenceBuilderExerciseType,
  prompt: string,
  answer: string,
): SentenceBuilderExercise {
  const isInteractive = type === "active_sentence";
  return {
    id,
    type,
    prompt,
    answer,
    tokens: isInteractive ? tokenizeAnswer(answer) : [],
  };
}

function extractExercisesForDays15To42(
  section: ParsedSection,
): SentenceBuilderExercise[] {
  const lines = section.rawMarkdown
    .split("\n")
    .map((line) => line.trimEnd());

  const arrowLines = lines.filter((line) =>
    /\\rightarrow|→/.test(line),
  );

  if (arrowLines.length === 0) {
    // No arrow transformations -> treat as read-only dialogue synthesis.
    return [
      {
        id: `${section.id}.ex1`,
        type: "dialogue_synthesis",
        prompt: section.rawMarkdown,
        answer: "",
        tokens: [],
      },
    ];
  }

  const exercises: SentenceBuilderExercise[] = [];

  for (let i = 0; i < arrowLines.length; i++) {
    const line = arrowLines[i];
    const answer = extractFinalSegment(line);

    if (!answer) {
      // Preserve the line as a read-only example rather than dropping.
      exercises.push({
        id: `${section.id}.ex${i + 1}`,
        type: "receptive_example",
        prompt: line,
        answer: "",
        tokens: [],
      });
      continue;
    }

    const type = classifyExercise(line, answer);

    exercises.push(
      buildExercise(
        `${section.id}.ex${i + 1}`,
        type,
        line,
        answer,
      ),
    );
  }

  if (exercises.length === 0) {
    return [
      {
        id: `${section.id}.ex1`,
        type: "dialogue_synthesis",
        prompt: section.rawMarkdown,
        answer: "",
        tokens: [],
      },
    ];
  }

  return exercises;
}

function extractExercisesForDays1To14(
  section: ParsedSection,
  dayNumber: number,
): SentenceBuilderExercise[] {
  const answer = legacySentenceBuilderAnswers[dayNumber];

  if (!answer) {
    throw new Error(
      `Day ${dayNumber} has no legacy sentence-builder answer`,
    );
  }

  const normalizedSource = normalizeForVerification(
    section.rawMarkdown,
  );
  const normalizedAnswer = normalizeForVerification(answer);

  if (!normalizedSource.includes(normalizedAnswer)) {
    throw new Error(
      `Day ${dayNumber} legacy sentence-builder answer is not present in the canonical source section`,
    );
  }

  const tokens = tokenizeAnswer(answer);

  return [
    {
      id: `${section.id}.ex1`,
      type: "active_sentence",
      prompt: section.rawMarkdown,
      answer,
      tokens,
    },
  ];
}

function extractSentenceBuilders(
  parsedDay: ParsedDay,
): SentenceBuilderExercise[] {
  const section = primarySection(
    parsedDay,
    "sentenceBuilding",
  );

  if (!section) {
    throw new Error(
      `Day ${parsedDay.number} is missing sentenceBuilding`,
    );
  }

  if (parsedDay.number <= 14) {
    return extractExercisesForDays1To14(
      section,
      parsedDay.number,
    );
  }

  return extractExercisesForDays15To42(section);
}

// ------------------------------------------------------------
// Day mapping
// ------------------------------------------------------------

function mapParsedDayToRuntimeDay(
  parsedDay: ParsedDay,
): A1Day {
  const objectiveSection = primarySection(
    parsedDay,
    "objective",
  );
  const objective = objectiveSection?.rawMarkdown ?? "";

  const sections: A1LessonSection[] = [];

  for (const [
    canonicalKey,
    runtimeKind,
    isVocabularyProxy,
  ] of sectionMapping) {
    const section = primarySection(
      parsedDay,
      canonicalKey,
    );

    if (section) {
      sections.push(
        mapSectionToRuntime(
          section,
          runtimeKind,
          isVocabularyProxy,
        ),
      );
    }
  }

  for (const section of parsedDay.sections.filter(
    (s) => s.isAdditional,
  )) {
    sections.push({
      id: section.id,
      kind: "other",
      title: section.heading,
      markdown: section.rawMarkdown,
      isVocabularyProxy: false,
    });
  }

  const mappedKeys = new Set(
    sectionMapping.map(([key]) => key),
  );

  for (const section of parsedDay.sections.filter(
    (s) =>
      !s.isAdditional &&
      (s.canonicalKey === null ||
        !mappedKeys.has(s.canonicalKey)),
  )) {
    sections.push({
      id: section.id,
      kind: "other",
      title: section.heading,
      markdown: section.rawMarkdown,
      isVocabularyProxy: false,
    });
  }

  const sentenceBuilders =
    extractSentenceBuilders(parsedDay);

  const legacyActive = sentenceBuilders.find(
    (exercise) => exercise.type === "active_sentence",
  );

  const sentenceBuilder =
    parsedDay.number <= 14 && legacyActive
      ? {
          prompt:
            primarySection(
              parsedDay,
              "sentenceBuilding",
            )?.rawMarkdown ?? "",
          answer: legacyActive.answer,
          tokens: legacyActive.tokens,
        }
      : undefined;

  const weekQa = parsedDay.qaOverride;

  const weekQaStart =
    weekQa
      .split("\n\n")
      .find((block) => block.startsWith("## Week")) ??
    "";

  return {
    dayNumber: parsedDay.number,
    weekNumber: parsedDay.weekNumber,
    title: parsedDay.title,
    objective,
    sections,
    sentenceBuilder,
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
        line.includes(`Day ${parsedDay.number}`),
      ),
  };
}

// ------------------------------------------------------------
// Full runtime parser
// ------------------------------------------------------------

export function parseFullA1Curriculum(
  source: string,
): A1Curriculum {
  const parsed: ParsedCurriculum = parseCurriculum(
    source,
    {
      documentPath: SOURCE_DOCUMENT,
    },
  );

  return {
    sourceDocument: SOURCE_DOCUMENT,
    learningScope: {
      firstDay: 1,
      lastDay: 42,
      canonicalTotalDays: 42,
    },
    days: parsed.days.map(
      mapParsedDayToRuntimeDay,
    ),
  };
}
