"use client";

import { createBrowserClient } from "@supabase/ssr";

import { readSupabaseBrowserConfig } from "@/lib/supabase/env";

export function createSupabaseBrowserClient() {
  const { url, publishableKey } = readSupabaseBrowserConfig();

  return createBrowserClient(url, publishableKey);
}
