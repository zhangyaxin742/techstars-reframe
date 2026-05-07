import { NextResponse } from "next/server";

import type { getVerifiedActor } from "./auth";
import { CsrfConfigError, verifyCsrfRequest } from "@/lib/security/csrf";

type ActorFailure = Exclude<
  Awaited<ReturnType<typeof getVerifiedActor>>,
  { ok: true }
>;

export function verifyAccountMutationCsrf(
  request: Request,
  allowedMethods: string[],
) {
  try {
    const csrf = verifyCsrfRequest(request, { allowedMethods });
    if (csrf.ok) {
      return null;
    }

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
}

export function accountAuthError(actor: ActorFailure) {
  return NextResponse.json(
    {
      ok: false,
      error: {
        code: actor.code,
        message: actor.message,
      },
    },
    { status: actor.status },
  );
}

export function accountValidationError(input: {
  code: string;
  message: string;
  status: 400 | 413;
  fields: Record<string, string>;
}) {
  return NextResponse.json(
    {
      ok: false,
      error: {
        code: input.code,
        message: input.message,
        fields: input.fields,
      },
    },
    { status: input.status },
  );
}

export function accountRateLimitError(input: {
  message: string;
  retryAfterSeconds: number;
}) {
  return NextResponse.json(
    {
      ok: false,
      error: {
        code: "rate_limited",
        message: input.message,
      },
      retryAfterSeconds: input.retryAfterSeconds,
    },
    {
      status: 429,
      headers: {
        "Retry-After": String(input.retryAfterSeconds),
      },
    },
  );
}

export function accountMutationFailure(input: {
  code: string;
  message: string;
  status?: number;
}) {
  return NextResponse.json(
    {
      ok: false,
      error: {
        code: input.code,
        message: input.message,
      },
    },
    { status: input.status ?? 500 },
  );
}
