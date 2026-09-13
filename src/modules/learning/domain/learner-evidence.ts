import type {
  AttemptResult,
  AttemptSkill,
  LocalAttempt,
} from "@/modules/learning/domain/local-progress";

export type LearnerEvidenceRecord = {
  id: string;
  learnerId: string;
  dayNumber: number;
  exerciseId: string;
  correct: boolean;
  result?: AttemptResult;
  skill?: AttemptSkill;
  response?: string;
  occurredAt: string;
};

export function localAttemptToEvidence(
  learnerId: string,
  attempt: LocalAttempt,
): LearnerEvidenceRecord {
  return {
    id: attempt.id,
    learnerId,
    dayNumber: attempt.dayNumber,
    exerciseId: attempt.exerciseId,
    correct: attempt.correct,
    result: attempt.result,
    skill: attempt.skill,
    response: attempt.response,
    occurredAt: attempt.at,
  };
}
