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
import { createSupabasePasswordlessAuthClient } from "@/lib/supabase/auth";

vi.mock("@/lib/supabase/auth", () => ({
  createSupabasePasswordlessAuthClient: vi.fn(),
}));

const CSRF_SECRET = "csrf_continue_test_secret_32_characters";
const SERVICE_ROLE_KEY = "service_role_key_32_characters_min";
const EXPIRES_AT = "2026-05-08T12:00:00.000Z";
const DRAFT_TOKEN = "continue_draft_token_abcdefghijklmnopqrstuvwxyz0123456789";

const signInWithOtpMock = vi.fn();
const createAuthClientMock = vi.mocked(createSupabasePasswordlessAuthClient);

describe("intake continue route", () => {
  const originalFetch = global.fetch;
  const originalEnv = {
    SUPABASE_URL: process.env.SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
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
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "";
    process.env.SUPABASE_SERVICE_ROLE_KEY = SERVICE_ROLE_KEY;
    process.env.REFRAME_CSRF_SECRET = CSRF_SECRET;
    process.env.REFRAME_DRAFT_TOKEN_SECRET = SERVICE_ROLE_KEY;
    process.env.REFRAME_EMAIL_HASH_SECRET = SERVICE_ROLE_KEY;
    signInWithOtpMock.mockResolvedValue({ data: {}, error: null });
    createAuthClientMock.mockReturnValue({
      auth: {
        signInWithOtp: signInWithOtpMock,
      },
    } as unknown as ReturnType<typeof createSupabasePasswordlessAuthClient>);
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.clearAllMocks();
    process.env.SUPABASE_URL = originalEnv.SUPABASE_URL;
    process.env.NEXT_PUBLIC_SUPABASE_URL = originalEnv.NEXT_PUBLIC_SUPABASE_URL;
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY =
      originalEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY =
      originalEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    process.env.SUPABASE_SERVICE_ROLE_KEY =
      originalEnv.SUPABASE_SERVICE_ROLE_KEY;
    process.env.REFRAME_CSRF_SECRET = originalEnv.REFRAME_CSRF_SECRET;
    process.env.REFRAME_DRAFT_TOKEN_SECRET =
      originalEnv.REFRAME_DRAFT_TOKEN_SECRET;
    process.env.REFRAME_EMAIL_HASH_SECRET =
      originalEnv.REFRAME_EMAIL_HASH_SECRET;
  });

  it("starts email OTP with the exact Supabase passwordless call and returns the generic public shape", async () => {
    const draftTokenHash = hashIntakeDraftToken(DRAFT_TOKEN, SERVICE_ROLE_KEY);
    const emailHash = hashIntakeEmail("founder@example.com", SERVICE_ROLE_KEY);
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(restoredDraftResponse())
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    global.fetch = fetchMock as typeof fetch;

    const response = await POST(buildContinueRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      ok: true,
      nextStep: "verify_email",
      maskedEmail: "f***@example.com",
      resendAfterSeconds: 60,
    });
    expect(body).not.toHaveProperty("accountState");
    expect(signInWithOtpMock).toHaveBeenCalledWith({
      email: "founder@example.com",
      options: {
        shouldCreateUser: true,
      },
    });
    expect(fetchMock.mock.calls[0]?.[0]).toContain(
      `token_hash=eq.${encodeURIComponent(draftTokenHash)}`,
    );
    expect(fetchMock.mock.calls[1]?.[0]).toBe(
      `https://project.supabase.co/rest/v1/intake_drafts?token_hash=eq.${encodeURIComponent(draftTokenHash)}`,
    );
    expect(JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body))).toEqual({
      status: "verification_pending",
      email_hash: emailHash,
    });
    expect(String(fetchMock.mock.calls[1]?.[1]?.body)).not.toContain(
      "founder@example.com",
    );
  });

  it("keeps the same public success shape across repeated valid OTP starts", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(restoredDraftResponse())
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(restoredDraftResponse())
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    global.fetch = fetchMock as typeof fetch;

    const first = await POST(buildContinueRequest());
    const second = await POST(buildContinueRequest());

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(await first.json()).toEqual(await second.json());
    expect(signInWithOtpMock).toHaveBeenCalledTimes(2);
  });

  it("rejects missing CSRF before restoring the draft or calling Supabase Auth", async () => {
    const fetchMock = vi.fn();
    global.fetch = fetchMock as typeof fetch;

    const response = await POST(
      new Request("https://app.example.com/api/reframe/intake/continue", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          host: "app.example.com",
          origin: "https://app.example.com",
          cookie: `${REFRAME_INTAKE_DRAFT_COOKIE}=${DRAFT_TOKEN}`,
        },
        body: JSON.stringify({ email: "founder@example.com" }),
      }),
    );

    expect(response.status).toBe(403);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(signInWithOtpMock).not.toHaveBeenCalled();
  });

  it("does not start OTP for invalid email or missing draft cookie", async () => {
    const fetchMock = vi.fn();
    global.fetch = fetchMock as typeof fetch;

    const invalidEmail = await POST(
      buildContinueRequest({
        body: {
          email: "not-an-email",
        },
      }),
    );
    expect(invalidEmail.status).toBe(400);

    const missingDraft = await POST(
      buildContinueRequest({
        includeDraftCookie: false,
      }),
    );
    expect(missingDraft.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(signInWithOtpMock).not.toHaveBeenCalled();
  });

  it("returns expired and clears the draft cookie without starting OTP", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(
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
    ).mockResolvedValueOnce(new Response(null, { status: 204 }));
    global.fetch = fetchMock as typeof fetch;

    const response = await POST(buildContinueRequest());
    const body = await response.json();

    expect(response.status).toBe(410);
    expect(body).toEqual({
      ok: false,
      state: "expired",
      expiresAt: "2026-05-06T12:00:00.000Z",
    });
    expect(response.headers.get("set-cookie")).toContain(
      `${REFRAME_INTAKE_DRAFT_COOKIE}=;`,
    );
    expect(signInWithOtpMock).not.toHaveBeenCalled();
  });

  it("rate-limits OTP start by draft and email before calling Supabase Auth", async () => {
    const fetchMock = vi.fn();
    for (let index = 0; index < 5; index += 1) {
      fetchMock
        .mockResolvedValueOnce(restoredDraftResponse())
        .mockResolvedValueOnce(new Response(null, { status: 204 }));
    }
    global.fetch = fetchMock as typeof fetch;

    for (let index = 0; index < 5; index += 1) {
      const response = await POST(buildContinueRequest());
      expect(response.status).toBe(200);
    }

    const limited = await POST(buildContinueRequest());
    const body = await limited.json();

    expect(limited.status).toBe(429);
    expect(body.error.code).toBe("rate_limited");
    expect(signInWithOtpMock).toHaveBeenCalledTimes(5);
  });

  it("returns a generic provider error without account-state details", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(restoredDraftResponse());
    global.fetch = fetchMock as typeof fetch;
    signInWithOtpMock.mockResolvedValueOnce({
      data: {},
      error: {
        name: "AuthRetryableFetchError",
        status: 500,
      },
    });

    const response = await POST(buildContinueRequest());
    const body = await response.json();

    expect(response.status).toBe(502);
    expect(body).toEqual({
      ok: false,
      error: {
        code: "verification_start_failed",
        message: "Could not start verification.",
      },
    });
    expect(JSON.stringify(body)).not.toContain("account");
  });
});

function buildContinueRequest(input: {
  body?: Record<string, unknown>;
  includeDraftCookie?: boolean;
} = {}) {
  const csrf = issueCsrfToken({
    secret: CSRF_SECRET,
    randomBytesFn: (size) => Buffer.alloc(size, 8),
  });
  const cookies = [
    `${REFRAME_CSRF_COOKIE}=${encodeURIComponent(csrf.cookie.value)}`,
  ];

  if (input.includeDraftCookie !== false) {
    cookies.push(
      `${REFRAME_INTAKE_DRAFT_COOKIE}=${encodeURIComponent(DRAFT_TOKEN)}`,
    );
  }

  return new Request("https://app.example.com/api/reframe/intake/continue", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: cookies.join("; "),
      host: "app.example.com",
      origin: "https://app.example.com",
      "sec-fetch-site": "same-origin",
      "x-forwarded-for": "203.0.113.10",
      [REFRAME_CSRF_HEADER]: csrf.token,
    },
    body: JSON.stringify(input.body ?? { email: "founder@example.com" }),
  });
}

function restoredDraftResponse() {
  return jsonResponse([
    {
      status: "draft",
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
