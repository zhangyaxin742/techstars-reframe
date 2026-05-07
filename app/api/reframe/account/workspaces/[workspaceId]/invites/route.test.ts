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

const CSRF_SECRET = "csrf_invite_secret_32_characters";
const HASH_SECRET = "workspace_invite_hash_secret_32_chars";
const USER_ID = "00000000-0000-4000-8000-000000000001";
const WORKSPACE_ID = "00000000-0000-4000-8000-000000000002";
const INVITE_ID = "00000000-0000-4000-8000-000000000003";

const getClaimsMock = vi.fn();
const rpcMock = vi.fn();
const createRouteClientMock = vi.mocked(createSupabaseRouteClient);

describe("workspace invite create route", () => {
  const originalFetch = global.fetch;
  const originalEnv = {
    REFRAME_CSRF_SECRET: process.env.REFRAME_CSRF_SECRET,
    REFRAME_EMAIL_HASH_SECRET: process.env.REFRAME_EMAIL_HASH_SECRET,
    REFRAME_INVITE_TOKEN_SECRET: process.env.REFRAME_INVITE_TOKEN_SECRET,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    REFRAME_INVITE_EMAIL_FROM: process.env.REFRAME_INVITE_EMAIL_FROM,
    REFRAME_APP_URL: process.env.REFRAME_APP_URL,
  };

  beforeEach(() => {
    resetAccountRateLimiter();
    process.env.REFRAME_CSRF_SECRET = CSRF_SECRET;
    process.env.REFRAME_EMAIL_HASH_SECRET = HASH_SECRET;
    process.env.REFRAME_INVITE_TOKEN_SECRET = HASH_SECRET;
    process.env.RESEND_API_KEY = "re_test_key";
    process.env.REFRAME_INVITE_EMAIL_FROM = "Reframe <invites@example.com>";
    process.env.REFRAME_APP_URL = "https://app.example.com";
    getClaimsMock.mockResolvedValue({
      data: {
        claims: {
          sub: USER_ID,
          email: "owner@example.com",
        },
      },
      error: null,
    });
    rpcMock.mockImplementation((name: string) => {
      if (name === "create_workspace_invite") {
        return Promise.resolve({
          data: [
            {
              invite_id: INVITE_ID,
              workspace_id: WORKSPACE_ID,
              email_display: "member@example.com",
              role: "member",
              status: "pending",
              expires_at: "2026-05-14T10:00:00.000Z",
              created: true,
            },
          ],
          error: null,
        });
      }

      if (name === "mark_workspace_invite_delivery") {
        return Promise.resolve({
          data: [{ invite_id: INVITE_ID, delivery_status: "sent" }],
          error: null,
        });
      }

      throw new Error(`Unexpected RPC: ${name}`);
    });
    global.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ id: "email_123" }), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      }),
    ) as typeof fetch;
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
    global.fetch = originalFetch;
    vi.clearAllMocks();
    process.env.REFRAME_CSRF_SECRET = originalEnv.REFRAME_CSRF_SECRET;
    process.env.REFRAME_EMAIL_HASH_SECRET =
      originalEnv.REFRAME_EMAIL_HASH_SECRET;
    process.env.REFRAME_INVITE_TOKEN_SECRET =
      originalEnv.REFRAME_INVITE_TOKEN_SECRET;
    process.env.RESEND_API_KEY = originalEnv.RESEND_API_KEY;
    process.env.REFRAME_INVITE_EMAIL_FROM =
      originalEnv.REFRAME_INVITE_EMAIL_FROM;
    process.env.REFRAME_APP_URL = originalEnv.REFRAME_APP_URL;
  });

  it("creates the app-level invite before sending and marking email delivery", async () => {
    const response = await POST(buildRequest(), {
      params: Promise.resolve({ workspaceId: WORKSPACE_ID }),
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.invite).toEqual(
      expect.objectContaining({
        id: INVITE_ID,
        email: "member@example.com",
        role: "member",
        deliveryStatus: "sent",
      }),
    );
    expect(rpcMock.mock.calls[0]?.[0]).toBe("create_workspace_invite");
    expect(global.fetch).toHaveBeenCalled();
    expect(rpcMock).toHaveBeenCalledWith(
      "mark_workspace_invite_delivery",
      expect.objectContaining({
        p_workspace_id: WORKSPACE_ID,
        p_invite_id: INVITE_ID,
        p_delivery_status: "sent",
      }),
    );
  });
});

function buildRequest() {
  const csrf = issueCsrfToken({
    secret: CSRF_SECRET,
    randomBytesFn: (size) => Buffer.alloc(size, 2),
  });

  return new Request(
    `https://app.example.com/api/reframe/account/workspaces/${WORKSPACE_ID}/invites`,
    {
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
        email: "Member@Example.com",
        role: "member",
      }),
    },
  );
}
