import { POST } from "./route";
import type { NextResponse } from "next/server";

import {
  issueCsrfToken,
  REFRAME_CSRF_COOKIE,
  REFRAME_CSRF_HEADER,
} from "@/lib/security/csrf";
import { createSupabaseRouteClient } from "@/lib/supabase/route";

vi.mock("@/lib/supabase/route", () => ({
  createSupabaseRouteClient: vi.fn(),
}));

const CSRF_SECRET = "csrf_sign_out_secret_32_characters";

const getClaimsMock = vi.fn();
const signOutMock = vi.fn();
const createRouteClientMock = vi.mocked(createSupabaseRouteClient);

describe("sign out route", () => {
  const originalEnv = {
    REFRAME_CSRF_SECRET: process.env.REFRAME_CSRF_SECRET,
  };

  beforeEach(() => {
    process.env.REFRAME_CSRF_SECRET = CSRF_SECRET;
    getClaimsMock.mockResolvedValue({
      data: {
        claims: {
          sub: "00000000-0000-4000-8000-000000000001",
          email: "founder@example.com",
        },
      },
      error: null,
    });
    signOutMock.mockResolvedValue({ error: null });
    createRouteClientMock.mockReturnValue({
      supabase: {
        auth: {
          getClaims: getClaimsMock,
          signOut: signOutMock,
        },
      },
      applyToResponse(response: NextResponse) {
        response.cookies.set("sb-test-auth-token", "", {
          httpOnly: true,
          path: "/",
        });
        return response;
      },
    } as unknown as ReturnType<typeof createSupabaseRouteClient>);
  });

  afterEach(() => {
    vi.clearAllMocks();
    process.env.REFRAME_CSRF_SECRET = originalEnv.REFRAME_CSRF_SECRET;
  });

  it("validates the current user and signs out through Supabase auth", async () => {
    const response = await POST(buildRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      ok: true,
      redirectTo: "/account",
    });
    expect(getClaimsMock).toHaveBeenCalled();
    expect(signOutMock).toHaveBeenCalled();
    expect(response.headers.get("set-cookie")).toContain("sb-test-auth-token=");
  });
});

function buildRequest() {
  const csrf = issueCsrfToken({
    secret: CSRF_SECRET,
    randomBytesFn: (size) => Buffer.alloc(size, 3),
  });

  return new Request("https://app.example.com/api/reframe/auth/sign-out", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: `${REFRAME_CSRF_COOKIE}=${encodeURIComponent(csrf.cookie.value)}`,
      host: "app.example.com",
      origin: "https://app.example.com",
      "sec-fetch-site": "same-origin",
      [REFRAME_CSRF_HEADER]: csrf.token,
    },
    body: JSON.stringify({}),
  });
}
