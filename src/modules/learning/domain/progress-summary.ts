import type { A1Curriculum } from "@/modules/curriculum/domain/a1-days-1-14";
import type { LocalLearningProgress } from "@/modules/learning/domain/local-progress";
import { buildReviewQueue } from "@/modules/learning/domain/review-queue";
import { dayProgress } from "@/modules/learning/domain/local-progress";

export type SkillEvidenceSummary = {
  skill: string;
  attempts: number;
  correct: number;
  incorrect: number;
  accuracy: number | null;
};

export type ProgressSummary = {
  totalDays: number;
  completedDays: number;
  currentDay: number;
  currentDayCompleted: boolean;
  daysWithEvidence: number;
  reviewCount: number;
  reviewReasons: Record<string, number>;
  skills: SkillEvidenceSummary[];
};

const SKILLS = [
  "listening",
  "speaking",
  "reading",
  "writing",
  "vocabulary",
  "grammar",
  "pronunciation",
  "communication_repair",
] as const;

/**
 * Produces a transparent local progress summary from curriculum state and
 * append-only attempts. Accuracy is descriptive evidence, not proficiency or
 * mastery certification.
 */
export function buildProgressSummary(
  curriculum: A1Curriculum,
  progress: LocalLearningProgress,
  now = new Date(),
): ProgressSummary {
  const completedDays = curriculum.days.filter((day) => {
    const state = dayProgress(progress, day.dayNumber);
    return state.lessonCompleted && state.practiceCompleted;
  }).length;

  const daysWithEvidence = new Set(
    progress.attempts.map((attempt) => attempt.dayNumber),
  ).size;

  const reviewQueue = buildReviewQueue(progress, now);
  const reviewReasons: Record<string, number> = {};
  for (const item of reviewQueue) {
    reviewReasons[item.reason] = (reviewReasons[item.reason] ?? 0) + 1;
  }

  const skills = SKILLS.map((skill) => {
    const attempts = progress.attempts.filter((attempt) => attempt.skill === skill);
    const correct = attempts.filter((attempt) => attempt.correct).length;
    return {
      skill,
      attempts: attempts.length,
      correct,
      incorrect: attempts.length - correct,
      accuracy: attempts.length ? correct / attempts.length : null,
    };
  });

  return {
    totalDays: curriculum.days.length,
    completedDays,
    currentDay: progress.currentDay,
    currentDayCompleted:
      dayProgress(progress, progress.currentDay).lessonCompleted &&
      dayProgress(progress, progress.currentDay).practiceCompleted,
    daysWithEvidence,
    reviewCount: reviewQueue.length,
    reviewReasons,
    skills,
  };
}
