export type SourceRef = {
  documentPath: string;
  documentRole: "canonical-a1-curriculum";
  weekNumber?: number;
  dayNumber?: number;
  sectionNumber?: number;
  startLine?: number;
  endLine?: number;
};

export type DaySectionKey =
  | "objective"
  | "lessonContent"
  | "dailyCore"
  | "pronunciation"
  | "minimumTheory"
  | "listening"
  | "speaking"
  | "reading"
  | "writing"
  | "sentenceBuilding"
  | "retrieval"
  | "practicalTask"
  | "repair"
  | "nativeInteraction"
  | "interestExposure"
  | "mastery";

export type ParsedSection = {
  id: string;
  number: number;
  canonicalKey: DaySectionKey | null;
  heading: string;
  rawMarkdown: string;
  isAdditional: boolean;
  source: SourceRef;
};

export type ParsedDay = {
  id: string;
  number: number;
  title: string;
  weekNumber: number;
  phaseNumber: number;
  sections: ParsedSection[];
  qaOverride: string;
  source: SourceRef;
  objectiveMarkdown: string;
  dailyCoreReferences: number[];
  rawMarkdown: string;
};

export type ParsedWeek = {
  id: string;
  number: number;
  title: string;
  phaseNumber: number;
  days: ParsedDay[];
  source: SourceRef;
};

export type ParsedPhase = {
  id: string;
  number: number;
  title: string;
  weekNumbers: number[];
  source: SourceRef;
};

export type ParsedCurriculum = {
  id: "a1";
  level: "A1";
  title: string;
  source: SourceRef;
  phases: ParsedPhase[];
  weeks: ParsedWeek[];
  days: ParsedDay[];
  finalQaOverrides: string;
  sourceText: string;
};

export function parseCurriculum(sourceText: string, options?: { documentPath?: string }): ParsedCurriculum;
export function loadCurriculum(filePath?: string): ParsedCurriculum;
export function getSection(day: ParsedDay, canonicalKey: DaySectionKey): ParsedSection | undefined;
export function isCanonicalSourcePath(filePath: string): boolean;

export const CANONICAL_A1_PATH: string;
export const DUPLICATE_A1_PATH: string;
export const CANONICAL_DOCUMENT_ROLE: "canonical-a1-curriculum";
