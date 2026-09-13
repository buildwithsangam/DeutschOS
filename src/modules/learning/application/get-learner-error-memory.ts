"use server";

import { createSupabaseServerClient } from "@/shared/infrastructure/supabase/server";
import type { AttemptSkill } from "@/modules/learning/domain/local-progress";
import type { ErrorCategory, ErrorMemory } from "@/modules/learning/domain/error-memory";

export async function getLearnerErrorMemory(): Promise<{ memories: ErrorMemory[] }> {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { memories: [] };

  const { data, error } = await supabase
    .from("learner_error_memory")
    .select("learner_id, exercise_id, day_number, category, skill, occurrences, recent_occurrences, resolved_streak, last_occurred_at, last_resolved_at, influence")
    .eq("learner_id", user.id)
    .order("influence", { ascending: false });

  if (error) return { memories: [] };

  return {
    memories: (data ?? []).map((row) => ({
      learnerId: row.learner_id,
      exerciseId: row.exercise_id,
      dayNumber: row.day_number,
      category: row.category as ErrorCategory,
      skill: row.skill as AttemptSkill | undefined,
      occurrences: row.occurrences,
      recentOccurrences: row.recent_occurrences,
      resolvedStreak: row.resolved_streak,
      lastOccurredAt: row.last_occurred_at,
      lastResolvedAt: row.last_resolved_at,
      influence: Number(row.influence),
    })),
  };
}
