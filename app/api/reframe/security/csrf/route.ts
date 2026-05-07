import { NextResponse } from "next/server";

import { issueCsrfToken, CsrfConfigError } from "@/lib/security/csrf";

export function GET() {
  try {
    const issued = issueCsrfToken();
    const response = NextResponse.json({
      ok: true,
      csrfToken: issued.token,
    });

    response.cookies.set(
      issued.cookie.name,
      issued.cookie.value,
      issued.cookie.options,
    );

    return response;
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
