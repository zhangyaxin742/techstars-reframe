import { POST } from "./route";

import {
  hashAccountEmail,
  maskAccountEmail,
} from "@/lib/reframe/account/email";
import { resetAccountRateLimiter } from "@/lib/reframe/account/rate-limit";
import { hashWorkspaceInviteToken } from "@/lib/reframe/account/tokens";
import {
  issueCsrfToken,
  REFRAME_CSRF_COOKIE,
  REFRAME_CSRF_HEADER,
} from "@/lib/security/csrf";
import { createSupabasePasswordlessAuthClient } from "@/lib/supabase/auth";

vi.mock("@/lib/supabase/auth", () => ({
  createSupabasePasswordlessAuthClient: vi.fn(),
}));

const CSRF_SECRET = "csrf_account_otp_secret_32_characters";
const ACCOUNT_SECRET = "account_email_secret_32_characters";
const INVITE_SECRET = "workspace_invite_secret_32_characters";
const INVITE_TOKEN = "invite_token_abcdefghijklmnopqrstuvwxyz0123456789";

const signInWithOtpMock = vi.fn();
const rpcMock = vi.fn();
const createAuthClientMock = vi.mocked(createSupabasePasswordlessAuthClient);

describe("account OTP start route", () => {
  const originalEnv = {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    REFRAME_CSRF_SECRET: process.env.REFRAME_CSRF_SECRET,
    REFRAME_EMAIL_HASH_SECRET: process.env.REFRAME_EMAIL_HASH_SECRET,
    REFRAME_INVITE_TOKEN_SECRET: process.env.REFRAME_INVITE_TOKEN_SECRET,
  };

  beforeEach(() => {
    resetAccountRateLimiter();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://project.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "publishable_key";
    process.env.REFRAME_CSRF_SECRET = CSRF_SECRET;
    process.env.REFRAME_EMAIL_HASH_SECRET = ACCOUNT_SECRET;
    process.env.REFRAME_INVITE_TOKEN_SECRET = INVITE_SECRET;
    signInWithOtpMock.mockResolvedValue({ data: {}, error: null });
    rpcMock.mockResolvedValue({
      data: [{ valid: true, state: "pending" }],
      error: null,
    });
    createAuthClientMock.mockReturnValue({
      auth: {
        signInWithOtp: signInWithOtpMock,
      },
      rpc: rpcMock,
    } as unknown as ReturnType<typeof createSupabasePasswordlessAuthClient>);
  });

  afterEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL =
      originalEnv.NEXT_PUBLIC_SUPABASE_URL;
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY =
      originalEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    process.env.REFRAME_CSRF_SECRET = originalEnv.REFRAME_CSRF_SECRET;
    process.env.REFRAME_EMAIL_HASH_SECRET =
      originalEnv.REFRAME_EMAIL_HASH_SECRET;
    process.env.REFRAME_INVITE_TOKEN_SECRET =
      originalEnv.REFRAME_INVITE_TOKEN_SECRET;
  });

  it("starts public account OTP with shouldCreateUser true", async () => {
    const response = await POST(buildOtpStartRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      ok: true,
      nextStep: "verify_email",
      maskedEmail: maskAccountEmail("founder@example.com"),
      resendAfterSeconds: 60,
    });
    expect(signInWithOtpMock).toHaveBeenCalledWith({
      email: "founder@example.com",
      options: {
        shouldCreateUser: true,
      },
    });
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it("starts recovery OTP with shouldCreateUser false", async () => {
    const response = await POST(
      buildOtpStartRequest({
        body: {
          email: "founder@example.com",
          mode: "recovery",
        },
      }),
    );

    expect(response.status).toBe(200);
    expect(signInWithOtpMock).toHaveBeenCalledWith({
      email: "founder@example.com",
      options: {
        shouldCreateUser: false,
      },
    });
  });

  it("gates invite OTP creation on the app-level invite row", async () => {
    const emailHash = hashAccountEmail("invitee@example.com", ACCOUNT_SECRET);
    const tokenHash = hashWorkspaceInviteToken(INVITE_TOKEN, INVITE_SECRET);

    const response = await POST(
      buildOtpStartRequest({
        body: {
          email: "Invitee@Example.com",
          mode: "invite_accept",
          inviteToken: INVITE_TOKEN,
        },
      }),
    );

    expect(response.status).toBe(200);
    expect(rpcMock).toHaveBeenCalledWith("resolve_workspace_invite_for_otp", {
      p_token_hash: tokenHash,
      p_email_hash: emailHash,
    });
    expect(signInWithOtpMock).toHaveBeenCalledWith({
      email: "invitee@example.com",
      options: {
        shouldCreateUser: true,
      },
    });
  });

  it("does not create users when the invite token and email do not match", async () => {
    rpcMock.mockResolvedValueOnce({
      data: [{ valid: false, state: "email_mismatch" }],
      error: null,
    });

    const response = await POST(
      buildOtpStartRequest({
        body: {
          email: "other@example.com",
          mode: "invite_accept",
          inviteToken: INVITE_TOKEN,
        },
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      ok: true,
      nextStep: "verify_email",
      maskedEmail: "o***@example.com",
      resendAfterSeconds: 60,
    });
    expect(signInWithOtpMock).not.toHaveBeenCalled();
  });
});

function buildOtpStartRequest(
  input: {
    body?: Record<string, unknown>;
  } = {},
) {
  const csrf = issueCsrfToken({
    secret: CSRF_SECRET,
    randomBytesFn: (size) => Buffer.alloc(size, 7),
  });

  return new Request("https://app.example.com/api/reframe/auth/otp/start", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: `${REFRAME_CSRF_COOKIE}=${encodeURIComponent(csrf.cookie.value)}`,
      host: "app.example.com",
      origin: "https://app.example.com",
      "sec-fetch-site": "same-origin",
      "x-forwarded-for": "203.0.113.10",
      [REFRAME_CSRF_HEADER]: csrf.token,
    },
    body: JSON.stringify(
      input.body ?? {
        email: "Founder@Example.com",
        mode: "public_account",
        password: "must-not-be-used",
      },
    ),
  });
}
