export class SupabaseAdminConfigError extends Error {
  constructor(message = "Supabase admin configuration is missing.") {
    super(message);
    this.name = "SupabaseAdminConfigError";
  }
}

export type SupabaseAdminConfig = {
  url: string;
  serviceRoleKey: string;
};

export function readSupabaseAdminConfig(): SupabaseAdminConfig {
  const url =
    process.env.SUPABASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!url || !serviceRoleKey) {
    throw new SupabaseAdminConfigError(
      "Set SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL plus SUPABASE_SERVICE_ROLE_KEY.",
    );
  }

  return {
    url: url.replace(/\/+$/, ""),
    serviceRoleKey,
  };
}

export function buildSupabaseAdminHeaders(config: SupabaseAdminConfig) {
  return {
    apikey: config.serviceRoleKey,
    Authorization: `Bearer ${config.serviceRoleKey}`,
  };
}
