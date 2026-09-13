"use server";

import { createSupabaseAdminClient } from "@/shared/infrastructure/supabase/admin";
import { createSupabaseServerClient } from "@/shared/infrastructure/supabase/server";
import type { LocalAttempt } from "@/modules/learning/domain/local-progress";
import {
  projectDayMastery,
  projectExerciseMastery,
  projectSkillMastery,
  type MasteryProjection,
} from "@/modules/learning/domain/mastery";
import {
  localAttemptToEvidence,
  type LearnerEvidenceRecord,
} from "@/modules/learning/domain/learner-evidence";

type RecordLearnerAttemptResult =
  | { persisted: true }
  | { persisted: false; reason: "unauthenticated" }
  | { persisted: false; reason: "failed" };

async function requireLearnerId() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user?.id ?? null;
}

function projectionToRow(
  learnerId: string,
  projection: MasteryProjection,
) {
  return {
    learner_id: learnerId,
    scope: projection.scope,
    scope_key: projection.scopeKey,
    mastery_status: projection.masteryStatus,
    attempts: projection.attempts,
    correct_attempts: projection.correctAttempts,
    accuracy: projection.accuracy,
    evidence_level: projection.evidenceLevel,
    last_evidenced_at: projection.lastEvidencedAt,
  };
}

export async function recordLearnerAttempt(
  attempt: LocalAttempt,
): Promise<RecordLearnerAttemptResult> {
  const learnerId = await requireLearnerId();

  if (!learnerId) {
    return { persisted: false, reason: "unauthenticated" };
  }

  const evidence = localAttemptToEvidence(learnerId, attempt);

  const supabase = await createSupabaseServerClient();

  const { error: insertError } = await supabase
    .from("learner_attempts")
    .upsert(
      {
        id: evidence.id,
        learner_id: evidence.learnerId,
        day_number: evidence.dayNumber,
        exercise_id: evidence.exerciseId,
        correct: evidence.correct,
        result: evidence.result ?? null,
        skill: evidence.skill ?? null,
        response: evidence.response ?? null,
        occurred_at: evidence.occurredAt,
      },
      { onConflict: "id" },
    );

  if (insertError) {
    return { persisted: false, reason: "failed" };
  }

  const { data: rows, error: readError } = await supabase
    .from("learner_attempts")
    .select(
      "id, learner_id, day_number, exercise_id, correct, result, skill, response, occurred_at",
    )
    .eq("learner_id", learnerId);

  if (readError) {
    return { persisted: false, reason: "failed" };
  }

  const evidenceRows: LearnerEvidenceRecord[] = (rows ?? []).map((row) => ({
    id: row.id,
    learnerId: row.learner_id,
    dayNumber: row.day_number,
    exerciseId: row.exercise_id,
    correct: row.correct,
    result: row.result ?? undefined,
    skill: row.skill ?? undefined,
    response: row.response ?? undefined,
    occurredAt: row.occurred_at,
  }));

  const projections: MasteryProjection[] = [
    projectDayMastery(evidenceRows, attempt.dayNumber),
    projectExerciseMastery(evidenceRows, attempt.exerciseId),
  ];

  if (attempt.skill) {
    projections.push(projectSkillMastery(evidenceRows, attempt.skill));
  }

  const admin = createSupabaseAdminClient();

  const { error: masteryError } = await admin
    .from("learner_mastery_snapshots")
    .upsert(
      projections.map((projection) =>
        projectionToRow(learnerId, projection),
      ),
      { onConflict: "learner_id,scope,scope_key" },
    );

  if (masteryError) {
    return { persisted: false, reason: "failed" };
  }

  return { persisted: true };
}
