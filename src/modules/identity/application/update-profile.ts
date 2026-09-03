import "server-only";

import type { UpdateableProfileFields } from "@/modules/identity/domain/profile";
import { createSupabaseServerClient } from "@/shared/infrastructure/supabase/server";

/**
 * Updates the authenticated user's own profile. Only the updatable fields
 * are sent. The RLS policy ensures the user can only update their own row.
 */
export async function updateProfile(
  fields: UpdateableProfileFields,
): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not authenticated");
  }

  const update: Record<string, unknown> = {};
  if (fields.displayName !== undefined) {
    update.display_name = fields.displayName;
  }
  if (fields.timezone !== undefined) {
    update.timezone = fields.timezone;
  }
  if (fields.targetExamTrackId !== undefined) {
    update.target_exam_track_id = fields.targetExamTrackId;
  }

  if (Object.keys(update).length === 0) {
    return;
  }

  const { error } = await supabase
    .from("profiles")
    .update(update)
    .eq("id", user.id);

  if (error) {
    throw new Error(`Failed to update profile: ${error.message}`);
  }
}
