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
import type { AccountWorkspace, ProfileRow } from "@/lib/reframe/account/types";
import {
  ACCOUNT_MUTATION_MAX_PAYLOAD_BYTES,
  parseJsonPayload,
  validateActiveWorkspacePayload,
} from "@/lib/reframe/account/validation";
import { getClientIpAddress } from "@/lib/reframe/intake/http";
import { createSupabaseRouteClient } from "@/lib/supabase/route";

type MembershipRow = {
  workspace_id: string;
  role: AccountWorkspace["role"];
  workspaces?: {
    id: string;
    slug: string;
    name: string;
    created_at: string;
  } | null;
};

type MembershipQueryRow = Omit<MembershipRow, "workspaces"> & {
  workspaces?: MembershipRow["workspaces"] | NonNullable<MembershipRow["workspaces"]>[];
};

export async function PATCH(request: Request) {
  const csrfResponse = verifyAccountMutationCsrf(request, ["PATCH"]);
  if (csrfResponse) {
    return csrfResponse;
  }

  const parsed = await parseJsonPayload(
    request,
    ACCOUNT_MUTATION_MAX_PAYLOAD_BYTES,
    validateActiveWorkspacePayload,
  );
  if (!parsed.ok) {
    return accountValidationError({
      code: "invalid_active_workspace_request",
      message: "Choose a valid workspace.",
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
    workspaceId: parsed.value.workspaceId,
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

  const { data: membership, error: membershipError } = await supabase
    .from("workspace_memberships")
    .select("workspace_id,role,workspaces(id,slug,name,created_at)")
    .eq("workspace_id", parsed.value.workspaceId)
    .eq("user_id", actor.actor.userId)
    .maybeSingle();

  if (membershipError) {
    return applyToResponse(
      accountMutationFailure({
        code: "active_workspace_membership_read_failed",
        message: "Could not verify workspace membership.",
      }),
    );
  }

  if (!membership) {
    return applyToResponse(
      accountMutationFailure({
        code: "workspace_membership_required",
        message: "You are not a member of that workspace.",
        status: 403,
      }),
    );
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .update({
      active_workspace_id: parsed.value.workspaceId,
    })
    .eq("id", actor.actor.userId)
    .select("id,email_display,display_name,avatar_url,active_workspace_id")
    .maybeSingle();

  if (profileError || !profile) {
    return applyToResponse(
      accountMutationFailure({
        code: "active_workspace_update_failed",
        message: "Could not switch workspace.",
      }),
    );
  }

  const membershipRow = toMembershipRow(membership as unknown as MembershipQueryRow);
  const workspace = membershipRow.workspaces;

  return applyToResponse(
    NextResponse.json({
      ok: true,
      profile: toProfile(profile as ProfileRow),
      activeWorkspace: workspace
        ? {
            id: workspace.id,
            slug: workspace.slug,
            name: workspace.name,
            role: membershipRow.role,
            createdAt: workspace.created_at,
          }
        : null,
    }),
  );
}

function toMembershipRow(row: MembershipQueryRow): MembershipRow {
  return {
    workspace_id: row.workspace_id,
    role: row.role,
    workspaces: Array.isArray(row.workspaces)
      ? row.workspaces[0] ?? null
      : row.workspaces ?? null,
  };
}

function toProfile(profile: ProfileRow) {
  return {
    id: profile.id,
    email: profile.email_display,
    displayName: profile.display_name,
    avatarUrl: profile.avatar_url,
    activeWorkspaceId: profile.active_workspace_id,
  };
}
