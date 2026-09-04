import type { ParsedCurriculum, ParsedDay, ParsedPhase, ParsedSection, ParsedWeek, SourceRef } from "./curriculum-parser.d.mts";

export type ImportEntity<T> = T & { source: SourceRef };
export type CurriculumImportBundle = {
  curriculum: ImportEntity<Pick<ParsedCurriculum, "id" | "level" | "title">>;
  phases: ParsedPhase[];
  weeks: ParsedWeek[];
  days: ParsedDay[];
  daySections: ParsedSection[];
  vocabulary: Array<Record<string, unknown>>;
  grammar: Array<Record<string, unknown>>;
  pronunciation: Array<Record<string, unknown>>;
  dialogues: Array<Record<string, unknown>>;
  practicalMissions: Array<Record<string, unknown>>;
  exercises: Array<Record<string, unknown>>;
  masteryChecks: Array<Record<string, unknown>>;
  exerciseTargets: Array<Record<string, unknown>>;
  unknownSections: Array<Record<string, unknown>>;
};
