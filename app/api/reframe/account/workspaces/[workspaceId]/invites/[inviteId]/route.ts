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
import {
  ACCOUNT_MUTATION_MAX_PAYLOAD_BYTES,
  isUuid,
  parseJsonPayload,
  validateEmptyPayload,
} from "@/lib/reframe/account/validation";
import { getClientIpAddress } from "@/lib/reframe/intake/http";
import { createSupabaseRouteClient } from "@/lib/supabase/route";

type RevokeInviteRow = {
  invite_id: string;
  status: "revoked";
  revoked_at: string;
};

type RouteContext = {
  params: Promise<{
    workspaceId: string;
    inviteId: string;
  }>;
};

export async function DELETE(request: Request, context: RouteContext) {
  const params = await context.params;
  const paramErrors: Record<string, string> = {};

  if (!isUuid(params.workspaceId)) {
    paramErrors.workspaceId = "Workspace is invalid.";
  }

  if (!isUuid(params.inviteId)) {
    paramErrors.inviteId = "Invite is invalid.";
  }

  if (Object.keys(paramErrors).length > 0) {
    return accountValidationError({
      code: "invalid_workspace_invite_revoke_request",
      message: "Invite is invalid.",
      status: 400,
      fields: paramErrors,
    });
  }

  const csrfResponse = verifyAccountMutationCsrf(request, ["DELETE"]);
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
      code: "invalid_workspace_invite_revoke_request",
      message: "Invite is invalid.",
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
    workspaceId: params.workspaceId,
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

  const { data, error } = await supabase.rpc("revoke_workspace_invite", {
    p_workspace_id: params.workspaceId,
    p_invite_id: params.inviteId,
  });

  if (error) {
    return applyToResponse(
      accountMutationFailure({
        code: "workspace_invite_revoke_failed",
        message: "Could not revoke invite.",
        status: revokeErrorStatus(error.message),
      }),
    );
  }

  const revoked = readFirstRpcRow<RevokeInviteRow>(data);
  if (!revoked?.invite_id) {
    return applyToResponse(
      accountMutationFailure({
        code: "workspace_invite_revoke_failed",
        message: "Could not revoke invite.",
      }),
    );
  }

  return applyToResponse(
    NextResponse.json({
      ok: true,
      invite: {
        id: revoked.invite_id,
        status: revoked.status,
        revokedAt: revoked.revoked_at,
      },
    }),
  );
}

function revokeErrorStatus(message: string) {
  if (message.includes("not_authenticated")) {
    return 401;
  }

  if (message.includes("forbidden")) {
    return 403;
  }

  if (message.includes("not_pending")) {
    return 409;
  }

  return 400;
}
