import "server-only";

import type { ConsentRequest } from "@/modules/identity/domain/consent";
import { createSupabaseAdminClient } from "@/shared/infrastructure/supabase/admin";
import { getCurrentActor } from "@/modules/identity/application/get-current-actor";

/**
 * Records a consent action for the authenticated user. Uses the service-role
 * client because consent_records have no INSERT policy for authenticated users
 * — consent writes must go through this secure server-side boundary only.
 */
export async function recordConsent(request: ConsentRequest): Promise<void> {
  const actor = await getCurrentActor();

  if (!actor) {
    throw new Error("Not authenticated");
  }

  const admin = createSupabaseAdminClient();
  const { error } = await admin.from("consent_records").insert({
    learner_id: actor.id,
    feature: request.feature,
    action: request.action,
    consent_version: request.consentVersion ?? null,
  });

  if (error) {
    throw new Error(`Failed to record consent: ${error.message}`);
  }
}
