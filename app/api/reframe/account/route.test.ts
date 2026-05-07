import { GET } from "./route";
import type { NextResponse } from "next/server";

import { createSupabaseRouteClient } from "@/lib/supabase/route";

vi.mock("@/lib/supabase/route", () => ({
  createSupabaseRouteClient: vi.fn(),
}));

const USER_ID = "00000000-0000-4000-8000-000000000001";
const WORKSPACE_ID = "00000000-0000-4000-8000-000000000002";

const getClaimsMock = vi.fn();
const fromMock = vi.fn();
const rpcMock = vi.fn();
const createRouteClientMock = vi.mocked(createSupabaseRouteClient);

describe("account payload route", () => {
  beforeEach(() => {
    getClaimsMock.mockResolvedValue({
      data: {
        claims: {
          sub: USER_ID,
          email: "founder@example.com",
        },
      },
      error: null,
    });
    createRouteClientMock.mockReturnValue({
      supabase: {
        auth: {
          getClaims: getClaimsMock,
        },
        from: fromMock,
        rpc: rpcMock,
      },
      applyToResponse(response: NextResponse) {
        return response;
      },
    } as unknown as ReturnType<typeof createSupabaseRouteClient>);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("loads owner/admin account payload with member emails and pending invites", async () => {
    mockAccountRead({
      membershipRole: "owner",
      memberEmail: "member@example.com",
      includeInvite: true,
    });

    const response = await GET(
      new Request("https://app.example.com/api/reframe/account"),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.account.profile).toEqual({
      id: USER_ID,
      email: "founder@example.com",
      displayName: "Founder",
      avatarUrl: null,
      activeWorkspaceId: WORKSPACE_ID,
    });
    expect(body.account.members).toEqual([
      expect.objectContaining({
        userId: USER_ID,
        email: "founder@example.com",
        role: "owner",
      }),
      expect.objectContaining({
        userId: "00000000-0000-4000-8000-000000000003",
        email: "member@example.com",
        role: "member",
      }),
    ]);
    expect(body.account.pendingInvites).toEqual([
      expect.objectContaining({
        email: "pending@example.com",
        role: "member",
        status: "pending",
      }),
    ]);
    expect(rpcMock).toHaveBeenCalledWith("get_workspace_pending_invites", {
      p_workspace_id: WORKSPACE_ID,
    });
  });

  it("loads regular member account payload without member emails or pending invites", async () => {
    mockAccountRead({
      membershipRole: "member",
      memberEmail: "owner@example.com",
      includeInvite: false,
    });

    const response = await GET(
      new Request("https://app.example.com/api/reframe/account"),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.account.members).toEqual([
      expect.objectContaining({
        userId: USER_ID,
        email: null,
        role: "member",
      }),
      expect.objectContaining({
        userId: "00000000-0000-4000-8000-000000000003",
        email: null,
        role: "owner",
      }),
    ]);
    expect(body.account).not.toHaveProperty("pendingInvites");
    expect(rpcMock).not.toHaveBeenCalledWith(
      "get_workspace_pending_invites",
      expect.anything(),
    );
  });

  it("rejects unauthenticated requests before account reads", async () => {
    getClaimsMock.mockResolvedValueOnce({
      data: {
        claims: null,
      },
      error: {
        message: "missing session",
      },
    });

    const response = await GET(
      new Request("https://app.example.com/api/reframe/account"),
    );
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error.code).toBe("unauthenticated");
    expect(fromMock).not.toHaveBeenCalled();
    expect(rpcMock).not.toHaveBeenCalled();
  });
});

function mockAccountRead(input: {
  membershipRole: "owner" | "admin" | "member";
  memberEmail: string | null;
  includeInvite: boolean;
}) {
  fromMock.mockImplementation((table: string) => {
    if (table === "profiles") {
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({
              data: {
                id: USER_ID,
                email_display: "founder@example.com",
                display_name: "Founder",
                avatar_url: null,
                active_workspace_id: WORKSPACE_ID,
              },
              error: null,
            }),
          }),
        }),
      };
    }

    if (table === "workspace_memberships") {
      return {
        select: () => ({
          eq: () => ({
            order: async () => ({
              data: [
                {
                  workspace_id: WORKSPACE_ID,
                  user_id: USER_ID,
                  role: input.membershipRole,
                  joined_at: "2026-05-07T10:00:00.000Z",
                  created_at: "2026-05-07T10:00:00.000Z",
                  workspaces: {
                    id: WORKSPACE_ID,
                    slug: "my-workspace",
                    name: "My Workspace",
                    created_at: "2026-05-07T10:00:00.000Z",
                  },
                },
              ],
              error: null,
            }),
          }),
        }),
      };
    }

    throw new Error(`Unexpected table: ${table}`);
  });

  rpcMock.mockImplementation((name: string) => {
    if (name === "get_workspace_account_members") {
      return Promise.resolve({
        data: [
          {
            workspace_id: WORKSPACE_ID,
            user_id: USER_ID,
            role: input.membershipRole,
            joined_at: "2026-05-07T10:00:00.000Z",
            created_at: "2026-05-07T10:00:00.000Z",
            display_name: "Founder",
            email_display: "founder@example.com",
            avatar_url: null,
          },
          {
            workspace_id: WORKSPACE_ID,
            user_id: "00000000-0000-4000-8000-000000000003",
            role: input.membershipRole === "member" ? "owner" : "member",
            joined_at: "2026-05-07T11:00:00.000Z",
            created_at: "2026-05-07T11:00:00.000Z",
            display_name: "Teammate",
            email_display: input.memberEmail,
            avatar_url: null,
          },
        ],
        error: null,
      });
    }

    if (name === "get_workspace_pending_invites" && input.includeInvite) {
      return Promise.resolve({
        data: [
          {
            id: "00000000-0000-4000-8000-000000000004",
            workspace_id: WORKSPACE_ID,
            email_display: "pending@example.com",
            role: "member",
            status: "pending",
            expires_at: "2026-05-14T10:00:00.000Z",
            delivery_status: "sent",
          },
        ],
        error: null,
      });
    }

    throw new Error(`Unexpected RPC: ${name}`);
  });
}
