import { describe, expect, it } from "vitest";

import { toAccountMembers, toPendingInvites } from "./service";
import type { WorkspaceInviteRow, WorkspaceMemberRow } from "./types";

const memberRows: WorkspaceMemberRow[] = [
  {
    id: "membership-1",
    workspace_id: "workspace-1",
    user_id: "user-1",
    role: "owner",
    created_at: "2026-05-07T10:00:00.000Z",
    joined_at: "2026-05-07T10:00:00.000Z",
    profiles: {
      display_name: "Owner User",
      email_display: "owner@example.com",
    },
  },
  {
    id: "membership-2",
    workspace_id: "workspace-1",
    user_id: "user-2",
    role: "member",
    created_at: "2026-05-07T11:00:00.000Z",
    joined_at: "2026-05-07T11:00:00.000Z",
    profiles: {
      display_name: "Member User",
      email_display: "member@example.com",
    },
  },
];

const inviteRows: WorkspaceInviteRow[] = [
  {
    id: "invite-1",
    workspace_id: "workspace-1",
    email_display: "pending@example.com",
    role: "admin",
    status: "pending",
    expires_at: "2026-05-14T10:00:00.000Z",
    delivery_status: "sent",
    created_at: "2026-05-07T10:00:00.000Z",
    invited_by: "user-1",
  },
];

describe("account service helpers", () => {
  it("includes full member fields and pending invites for owner/admin roles", () => {
    expect(toAccountMembers({ rows: memberRows, requesterRole: "admin" })).toEqual([
      expect.objectContaining({
        userId: "user-1",
        email: "owner@example.com",
      }),
      expect.objectContaining({
        userId: "user-2",
        email: "member@example.com",
      }),
    ]);

    expect(toPendingInvites({ rows: inviteRows, requesterRole: "owner" })).toEqual([
      expect.objectContaining({
        id: "invite-1",
        email: "pending@example.com",
      }),
    ]);
  });

  it("withholds member emails and pending invites from regular members", () => {
    expect(toAccountMembers({ rows: memberRows, requesterRole: "member" })).toEqual([
      expect.objectContaining({
        userId: "user-1",
        email: null,
      }),
      expect.objectContaining({
        userId: "user-2",
        email: null,
      }),
    ]);

    expect(toPendingInvites({ rows: inviteRows, requesterRole: "member" })).toBeUndefined();
  });
});
