import type { LocalAttempt, LocalLearningProgress } from "@/modules/learning/domain/local-progress";
import { attemptsForExercise, dayProgress } from "@/modules/learning/domain/local-progress";
import {
  buildScheduledReviewQueue,
  interleaveReviewQueue,
  type ReviewScheduleState,
} from "@/modules/learning/domain/srs";

export type ReviewReason =
  | "due"
  | "overdue"
  | "recent_failure"
  | "repeated_failure"
  | "needs_review"
  | "recent_exposure";

export type ReviewCandidate = {
  exerciseId: string;
  dayNumber: number;
  reason: ReviewReason;
  score: number;
  failureCount: number;
  lastAttemptAt: string;
  dueAt?: string;
  overdueDays?: number;
};

export type ReviewExercise = {
  exerciseId: string;
  dayNumber: number;
};

const RECENT_FAILURE_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

function latestAttempt(attempts: LocalAttempt[]) {
  return [...attempts].sort((a, b) => b.at.localeCompare(a.at))[0];
}

function latestFailure(attempts: LocalAttempt[]) {
  return attempts
    .filter((attempt) => !attempt.correct)
    .sort((a, b) => b.at.localeCompare(a.at))[0];
}

/**
 * Local review queue. When SRS state is available, due/overdue scheduling is
 * authoritative. The legacy evidence signals remain as a migration-safe
 * fallback for learners whose older attempts predate persisted scheduling.
 */
export function buildReviewQueue(
  progress: LocalLearningProgress,
  now = new Date(),
  scheduleStates: ReviewScheduleState[] = [],
): ReviewCandidate[] {
  if (scheduleStates.length > 0) {
    const scheduled = interleaveReviewQueue(
      buildScheduledReviewQueue(scheduleStates, now, 10),
    );

    return scheduled.map((candidate) => {
      const attempts = attemptsForExercise(progress, candidate.exerciseId);
      const failures = attempts.filter((attempt) => !attempt.correct);
      const latest = latestAttempt(attempts);
      return {
        exerciseId: candidate.exerciseId,
        dayNumber: candidate.dayNumber,
        reason: candidate.overdueDays > 0 ? "overdue" : "due",
        score: candidate.priority,
        failureCount: Math.max(candidate.lapses, failures.length),
        lastAttemptAt: latest?.at ?? candidate.lastReviewedAt ?? candidate.dueAt,
        dueAt: candidate.dueAt,
        overdueDays: candidate.overdueDays,
      };
    });
  }

  const byExercise = new Map<string, LocalAttempt[]>();

  for (const attempt of progress.attempts) {
    const existing = byExercise.get(attempt.exerciseId) ?? [];
    existing.push(attempt);
    byExercise.set(attempt.exerciseId, existing);
  }

  const candidates: ReviewCandidate[] = [];

  for (const [exerciseId, attempts] of byExercise) {
    const latest = latestAttempt(attempts);
    if (!latest) continue;

    const failures = attempts.filter((attempt) => !attempt.correct);
    const lastFailure = latestFailure(attempts);
    const recentFailure =
      lastFailure !== undefined &&
      now.getTime() - new Date(lastFailure.at).getTime() <= RECENT_FAILURE_WINDOW_MS;
    const repeatedFailure = failures.length >= 2;
    const flagged = dayProgress(progress, latest.dayNumber).needsReview;
    const recentExposure =
      now.getTime() - new Date(latest.at).getTime() <= RECENT_FAILURE_WINDOW_MS;

    if (!recentFailure && !repeatedFailure && !flagged && !recentExposure) continue;

    let reason: ReviewReason;
    let score: number;

    if (recentFailure) {
      reason = "recent_failure";
      score = 400;
    } else if (repeatedFailure) {
      reason = "repeated_failure";
      score = 300;
    } else if (flagged) {
      reason = "needs_review";
      score = 200;
    } else {
      reason = "recent_exposure";
      score = 100;
    }

    candidates.push({
      exerciseId,
      dayNumber: latest.dayNumber,
      reason,
      score,
      failureCount: failures.length,
      lastAttemptAt: latest.at,
    });
  }

  return candidates.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (b.failureCount !== a.failureCount) return b.failureCount - a.failureCount;
    return b.lastAttemptAt.localeCompare(a.lastAttemptAt);
  });
}

export function reviewReasonLabel(reason: ReviewReason): string {
  switch (reason) {
    case "due":
      return "Due now";
    case "overdue":
      return "Overdue";
    case "recent_failure":
      return "Recent mistake";
    case "repeated_failure":
      return "Repeated mistake";
    case "needs_review":
      return "Marked for review";
    case "recent_exposure":
      return "Recently practised";
  }
}

export function reviewExercises(
  progress: LocalLearningProgress,
  limit = 10,
  scheduleStates: ReviewScheduleState[] = [],
): ReviewExercise[] {
  return buildReviewQueue(progress, new Date(), scheduleStates)
    .slice(0, Math.max(0, limit))
    .map((candidate) => ({
      exerciseId: candidate.exerciseId,
      dayNumber: candidate.dayNumber,
    }));
}

export { attemptsForExercise };
