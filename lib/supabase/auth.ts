import { createClient } from "@supabase/supabase-js";

import { readSupabaseBrowserConfig } from "@/lib/supabase/env";

export function createSupabasePasswordlessAuthClient() {
  const { url, publishableKey } = readSupabaseBrowserConfig();

  return createClient(url, publishableKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });
}
