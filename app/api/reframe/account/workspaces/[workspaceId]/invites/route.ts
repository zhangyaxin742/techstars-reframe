import { NextResponse } from "next/server";

import { getVerifiedActor } from "@/lib/reframe/account/auth";
import {
  AccountEmailHashConfigError,
  hashAccountEmail,
  sendWorkspaceInviteEmail,
  WorkspaceInviteEmailConfigError,
} from "@/lib/reframe/account/email";
import {
  accountAuthError,
  accountMutationFailure,
  accountRateLimitError,
  accountValidationError,
  verifyAccountMutationCsrf,
} from "@/lib/reframe/account/http";
import { checkWorkspaceInviteRateLimit } from "@/lib/reframe/account/rate-limit";
import { readFirstRpcRow } from "@/lib/reframe/account/service";
import {
  createWorkspaceInviteToken,
  getWorkspaceInviteExpiresAt,
  hashWorkspaceInviteToken,
  WorkspaceInviteTokenConfigError,
} from "@/lib/reframe/account/tokens";
import {
  ACCOUNT_MUTATION_MAX_PAYLOAD_BYTES,
  isUuid,
  parseJsonPayload,
  validateWorkspaceInvitePayload,
} from "@/lib/reframe/account/validation";
import { getClientIpAddress } from "@/lib/reframe/intake/http";
import { createSupabaseRouteClient } from "@/lib/supabase/route";

type InviteCreateRow = {
  invite_id: string;
  workspace_id: string;
  workspace_name?: string;
  email_display: string;
  role: "admin" | "member";
  status: "pending";
  expires_at: string;
  created: boolean;
};

type SupabaseRouteClient = ReturnType<typeof createSupabaseRouteClient>["supabase"];

type RouteContext = {
  params: Promise<{
    workspaceId: string;
  }>;
};

