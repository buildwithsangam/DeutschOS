import type { AttemptSkill } from "@/modules/learning/domain/local-progress";

export type ReviewRating = "incorrect" | "correct";

export type ReviewScheduleState = {
  learnerId: string;
  exerciseId: string;
  dayNumber: number;
  skill?: AttemptSkill;
  repetitions: number;
  lapses: number;
  intervalDays: number;
  easeFactor: number;
  dueAt: string;
  lastReviewedAt: string | null;
};

export type ScheduledReviewCandidate = ReviewScheduleState & {
  overdueDays: number;
  priority: number;
};

const MIN_EASE = 1.3;
const MAX_EASE = 2.8;
const INITIAL_EASE = 2.3;
const MAX_INTERVAL_DAYS = 180;
const FIRST_SUCCESS_INTERVAL_DAYS = 1;
const SECOND_SUCCESS_INTERVAL_DAYS = 3;
const FAILURE_INTERVAL_MINUTES = 10;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function addMinutes(iso: string, minutes: number) {
  return new Date(new Date(iso).getTime() + minutes * 60_000).toISOString();
}

function addDays(iso: string, days: number) {
  return new Date(new Date(iso).getTime() + days * 86_400_000).toISOString();
}

export function initialReviewState(input: {
  learnerId: string;
  exerciseId: string;
  dayNumber: number;
  skill?: AttemptSkill;
  reviewedAt: string;
  correct: boolean;
}): ReviewScheduleState {
  const base: ReviewScheduleState = {
    learnerId: input.learnerId,
    exerciseId: input.exerciseId,
    dayNumber: input.dayNumber,
    skill: input.skill,
    repetitions: 0,
    lapses: 0,
    intervalDays: 0,
    easeFactor: INITIAL_EASE,
    dueAt: input.reviewedAt,
    lastReviewedAt: null,
  };

  return scheduleReview(base, input.correct ? "correct" : "incorrect", input.reviewedAt);
}

export function scheduleReview(
  previous: ReviewScheduleState,
  rating: ReviewRating,
  reviewedAt: string,
): ReviewScheduleState {
  if (rating === "incorrect") {
    return {
      ...previous,
      repetitions: 0,
      lapses: previous.lapses + 1,
      intervalDays: 0,
      easeFactor: clamp(previous.easeFactor - 0.2, MIN_EASE, MAX_EASE),
      dueAt: addMinutes(reviewedAt, FAILURE_INTERVAL_MINUTES),
      lastReviewedAt: reviewedAt,
    };
  }

  const repetitions = previous.repetitions + 1;
  let intervalDays: number;

  if (repetitions === 1) {
    intervalDays = FIRST_SUCCESS_INTERVAL_DAYS;
  } else if (repetitions === 2) {
    intervalDays = SECOND_SUCCESS_INTERVAL_DAYS;
  } else {
    intervalDays = clamp(
      Math.max(1, previous.intervalDays) * previous.easeFactor,
      SECOND_SUCCESS_INTERVAL_DAYS,
      MAX_INTERVAL_DAYS,
    );
  }

  const easeFactor = clamp(previous.easeFactor + 0.05, MIN_EASE, MAX_EASE);

  return {
    ...previous,
    repetitions,
    intervalDays,
    easeFactor,
    dueAt: addDays(reviewedAt, intervalDays),
    lastReviewedAt: reviewedAt,
  };
}

export function isReviewDue(state: ReviewScheduleState, now = new Date()) {
  return new Date(state.dueAt).getTime() <= now.getTime();
}

export function buildScheduledReviewQueue(
  states: ReviewScheduleState[],
  now = new Date(),
  limit = 10,
): ScheduledReviewCandidate[] {
  const nowMs = now.getTime();

  return states
    .filter((state) => isReviewDue(state, now))
    .map((state) => {
      const overdueMs = Math.max(0, nowMs - new Date(state.dueAt).getTime());
      const overdueDays = overdueMs / 86_400_000;
      const priority =
        Math.min(100, overdueDays * 10) +
        Math.min(30, state.lapses * 5) +
        (state.repetitions === 0 ? 20 : 0);

      return { ...state, overdueDays, priority };
    })
    .sort((a, b) => {
      if (b.priority !== a.priority) return b.priority - a.priority;
      if (b.overdueDays !== a.overdueDays) return b.overdueDays - a.overdueDays;
      if (b.lapses !== a.lapses) return b.lapses - a.lapses;
      return a.exerciseId.localeCompare(b.exerciseId);
    })
    .slice(0, Math.max(0, limit));
}

/**
 * Interleave due reviews by learning day where possible, avoiding a long run
 * of the same day before returning to the next available day.
 */
export function interleaveReviewQueue(
  candidates: ScheduledReviewCandidate[],
): ScheduledReviewCandidate[] {
  const groups = new Map<number, ScheduledReviewCandidate[]>();

  for (const candidate of candidates) {
    const group = groups.get(candidate.dayNumber) ?? [];
    group.push(candidate);
    groups.set(candidate.dayNumber, group);
  }

  const orderedGroups = [...groups.values()].sort((a, b) => {
    const priorityDelta = b[0].priority - a[0].priority;
    if (priorityDelta !== 0) return priorityDelta;
    return a[0].dayNumber - b[0].dayNumber;
  });

  const result: ScheduledReviewCandidate[] = [];
  let remaining = true;
  let index = 0;

  while (remaining) {
    remaining = false;
    for (const group of orderedGroups) {
      const item = group[index];
      if (item) {
        result.push(item);
        remaining = true;
      }
    }
    index += 1;
  }

  return result;
}

export const srsConstants = {
  minEase: MIN_EASE,
  maxEase: MAX_EASE,
  initialEase: INITIAL_EASE,
  maxIntervalDays: MAX_INTERVAL_DAYS,
  failureIntervalMinutes: FAILURE_INTERVAL_MINUTES,
};
