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

const CSRF_SECRET = "csrf_workspace_create_secret_32_chars";
const USER_ID = "00000000-0000-4000-8000-000000000001";
const WORKSPACE_ID = "00000000-0000-4000-8000-000000000002";

const getClaimsMock = vi.fn();
const rpcMock = vi.fn();
const createRouteClientMock = vi.mocked(createSupabaseRouteClient);

describe("workspace create route", () => {
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
          email: "founder@example.com",
        },
      },
      error: null,
    });
    rpcMock.mockResolvedValue({
      data: [
        {
          workspace_id: WORKSPACE_ID,
          workspace_slug: "growth-team",
          workspace_name: "Growth Team",
          membership_role: "owner",
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

  it("creates a workspace through the authenticated create_workspace RPC", async () => {
    const response = await POST(buildRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(rpcMock).toHaveBeenCalledWith("create_workspace", {
      p_name: "Growth Team",
    });
    expect(body.workspace).toEqual({
      id: WORKSPACE_ID,
      slug: "growth-team",
      name: "Growth Team",
      role: "owner",
    });
  });
});

function buildRequest() {
  const csrf = issueCsrfToken({
    secret: CSRF_SECRET,
    randomBytesFn: (size) => Buffer.alloc(size, 4),
  });

  return new Request("https://app.example.com/api/reframe/account/workspaces", {
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
      name: " Growth Team ",
    }),
  });
}
