import { NextResponse } from "next/server";

import {
  buildClaimRedirect,
  readClaimRpcRow,
} from "@/lib/reframe/intake/claim";
import {
  AccountEmailHashConfigError,
  hashAccountEmail,
} from "@/lib/reframe/account/email";
import { checkAccountOtpVerifyRateLimit } from "@/lib/reframe/account/rate-limit";
import {
  accountErrorStatus,
  readFirstRpcRow,
} from "@/lib/reframe/account/service";
import type { RpcWorkspaceRow } from "@/lib/reframe/account/types";
import {
  ACCOUNT_AUTH_MAX_PAYLOAD_BYTES,
  parseJsonPayload,
  type OtpVerifyPayload,
  validateOtpVerifyPayload,
} from "@/lib/reframe/account/validation";
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
import {
  checkOtpVerifyRateLimit as checkIntakeOtpVerifyRateLimit,
} from "@/lib/reframe/intake/rate-limit";
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
      return configError(
        "csrf_not_configured",
        "Request protection is not configured.",
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

  const parsed = await parseJsonPayload(
    request,
    ACCOUNT_AUTH_MAX_PAYLOAD_BYTES,
    validateOtpVerifyPayload,
  );
  if (!parsed.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "invalid_verify_request",
          message: "Could not continue with that code.",
          fields: parsed.errors,
        },
      },
      { status: parsed.status },
    );
  }

  const draftToken = readRequestCookie(
    request.headers,
    REFRAME_INTAKE_DRAFT_COOKIE,
  );

  const shouldClaimIntake =
    parsed.value.returnTo === "/intake/verify" ||
    isValidIntakeDraftToken(draftToken);

  if (!shouldClaimIntake) {
    return verifyAccountOtp(request, parsed.value);
  }

  if (!isValidIntakeDraftToken(draftToken)) {
    return clearDraftCookie(
      {
        ok: false,
        state: "invalid_draft",
      },
      400,
    );
  }

  return verifyIntakeOtp(request, parsed.value, draftToken);
}

async function verifyAccountOtp(request: Request, parsed: OtpVerifyPayload) {
  try {
    const emailHash = hashAccountEmail(parsed.email);
    const rateLimit = checkAccountOtpVerifyRateLimit({
      ipAddress: getClientIpAddress(request.headers),
      emailHash,
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

    const { supabase, applyToResponse } = createSupabaseRouteClient(request);
    const { error: verifyError } = await supabase.auth.verifyOtp({
      email: parsed.email,
      token: parsed.token,
      type: "email",
    });

    if (verifyError) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: "verification_failed",
            message: "Could not continue with that code.",
          },
        },
        { status: 400 },
      );
    }

    const { data, error: accountError } = await supabase.rpc(
      "ensure_account_workspace",
      {
        p_email_display: parsed.email,
        p_email_hash: emailHash,
        p_workspace_name: "My Workspace",
      },
    );

    if (accountError) {
      return applyToResponse(
        NextResponse.json(
          {
            ok: false,
            error: {
              code: "account_workspace_failed",
              message: "Could not open the account workspace.",
            },
          },
          { status: accountErrorStatus(accountError.message) },
        ),
      );
    }

    const account = readFirstRpcRow<RpcWorkspaceRow>(data);
    if (!account) {
      return applyToResponse(
        NextResponse.json(
          {
            ok: false,
            error: {
              code: "account_workspace_failed",
              message: "Could not open the account workspace.",
            },
          },
          { status: 500 },
        ),
      );
    }

    return applyToResponse(
      NextResponse.json({
        ok: true,
        redirectTo: "/account",
        account: {
          activeWorkspaceId:
            account.active_workspace_id ?? account.workspace_id ?? null,
          activeWorkspaceSlug:
            account.active_workspace_slug ?? account.workspace_slug ?? null,
          activeWorkspaceRole:
            account.active_workspace_role ?? account.membership_role ?? null,
          repairedProfile: Boolean(account.repaired_profile),
          repairedWorkspace: Boolean(account.repaired_workspace),
        },
      }),
    );
  } catch (error) {
    if (error instanceof AccountEmailHashConfigError) {
      return configError(
        "account_auth_not_configured",
        "Account auth protection is not configured.",
      );
    }

    if (error instanceof SupabaseBrowserConfigError) {
      return configError(
        "account_provider_not_configured",
        "Account auth is not configured.",
      );
    }

    console.error("Failed to verify account auth handoff.", error);
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "account_verify_failed",
          message: "Could not verify right now.",
        },
      },
      { status: 500 },
    );
  }
}

async function verifyIntakeOtp(
  request: Request,
  parsed: OtpVerifyPayload,
  draftToken: string,
) {
  try {
    const draftTokenHash = hashIntakeDraftToken(draftToken);
    const emailHash = hashIntakeEmail(parsed.email);
    const rateLimit = checkIntakeOtpVerifyRateLimit({
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

    const { supabase, applyToResponse } = createSupabaseRouteClient(request);
    const { error: verifyError } = await supabase.auth.verifyOtp({
      email: parsed.email,
      token: parsed.token,
      type: "email",
    });

    if (verifyError) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: "verification_failed",
            message: "Could not continue with that code.",
          },
        },
        { status: 400 },
      );
    }

    const { data, error: claimError } = await supabase.rpc("claim_intake_draft", {
      p_token_hash: draftTokenHash,
      p_email_display: parsed.email,
      p_email_hash: emailHash,
      p_workspace_name: "My Workspace",
    });

    if (claimError) {
      return applyToResponse(handleClaimError(claimError.message));
    }

    const claim = readClaimRpcRow(data);
    if (!claim) {
      return applyToResponse(
        NextResponse.json(
          {
            ok: false,
            error: {
              code: "claim_failed",
              message: "Could not open the workspace.",
            },
          },
          { status: 500 },
        ),
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

    console.error("Failed to verify intake auth handoff.", error);
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "intake_verify_failed",
          message: "Could not verify right now.",
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
