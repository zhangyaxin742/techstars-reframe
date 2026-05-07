import { isOwnerOrAdmin } from "./auth";
import type {
  AccountMember,
  AccountPayload,
  AccountProfile,
  AccountWorkspace,
  PendingWorkspaceInvite,
  ProfileRow,
  WorkspaceInviteRow,
  WorkspaceMemberRow,
  WorkspaceMembershipRow,
  WorkspaceRole,
} from "./types";

export function toAccountProfile(row: ProfileRow): AccountProfile {
  return {
    id: row.id,
    email: row.email_display,
    displayName: row.display_name,
    avatarUrl: row.avatar_url,
    activeWorkspaceId: row.active_workspace_id,
  };
}

export function toMembershipWorkspaces(
  rows: WorkspaceMembershipRow[],
): AccountWorkspace[] {
  return rows
    .map((row) => {
      const workspace = row.workspaces;
      if (!workspace) {
        return null;
      }

      return {
        id: workspace.id,
        slug: workspace.slug,
        name: workspace.name,
        role: row.role,
        createdAt: workspace.created_at,
      };
    })
    .filter((workspace): workspace is AccountWorkspace => Boolean(workspace));
}

export function chooseActiveWorkspace(input: {
  profile: AccountProfile;
  memberships: AccountWorkspace[];
}) {
  return (
    input.memberships.find(
      (workspace) => workspace.id === input.profile.activeWorkspaceId,
    ) ??
    input.memberships[0] ??
    null
  );
}

export function toAccountMembers(input: {
  rows: WorkspaceMemberRow[];
  requesterRole: WorkspaceRole | null;
}): AccountMember[] {
  const canSeeFullFields = isOwnerOrAdmin(input.requesterRole);

  return input.rows.map((row) => ({
    userId: row.user_id,
    displayName: row.profiles?.display_name ?? null,
    email: canSeeFullFields ? row.profiles?.email_display ?? null : null,
    role: row.role,
    joinedAt: row.joined_at ?? row.created_at,
  }));
}

export function toPendingInvites(input: {
  rows: WorkspaceInviteRow[];
  requesterRole: WorkspaceRole | null;
}): PendingWorkspaceInvite[] | undefined {
  if (!isOwnerOrAdmin(input.requesterRole)) {
    return undefined;
  }

  return input.rows.map((row) => ({
    id: row.id,
    email: row.email_display,
    role: row.role,
    status: row.status,
    expiresAt: row.expires_at,
    deliveryStatus: row.delivery_status,
  }));
}

export function buildAccountPayload(input: {
  profile: ProfileRow;
  membershipRows: WorkspaceMembershipRow[];
  memberRows: WorkspaceMemberRow[];
  inviteRows: WorkspaceInviteRow[];
}): AccountPayload {
  const profile = toAccountProfile(input.profile);
  const memberships = toMembershipWorkspaces(input.membershipRows);
  const activeWorkspace = chooseActiveWorkspace({ profile, memberships });
  const requesterRole = activeWorkspace?.role ?? null;
  const pendingInvites = toPendingInvites({
    rows: input.inviteRows,
    requesterRole,
  });

  return {
    profile,
    activeWorkspace,
    memberships,
    members: toAccountMembers({
      rows: input.memberRows,
      requesterRole,
    }),
    ...(pendingInvites ? { pendingInvites } : {}),
  };
}

export function readFirstRpcRow<T>(data: unknown): T | null {
  const row = Array.isArray(data) ? data[0] : data;
  return row && typeof row === "object" ? (row as T) : null;
}

export function accountErrorStatus(message: string) {
  if (
    message.includes("not_authenticated") ||
    message.includes("invalid_profile_identity")
  ) {
    return 401;
  }

  if (
    message.includes("forbidden") ||
    message.includes("email_mismatch") ||
    message.includes("different_user")
  ) {
    return 403;
  }

  if (message.includes("not_found")) {
    return 404;
  }

  if (message.includes("expired") || message.includes("revoked")) {
    return 410;
  }

  if (message.includes("existing_member") || message.includes("not_pending")) {
    return 409;
  }

  return 400;
}
