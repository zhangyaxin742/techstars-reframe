import { NextResponse } from "next/server";

import { getVerifiedActor } from "@/lib/reframe/account/auth";
import {
  accountAuthError,
  accountMutationFailure,
  accountRateLimitError,
  accountValidationError,
  verifyAccountMutationCsrf,
} from "@/lib/reframe/account/http";
import { checkAccountWorkspaceMutationRateLimit } from "@/lib/reframe/account/rate-limit";
import { readFirstRpcRow } from "@/lib/reframe/account/service";
import type { RpcWorkspaceRow } from "@/lib/reframe/account/types";
import {
  ACCOUNT_MUTATION_MAX_PAYLOAD_BYTES,
  parseJsonPayload,
  validateWorkspaceCreatePayload,
} from "@/lib/reframe/account/validation";
import { getClientIpAddress } from "@/lib/reframe/intake/http";
import { createSupabaseRouteClient } from "@/lib/supabase/route";

export async function POST(request: Request) {
  const csrfResponse = verifyAccountMutationCsrf(request, ["POST"]);
  if (csrfResponse) {
    return csrfResponse;
  }

  const parsed = await parseJsonPayload(
    request,
    ACCOUNT_MUTATION_MAX_PAYLOAD_BYTES,
    validateWorkspaceCreatePayload,
  );
  if (!parsed.ok) {
    return accountValidationError({
      code: "invalid_workspace_create_request",
      message: "Check the workspace fields and try again.",
      status: parsed.status,
      fields: parsed.errors,
    });
  }

  const { supabase, applyToResponse } = createSupabaseRouteClient(request);
  const actor = await getVerifiedActor(supabase);

  if (!actor.ok) {
    return applyToResponse(accountAuthError(actor));
  }

  const rateLimit = checkAccountWorkspaceMutationRateLimit({
    userId: actor.actor.userId,
    ipAddress: getClientIpAddress(request.headers),
  });

  if (!rateLimit.allowed) {
    return applyToResponse(
      accountRateLimitError({
        message: "Too many workspace updates. Try again shortly.",
        retryAfterSeconds: rateLimit.retryAfterSeconds,
      }),
    );
  }

  const { data, error } = await supabase.rpc("create_workspace", {
    p_name: parsed.value.name ?? "My Workspace",
  });

  if (error) {
    return applyToResponse(
      accountMutationFailure({
        code: "workspace_create_failed",
        message: "Could not create workspace.",
      }),
    );
  }

  const workspace = readFirstRpcRow<RpcWorkspaceRow>(data);
  if (!workspace?.workspace_id || !workspace.workspace_slug) {
    return applyToResponse(
      accountMutationFailure({
        code: "workspace_create_failed",
        message: "Could not create workspace.",
      }),
    );
  }

  return applyToResponse(
    NextResponse.json({
      ok: true,
      workspace: {
        id: workspace.workspace_id,
        slug: workspace.workspace_slug,
        name: workspace.workspace_name ?? parsed.value.name ?? "My Workspace",
        role: workspace.membership_role ?? "owner",
      },
    }),
  );
}
