import "server-only";

import { createClient } from "@supabase/supabase-js";

import {
  getSupabasePublicConfig,
  getSupabaseServiceRoleKey,
} from "@/shared/infrastructure/supabase/config";

/**
 * Bypasses RLS and is reserved for isolated, audited administrative or job
 * adapters. It must never be imported by browser-facing code.
 */
export function createSupabaseAdminClient() {
  const { url } = getSupabasePublicConfig();

  return createClient(url, getSupabaseServiceRoleKey(), {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
