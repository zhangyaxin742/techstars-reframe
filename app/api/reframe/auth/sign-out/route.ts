import { NextResponse } from "next/server";

import { getVerifiedActor } from "@/lib/reframe/account/auth";
import {
  ACCOUNT_MUTATION_MAX_PAYLOAD_BYTES,
  parseJsonPayload,
  validateEmptyPayload,
} from "@/lib/reframe/account/validation";
import {
  accountValidationError,
  verifyAccountMutationCsrf,
} from "@/lib/reframe/account/http";
import { createSupabaseRouteClient } from "@/lib/supabase/route";

export async function POST(request: Request) {
  const csrfResponse = verifyAccountMutationCsrf(request, ["POST"]);
  if (csrfResponse) {
    return csrfResponse;
  }

  const parsed = await parseJsonPayload(
    request,
    ACCOUNT_MUTATION_MAX_PAYLOAD_BYTES,
    validateEmptyPayload,
  );
  if (!parsed.ok) {
    return accountValidationError({
      code: "invalid_sign_out_request",
      message: "Could not sign out.",
      status: parsed.status,
      fields: parsed.errors,
    });
  }

  const { supabase, applyToResponse } = createSupabaseRouteClient(request);
  await getVerifiedActor(supabase);

  const { error } = await supabase.auth.signOut();
  if (error) {
    return applyToResponse(
      NextResponse.json(
        {
          ok: false,
          error: {
            code: "sign_out_failed",
            message: "Could not sign out.",
          },
        },
        { status: 502 },
      ),
    );
  }

  return applyToResponse(
    NextResponse.json({
      ok: true,
      redirectTo: "/account",
    }),
  );
}
