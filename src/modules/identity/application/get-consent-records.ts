import "server-only";

import type { ConsentRecord } from "@/modules/identity/domain/consent";
import { createSupabaseServerClient } from "@/shared/infrastructure/supabase/server";

function rowToConsentRecord(row: Record<string, unknown>): ConsentRecord {
  return {
    id: row.id as string,
    learnerId: row.learner_id as string,
    feature: row.feature as ConsentRecord["feature"],
    action: row.action as ConsentRecord["action"],
    consentVersion: (row.consent_version as string | null) ?? null,
    recordedAt: row.recorded_at as string,
  };
}

/**
 * Fetches all consent records for the authenticated user, ordered by
 * recorded_at descending (most recent first).
 */
export async function getConsentRecords(): Promise<ConsentRecord[]> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return [];
  }

  const { data, error } = await supabase
    .from("consent_records")
    .select("id, learner_id, feature, action, consent_version, recorded_at")
    .eq("learner_id", user.id)
    .order("recorded_at", { ascending: false });

  if (error || !data) {
    return [];
  }

  return data.map(rowToConsentRecord);
}
