import { createBrowserClient } from "@supabase/ssr";

import { getSupabasePublicConfig } from "@/shared/infrastructure/supabase/config";

/** Browser client for Auth and explicitly authorized public-key operations only. */
export function createSupabaseBrowserClient() {
  const { url, publishableKey } = getSupabasePublicConfig();

  return createBrowserClient(url, publishableKey);
}
