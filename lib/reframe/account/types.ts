export type WorkspaceRole = "owner" | "admin" | "member";
export type InviteRole = "admin" | "member";
export type InviteStatus = "pending" | "accepted" | "revoked" | "expired";

export type VerifiedActor = {
  userId: string;
  email: string;
};

export type AccountProfile = {
  id: string;
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
  activeWorkspaceId: string | null;
};

export type AccountWorkspace = {
  id: string;
  slug: string;
  name: string;
  role: WorkspaceRole;
  createdAt: string;
};

export type AccountMember = {
  userId: string;
  displayName: string | null;
  email: string | null;
  role: WorkspaceRole;
  joinedAt: string;
};

export type PendingWorkspaceInvite = {
  id: string;
  email: string;
  role: InviteRole;
  status: InviteStatus;
  expiresAt: string;
  deliveryStatus?: "pending" | "sent" | "failed" | "skipped";
};

export type AccountPayload = {
  profile: AccountProfile;
  activeWorkspace: AccountWorkspace | null;
  memberships: AccountWorkspace[];
  members: AccountMember[];
  pendingInvites?: PendingWorkspaceInvite[];
};

export type RpcWorkspaceRow = {
  workspace_id: string;
  workspace_slug: string;
  workspace_name?: string;
  membership_role?: WorkspaceRole;
  active_workspace_role?: WorkspaceRole;
};

export type ProfileRow = {
  id: string;
  email_display: string;
  display_name: string | null;
  avatar_url: string | null;
  active_workspace_id: string | null;
};

export type WorkspaceMembershipRow = {
  workspace_id: string;
  user_id: string;
  role: WorkspaceRole;
  joined_at: string | null;
  created_at: string;
  workspaces?: {
    id: string;
    slug: string;
    name: string;
    created_at: string;
  } | null;
};

export type WorkspaceMemberRow = {
  workspace_id: string;
  user_id: string;
  role: WorkspaceRole;
  joined_at: string | null;
  created_at: string;
  profiles?: {
    id: string;
    email_display?: string | null;
    display_name?: string | null;
    avatar_url?: string | null;
  } | null;
};

export type WorkspaceInviteRow = {
  id: string;
  workspace_id: string;
  email_display: string;
  role: InviteRole;
  status: InviteStatus;
  expires_at: string;
  delivery_status?: "pending" | "sent" | "failed" | "skipped";
};
