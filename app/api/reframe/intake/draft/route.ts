import { NextResponse } from "next/server";

import {
  getExpiredIntakeDraftCookieOptions,
  hashIntakeDraftToken,
  isValidIntakeDraftToken,
  IntakeDraftTokenConfigError,
  REFRAME_INTAKE_DRAFT_COOKIE,
} from "@/lib/reframe/intake/draft-cookie";
import { restoreIntakeDraft } from "@/lib/reframe/intake/draft-store";
import { readRequestCookie } from "@/lib/reframe/intake/http";
import { SupabaseAdminConfigError } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  const draftToken = readRequestCookie(
    request.headers,
    REFRAME_INTAKE_DRAFT_COOKIE,
  );

  if (!isValidIntakeDraftToken(draftToken)) {
    return clearDraftCookie(
      {
        ok: false,
        state: "missing",
      },
      404,
    );
  }

  try {
    const restored = await restoreIntakeDraft({
      tokenHash: hashIntakeDraftToken(draftToken),
    });

    if (!restored.ok) {
      return clearDraftCookie(
        {
          ok: false,
          state: restored.state,
          expiresAt: restored.expiresAt,
        },
        restored.state === "expired" ? 410 : 404,
      );
    }

    return NextResponse.json({
      ok: true,
      state: restored.state,
      draft: restored.draft,
    });
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

    console.error("Failed to restore intake draft.", error);
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "intake_draft_restore_failed",
          message: "Could not restore the intake draft.",
        },
      },
      { status: 500 },
    );
  }
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