export async function POST(request: Request, context: RouteContext) {
  const params = await context.params;
  if (!isUuid(params.workspaceId)) {
    return accountValidationError({
      code: "invalid_workspace_invite_request",
      message: "Workspace is invalid.",
      status: 400,
      fields: {
        workspaceId: "Workspace is invalid.",
      },
    });
  }

  const csrfResponse = verifyAccountMutationCsrf(request, ["POST"]);
  if (csrfResponse) {
    return csrfResponse;
  }

  const parsed = await parseJsonPayload(
    request,
    ACCOUNT_MUTATION_MAX_PAYLOAD_BYTES,
    validateWorkspaceInvitePayload,
  );
  if (!parsed.ok) {
    return accountValidationError({
      code: "invalid_workspace_invite_request",
      message: "Check the invite fields and try again.",
      status: parsed.status,
      fields: parsed.errors,
    });
  }

  const { supabase, applyToResponse } = createSupabaseRouteClient(request);
  const actor = await getVerifiedActor(supabase);

  if (!actor.ok) {
    return applyToResponse(accountAuthError(actor));
  }

  const token = createWorkspaceInviteToken();
  let emailHash: string;
  let tokenHash: string;
  try {
    emailHash = hashAccountEmail(parsed.value.email);
    tokenHash = hashWorkspaceInviteToken(token);
  } catch (error) {
    if (
      error instanceof AccountEmailHashConfigError ||
      error instanceof WorkspaceInviteTokenConfigError
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
  const expiresAt = getWorkspaceInviteExpiresAt().toISOString();
  const rateLimit = checkWorkspaceInviteRateLimit({
    userId: actor.actor.userId,
    workspaceId: params.workspaceId,
    emailHash,
    ipAddress: getClientIpAddress(request.headers),
  });

  if (!rateLimit.allowed) {
    return applyToResponse(
      accountRateLimitError({
        message: "Too many workspace invites. Try again shortly.",
        retryAfterSeconds: rateLimit.retryAfterSeconds,
      }),
    );
  }

  const { data, error } = await supabase.rpc("create_workspace_invite", {
    p_workspace_id: params.workspaceId,
    p_email_display: parsed.value.email,
    p_email_hash: emailHash,
    p_role: parsed.value.role,
    p_token_hash: tokenHash,
    p_expires_at: expiresAt,
  });

  if (error) {
    return applyToResponse(
      accountMutationFailure({
        code: "workspace_invite_create_failed",
        message: "Could not create invite.",
        status: inviteErrorStatus(error.message),
      }),
    );
  }

  const invite = readFirstRpcRow<InviteCreateRow>(data);
  if (!invite?.invite_id) {
    return applyToResponse(
      accountMutationFailure({
        code: "workspace_invite_create_failed",
        message: "Could not create invite.",
      }),
    );
  }

  const delivery = await sendInviteAndRecordDelivery({
    supabase,
    workspaceId: params.workspaceId,
    invite,
    token,
    inviterName: actor.actor.email,
  });

  return applyToResponse(
    NextResponse.json(
      {
        ok: delivery.ok,
        invite: {
          id: invite.invite_id,
          workspaceId: invite.workspace_id,
          email: invite.email_display,
          role: invite.role,
          status: invite.status,
          expiresAt: invite.expires_at,
          created: invite.created,
          deliveryStatus: delivery.status,
        },
        ...(delivery.ok
          ? {}
          : {
              error: {
                code: delivery.code,
                message: delivery.message,
              },
            }),
      },
      { status: delivery.httpStatus },
    ),
  );
}

async function sendInviteAndRecordDelivery(input: {
  supabase: Pick<SupabaseRouteClient, "rpc">;
  workspaceId: string;
  invite: InviteCreateRow;
  token: string;
  inviterName: string;
}) {
  try {
    const emailId = await sendWorkspaceInviteEmail({
      inviteId: input.invite.invite_id,
      email: input.invite.email_display,
      token: input.token,
      workspaceName: input.invite.workspace_name ?? "Reframe workspace",
      inviterName: input.inviterName,
      role: input.invite.role,
      expiresAt: input.invite.expires_at,
    });
    await markDelivery(input.supabase, {
      workspaceId: input.workspaceId,
      inviteId: input.invite.invite_id,
      status: "sent",
      emailId,
    });
    return {
      ok: true as const,
      status: "sent",
      httpStatus: 200,
    };
  } catch (error) {
    const status =
      error instanceof WorkspaceInviteEmailConfigError ? "skipped" : "failed";
    await markDelivery(input.supabase, {
      workspaceId: input.workspaceId,
      inviteId: input.invite.invite_id,
      status,
      error: error instanceof Error ? error.message : "Invite email failed.",
    });

    return {
      ok: false as const,
      status,
      httpStatus: error instanceof WorkspaceInviteEmailConfigError ? 503 : 502,
      code:
        error instanceof WorkspaceInviteEmailConfigError
          ? "workspace_invite_email_not_configured"
          : "workspace_invite_email_failed",
      message: "Invite was created, but the email could not be sent.",
    };
  }
}

async function markDelivery(
  supabase: Pick<SupabaseRouteClient, "rpc">,
  input: {
    workspaceId: string;
    inviteId: string;
    status: "sent" | "failed" | "skipped";
    emailId?: string | null;
    error?: string;
  },
) {
  const { error } = await supabase.rpc("mark_workspace_invite_delivery", {
    p_workspace_id: input.workspaceId,
    p_invite_id: input.inviteId,
    p_delivery_status: input.status,
    p_delivery_email_id: input.emailId ?? null,
    p_delivery_error: input.error ?? null,
  });

  if (error) {
    console.error("Failed to mark workspace invite delivery.", {
      code: "workspace_invite_delivery_mark_failed",
    });
  }
}

function inviteErrorStatus(message: string) {
  if (message.includes("not_authenticated")) {
    return 401;
  }

  if (message.includes("forbidden")) {
    return 403;
  }

  if (message.includes("existing_member")) {
    return 409;
  }

  return 400;
}
