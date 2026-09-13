import type { AttemptSkill } from "@/modules/learning/domain/local-progress";
import type { LearnerEvidenceRecord } from "@/modules/learning/domain/learner-evidence";

export type ErrorCategory = "grammar" | "vocabulary" | "listening" | "reading" | "writing" | "speaking" | "pronunciation" | "communication_repair" | "general";

export type ErrorMemory = {
  learnerId: string;
  exerciseId: string;
  dayNumber: number;
  category: ErrorCategory;
  skill?: AttemptSkill;
  occurrences: number;
  recentOccurrences: number;
  resolvedStreak: number;
  lastOccurredAt: string;
  lastResolvedAt: string | null;
  influence: number;
};

const RECENT_WINDOW_MS = 14 * 24 * 60 * 60 * 1000;
const MAX_INFLUENCE = 100;

export function classifyError(skill?: AttemptSkill): ErrorCategory {
  switch (skill) {
    case "grammar": return "grammar";
    case "vocabulary": return "vocabulary";
    case "listening": return "listening";
    case "reading": return "reading";
    case "writing": return "writing";
    case "speaking": return "speaking";
    case "pronunciation": return "pronunciation";
    case "communication_repair": return "communication_repair";
    default: return "general";
  }
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function influenceFor(occurrences: number, recentOccurrences: number, resolvedStreak: number) {
  return clamp(
    occurrences * 15 + recentOccurrences * 10 - resolvedStreak * 8,
    0,
    MAX_INFLUENCE,
  );
}

export function projectErrorMemory(
  evidence: LearnerEvidenceRecord[],
  exerciseId: string,
  now = new Date(),
): ErrorMemory | null {
  const exerciseEvidence = evidence
    .filter((item) => item.exerciseId === exerciseId)
    .sort((a, b) => a.occurredAt.localeCompare(b.occurredAt));
  if (!exerciseEvidence.some((item) => !item.correct)) return null;

  const latest = exerciseEvidence[exerciseEvidence.length - 1];
  const failures = exerciseEvidence.filter((item) => !item.correct);
  const recentOccurrences = failures.filter(
    (item) => now.getTime() - new Date(item.occurredAt).getTime() <= RECENT_WINDOW_MS,
  ).length;
  let resolvedStreak = 0;
  for (let index = exerciseEvidence.length - 1; index >= 0 && exerciseEvidence[index].correct; index -= 1) {
    resolvedStreak += 1;
  }
  const lastFailure = failures[failures.length - 1];
  const lastResolved = [...exerciseEvidence].reverse().find((item) => item.correct);
  const category = classifyError(lastFailure.skill);

  return {
    learnerId: lastFailure.learnerId,
    exerciseId,
    dayNumber: lastFailure.dayNumber,
    category,
    skill: lastFailure.skill,
    occurrences: failures.length,
    recentOccurrences,
    resolvedStreak,
    lastOccurredAt: lastFailure.occurredAt,
    lastResolvedAt: lastResolved?.occurredAt ?? null,
    influence: influenceFor(failures.length, recentOccurrences, resolvedStreak),
  };
}

export function projectAllErrorMemory(
  evidence: LearnerEvidenceRecord[],
  now = new Date(),
): ErrorMemory[] {
  return [...new Set(evidence.filter((item) => !item.correct).map((item) => item.exerciseId))]
    .map((exerciseId) => projectErrorMemory(evidence, exerciseId, now))
    .filter((item): item is ErrorMemory => item !== null)
    .sort((a, b) => b.influence - a.influence || b.lastOccurredAt.localeCompare(a.lastOccurredAt) || a.exerciseId.localeCompare(b.exerciseId));
}
