import type { A1Curriculum, A1LearningScope, A1SectionKind } from "./a1-days-1-14";
import { loadCurriculum, parseCurriculum } from "./curriculum-parser.mjs";
import type { ParsedDay, ParsedSection } from "./curriculum-parser.d.mts";

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

function cleanMarkdown(text: string) {
  return text
    .replace(/\r/g, "")
    .replace(/\$?\\rightarrow\$?/g, "→")
    .replace(/\*+/g, "")
    .replace(/`/g, "")
    .replace(/\[[^\]]+\]/g, "")
    .replace(/\\\([^)]*\\\)/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function primarySection(day: ParsedDay, kind: string) {
  return day.sections.find((section) => !section.isAdditional && section.canonicalKey === kind);
}

function sectionToLegacy(section: ParsedSection, kind: A1SectionKind, isVocabularyProxy = false) {
  return { kind, title: isVocabularyProxy ? "Vocabulary & patterns in today’s lesson" : section.heading, markdown: section.rawMarkdown, isVocabularyProxy };
}

function sentenceBuilder(section: ParsedSection, dayNumber: number) {
  const cleanedLines = section.rawMarkdown.split("\n").map(cleanMarkdown).filter(Boolean);
  const answerLine = cleanedLines.find((line) => line.includes("→") && /[A-Za-zÄÖÜäöüß]/.test(line.split("→")[1] ?? ""));
  const exampleLine = cleanedLines.find((line) => {
    const candidate = line.replace(/^[-–]\s*/, "").trim();
    return /[.!?]["”']?$/.test(candidate) && !/^(Task|Input Blocks|Execution|Substitution Drill|Expansion):/i.test(candidate);
  });
  const answer = (answerLine?.split("→")[1] ?? exampleLine)?.trim().replace(/\s+$/, "");
  if (!answer || answer.length < 2) throw new Error(`Day ${dayNumber} has no canonical sentence-builder answer`);
  const tokens = answer.match(/[\p{L}\p{N}]+(?:[-'][\p{L}\p{N}]+)*|[.,?!:;]/gu) ?? [];
  if (tokens.length < 2) throw new Error(`Day ${dayNumber} sentence-builder answer has too few tokens`);
  return { prompt: section.rawMarkdown, answer: tokens.join(" ").replace(/\s+([.,?!:;])/g, "$1"), tokens };
}

function toLegacyDay(day: ParsedDay): A1Curriculum["days"][number] {
  const map: Array<[A1SectionKind, string, boolean?]> = [
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
  const sections = map.map(([legacyKind, canonicalKey, isVocabularyProxy]) => {
    const section = primarySection(day, canonicalKey);
    if (!section) throw new Error(`Day ${day.number} is missing ${canonicalKey}`);
    return sectionToLegacy(section, legacyKind, isVocabularyProxy);
  });
  const builder = primarySection(day, "sentenceBuilding");
  if (!builder) throw new Error(`Day ${day.number} is missing sentenceBuilding`);

  const weekQa = day.qaOverride;
  const weekQaStart = weekQa.split("\n\n").find((block) => block.startsWith("## Week")) ?? "";
  return {
    dayNumber: day.number,
    weekNumber: day.weekNumber,
    title: day.title,
    objective: primarySection(day, "objective")?.rawMarkdown ?? "",
    sections,
    sentenceBuilder: sentenceBuilder(builder, day.number),
    finalQaOverrides: ["# FINAL QA OVERRIDES — MUST TAKE PRECEDENCE OVER EARLIER WEEKLY DRAFT WORDING", weekQa].filter(Boolean).join("\n\n"),
    finalQaNotices: weekQaStart.split("\n").filter((line) => line.includes(`Day ${day.number}`)),
  };
}

export function parseA1Curriculum(source: string, learningScope: A1LearningScope): A1Curriculum {
  const parsed = parseCurriculum(source);
  if (learningScope.firstDay < 1 || learningScope.lastDay < learningScope.firstDay || learningScope.lastDay > parsed.days.length) throw new Error("Canonical A1 curriculum could not be read: invalid learning scope");
  if (learningScope.canonicalTotalDays !== parsed.days.length) throw new Error("Canonical A1 curriculum could not be read: learning scope does not match canonical day count");
  const selected = parsed.days.filter((day) => day.number >= learningScope.firstDay && day.number <= learningScope.lastDay);
  if (selected.length !== learningScope.lastDay - learningScope.firstDay + 1) throw new Error("Canonical A1 curriculum could not be read: loaded day count does not match learning scope");
  return { sourceDocument, learningScope, days: selected.map(toLegacyDay) };
}

export function parseA1DaysOneToFourteen(source: string): A1Curriculum {
  return parseA1Curriculum(source, { firstDay: 1, lastDay: 14, canonicalTotalDays: 42 });
}

export function loadA1DaysOneToFourteen(): A1Curriculum {
  return parseA1DaysOneToFourteen(loadCurriculum().sourceText);
}
