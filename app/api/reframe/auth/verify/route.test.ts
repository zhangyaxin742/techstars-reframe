import { POST } from "./route";

import {
  hashIntakeDraftToken,
  REFRAME_INTAKE_DRAFT_COOKIE,
} from "@/lib/reframe/intake/draft-cookie";
import { hashIntakeEmail } from "@/lib/reframe/intake/email";
import { resetIntakeRateLimiter } from "@/lib/reframe/intake/rate-limit";
import {
  issueCsrfToken,
  REFRAME_CSRF_COOKIE,
  REFRAME_CSRF_HEADER,
} from "@/lib/security/csrf";
import { createSupabaseRouteClient } from "@/lib/supabase/route";

vi.mock("@/lib/supabase/route", () => ({
  createSupabaseRouteClient: vi.fn(),
}));

const CSRF_SECRET = "csrf_verify_test_secret_32_characters";
const SERVICE_ROLE_KEY = "service_role_key_32_characters_min";
const DRAFT_TOKEN = "verify_draft_token_abcdefghijklmnopqrstuvwxyz0123456789";
const EXPIRES_AT = "2026-05-08T12:00:00.000Z";

const verifyOtpMock = vi.fn();
const rpcMock = vi.fn();
const createRouteClientMock = vi.mocked(createSupabaseRouteClient);

describe("intake auth verify route", () => {
  const originalFetch = global.fetch;
  const originalEnv = {
    SUPABASE_URL: process.env.SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    REFRAME_CSRF_SECRET: process.env.REFRAME_CSRF_SECRET,
    REFRAME_DRAFT_TOKEN_SECRET: process.env.REFRAME_DRAFT_TOKEN_SECRET,
    REFRAME_EMAIL_HASH_SECRET: process.env.REFRAME_EMAIL_HASH_SECRET,
  };

  beforeEach(() => {
    resetIntakeRateLimiter();
    process.env.SUPABASE_URL = "https://project.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://project.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "publishable_key";
    process.env.SUPABASE_SERVICE_ROLE_KEY = SERVICE_ROLE_KEY;
    process.env.REFRAME_CSRF_SECRET = CSRF_SECRET;
    process.env.REFRAME_DRAFT_TOKEN_SECRET = SERVICE_ROLE_KEY;
    process.env.REFRAME_EMAIL_HASH_SECRET = SERVICE_ROLE_KEY;
    verifyOtpMock.mockResolvedValue({ data: { session: {} }, error: null });
    rpcMock.mockResolvedValue({
      data: [
        {
          workspace_slug: "my-workspace",
          project_slug: "campaign-abc123",
          reused_existing_project: false,
        },
      ],
      error: null,
    });
    createRouteClientMock.mockReturnValue({
      supabase: {
        auth: {
          verifyOtp: verifyOtpMock,
        },
        rpc: rpcMock,
      },
      applyToResponse(response) {
        response.cookies.set("sb-test-auth-token", "session", {
          httpOnly: true,
          path: "/",
          sameSite: "lax",
          secure: true,
        });
        return response;
      },
    } as unknown as ReturnType<typeof createSupabaseRouteClient>);
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.clearAllMocks();
    process.env.SUPABASE_URL = originalEnv.SUPABASE_URL;
    process.env.NEXT_PUBLIC_SUPABASE_URL = originalEnv.NEXT_PUBLIC_SUPABASE_URL;
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY =
      originalEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    process.env.SUPABASE_SERVICE_ROLE_KEY =
      originalEnv.SUPABASE_SERVICE_ROLE_KEY;
    process.env.REFRAME_CSRF_SECRET = originalEnv.REFRAME_CSRF_SECRET;
    process.env.REFRAME_DRAFT_TOKEN_SECRET =
      originalEnv.REFRAME_DRAFT_TOKEN_SECRET;
    process.env.REFRAME_EMAIL_HASH_SECRET =
      originalEnv.REFRAME_EMAIL_HASH_SECRET;
  });

  it("verifies email OTP, persists auth cookies, and claims the draft through RPC", async () => {
    const draftTokenHash = hashIntakeDraftToken(DRAFT_TOKEN, SERVICE_ROLE_KEY);
    const emailHash = hashIntakeEmail("founder@example.com", SERVICE_ROLE_KEY);
    const fetchMock = vi.fn().mockResolvedValueOnce(restoredDraftResponse());
    global.fetch = fetchMock as typeof fetch;

    const response = await POST(buildVerifyRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      ok: true,
      redirectTo: "/app/my-workspace/projects/campaign-abc123",
      project: {
        workspaceSlug: "my-workspace",
        projectSlug: "campaign-abc123",
        reusedExistingProject: false,
      },
    });
    expect(verifyOtpMock).toHaveBeenCalledWith({
      email: "founder@example.com",
      token: "123456",
      type: "email",
    });
    expect(rpcMock).toHaveBeenCalledWith("claim_intake_draft", {
      p_token_hash: draftTokenHash,
      p_email_display: "founder@example.com",
      p_email_hash: emailHash,
      p_workspace_name: "My Workspace",
    });
    expect(response.headers.get("set-cookie")).toContain("sb-test-auth-token=");
    expect(response.headers.get("set-cookie")).toContain(
      `${REFRAME_INTAKE_DRAFT_COOKIE}=;`,
    );
  });

  it("rejects invalid OTP input before calling Supabase", async () => {
    const fetchMock = vi.fn();
    global.fetch = fetchMock as typeof fetch;

    const response = await POST(
      buildVerifyRequest({
        body: {
          email: "founder@example.com",
          token: "12",
        },
      }),
    );

    expect(response.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(verifyOtpMock).not.toHaveBeenCalled();
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it("returns generic verification failure and does not claim on invalid code", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(restoredDraftResponse());
    global.fetch = fetchMock as typeof fetch;
    verifyOtpMock.mockResolvedValueOnce({
      data: {},
      error: {
        message: "invalid token",
      },
    });

    const response = await POST(buildVerifyRequest());
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({
      ok: false,
      error: {
        code: "verification_failed",
        message: "Could not continue with that code.",
      },
    });
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it("clears the draft cookie on claim conflict without exposing owner details", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(restoredDraftResponse());
    global.fetch = fetchMock as typeof fetch;
    rpcMock.mockResolvedValueOnce({
      data: null,
      error: {
        message: "intake_draft_claim_conflict",
      },
    });

    const response = await POST(buildVerifyRequest());
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body).toEqual({
      ok: false,
      state: "claim_conflict",
    });
    expect(JSON.stringify(body)).not.toContain("owner");
    expect(response.headers.get("set-cookie")).toContain(
      `${REFRAME_INTAKE_DRAFT_COOKIE}=;`,
    );
  });

  it("does not verify OTP for expired drafts", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse([
          {
            status: "draft",
            business_url: "https://petiteoutdoors.com/",
            product_url: null,
            campaign_goal: "Open preorders.",
            founder_note: "",
            source_references: [],
            expires_at: "2026-05-06T12:00:00.000Z",
          },
        ]),
      )
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    global.fetch = fetchMock as typeof fetch;

    const response = await POST(buildVerifyRequest());
    const body = await response.json();

    expect(response.status).toBe(410);
    expect(body).toEqual({
      ok: false,
      state: "expired",
      expiresAt: "2026-05-06T12:00:00.000Z",
    });
    expect(verifyOtpMock).not.toHaveBeenCalled();
  });
});

