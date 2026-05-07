import { NextResponse } from "next/server";

import {
  buildClaimRedirect,
  readClaimRpcRow,
} from "@/lib/reframe/intake/claim";
import {
  getExpiredIntakeDraftCookieOptions,
  hashIntakeDraftToken,
  IntakeDraftTokenConfigError,
  isValidIntakeDraftToken,
  REFRAME_INTAKE_DRAFT_COOKIE,
} from "@/lib/reframe/intake/draft-cookie";
import { restoreIntakeDraft } from "@/lib/reframe/intake/draft-store";
import {
  hashIntakeEmail,
  IntakeEmailHashConfigError,
} from "@/lib/reframe/intake/email";
import {
  getClientIpAddress,
  readRequestCookie,
} from "@/lib/reframe/intake/http";
import { checkClaimRateLimit } from "@/lib/reframe/intake/rate-limit";
import { CsrfConfigError, verifyCsrfRequest } from "@/lib/security/csrf";
import { SupabaseAdminConfigError } from "@/lib/supabase/admin";
import { SupabaseBrowserConfigError } from "@/lib/supabase/env";
import { createSupabaseRouteClient } from "@/lib/supabase/route";

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
    const rateLimit = checkClaimRateLimit({
      ipAddress: getClientIpAddress(request.headers),
      draftTokenHash,
    });

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: "rate_limited",
            message: "Too many claim attempts. Try again shortly.",
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

    const { supabase, applyToResponse } = createSupabaseRouteClient(request);
    const { data: claimsData, error: claimsError } =
      await supabase.auth.getClaims();
    const subject = claimsData?.claims?.sub;

    if (claimsError || !subject) {
      return NextResponse.json(
        {
          ok: false,
          state: "auth_required",
        },
        { status: 401 },
      );
    }

    const { data: userData, error: userError } = await supabase.auth.getUser();
    const email = userData.user?.email?.trim().toLowerCase();

    if (userError || !email) {
      return NextResponse.json(
        {
          ok: false,
          state: "auth_required",
        },
        { status: 401 },
      );
    }

    const { data, error: claimError } = await supabase.rpc("claim_intake_draft", {
      p_token_hash: draftTokenHash,
      p_email_display: email,
      p_email_hash: hashIntakeEmail(email),
      p_workspace_name: "My Workspace",
    });

    if (claimError) {
      return handleClaimError(claimError.message);
    }

    const claim = readClaimRpcRow(data);
    if (!claim) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: "claim_failed",
            message: "Could not open the workspace.",
          },
        },
        { status: 500 },
      );
    }

    const response = NextResponse.json({
      ok: true,
      redirectTo: buildClaimRedirect(claim),
      project: {
        workspaceSlug: claim.workspace_slug,
        projectSlug: claim.project_slug,
        reusedExistingProject: claim.reused_existing_project,
      },
    });
    response.cookies.set(
      REFRAME_INTAKE_DRAFT_COOKIE,
      "",
      getExpiredIntakeDraftCookieOptions(),
    );

    return applyToResponse(response);
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

    console.error("Failed to claim intake draft.", error);
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "intake_claim_failed",
          message: "Could not open the workspace.",
        },
      },
      { status: 500 },
    );
  }
}

function handleClaimError(message: string) {
  if (message.includes("intake_draft_expired")) {
    return clearDraftCookie(
      {
        ok: false,
        state: "expired",
      },
      410,
    );
  }

  if (message.includes("intake_draft_claim_conflict")) {
    return clearDraftCookie(
      {
        ok: false,
        state: "claim_conflict",
      },
      409,
    );
  }

  console.error("Failed to claim intake draft.", {
    code: "claim_rpc_error",
  });
  return NextResponse.json(
    {
      ok: false,
      error: {
        code: "claim_failed",
        message: "Could not open the workspace.",
      },
    },
    { status: 500 },
  );
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
