import { NextResponse } from "next/server";

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
  normalizeIntakeEmail,
} from "@/lib/reframe/intake/email";
import {
  getClientIpAddress,
  readRequestCookie,
} from "@/lib/reframe/intake/http";
import { checkOtpVerifyRateLimit } from "@/lib/reframe/intake/rate-limit";
import { CsrfConfigError, verifyCsrfRequest } from "@/lib/security/csrf";
import { SupabaseAdminConfigError } from "@/lib/supabase/admin";
import { SupabaseBrowserConfigError } from "@/lib/supabase/env";
import { createSupabaseRouteClient } from "@/lib/supabase/route";

const MAX_VERIFY_PAYLOAD_BYTES = 2_000;

type ClaimRpcRow = {
  workspace_slug: string;
  project_slug: string;
  reused_existing_project: boolean;
};

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

  const parsed = await parseVerifyBody(request);
  if (!parsed.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "invalid_verify_request",
          message: "Could not continue with that code.",
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
    const rateLimit = checkOtpVerifyRateLimit({
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
      redirectTo: `/app/${claim.workspace_slug}/projects/${claim.project_slug}`,
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

async function parseVerifyBody(request: Request) {
  const rawBody = await request.text();
  if (Buffer.byteLength(rawBody, "utf8") > MAX_VERIFY_PAYLOAD_BYTES) {
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

  const input = payload as Record<string, unknown>;
  const email = normalizeIntakeEmail(input.email);
  const token = typeof input.token === "string" ? input.token.trim() : "";

  if (!email || !/^\d{6}$/.test(token)) {
    return {
      ok: false as const,
      status: 400,
    };
  }

  return {
    ok: true as const,
    email,
    token,
  };
}

function readClaimRpcRow(data: unknown): ClaimRpcRow | null {
  const row = Array.isArray(data) ? data[0] : data;

  if (!row || typeof row !== "object") {
    return null;
  }

  const candidate = row as Record<string, unknown>;
  if (
    typeof candidate.workspace_slug !== "string" ||
    typeof candidate.project_slug !== "string"
  ) {
    return null;
  }

  return {
    workspace_slug: candidate.workspace_slug,
    project_slug: candidate.project_slug,
    reused_existing_project: candidate.reused_existing_project === true,
  };
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
