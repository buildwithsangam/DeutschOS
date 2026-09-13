import type { AttemptSkill } from "@/modules/learning/domain/local-progress";
import type { LearnerEvidenceRecord } from "@/modules/learning/domain/learner-evidence";

export type MasteryStatus =
  | "not_assessed"
  | "needs_practice"
  | "developing"
  | "strong_evidence"
  | "ready_for_review";

export type EvidenceLevel = "none" | "emerging" | "sufficient";

export type MasteryProjection = {
  scope: "skill" | "day" | "exercise";
  scopeKey: string;
  masteryStatus: MasteryStatus;
  attempts: number;
  correctAttempts: number;
  accuracy: number | null;
  evidenceLevel: EvidenceLevel;
  lastEvidencedAt: string | null;
};

type EvidenceThresholds = {
  minAttempts: number;
  strongAccuracy: number;
};

const DEFAULT_THRESHOLDS: EvidenceThresholds = {
  minAttempts: 3,
  strongAccuracy: 0.8,
};

function buildProjection(
  scope: MasteryProjection["scope"],
  scopeKey: string,
  attempts: LearnerEvidenceRecord[],
  thresholds = DEFAULT_THRESHOLDS,
): MasteryProjection {
  const correctAttempts = attempts.filter((item) => item.correct).length;
  const accuracy = attempts.length ? correctAttempts / attempts.length : null;
  const lastEvidencedAt =
    attempts.length
      ? [...attempts].sort((a, b) =>
          b.occurredAt.localeCompare(a.occurredAt),
        )[0].occurredAt
      : null;

  let masteryStatus: MasteryStatus = "not_assessed";
  let evidenceLevel: EvidenceLevel = "none";

  if (attempts.length > 0) {
    evidenceLevel = attempts.length >= thresholds.minAttempts ? "sufficient" : "emerging";

    if (accuracy !== null && attempts.length >= thresholds.minAttempts) {
      masteryStatus =
        accuracy >= thresholds.strongAccuracy
          ? "strong_evidence"
          : "developing";
    } else {
      masteryStatus = "needs_practice";
    }
  }

  return {
    scope,
    scopeKey,
    masteryStatus,
    attempts: attempts.length,
    correctAttempts,
    accuracy,
    evidenceLevel,
    lastEvidencedAt,
  };
}

export function projectSkillMastery(
  evidence: LearnerEvidenceRecord[],
  skill: AttemptSkill,
): MasteryProjection {
  return buildProjection(
    "skill",
    skill,
    evidence.filter((item) => item.skill === skill),
  );
}

export function projectDayMastery(
  evidence: LearnerEvidenceRecord[],
  dayNumber: number,
): MasteryProjection {
  return buildProjection(
    "day",
    String(dayNumber),
    evidence.filter((item) => item.dayNumber === dayNumber),
  );
}

export function projectExerciseMastery(
  evidence: LearnerEvidenceRecord[],
  exerciseId: string,
): MasteryProjection {
  return buildProjection(
    "exercise",
    exerciseId,
    evidence.filter((item) => item.exerciseId === exerciseId),
  );
}
