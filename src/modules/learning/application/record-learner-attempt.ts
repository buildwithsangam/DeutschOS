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
import {
  initialReviewState,
  scheduleReview,
  type ReviewScheduleState,
} from "@/modules/learning/domain/srs";
import { projectAllErrorMemory } from "@/modules/learning/domain/error-memory";

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

function reviewStateToRow(state: ReviewScheduleState) {
  return {
    learner_id: state.learnerId,
    exercise_id: state.exerciseId,
    day_number: state.dayNumber,
    skill: state.skill ?? null,
    repetitions: state.repetitions,
    lapses: state.lapses,
    interval_days: state.intervalDays,
    ease_factor: state.easeFactor,
    due_at: state.dueAt,
    last_reviewed_at: state.lastReviewedAt,
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
      projections.map((projection) => projectionToRow(learnerId, projection)),
      { onConflict: "learner_id,scope,scope_key" },
    );

  if (masteryError) {
    return { persisted: false, reason: "failed" };
  }

  const { data: existingReviewState, error: reviewReadError } = await supabase
    .from("learner_review_states")
    .select(
      "learner_id, exercise_id, day_number, skill, repetitions, lapses, interval_days, ease_factor, due_at, last_reviewed_at",
    )
    .eq("learner_id", learnerId)
    .eq("exercise_id", attempt.exerciseId)
    .maybeSingle();

  if (reviewReadError) {
    return { persisted: false, reason: "failed" };
  }

  const previous: ReviewScheduleState | null = existingReviewState
    ? {
        learnerId: existingReviewState.learner_id,
        exerciseId: existingReviewState.exercise_id,
        dayNumber: existingReviewState.day_number,
        skill: existingReviewState.skill ?? undefined,
        repetitions: existingReviewState.repetitions,
        lapses: existingReviewState.lapses,
        intervalDays: Number(existingReviewState.interval_days),
        easeFactor: Number(existingReviewState.ease_factor),
        dueAt: existingReviewState.due_at,
        lastReviewedAt: existingReviewState.last_reviewed_at,
      }
    : null;

  const nextState = previous
    ? scheduleReview(
        {
          ...previous,
          dayNumber: attempt.dayNumber,
          skill: attempt.skill ?? previous.skill,
        },
        attempt.correct ? "correct" : "incorrect",
        attempt.at,
      )
    : initialReviewState({
        learnerId,
        exerciseId: attempt.exerciseId,
        dayNumber: attempt.dayNumber,
        skill: attempt.skill,
        reviewedAt: attempt.at,
        correct: attempt.correct,
      });

  const { error: reviewWriteError } = await supabase
    .from("learner_review_states")
    .upsert(reviewStateToRow(nextState), {
      onConflict: "learner_id,exercise_id",
    });

  if (reviewWriteError) {
    return { persisted: false, reason: "failed" };
  }

  const errorMemory = projectAllErrorMemory(evidenceRows, new Date(attempt.at));
  const { error: errorMemoryWriteError } = await supabase
    .from("learner_error_memory")
    .upsert(
      errorMemory.map((memory) => ({
        learner_id: memory.learnerId,
        exercise_id: memory.exerciseId,
        day_number: memory.dayNumber,
        category: memory.category,
        skill: memory.skill ?? null,
        occurrences: memory.occurrences,
        recent_occurrences: memory.recentOccurrences,
        resolved_streak: memory.resolvedStreak,
        last_occurred_at: memory.lastOccurredAt,
        last_resolved_at: memory.lastResolvedAt,
        influence: memory.influence,
      })),
      { onConflict: "learner_id,exercise_id" },
    );

  if (errorMemoryWriteError) {
    return { persisted: false, reason: "failed" };
  }

  return { persisted: true };
}
