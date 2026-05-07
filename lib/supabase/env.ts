export class SupabaseBrowserConfigError extends Error {
  constructor(message = "Supabase browser configuration is missing.") {
    super(message);
    this.name = "SupabaseBrowserConfigError";
  }
}

export type SupabaseBrowserConfig = {
  url: string;
  publishableKey: string;
};

export function readSupabaseBrowserConfig(): SupabaseBrowserConfig {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const publishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (!url || !publishableKey) {
    throw new SupabaseBrowserConfigError(
      "Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, or NEXT_PUBLIC_SUPABASE_ANON_KEY.",
    );
  }

  return {
    url: url.replace(/\/+$/, ""),
    publishableKey,
  };
}
