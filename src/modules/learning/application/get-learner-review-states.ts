"use server";

import { createSupabaseServerClient } from "@/shared/infrastructure/supabase/server";
import type { AttemptSkill } from "@/modules/learning/domain/local-progress";
import type { ReviewScheduleState } from "@/modules/learning/domain/srs";

export type GetLearnerReviewStatesResult = {
  states: ReviewScheduleState[];
};

export async function getLearnerReviewStates(): Promise<GetLearnerReviewStatesResult> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { states: [] };

  const { data, error } = await supabase
    .from("learner_review_states")
    .select(
      "learner_id, exercise_id, day_number, skill, repetitions, lapses, interval_days, ease_factor, due_at, last_reviewed_at",
    )
    .eq("learner_id", user.id)
    .order("due_at", { ascending: true });

  if (error) return { states: [] };

  return {
    states: (data ?? []).map((row) => ({
      learnerId: row.learner_id,
      exerciseId: row.exercise_id,
      dayNumber: row.day_number,
      skill: (row.skill ?? undefined) as AttemptSkill | undefined,
      repetitions: row.repetitions,
      lapses: row.lapses,
      intervalDays: Number(row.interval_days),
      easeFactor: Number(row.ease_factor),
      dueAt: row.due_at,
      lastReviewedAt: row.last_reviewed_at,
    })),
  };
}
