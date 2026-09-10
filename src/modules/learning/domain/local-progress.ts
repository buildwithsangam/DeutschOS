export type MasteryStatus =
  | "not_assessed"
  | "needs_practice"
  | "developing"
  | "strong_evidence"
  | "ready_for_review";

export type AttemptResult = "correct" | "incorrect";

export type AttemptSkill =
  | "listening"
  | "speaking"
  | "reading"
  | "writing"
  | "vocabulary"
  | "grammar"
  | "pronunciation"
  | "communication_repair";

export type LocalAttempt = {
  id: string;
  dayNumber: number;
  exerciseId: string;
  correct: boolean;
  result?: AttemptResult;
  skill?: AttemptSkill;
  response?: string;
  at: string;
};

export type LocalDayProgress = {
  lessonCompleted: boolean;
  practiceCompleted: boolean;
  sentenceBuilderCompleted: boolean;
  completedPracticeTaskIds: string[];
  needsReview: boolean;
  masteryStatus: MasteryStatus;
};

export type LocalLearningProgress = {
  version: 1;
  currentDay: number;
  days: Record<number, LocalDayProgress>;
  attempts: LocalAttempt[];
};

export const localProgressStorageKey = "deutschos.local-a1-days-1-14-progress.v1";

export function emptyDayProgress(): LocalDayProgress {
  return {
    lessonCompleted: false,
    practiceCompleted: false,
    sentenceBuilderCompleted: false,
    completedPracticeTaskIds: [],
    needsReview: false,
    masteryStatus: "not_assessed",
  };
}

export function createLocalProgress(): LocalLearningProgress {
  return { version: 1, currentDay: 1, days: {}, attempts: [] };
}

export function dayProgress(progress: LocalLearningProgress, dayNumber: number) {
  return progress.days[dayNumber] ?? emptyDayProgress();
}

export function isDayUnlocked(progress: LocalLearningProgress, dayNumber: number) {
  if (dayNumber === 1) return true;
  const previous = dayProgress(progress, dayNumber - 1);
  return previous.lessonCompleted && previous.practiceCompleted;
}

export function withDayProgress(
  progress: LocalLearningProgress,
  dayNumber: number,
  update: Partial<LocalDayProgress>,
): LocalLearningProgress {
  return {
    ...progress,
    days: {
      ...progress.days,
      [dayNumber]: { ...dayProgress(progress, dayNumber), ...update },
    },
  };
}

export function isPracticeTaskComplete(
  progress: LocalLearningProgress,
  dayNumber: number,
  taskId: string,
) {
  return dayProgress(progress, dayNumber).completedPracticeTaskIds.includes(taskId);
}

export function withPracticeTaskCompletion(
  progress: LocalLearningProgress,
  dayNumber: number,
  taskId: string,
) {
  const current = dayProgress(progress, dayNumber);
  if (current.completedPracticeTaskIds.includes(taskId)) return progress;
  return withDayProgress(progress, dayNumber, {
    completedPracticeTaskIds: [...current.completedPracticeTaskIds, taskId],
  });
}

/**
 * Append immutable learner evidence. A retry creates another record rather
 * than replacing an earlier attempt, so review/progress logic can inspect the
 * complete local history.
 */
export function withAttempt(
  progress: LocalLearningProgress,
  attempt: LocalAttempt,
): LocalLearningProgress {
  if (progress.attempts.some((existing) => existing.id === attempt.id)) {
    return progress;
  }

  return {
    ...progress,
    attempts: [...progress.attempts, { ...attempt }],
  };
}

export function attemptsForExercise(
  progress: LocalLearningProgress,
  exerciseId: string,
): LocalAttempt[] {
  return progress.attempts
    .filter((attempt) => attempt.exerciseId === exerciseId)
    .sort((a, b) => a.at.localeCompare(b.at));
}

export function readLocalProgress(value: string | null): LocalLearningProgress {
  if (!value) return createLocalProgress();

  try {
    const parsed = JSON.parse(value) as Partial<LocalLearningProgress>;
    if (
      parsed.version !== 1 ||
      typeof parsed.currentDay !== "number" ||
      !parsed.days
    ) {
      return createLocalProgress();
    }

    const rawAttempts = Array.isArray(parsed.attempts) ? parsed.attempts : [];

    const attempts = rawAttempts.filter(
      (attempt): attempt is LocalAttempt =>
        Boolean(attempt) &&
        typeof attempt.id === "string" &&
        typeof attempt.dayNumber === "number" &&
        typeof attempt.exerciseId === "string" &&
        typeof attempt.correct === "boolean" &&
        typeof attempt.at === "string",
    );

    return {
      version: 1,
      currentDay: parsed.currentDay,
      attempts,
      days: Object.fromEntries(
        Object.entries(parsed.days).map(([dayNumber, dayProgressValue]) => [
          dayNumber,
          {
            ...emptyDayProgress(),
            ...dayProgressValue,
            completedPracticeTaskIds:
              dayProgressValue.completedPracticeTaskIds ?? [],
          },
        ]),
      ),
    };
  } catch {
    return createLocalProgress();
  }
}
