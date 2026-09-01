export type MasteryStatus = "not_assessed" | "needs_practice" | "developing" | "strong_evidence" | "ready_for_review";

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
  return { version: 1, currentDay: 1, days: {} };
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
    days: { ...progress.days, [dayNumber]: { ...dayProgress(progress, dayNumber), ...update } },
  };
}

export function isPracticeTaskComplete(progress: LocalLearningProgress, dayNumber: number, taskId: string) {
  return dayProgress(progress, dayNumber).completedPracticeTaskIds.includes(taskId);
}

export function withPracticeTaskCompletion(progress: LocalLearningProgress, dayNumber: number, taskId: string) {
  const current = dayProgress(progress, dayNumber);
  if (current.completedPracticeTaskIds.includes(taskId)) return progress;
  return withDayProgress(progress, dayNumber, {
    completedPracticeTaskIds: [...current.completedPracticeTaskIds, taskId],
  });
}

export function readLocalProgress(value: string | null): LocalLearningProgress {
  if (!value) return createLocalProgress();
  try {
    const parsed = JSON.parse(value) as LocalLearningProgress;
    if (parsed.version !== 1 || typeof parsed.currentDay !== "number" || !parsed.days) return createLocalProgress();
    return {
      ...parsed,
      days: Object.fromEntries(
        Object.entries(parsed.days).map(([dayNumber, progress]) => [
          dayNumber,
          { ...emptyDayProgress(), ...progress, completedPracticeTaskIds: progress.completedPracticeTaskIds ?? [] },
        ]),
      ),
    };
  } catch {
    return createLocalProgress();
  }
}
