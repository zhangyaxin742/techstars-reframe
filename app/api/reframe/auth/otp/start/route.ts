import { NextResponse } from "next/server";

import {
  AccountEmailHashConfigError,
  hashAccountEmail,
  maskAccountEmail,
} from "@/lib/reframe/account/email";
import { checkAccountOtpStartRateLimit } from "@/lib/reframe/account/rate-limit";
import { readFirstRpcRow } from "@/lib/reframe/account/service";
import {
  hashWorkspaceInviteToken,
  WorkspaceInviteTokenConfigError,
} from "@/lib/reframe/account/tokens";
import {
  ACCOUNT_AUTH_MAX_PAYLOAD_BYTES,
  parseJsonPayload,
  validateOtpStartPayload,
} from "@/lib/reframe/account/validation";
import { getClientIpAddress } from "@/lib/reframe/intake/http";
import { CsrfConfigError, verifyCsrfRequest } from "@/lib/security/csrf";
import { createSupabasePasswordlessAuthClient } from "@/lib/supabase/auth";
import {
  createSupabaseServiceRoleClient,
  SupabaseAdminConfigError,
} from "@/lib/supabase/admin";
import { SupabaseBrowserConfigError } from "@/lib/supabase/env";

const RESEND_AFTER_SECONDS = 60;

type InviteGateRow = {
  valid?: boolean;
  state?: string;
};

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
    validateOtpStartPayload,
  );
  if (!parsed.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "invalid_otp_start_request",
          message: "Enter a valid email to continue.",
          fields: parsed.errors,
        },
      },
      { status: parsed.status },
    );
  }

  const { email, mode } = parsed.value;
  let emailHash: string;
  let inviteTokenHash: string | undefined;

  try {
    emailHash = hashAccountEmail(email);
    if (mode === "invite_accept" && parsed.value.inviteToken) {
      inviteTokenHash = hashWorkspaceInviteToken(parsed.value.inviteToken);
    }
  } catch (error) {
    if (
      error instanceof AccountEmailHashConfigError ||
      error instanceof WorkspaceInviteTokenConfigError
    ) {
      return configError(
        "account_auth_not_configured",
        "Account auth protection is not configured.",
      );
    }

    throw error;
  }

  const rateLimit = checkAccountOtpStartRateLimit({
    ipAddress: getClientIpAddress(request.headers),
    emailHash,
    inviteTokenHash,
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

  try {
    const supabase = createSupabasePasswordlessAuthClient();

    if (mode === "invite_accept") {
      const allowed = await isInviteOtpStartAllowed({
        emailHash,
        inviteTokenHash,
      });

      if (!allowed) {
        return NextResponse.json(publicVerifyEmailResponse(email));
      }
    }

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: mode !== "recovery",
      },
    });

    if (error) {
      console.error("Failed to start account email OTP.", {
        code: error.name,
        status: error.status,
        mode,
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

    return NextResponse.json(publicVerifyEmailResponse(email));
  } catch (error) {
    if (error instanceof SupabaseBrowserConfigError) {
      return configError(
        "account_provider_not_configured",
        "Account auth is not configured.",
      );
    }

    if (error instanceof SupabaseAdminConfigError) {
      return configError(
        "account_invite_gate_not_configured",
        "Workspace invite auth is not configured.",
      );
    }

    console.error("Failed to start account auth handoff.", error);
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "account_otp_start_failed",
          message: "Could not start account verification.",
        },
      },
      { status: 500 },
    );
  }
}

async function isInviteOtpStartAllowed(input: {
  emailHash: string;
  inviteTokenHash?: string;
}) {
  if (!input.inviteTokenHash) {
    return false;
  }

  const supabase = createSupabaseServiceRoleClient();
  const { data, error } = await supabase.rpc(
    "resolve_workspace_invite_for_otp",
    {
      p_token_hash: input.inviteTokenHash,
      p_email_hash: input.emailHash,
    },
  );

  if (error) {
    console.error("Failed to resolve workspace invite OTP gate.", {
      code: "workspace_invite_gate_error",
    });
    return false;
  }

  const row = readFirstRpcRow<InviteGateRow>(data);
  return row?.valid === true;
}

function publicVerifyEmailResponse(email: string) {
  return {
    ok: true,
    nextStep: "verify_email",
    maskedEmail: maskAccountEmail(email),
    resendAfterSeconds: RESEND_AFTER_SECONDS,
  };
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
