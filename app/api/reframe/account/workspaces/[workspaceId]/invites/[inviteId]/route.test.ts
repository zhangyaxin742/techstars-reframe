import { DELETE } from "./route";
import type { NextResponse } from "next/server";

import { resetAccountRateLimiter } from "@/lib/reframe/account/rate-limit";
import {
  issueCsrfToken,
  REFRAME_CSRF_COOKIE,
  REFRAME_CSRF_HEADER,
} from "@/lib/security/csrf";
import { createSupabaseRouteClient } from "@/lib/supabase/route";

vi.mock("@/lib/supabase/route", () => ({
  createSupabaseRouteClient: vi.fn(),
}));

const CSRF_SECRET = "csrf_revoke_invite_secret_32_chars";
const USER_ID = "00000000-0000-4000-8000-000000000001";
const WORKSPACE_ID = "00000000-0000-4000-8000-000000000002";
const INVITE_ID = "00000000-0000-4000-8000-000000000003";

const getClaimsMock = vi.fn();
const rpcMock = vi.fn();
const createRouteClientMock = vi.mocked(createSupabaseRouteClient);

describe("workspace invite revoke route", () => {
  const originalEnv = {
    REFRAME_CSRF_SECRET: process.env.REFRAME_CSRF_SECRET,
  };

  beforeEach(() => {
    resetAccountRateLimiter();
    process.env.REFRAME_CSRF_SECRET = CSRF_SECRET;
    getClaimsMock.mockResolvedValue({
      data: {
        claims: {
          sub: USER_ID,
          email: "owner@example.com",
        },
      },
      error: null,
    });
    rpcMock.mockResolvedValue({
      data: [
        {
          invite_id: INVITE_ID,
          status: "revoked",
          revoked_at: "2026-05-07T10:00:00.000Z",
        },
      ],
      error: null,
    });
    createRouteClientMock.mockReturnValue({
      supabase: {
        auth: {
          getClaims: getClaimsMock,
        },
        rpc: rpcMock,
      },
      applyToResponse(response: NextResponse) {
        return response;
      },
    } as unknown as ReturnType<typeof createSupabaseRouteClient>);
  });

  afterEach(() => {
    vi.clearAllMocks();
    process.env.REFRAME_CSRF_SECRET = originalEnv.REFRAME_CSRF_SECRET;
  });

  it("revokes the app-level invite through the authenticated RPC", async () => {
    const response = await DELETE(buildRequest(), {
      params: Promise.resolve({
        workspaceId: WORKSPACE_ID,
        inviteId: INVITE_ID,
      }),
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.invite).toEqual({
      id: INVITE_ID,
      status: "revoked",
      revokedAt: "2026-05-07T10:00:00.000Z",
    });
    expect(rpcMock).toHaveBeenCalledWith("revoke_workspace_invite", {
      p_workspace_id: WORKSPACE_ID,
      p_invite_id: INVITE_ID,
    });
  });
});

function buildRequest() {
  const csrf = issueCsrfToken({
    secret: CSRF_SECRET,
    randomBytesFn: (size) => Buffer.alloc(size, 1),
  });

  return new Request(
    `https://app.example.com/api/reframe/account/workspaces/${WORKSPACE_ID}/invites/${INVITE_ID}`,
    {
      method: "DELETE",
      headers: {
        "content-type": "application/json",
        cookie: `${REFRAME_CSRF_COOKIE}=${encodeURIComponent(csrf.cookie.value)}`,
        host: "app.example.com",
        origin: "https://app.example.com",
        "sec-fetch-site": "same-origin",
        [REFRAME_CSRF_HEADER]: csrf.token,
      },
      body: JSON.stringify({}),
    },
  );
}
