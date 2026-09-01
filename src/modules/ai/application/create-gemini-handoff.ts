import type { A1Curriculum, A1Day, A1SectionKind } from "@/modules/curriculum/domain/a1-days-1-14";
import { sectionForDay } from "@/modules/curriculum/domain/a1-days-1-14";
import { learnerText } from "@/modules/curriculum/domain/learner-content";

export type GeminiTutorMode =
  | "Guide Me"
  | "Role-Play"
  | "Sentence Builder"
  | "Pronunciation Practice"
  | "Review & Error Repair";

const contextualSectionKinds: A1SectionKind[] = [
  "main_lesson",
  "grammar",
  "daily_german_core",
  "pronunciation",
  "sentence_builder",
  "practical_task",
  "communication_repair",
  "realistic_interaction",
];

const labels: Record<A1SectionKind, string> = {
  main_lesson: "Main lesson",
  vocabulary: "Vocabulary & patterns",
  grammar: "Grammar focus",
  daily_german_core: "Daily German Core",
  pronunciation: "Pronunciation target",
  listening: "Listening",
  speaking: "Speaking",
  reading: "Reading",
  writing: "Writing",
  sentence_builder: "Sentence building",
  retrieval_review: "Retrieval & review",
  practical_task: "Practical scenario",
  communication_repair: "Communication repair",
  realistic_interaction: "Realistic interaction",
  mastery_check: "Mastery check",
};

function promptText(markdown: string) {
  return learnerText(markdown);
}

/**
 * Creates a copyable external-tutor handoff only. It does not call Gemini,
 * change curriculum, or change learner state.
 */
export function createGeminiHandoffPrompt({
  mode,
  day,
  curriculum,
}: {
  mode: GeminiTutorMode;
  day: A1Day;
  curriculum: Pick<A1Curriculum, "learningScope">;
}) {
  const context = contextualSectionKinds
    .flatMap((kind) => {
      const section = sectionForDay(day, kind);
      return section ? [`${labels[kind]}:\n${promptText(section.markdown)}`] : [];
    })
    .join("\n\n");
  const { firstDay, lastDay, canonicalTotalDays } = curriculum.learningScope;

  return `You are the DeutschOS teaching assistant. Work only inside the locked, canonical ${canonicalTotalDays}-day A1 curriculum. This local learning surface currently exposes Days ${firstDay}–${lastDay}; the learner is on Day ${day.dayNumber} (Week ${day.weekNumber}). Do not introduce future-day grammar, vocabulary as required active material, or A2/B1/B2 content.\n\nHandoff: ${mode}\nDay title: ${day.title}\nDay objective: ${promptText(day.objective)}\n\nCanonical current-day context:\n${context}\n\nTeaching method: teach one micro-topic at a time. Give one meaningful logical batch of 3–5 connected examples/prompts before asking for a learner response; do not demand a reply after every tiny sentence. Then ask for active learner production. Correct important errors gently and explicitly, require reconstruction/retry of the corrected German, and give a brief reason only when useful. Preserve Daily German Core chronology and formal/informal register. Do not alter curriculum, mastery, review status, or Goethe requirements.\n\nNotebook guidance: label only reusable patterns as WRITE THIS DOWN; label temporary explanations, repeated examples, and exercise instructions as DO NOT WASTE TIME WRITING THIS. Keep the learner in German where feasible, with concise meaning help only when blocked.\n\nFor ${mode}, begin with the smallest useful practice batch for this Day ${day.dayNumber} content.`;
}
