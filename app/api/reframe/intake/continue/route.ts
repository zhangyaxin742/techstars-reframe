import { NextResponse } from "next/server";

import {
  getExpiredIntakeDraftCookieOptions,
  hashIntakeDraftToken,
  IntakeDraftTokenConfigError,
  isValidIntakeDraftToken,
  REFRAME_INTAKE_DRAFT_COOKIE,
} from "@/lib/reframe/intake/draft-cookie";
import {
  markIntakeDraftVerificationPending,
  restoreIntakeDraft,
} from "@/lib/reframe/intake/draft-store";
import {
  hashIntakeEmail,
  IntakeEmailHashConfigError,
  maskIntakeEmail,
  normalizeIntakeEmail,
} from "@/lib/reframe/intake/email";
import {
  getClientIpAddress,
  readRequestCookie,
} from "@/lib/reframe/intake/http";
import { checkOtpStartRateLimit } from "@/lib/reframe/intake/rate-limit";
import { CsrfConfigError, verifyCsrfRequest } from "@/lib/security/csrf";
import { SupabaseAdminConfigError } from "@/lib/supabase/admin";
import { createSupabasePasswordlessAuthClient } from "@/lib/supabase/auth";
import { SupabaseBrowserConfigError } from "@/lib/supabase/env";

const RESEND_AFTER_SECONDS = 60;
const MAX_CONTINUE_PAYLOAD_BYTES = 2_000;

export async function POST(request: Request) {
  let csrf;
  try {
    csrf = verifyCsrfRequest(request);
  } catch (error) {
    if (error instanceof CsrfConfigError) {
      return configError("csrf_not_configured", "Request protection is not configured.");
    }

    throw error;
  }

  if (!csrf.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: csrf.code,
          message: csrf.message,
        },
      },
      { status: csrf.status },
    );
  }

  const parsed = await parseContinueBody(request);
  if (!parsed.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "invalid_continue_request",
          message: "Enter a valid email to continue.",
        },
      },
      { status: parsed.status },
    );
  }

  const draftToken = readRequestCookie(
    request.headers,
    REFRAME_INTAKE_DRAFT_COOKIE,
  );

  if (!isValidIntakeDraftToken(draftToken)) {
    return clearDraftCookie(
      {
        ok: false,
        state: "invalid_draft",
      },
      400,
    );
  }

  try {
    const draftTokenHash = hashIntakeDraftToken(draftToken);
    const emailHash = hashIntakeEmail(parsed.email);
    const rateLimit = checkOtpStartRateLimit({
      ipAddress: getClientIpAddress(request.headers),
      emailHash,
      draftTokenHash,
    });

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: "rate_limited",
            message: "Too many verification attempts. Try again shortly.",
          },
          retryAfterSeconds: rateLimit.retryAfterSeconds,
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(rateLimit.retryAfterSeconds),
          },
        },
      );
    }

    const draft = await restoreIntakeDraft({
      tokenHash: draftTokenHash,
    });

    if (!draft.ok) {
      return clearDraftCookie(
        {
          ok: false,
          state: draft.state === "expired" ? "expired" : "invalid_draft",
          expiresAt: draft.expiresAt,
        },
        draft.state === "expired" ? 410 : 400,
      );
    }

    const supabase = createSupabasePasswordlessAuthClient();
    const { error } = await supabase.auth.signInWithOtp({
      email: parsed.email,
      options: {
        shouldCreateUser: true,
      },
    });

    if (error) {
      console.error("Failed to start intake email OTP.", {
        code: error.name,
        status: error.status,
      });
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: "verification_start_failed",
            message: "Could not start verification.",
          },
        },
        { status: 502 },
      );
    }

    await markIntakeDraftVerificationPending({
      tokenHash: draftTokenHash,
      emailHash,
    });

    return NextResponse.json(publicVerifyEmailResponse(parsed.email));
  } catch (error) {
    if (
      error instanceof IntakeDraftTokenConfigError ||
      error instanceof IntakeEmailHashConfigError
    ) {
      return configError(
        "intake_auth_not_configured",
        "Intake auth protection is not configured.",
      );
    }

    if (
      error instanceof SupabaseAdminConfigError ||
      error instanceof SupabaseBrowserConfigError
    ) {
      return configError(
        "intake_provider_not_configured",
        "Intake auth is not configured.",
      );
    }

    console.error("Failed to continue intake auth handoff.", error);
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "intake_continue_failed",
          message: "Could not continue intake verification.",
        },
      },
      { status: 500 },
    );
  }
}

function publicVerifyEmailResponse(email: string) {
  return {
    ok: true,
    nextStep: "verify_email",
    maskedEmail: maskIntakeEmail(email),
    resendAfterSeconds: RESEND_AFTER_SECONDS,
  };
}

async function parseContinueBody(request: Request) {
  const rawBody = await request.text();
  if (Buffer.byteLength(rawBody, "utf8") > MAX_CONTINUE_PAYLOAD_BYTES) {
    return {
      ok: false as const,
      status: 413,
    };
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return {
      ok: false as const,
      status: 400,
    };
  }

  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return {
      ok: false as const,
      status: 400,
    };
  }

  const email = normalizeIntakeEmail((payload as Record<string, unknown>).email);
  if (!email) {
    return {
      ok: false as const,
      status: 400,
    };
  }

  return {
    ok: true as const,
    email,
  };
}

function clearDraftCookie(body: Record<string, unknown>, status: number) {
  const response = NextResponse.json(body, { status });
  response.cookies.set(
    REFRAME_INTAKE_DRAFT_COOKIE,
    "",
    getExpiredIntakeDraftCookieOptions(),
  );
  return response;
}

function configError(code: string, message: string) {
  return NextResponse.json(
    {
      ok: false,
      error: {
        code,
        message,
      },
    },
    { status: 503 },
  );
}
