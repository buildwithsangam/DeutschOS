import type { LocalAttempt, LocalLearningProgress } from "@/modules/learning/domain/local-progress";
import { attemptsForExercise, dayProgress } from "@/modules/learning/domain/local-progress";
import {
  buildScheduledReviewQueue,
  initialReviewState,
  interleaveReviewQueue,
  scheduleReview,
  type ReviewScheduleState,
} from "@/modules/learning/domain/srs";

export type ReviewReason = "due" | "overdue" | "recent_failure" | "repeated_failure" | "needs_review" | "recent_exposure";
export type ReviewCandidate = { exerciseId: string; dayNumber: number; reason: ReviewReason; score: number; failureCount: number; lastAttemptAt: string; dueAt?: string; overdueDays?: number };
export type ReviewExercise = { exerciseId: string; dayNumber: number };
const RECENT_FAILURE_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

function latestAttempt(attempts: LocalAttempt[]) { return [...attempts].sort((a, b) => b.at.localeCompare(a.at))[0]; }
function latestFailure(attempts: LocalAttempt[]) { return attempts.filter((attempt) => !attempt.correct).sort((a, b) => b.at.localeCompare(a.at))[0]; }

function deriveLocalScheduleStates(progress: LocalLearningProgress): ReviewScheduleState[] {
  const attemptsByExercise = new Map<string, LocalAttempt[]>();
  for (const attempt of progress.attempts) {
    const items = attemptsByExercise.get(attempt.exerciseId) ?? [];
    items.push(attempt);
    attemptsByExercise.set(attempt.exerciseId, items);
  }
  return [...attemptsByExercise.values()].map((attempts) => {
    const ordered = [...attempts].sort((a, b) => a.at.localeCompare(b.at));
    const first = ordered[0];
    let state = initialReviewState({
      learnerId: "local",
      exerciseId: first.exerciseId,
      dayNumber: first.dayNumber,
      skill: first.skill,
      reviewedAt: first.at,
      correct: first.correct,
    });
    for (const attempt of ordered.slice(1)) {
      state = scheduleReview(state, attempt.correct ? "correct" : "incorrect", attempt.at);
      state = { ...state, dayNumber: attempt.dayNumber, skill: attempt.skill ?? state.skill };
    }
    return state;
  });
}

/**
 * SRS-first local review queue. Persisted states can be supplied by the
 * authenticated application layer; otherwise schedule state is reconstructed
 * from the append-only local attempt history so the learner still gets SRS
 * behavior offline.
 */
export function buildReviewQueue(progress: LocalLearningProgress, now = new Date(), scheduleStates: ReviewScheduleState[] = []): ReviewCandidate[] {
  const effectiveStates = scheduleStates.length > 0 ? scheduleStates : deriveLocalScheduleStates(progress);
  if (effectiveStates.length > 0) {
    const scheduled = interleaveReviewQueue(buildScheduledReviewQueue(effectiveStates, now, 10));
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
    const recentFailure = lastFailure !== undefined && now.getTime() - new Date(lastFailure.at).getTime() <= RECENT_FAILURE_WINDOW_MS;
    const repeatedFailure = failures.length >= 2;
    const flagged = dayProgress(progress, latest.dayNumber).needsReview;
    const recentExposure = now.getTime() - new Date(latest.at).getTime() <= RECENT_FAILURE_WINDOW_MS;
    if (!recentFailure && !repeatedFailure && !flagged && !recentExposure) continue;
    let reason: ReviewReason; let score: number;
    if (recentFailure) { reason = "recent_failure"; score = 400; }
    else if (repeatedFailure) { reason = "repeated_failure"; score = 300; }
    else if (flagged) { reason = "needs_review"; score = 200; }
    else { reason = "recent_exposure"; score = 100; }
    candidates.push({ exerciseId, dayNumber: latest.dayNumber, reason, score, failureCount: failures.length, lastAttemptAt: latest.at });
  }
  return candidates.sort((a, b) => b.score - a.score || b.failureCount - a.failureCount || b.lastAttemptAt.localeCompare(a.lastAttemptAt));
}

export function reviewReasonLabel(reason: ReviewReason): string {
  switch (reason) {
    case "due": return "Due now";
    case "overdue": return "Overdue";
    case "recent_failure": return "Recent mistake";
    case "repeated_failure": return "Repeated mistake";
    case "needs_review": return "Marked for review";
    case "recent_exposure": return "Recently practised";
  }
}

export function reviewExercises(progress: LocalLearningProgress, limit = 10, scheduleStates: ReviewScheduleState[] = []): ReviewExercise[] {
  return buildReviewQueue(progress, new Date(), scheduleStates).slice(0, Math.max(0, limit)).map((candidate) => ({ exerciseId: candidate.exerciseId, dayNumber: candidate.dayNumber }));
}

export { attemptsForExercise };
