import type { AttemptSkill, LocalLearningProgress } from "@/modules/learning/domain/local-progress";
import { dayProgress, attemptsForExercise } from "@/modules/learning/domain/local-progress";
import type { ReviewScheduleState } from "@/modules/learning/domain/srs";
import { buildScheduledReviewQueue, interleaveReviewQueue } from "@/modules/learning/domain/srs";
import type { ErrorMemory } from "@/modules/learning/domain/error-memory";

export type AdaptiveExercise = {
  exerciseId: string;
  dayNumber: number;
  score: number;
  reasons: string[];
  skill?: AttemptSkill;
};

export type AdaptiveExerciseInput = {
  exerciseId: string;
  dayNumber: number;
  skill?: AttemptSkill;
};

function masterySignal(progress: LocalLearningProgress, exerciseId: string) {
  const attempts = attemptsForExercise(progress, exerciseId);
  if (!attempts.length) return 0;
  const accuracy = attempts.filter((item) => item.correct).length / attempts.length;
  if (attempts.length < 3) return 25;
  if (accuracy < 0.5) return 65;
  if (accuracy < 0.8) return 40;
  return 5;
}

function recentExposureSignal(progress: LocalLearningProgress, exerciseId: string, now: Date) {
  const attempts = attemptsForExercise(progress, exerciseId);
  const latest = attempts[attempts.length - 1];
  if (!latest) return 0;
  const ageHours = Math.max(0, now.getTime() - new Date(latest.at).getTime()) / 3_600_000;
  if (ageHours < 2) return -20;
  if (ageHours < 24) return -8;
  return 0;
}

export function buildAdaptiveExerciseQueue(
  progress: LocalLearningProgress,
  exercises: AdaptiveExerciseInput[],
  options: {
    now?: Date;
    scheduleStates?: ReviewScheduleState[];
    errorMemory?: ErrorMemory[];
    limit?: number;
  } = {},
): AdaptiveExercise[] {
  const now = options.now ?? new Date();
  const limit = options.limit ?? 10;
  const scheduleStates = options.scheduleStates ?? [];
  const errorMemory = options.errorMemory ?? [];
  const scheduled = scheduleStates.length
    ? interleaveReviewQueue(buildScheduledReviewQueue(scheduleStates, now, Math.max(limit, 20)))
    : [];
  const scheduledByExercise = new Map(scheduled.map((item) => [item.exerciseId, item]));
  const errorsByExercise = new Map(errorMemory.map((item) => [item.exerciseId, item]));

  const scored = exercises.map((exercise) => {
    const scheduledState = scheduledByExercise.get(exercise.exerciseId);
    const error = errorsByExercise.get(exercise.exerciseId);
    const day = dayProgress(progress, exercise.dayNumber);
    let score = 0;
    const reasons: string[] = [];

    if (scheduledState) {
      score += 50 + scheduledState.priority;
      reasons.push(scheduledState.overdueDays > 0 ? "overdue review" : "due review");
    }
    if (error) {
      score += error.influence * 0.75;
      if (error.recentOccurrences > 0) score += 15;
      if (error.occurrences >= 2) reasons.push("repeated error");
      else reasons.push("recent error");
    }

    const mastery = masterySignal(progress, exercise.exerciseId);
    score += mastery;
    if (mastery >= 40) reasons.push("needs practice");

    if (day.needsReview) {
      score += 15;
      reasons.push("day marked for review");
    }

    score += recentExposureSignal(progress, exercise.exerciseId, now);
    if (recentExposureSignal(progress, exercise.exerciseId, now) < 0) reasons.push("recently practised");

    if (!reasons.length) reasons.push("new practice");
    return { ...exercise, score, reasons };
  });

  return scored
    .sort((a, b) => b.score - a.score || a.dayNumber - b.dayNumber || a.exerciseId.localeCompare(b.exerciseId))
    .slice(0, Math.max(0, limit));
}
