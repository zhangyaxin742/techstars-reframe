import { NextResponse } from "next/server";

import { getVerifiedActor } from "@/lib/reframe/account/auth";
import {
  AccountEmailHashConfigError,
  hashAccountEmail,
} from "@/lib/reframe/account/email";
import {
  accountAuthError,
  accountMutationFailure,
  accountRateLimitError,
  accountValidationError,
  verifyAccountMutationCsrf,
} from "@/lib/reframe/account/http";
import { checkWorkspaceInviteAcceptRateLimit } from "@/lib/reframe/account/rate-limit";
import { readFirstRpcRow } from "@/lib/reframe/account/service";
import {
  hashWorkspaceInviteToken,
  WorkspaceInviteTokenConfigError,
} from "@/lib/reframe/account/tokens";
import {
  ACCOUNT_MUTATION_MAX_PAYLOAD_BYTES,
  parseJsonPayload,
  validateInviteAcceptPayload,
} from "@/lib/reframe/account/validation";
import { getClientIpAddress } from "@/lib/reframe/intake/http";
import { createSupabaseRouteClient } from "@/lib/supabase/route";

type InviteAcceptRow = {
  workspace_id: string;
  workspace_slug: string;
  membership_role: "owner" | "admin" | "member";
  invite_status: "accepted";
  reused_existing_membership: boolean;
};

export async function POST(request: Request) {
  const csrfResponse = verifyAccountMutationCsrf(request, ["POST"]);
  if (csrfResponse) {
    return csrfResponse;
  }

  const parsed = await parseJsonPayload(
    request,
    ACCOUNT_MUTATION_MAX_PAYLOAD_BYTES,
    validateInviteAcceptPayload,
  );
  if (!parsed.ok) {
    return accountValidationError({
      code: "invalid_workspace_invite_accept_request",
      message: "Invite token is invalid.",
      status: parsed.status,
      fields: parsed.errors,
    });
  }

  const { supabase, applyToResponse } = createSupabaseRouteClient(request);
  const actor = await getVerifiedActor(supabase);

  if (!actor.ok) {
    return applyToResponse(accountAuthError(actor));
  }

  let tokenHash: string;
  let emailHash: string;
  try {
    tokenHash = hashWorkspaceInviteToken(parsed.value.token);
    emailHash = hashAccountEmail(actor.actor.email);
  } catch (error) {
    if (
      error instanceof WorkspaceInviteTokenConfigError ||
      error instanceof AccountEmailHashConfigError
    ) {
      return applyToResponse(
        accountMutationFailure({
          code: "workspace_invite_not_configured",
          message: "Workspace invites are not configured.",
          status: 503,
        }),
      );
    }

    throw error;
  }
  const rateLimit = checkWorkspaceInviteAcceptRateLimit({
    userId: actor.actor.userId,
    inviteTokenHash: tokenHash,
    ipAddress: getClientIpAddress(request.headers),
  });

  if (!rateLimit.allowed) {
    return applyToResponse(
      accountRateLimitError({
        message: "Too many invite attempts. Try again shortly.",
        retryAfterSeconds: rateLimit.retryAfterSeconds,
      }),
    );
  }

  const { data, error } = await supabase.rpc("accept_workspace_invite", {
    p_token_hash: tokenHash,
    p_email_display: actor.actor.email,
    p_email_hash: emailHash,
  });

  if (error) {
    return applyToResponse(
      accountMutationFailure({
        code: "workspace_invite_accept_failed",
        message: "Could not accept invite.",
        status: inviteAcceptErrorStatus(error.message),
      }),
    );
  }

  const accepted = readFirstRpcRow<InviteAcceptRow>(data);
  if (!accepted?.workspace_id) {
    return applyToResponse(
      accountMutationFailure({
        code: "workspace_invite_accept_failed",
        message: "Could not accept invite.",
      }),
    );
  }

  return applyToResponse(
    NextResponse.json({
      ok: true,
      workspace: {
        id: accepted.workspace_id,
        slug: accepted.workspace_slug,
        role: accepted.membership_role,
      },
      invite: {
        status: accepted.invite_status,
        reusedExistingMembership: accepted.reused_existing_membership,
      },
    }),
  );
}

function inviteAcceptErrorStatus(message: string) {
  if (message.includes("not_authenticated")) {
    return 401;
  }

  if (message.includes("email_mismatch") || message.includes("different_user")) {
    return 403;
  }

  if (message.includes("not_found")) {
    return 404;
  }

  if (message.includes("expired") || message.includes("revoked")) {
    return 410;
  }

  if (message.includes("not_pending")) {
    return 409;
  }

  return 400;
}
