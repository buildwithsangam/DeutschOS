import "server-only";

import type { Profile } from "@/modules/identity/domain/profile";
import { createSupabaseServerClient } from "@/shared/infrastructure/supabase/server";

function rowToProfile(row: Record<string, unknown>): Profile {
  return {
    id: row.id as string,
    displayName: (row.display_name as string | null) ?? null,
    timezone: row.timezone as string,
    targetExamTrackId: (row.target_exam_track_id as string | null) ?? null,
    consentVersion: (row.consent_version as string | null) ?? null,
    consentedAt: (row.consented_at as string | null) ?? null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

/**
 * Fetches the profile for the authenticated user. Creates a default profile
 * if one does not yet exist (first sign-in). Returns null when the user is
 * not authenticated.
 */
export async function getOrCreateProfile(): Promise<Profile | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: existing } = await supabase
    .from("profiles")
    .select(
      "id, display_name, timezone, target_exam_track_id, consent_version, consented_at, created_at, updated_at",
    )
    .eq("id", user.id)
    .maybeSingle();

  if (existing) {
    return rowToProfile(existing);
  }

  // Profile does not exist yet — create it. The INSERT policy allows
  // auth.uid() = id, so the session client can insert the user's own row.
  const { data: created, error } = await supabase
    .from("profiles")
    .insert({ id: user.id })
    .select(
      "id, display_name, timezone, target_exam_track_id, consent_version, consented_at, created_at, updated_at",
    )
    .maybeSingle();

  if (error || !created) {
    // Race condition: another request may have created the profile
    // concurrently. Try reading again.
    const { data: retry } = await supabase
      .from("profiles")
      .select(
        "id, display_name, timezone, target_exam_track_id, consent_version, consented_at, created_at, updated_at",
      )
      .eq("id", user.id)
      .maybeSingle();

    if (retry) {
      return rowToProfile(retry);
    }
    return null;
  }

  return rowToProfile(created);
}
