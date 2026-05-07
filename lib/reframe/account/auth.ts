import type { SupabaseClient } from "@supabase/supabase-js";

import type { VerifiedActor, WorkspaceRole } from "./types";

type ClaimsResponse = {
  data?: {
    claims?: {
      sub?: unknown;
      email?: unknown;
    } | null;
  } | null;
  error?: {
    message?: string;
  } | null;
};

export type VerifiedActorResult =
  | { ok: true; actor: VerifiedActor }
  | {
      ok: false;
      status: 401;
      code: "unauthenticated";
      message: string;
    };

export async function getVerifiedActor(
  supabase: Pick<SupabaseClient, "auth">,
): Promise<VerifiedActorResult> {
  const result = (await supabase.auth.getClaims()) as ClaimsResponse;
  const claims = result.data?.claims;
  const userId = typeof claims?.sub === "string" ? claims.sub : "";
  const email = typeof claims?.email === "string" ? claims.email.trim().toLowerCase() : "";

  if (result.error || !userId || !email) {
    return {
      ok: false,
      status: 401,
      code: "unauthenticated",
      message: "Sign in to continue.",
    };
  }

  return {
    ok: true,
    actor: {
      userId,
      email,
    },
  };
}

export function isOwnerOrAdmin(role: WorkspaceRole | null | undefined) {
  return role === "owner" || role === "admin";
}
