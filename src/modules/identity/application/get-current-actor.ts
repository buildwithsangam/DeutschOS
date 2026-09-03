import "server-only";

import type { CurrentActor } from "@/modules/identity/domain/actor";
import { createSupabaseServerClient } from "@/shared/infrastructure/supabase/server";

/**
 * Resolves the authenticated user from the request-bound Supabase session.
 * Never trusts a client-supplied user ID. Returns null when there is no
 * authenticated session (unauthenticated visitor).
 */
export async function getCurrentActor(): Promise<CurrentActor | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  return {
    id: user.id,
    role: "learner",
  };
}