function buildVerifyRequest(input: { body?: Record<string, unknown> } = {}) {
  const csrf = issueCsrfToken({
    secret: CSRF_SECRET,
    randomBytesFn: (size) => Buffer.alloc(size, 9),
  });

  return new Request("https://app.example.com/api/reframe/auth/verify", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: [
        `${REFRAME_CSRF_COOKIE}=${encodeURIComponent(csrf.cookie.value)}`,
        `${REFRAME_INTAKE_DRAFT_COOKIE}=${encodeURIComponent(DRAFT_TOKEN)}`,
      ].join("; "),
      host: "app.example.com",
      origin: "https://app.example.com",
      "sec-fetch-site": "same-origin",
      "x-forwarded-for": "203.0.113.10",
      [REFRAME_CSRF_HEADER]: csrf.token,
    },
    body: JSON.stringify(
      input.body ?? {
        email: "founder@example.com",
        token: "123456",
      },
    ),
  });
}

function restoredDraftResponse() {
  return jsonResponse([
    {
      status: "verification_pending",
      business_url: "https://petiteoutdoors.com/",
      product_url: null,
      campaign_goal: "Open preorders.",
      founder_note: "",
      source_references: [],
      expires_at: EXPIRES_AT,
    },
  ]);
}

function jsonResponse(value: unknown, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: {
      "Content-Type": "application/json",
    },
  });
}
