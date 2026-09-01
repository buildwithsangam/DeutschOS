import type { A1Day } from "@/modules/curriculum/domain/a1-days-1-14";
import { sectionForDay } from "@/modules/curriculum/domain/a1-days-1-14";

export type PracticeTaskKind = "sentence_builder" | "retrieval" | "practical_response";

export type PracticeTask = {
  id: string;
  kind: PracticeTaskKind;
  title: string;
  instruction: string;
  completionLabel: string;
};

/** Reuses only practice types that current canonical A1 lessons already define. */
export function practiceTasksForDay(day: A1Day): PracticeTask[] {
  const tasks: PracticeTask[] = [
    {
      id: `day-${day.dayNumber}-sentence-builder`,
      kind: "sentence_builder",
      title: "Sentence Builder",
      instruction: day.sentenceBuilder.prompt,
      completionLabel: "Sentence Builder completed",
    },
  ];
  const retrieval = sectionForDay(day, "retrieval_review");
  if (retrieval) {
    tasks.push({
      id: `day-${day.dayNumber}-retrieval`,
      kind: "retrieval",
      title: "Retrieval & review",
      instruction: retrieval.markdown,
      completionLabel: "Retrieval activity completed",
    });
  }
  const practical = sectionForDay(day, "practical_task");
  if (practical) {
    tasks.push({
      id: `day-${day.dayNumber}-practical-response`,
      kind: "practical_response",
      title: "Practical response",
      instruction: practical.markdown,
      completionLabel: "Practical response completed",
    });
  }
  return tasks;
}
