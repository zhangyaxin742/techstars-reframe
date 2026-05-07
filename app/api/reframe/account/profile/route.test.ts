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

const CSRF_SECRET = "csrf_profile_secret_32_characters";
const USER_ID = "00000000-0000-4000-8000-000000000001";

const getClaimsMock = vi.fn();
const fromMock = vi.fn();
const updateMock = vi.fn();
const createRouteClientMock = vi.mocked(createSupabaseRouteClient);

describe("account profile route", () => {
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
    updateMock.mockReturnValue({
      eq: () => ({
        select: () => ({
          maybeSingle: async () => ({
            data: {
              id: USER_ID,
              email_display: "founder@example.com",
              display_name: "Ada Founder",
              avatar_url: null,
              active_workspace_id: null,
            },
            error: null,
          }),
        }),
      }),
    });
    fromMock.mockReturnValue({
      update: updateMock,
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

  it("validates auth with getClaims and updates only the actor profile", async () => {
    const response = await PATCH(
      buildMutationRequest("/api/reframe/account/profile", {
        displayName: " Ada Founder ",
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.profile.displayName).toBe("Ada Founder");
    expect(getClaimsMock).toHaveBeenCalled();
    expect(fromMock).toHaveBeenCalledWith("profiles");
    expect(updateMock).toHaveBeenCalledWith({
      display_name: "Ada Founder",
    });
  });
});

function buildMutationRequest(path: string, body: Record<string, unknown>) {
  const csrf = issueCsrfToken({
    secret: CSRF_SECRET,
    randomBytesFn: (size) => Buffer.alloc(size, 6),
  });

  return new Request(`https://app.example.com${path}`, {
    method: "PATCH",
    headers: {
      "content-type": "application/json",
      cookie: `${REFRAME_CSRF_COOKIE}=${encodeURIComponent(csrf.cookie.value)}`,
      host: "app.example.com",
      origin: "https://app.example.com",
      "sec-fetch-site": "same-origin",
      [REFRAME_CSRF_HEADER]: csrf.token,
    },
    body: JSON.stringify(body),
  });
}
