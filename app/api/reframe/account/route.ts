import { NextResponse } from "next/server";

import { getVerifiedActor, isOwnerOrAdmin } from "@/lib/reframe/account/auth";
import {
  buildAccountPayload,
  chooseActiveWorkspace,
  toAccountProfile,
  toMembershipWorkspaces,
} from "@/lib/reframe/account/service";
import type {
  ProfileRow,
  WorkspaceInviteRow,
  WorkspaceMemberRow,
  WorkspaceMembershipRow,
} from "@/lib/reframe/account/types";
import { createSupabaseRouteClient } from "@/lib/supabase/route";

type WorkspaceMemberRpcRow = {
  workspace_id: string;
  user_id: string;
  role: WorkspaceMemberRow["role"];
  joined_at: string | null;
  created_at: string;
  display_name: string | null;
  email_display: string | null;
  avatar_url: string | null;
};

type WorkspaceInviteRpcRow = {
  id: string;
  workspace_id: string;
  email_display: string;
  role: WorkspaceInviteRow["role"];
  status: WorkspaceInviteRow["status"];
  expires_at: string;
  delivery_status?: WorkspaceInviteRow["delivery_status"];
};

export async function GET(request: Request) {
  const { supabase, applyToResponse } = createSupabaseRouteClient(request);
  const actor = await getVerifiedActor(supabase);

  if (!actor.ok) {
    return applyToResponse(
      NextResponse.json(
        {
          ok: false,
          error: {
            code: actor.code,
            message: actor.message,
          },
        },
        { status: actor.status },
      ),
    );
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id,email_display,display_name,avatar_url,active_workspace_id")
    .eq("id", actor.actor.userId)
    .maybeSingle();

  if (profileError) {
    return applyToResponse(readFailure("account_profile_read_failed"));
  }

  if (!profile) {
    return applyToResponse(
      NextResponse.json(
        {
          ok: false,
          error: {
            code: "account_profile_missing",
            message: "Account profile has not been created yet.",
          },
        },
        { status: 409 },
      ),
    );
  }

  const { data: memberships, error: membershipError } = await supabase
    .from("workspace_memberships")
    .select(
      "workspace_id,user_id,role,joined_at,created_at,workspaces(id,slug,name,created_at)",
    )
    .eq("user_id", actor.actor.userId)
    .order("created_at", { ascending: true });

  if (membershipError) {
    return applyToResponse(readFailure("account_membership_read_failed"));
  }

  const profileRow = profile as ProfileRow;
  const membershipRows = (memberships ?? []) as WorkspaceMembershipRow[];
  const accountProfile = toAccountProfile(profileRow);
  const workspaceRows = toMembershipWorkspaces(membershipRows);
  const activeWorkspace = chooseActiveWorkspace({
    profile: accountProfile,
    memberships: workspaceRows,
  });

  let memberRows: WorkspaceMemberRow[] = [];
  let inviteRows: WorkspaceInviteRow[] = [];

  if (activeWorkspace) {
    const { data: members, error: membersError } = await supabase.rpc(
      "get_workspace_account_members",
      {
        p_workspace_id: activeWorkspace.id,
      },
    );

    if (membersError) {
      return applyToResponse(readFailure("account_member_read_failed"));
    }

    memberRows = ((members ?? []) as WorkspaceMemberRpcRow[]).map(
      toWorkspaceMemberRow,
    );

    if (isOwnerOrAdmin(activeWorkspace.role)) {
      const { data: invites, error: invitesError } = await supabase.rpc(
        "get_workspace_pending_invites",
        {
          p_workspace_id: activeWorkspace.id,
        },
      );

      if (invitesError) {
        return applyToResponse(readFailure("account_invite_read_failed"));
      }

      inviteRows = ((invites ?? []) as WorkspaceInviteRpcRow[]).map(
        toWorkspaceInviteRow,
      );
    }
  }

  return applyToResponse(
    NextResponse.json({
      ok: true,
      account: buildAccountPayload({
        profile: profileRow,
        membershipRows,
        memberRows,
        inviteRows,
      }),
    }),
  );
}

function toWorkspaceMemberRow(row: WorkspaceMemberRpcRow): WorkspaceMemberRow {
  return {
    workspace_id: row.workspace_id,
    user_id: row.user_id,
    role: row.role,
    joined_at: row.joined_at,
    created_at: row.created_at,
    profiles: {
      id: row.user_id,
      display_name: row.display_name,
      email_display: row.email_display,
      avatar_url: row.avatar_url,
    },
  };
}

function toWorkspaceInviteRow(row: WorkspaceInviteRpcRow): WorkspaceInviteRow {
  return {
    id: row.id,
    workspace_id: row.workspace_id,
    email_display: row.email_display,
    role: row.role,
    status: row.status,
    expires_at: row.expires_at,
    delivery_status: row.delivery_status,
  };
}

function readFailure(code: string) {
  return NextResponse.json(
    {
      ok: false,
      error: {
        code,
        message: "Could not load account data.",
      },
    },
    { status: 500 },
  );
}
