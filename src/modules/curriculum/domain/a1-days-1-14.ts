export const a1DaysOneToFourteen = Array.from({ length: 14 }, (_, index) => index + 1);

export type A1LearningScope = {
  firstDay: number;
  lastDay: number;
  canonicalTotalDays: number;
};

export type A1SectionKind =
  | "main_lesson"
  | "vocabulary"
  | "grammar"
  | "daily_german_core"
  | "pronunciation"
  | "listening"
  | "speaking"
  | "reading"
  | "writing"
  | "sentence_builder"
  | "retrieval_review"
  | "practical_task"
  | "communication_repair"
  | "realistic_interaction"
  | "mastery_check"
  | "other";

export type A1LessonSection = {
  kind: A1SectionKind;
  title: string;
  markdown: string;
  isVocabularyProxy?: boolean;
};

export type A1SentenceBuilder = {
  prompt: string;
  answer: string;
  tokens: string[];
};

export type A1Day = {
  dayNumber: number;
  weekNumber: number;
  title: string;
  objective: string;
  sections: A1LessonSection[];
  sentenceBuilder: A1SentenceBuilder;
  finalQaOverrides: string;
  finalQaNotices: string[];
};

export type A1Curriculum = {
  sourceDocument: string;
  learningScope: A1LearningScope;
  days: A1Day[];
};

export function lessonSectionsForDisplay(day: A1Day) {
  return day.sections.filter((section) => !section.isVocabularyProxy && section.markdown.trim().length > 0);
}

export function sectionForDay(day: A1Day, kind: A1SectionKind) {
  return day.sections.find((section) => section.kind === kind && section.markdown.trim().length > 0);
}
