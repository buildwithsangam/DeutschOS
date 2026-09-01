export const curriculumSectionKinds = [
  "main_lesson",
  "grammar",
  "vocabulary",
  "pronunciation",
  "listening",
  "speaking",
  "reading",
  "writing",
  "sentence_builder",
  "retrieval_review",
  "practical_task",
  "communication_repair",
  "realistic_interaction",
  "mastery_check",
  "daily_german_core",
] as const;

export type CurriculumSectionKind = (typeof curriculumSectionKinds)[number];

export type CurriculumPublicationStatus = "draft" | "published" | "archived";

export type CurriculumProvenanceType =
  | "original_deutschos"
  | "official_reference"
  | "licensed"
  | "rights_cleared";
