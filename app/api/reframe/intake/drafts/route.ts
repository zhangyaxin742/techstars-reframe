import { NextResponse } from "next/server";

import {
  createIntakeDraftToken,
  getExpiredIntakeDraftCookieOptions,
  getIntakeDraftCookieOptions,
  hashIntakeDraftToken,
  isValidIntakeDraftToken,
  IntakeDraftTokenConfigError,
  REFRAME_INTAKE_DRAFT_COOKIE,
} from "@/lib/reframe/intake/draft-cookie";
import { saveIntakeDraft } from "@/lib/reframe/intake/draft-store";
import {
  getClientIpAddress,
  readRequestCookie,
} from "@/lib/reframe/intake/http";
import { checkDraftSaveRateLimit } from "@/lib/reframe/intake/rate-limit";
import { parseIntakeDraftPayload } from "@/lib/reframe/intake/validation";
import { CsrfConfigError, verifyCsrfRequest } from "@/lib/security/csrf";
import { SupabaseAdminConfigError } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  let csrf;
  try {
    csrf = verifyCsrfRequest(request);
  } catch (error) {
    if (error instanceof CsrfConfigError) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: "csrf_not_configured",
            message: "Request protection is not configured.",
          },
        },
        { status: 503 },
      );
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

  const existingToken = readRequestCookie(
    request.headers,
    REFRAME_INTAKE_DRAFT_COOKIE,
  );
  const draftToken = isValidIntakeDraftToken(existingToken)
    ? existingToken
    : createIntakeDraftToken();
  let tokenHash;
  try {
    tokenHash = hashIntakeDraftToken(draftToken);
  } catch (error) {
    if (error instanceof IntakeDraftTokenConfigError) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: "intake_draft_token_not_configured",
            message: "Intake draft protection is not configured.",
          },
        },
        { status: 503 },
      );
    }

    throw error;
  }
  const rateLimit = checkDraftSaveRateLimit({
    ipAddress: getClientIpAddress(request.headers),
    draftTokenHash: tokenHash,
  });

  if (!rateLimit.allowed) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "rate_limited",
          message: "Too many intake saves. Try again shortly.",
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

  const validation = parseIntakeDraftPayload(await request.text());
  if (!validation.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "invalid_intake_draft",
          message: "Check the intake fields and try again.",
          fields: validation.errors,
        },
      },
      { status: validation.status },
    );
  }

  try {
    const saved = await saveIntakeDraft({
      tokenHash,
      fields: validation.fields,
    });

    if (!saved.ok) {
      const response = NextResponse.json(
        {
          ok: false,
          state: saved.state,
          expiresAt: saved.expiresAt,
        },
        { status: saved.state === "expired" ? 410 : 409 },
      );
      response.cookies.set(
        REFRAME_INTAKE_DRAFT_COOKIE,
        "",
        getExpiredIntakeDraftCookieOptions(),
      );
      return response;
    }

    const response = NextResponse.json({
      ok: true,
      state: saved.state,
      expiresAt: saved.expiresAt,
    });
    response.cookies.set(
      REFRAME_INTAKE_DRAFT_COOKIE,
      draftToken,
      getIntakeDraftCookieOptions(),
    );

    return response;
  } catch (error) {
    if (error instanceof SupabaseAdminConfigError) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: "intake_provider_not_configured",
            message: "Intake persistence is not configured.",
          },
        },
        { status: 503 },
      );
    }

    console.error("Failed to save intake draft.", error);
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "intake_draft_save_failed",
          message: "Could not save the intake draft.",
        },
      },
      { status: 500 },
    );
  }
}
