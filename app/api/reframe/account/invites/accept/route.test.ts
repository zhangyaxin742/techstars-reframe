import { POST } from "./route";
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

const CSRF_SECRET = "csrf_accept_invite_secret_32_chars";
const HASH_SECRET = "workspace_invite_hash_secret_32_chars";
const INVITE_TOKEN = "invite_token_abcdefghijklmnopqrstuvwxyz0123456789";
const USER_ID = "00000000-0000-4000-8000-000000000001";
const WORKSPACE_ID = "00000000-0000-4000-8000-000000000002";

const getClaimsMock = vi.fn();
const rpcMock = vi.fn();
const createRouteClientMock = vi.mocked(createSupabaseRouteClient);

describe("workspace invite accept route", () => {
  const originalEnv = {
    REFRAME_CSRF_SECRET: process.env.REFRAME_CSRF_SECRET,
    REFRAME_EMAIL_HASH_SECRET: process.env.REFRAME_EMAIL_HASH_SECRET,
    REFRAME_INVITE_TOKEN_SECRET: process.env.REFRAME_INVITE_TOKEN_SECRET,
  };

  beforeEach(() => {
    resetAccountRateLimiter();
    process.env.REFRAME_CSRF_SECRET = CSRF_SECRET;
    process.env.REFRAME_EMAIL_HASH_SECRET = HASH_SECRET;
    process.env.REFRAME_INVITE_TOKEN_SECRET = HASH_SECRET;
    getClaimsMock.mockResolvedValue({
      data: {
        claims: {
          sub: USER_ID,
          email: "invitee@example.com",
        },
      },
      error: null,
    });
    rpcMock.mockResolvedValue({
      data: [
        {
          workspace_id: WORKSPACE_ID,
          workspace_slug: "my-workspace",
          membership_role: "member",
          invite_status: "accepted",
          reused_existing_membership: false,
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
    process.env.REFRAME_EMAIL_HASH_SECRET =
      originalEnv.REFRAME_EMAIL_HASH_SECRET;
    process.env.REFRAME_INVITE_TOKEN_SECRET =
      originalEnv.REFRAME_INVITE_TOKEN_SECRET;
  });

  it("accepts an invite only for the verified auth email", async () => {
    const response = await POST(buildRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.workspace).toEqual({
      id: WORKSPACE_ID,
      slug: "my-workspace",
      role: "member",
    });
    expect(rpcMock).toHaveBeenCalledWith(
      "accept_workspace_invite",
      expect.objectContaining({
        p_email_display: "invitee@example.com",
      }),
    );
  });
});

function buildRequest() {
  const csrf = issueCsrfToken({
    secret: CSRF_SECRET,
    randomBytesFn: (size) => Buffer.alloc(size, 1),
  });

  return new Request("https://app.example.com/api/reframe/account/invites/accept", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: `${REFRAME_CSRF_COOKIE}=${encodeURIComponent(csrf.cookie.value)}`,
      host: "app.example.com",
      origin: "https://app.example.com",
      "sec-fetch-site": "same-origin",
      [REFRAME_CSRF_HEADER]: csrf.token,
    },
    body: JSON.stringify({
      token: INVITE_TOKEN,
    }),
  });
}
