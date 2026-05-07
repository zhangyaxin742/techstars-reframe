import { PATCH } from "./route";
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

const CSRF_SECRET = "csrf_active_workspace_secret_32_chars";
const USER_ID = "00000000-0000-4000-8000-000000000001";
const WORKSPACE_ID = "00000000-0000-4000-8000-000000000002";

const getClaimsMock = vi.fn();
const fromMock = vi.fn();
const createRouteClientMock = vi.mocked(createSupabaseRouteClient);

describe("active workspace route", () => {
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
    createRouteClientMock.mockReturnValue({
      supabase: {
        auth: {
          getClaims: getClaimsMock,
        },
        from: fromMock,
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

  it("verifies membership before switching the active workspace", async () => {
    const updateMock = vi.fn().mockReturnValue({
      eq: () => ({
        select: () => ({
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
    });
    fromMock.mockImplementation((table: string) => {
      if (table === "workspace_memberships") {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: {
                    workspace_id: WORKSPACE_ID,
                    role: "admin",
                    workspaces: {
                      id: WORKSPACE_ID,
                      slug: "my-workspace",
                      name: "My Workspace",
                      created_at: "2026-05-07T10:00:00.000Z",
                    },
                  },
                  error: null,
                }),
              }),
            }),
          }),
        };
      }

      return {
        update: updateMock,
      };
    });

    const response = await PATCH(buildRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.activeWorkspace).toEqual({
      id: WORKSPACE_ID,
      slug: "my-workspace",
      name: "My Workspace",
      role: "admin",
      createdAt: "2026-05-07T10:00:00.000Z",
    });
    expect(updateMock).toHaveBeenCalledWith({
      active_workspace_id: WORKSPACE_ID,
    });
  });
});

function buildRequest() {
  const csrf = issueCsrfToken({
    secret: CSRF_SECRET,
    randomBytesFn: (size) => Buffer.alloc(size, 5),
  });

  return new Request(
    "https://app.example.com/api/reframe/account/workspaces/active",
    {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
        cookie: `${REFRAME_CSRF_COOKIE}=${encodeURIComponent(csrf.cookie.value)}`,
        host: "app.example.com",
        origin: "https://app.example.com",
        "sec-fetch-site": "same-origin",
        [REFRAME_CSRF_HEADER]: csrf.token,
      },
      body: JSON.stringify({
        workspaceId: WORKSPACE_ID,
      }),
    },
  );
}
