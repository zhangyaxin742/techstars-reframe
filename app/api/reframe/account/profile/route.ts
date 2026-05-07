import { NextResponse } from "next/server";

import { getVerifiedActor } from "@/lib/reframe/account/auth";
import {
  accountAuthError,
  accountMutationFailure,
  accountRateLimitError,
  accountValidationError,
  verifyAccountMutationCsrf,
} from "@/lib/reframe/account/http";
import { checkAccountProfileRateLimit } from "@/lib/reframe/account/rate-limit";
import type { ProfileRow } from "@/lib/reframe/account/types";
import {
  ACCOUNT_MUTATION_MAX_PAYLOAD_BYTES,
  parseJsonPayload,
  validateProfileUpdatePayload,
} from "@/lib/reframe/account/validation";
import { getClientIpAddress } from "@/lib/reframe/intake/http";
import { createSupabaseRouteClient } from "@/lib/supabase/route";

export async function PATCH(request: Request) {
  const csrfResponse = verifyAccountMutationCsrf(request, ["PATCH"]);
  if (csrfResponse) {
    return csrfResponse;
  }

  const parsed = await parseJsonPayload(
    request,
    ACCOUNT_MUTATION_MAX_PAYLOAD_BYTES,
    validateProfileUpdatePayload,
  );
  if (!parsed.ok) {
    return accountValidationError({
      code: "invalid_account_profile_request",
      message: "Check the profile fields and try again.",
      status: parsed.status,
      fields: parsed.errors,
    });
  }

  const { supabase, applyToResponse } = createSupabaseRouteClient(request);
  const actor = await getVerifiedActor(supabase);

  if (!actor.ok) {
    return applyToResponse(accountAuthError(actor));
  }

  const rateLimit = checkAccountProfileRateLimit({
    userId: actor.actor.userId,
    ipAddress: getClientIpAddress(request.headers),
  });

  if (!rateLimit.allowed) {
    return applyToResponse(
      accountRateLimitError({
        message: "Too many account updates. Try again shortly.",
        retryAfterSeconds: rateLimit.retryAfterSeconds,
      }),
    );
  }

  const { data, error } = await supabase
    .from("profiles")
    .update({
      display_name: parsed.value.displayName,
    })
    .eq("id", actor.actor.userId)
    .select("id,email_display,display_name,avatar_url,active_workspace_id")
    .maybeSingle();

  if (error || !data) {
    return applyToResponse(
      accountMutationFailure({
        code: "account_profile_update_failed",
        message: "Could not update profile.",
      }),
    );
  }

  const profile = data as ProfileRow;
  return applyToResponse(
    NextResponse.json({
      ok: true,
      profile: {
        id: profile.id,
        email: profile.email_display,
        displayName: profile.display_name,
        avatarUrl: profile.avatar_url,
        activeWorkspaceId: profile.active_workspace_id,
      },
    }),
  );
}
