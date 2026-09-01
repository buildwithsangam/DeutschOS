import type { A1Day, A1LessonSection, A1SectionKind } from "./a1-days-1-14";
import { sectionForDay } from "./a1-days-1-14";
import { learnerExcerpt } from "./learner-content";

export type DailyCoreItem = {
  german: string;
  meaningAndType: string;
  register?: "Formal" | "Informal";
};

export type TodayTarget = {
  label: string;
  value: string;
  sectionKind: A1SectionKind | "objective" | "sentence_builder";
};

export type SentenceBuilderStage =
  | "Words"
  | "Word groups"
  | "Sentence"
  | "Transformation"
  | "Personal sentence"
  | "Question / answer"
  | "Mini-dialogue";

function targetFrom(day: A1Day, kind: A1SectionKind, label: string): TodayTarget | undefined {
  const section = sectionForDay(day, kind);
  return section ? { label, value: learnerExcerpt(section.markdown), sectionKind: kind } : undefined;
}

/** Targets are source-derived labels and excerpts, never additional curriculum content. */
export function todayTargets(day: A1Day): TodayTarget[] {
  return [
    targetFrom(day, "main_lesson", "Learn"),
    targetFrom(day, "pronunciation", "Pronunciation"),
    { label: "Build", value: learnerExcerpt(day.sentenceBuilder.prompt), sectionKind: "sentence_builder" },
    targetFrom(day, "speaking", "Speak"),
    targetFrom(day, "practical_task", "Practical task"),
  ].filter((target): target is TodayTarget => Boolean(target));
}

export function dailyCoreItems(day: A1Day): DailyCoreItem[] {
  const core = sectionForDay(day, "daily_german_core");
  if (!core) return [];
  return core.markdown.split("\n").flatMap((line) => {
    const match = line.match(/\*\*(.+?)\*\*\s*\((.+?)\)/);
    if (!match) return [];
    const meaningAndType = match[2].replace(/\s*\[Day\s+\d+\s+core\]/i, "").trim();
    const register = /\bformal\b/i.test(meaningAndType) ? "Formal" : /\binformal\b/i.test(meaningAndType) ? "Informal" : undefined;
    return [{ german: match[1].trim(), meaningAndType, register }];
  });
}

export function sentenceBuilderStages(day: A1Day): SentenceBuilderStage[] {
  const source = day.sentenceBuilder.prompt.toLocaleLowerCase("de-DE");
  const stages: SentenceBuilderStage[] = [];
  if (/scrambled|input blocks|reorder|rearrange/.test(source)) stages.push("Words");
  if (/phrase/.test(source)) stages.push("Word groups");
  stages.push("Sentence");
  if (/substitution|convert|fill in|expansion/.test(source)) stages.push("Transformation");
  if (/your own|personal|self/.test(source)) stages.push("Personal sentence");
  if (/question|answer/.test(source)) stages.push("Question / answer");
  if (/dialogue|conversation/.test(source)) stages.push("Mini-dialogue");
  return [...new Set(stages)];
}

export const lessonFlow: Array<{ id: string; label: string; kinds: A1SectionKind[] }> = [
  { id: "learn", label: "Learn", kinds: ["main_lesson", "grammar"] },
  { id: "pronunciation", label: "Pronunciation", kinds: ["pronunciation"] },
  { id: "listen", label: "Listen", kinds: ["listening"] },
  { id: "practice", label: "Practice", kinds: ["reading", "writing"] },
  { id: "speak", label: "Speak", kinds: ["speaking", "realistic_interaction"] },
  { id: "mission", label: "Real-life mission", kinds: ["practical_task"] },
  { id: "repair", label: "Communication repair", kinds: ["communication_repair"] },
  { id: "review", label: "Review", kinds: ["retrieval_review"] },
  { id: "mastery", label: "Mastery check", kinds: ["mastery_check"] },
];

export function sectionsForFlow(day: A1Day, kinds: A1SectionKind[]): A1LessonSection[] {
  return kinds.flatMap((kind) => {
    const section = sectionForDay(day, kind);
    return section ? [section] : [];
  });
}
