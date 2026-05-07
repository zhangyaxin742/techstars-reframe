import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export const REFRAME_CSRF_COOKIE = "reframe_csrf";
export const REFRAME_CSRF_HEADER = "x-reframe-csrf";
export const CSRF_MAX_AGE_SECONDS = 24 * 60 * 60;

type CsrfCookieOptions = {
  httpOnly: true;
  secure: true;
  sameSite: "lax";
  path: "/";
  maxAge: number;
};

type IssueCsrfTokenInput = {
  secret?: string;
  now?: Date;
  randomBytesFn?: (size: number) => Buffer;
};

export type IssuedCsrfToken = {
  token: string;
  cookie: {
    name: typeof REFRAME_CSRF_COOKIE;
    value: string;
    options: CsrfCookieOptions;
  };
  expiresAt: Date;
};

export type CsrfVerificationResult =
  | { ok: true }
  | {
      ok: false;
      status: 403 | 405 | 415;
      code:
        | "csrf_method_not_allowed"
        | "csrf_invalid_content_type"
        | "csrf_invalid_origin"
        | "csrf_invalid_fetch_site"
        | "csrf_missing_token"
        | "csrf_missing_cookie"
        | "csrf_invalid_token"
        | "csrf_expired";
      message: string;
    };

export class CsrfConfigError extends Error {
  constructor(message = "CSRF configuration is missing.") {
    super(message);
    this.name = "CsrfConfigError";
  }
}

export function issueCsrfToken(input: IssueCsrfTokenInput = {}): IssuedCsrfToken {
  const secret = input.secret ?? readCsrfSecret();
  const now = input.now ?? new Date();
  const expiresAt = new Date(now.getTime() + CSRF_MAX_AGE_SECONDS * 1_000);
  const nonce = (input.randomBytesFn ?? randomBytes)(32).toString("base64url");
  const token = `v1.${nonce}.${expiresAt.getTime()}`;

  return {
    token,
    cookie: {
      name: REFRAME_CSRF_COOKIE,
      value: `v1.${expiresAt.getTime()}.${signCsrfToken(token, secret)}`,
      options: {
        httpOnly: true,
        secure: true,
        sameSite: "lax",
        path: "/",
        maxAge: CSRF_MAX_AGE_SECONDS,
      },
    },
    expiresAt,
  };
}

export function verifyCsrfToken(input: {
  token: string | null;
  cookieValue: string | null;
  secret?: string;
  now?: Date;
}): CsrfVerificationResult {
  if (!input.token) {
    return csrfFailure("csrf_missing_token", 403, "CSRF token is missing.");
  }

  if (!input.cookieValue) {
    return csrfFailure("csrf_missing_cookie", 403, "CSRF cookie is missing.");
  }

  const tokenParts = input.token.split(".");
  const cookieParts = input.cookieValue.split(".");

  if (tokenParts.length !== 3 || cookieParts.length !== 3) {
    return csrfFailure("csrf_invalid_token", 403, "CSRF token is invalid.");
  }

  const [tokenVersion, nonce, tokenExpiresAt] = tokenParts;
  const [cookieVersion, cookieExpiresAt, cookieSignature] = cookieParts;

  if (
    tokenVersion !== "v1" ||
    cookieVersion !== "v1" ||
    nonce.length < 32 ||
    tokenExpiresAt !== cookieExpiresAt ||
    !/^\d+$/.test(tokenExpiresAt)
  ) {
    return csrfFailure("csrf_invalid_token", 403, "CSRF token is invalid.");
  }

  const now = input.now ?? new Date();
  if (Number(tokenExpiresAt) <= now.getTime()) {
    return csrfFailure("csrf_expired", 403, "CSRF token expired.");
  }

  const secret = input.secret ?? readCsrfSecret();
  const expectedSignature = signCsrfToken(input.token, secret);

  if (!safeEqual(cookieSignature, expectedSignature)) {
    return csrfFailure("csrf_invalid_token", 403, "CSRF token is invalid.");
  }

  return { ok: true };
}

export function verifyCsrfRequest(
  request: Request,
  input: {
    secret?: string;
    now?: Date;
  } = {},
): CsrfVerificationResult {
  if (request.method !== "POST") {
    return csrfFailure(
      "csrf_method_not_allowed",
      405,
      "State-changing requests must use POST.",
    );
  }

  const contentType = request.headers.get("content-type")?.toLowerCase() ?? "";
  if (!contentType.includes("application/json")) {
    return csrfFailure(
      "csrf_invalid_content_type",
      415,
      "State-changing requests must use application/json.",
    );
  }

  const originResult = verifyOrigin(request.headers);
  if (!originResult.ok) {
    return originResult;
  }

  const secFetchSite = request.headers.get("sec-fetch-site")?.toLowerCase();
  if (
    secFetchSite &&
    secFetchSite !== "same-origin" &&
    secFetchSite !== "same-site"
  ) {
    return csrfFailure(
      "csrf_invalid_fetch_site",
      403,
      "Cross-site state-changing requests are not allowed.",
    );
  }

  return verifyCsrfToken({
    token: request.headers.get(REFRAME_CSRF_HEADER),
    cookieValue: readCookieValue(request.headers, REFRAME_CSRF_COOKIE),
    secret: input.secret,
    now: input.now,
  });
}

export function readCsrfSecret() {
  const secret =
    process.env.REFRAME_CSRF_SECRET?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!secret || secret.length < 32) {
    throw new CsrfConfigError(
      "Set REFRAME_CSRF_SECRET or a 32+ character SUPABASE_SERVICE_ROLE_KEY before enabling state-changing routes.",
    );
  }

  return secret;
}

function verifyOrigin(headers: Headers): CsrfVerificationResult {
  const origin = headers.get("origin");
  const host = normalizeHost(headers.get("host"));
  const forwardedHost = normalizeHost(headers.get("x-forwarded-host"));

  if (!origin || (!host && !forwardedHost)) {
    return csrfFailure("csrf_invalid_origin", 403, "Request origin is invalid.");
  }

  let originHost: string;
  try {
    originHost = normalizeHost(new URL(origin).host);
  } catch {
    return csrfFailure("csrf_invalid_origin", 403, "Request origin is invalid.");
  }

  if (originHost !== host && originHost !== forwardedHost) {
    return csrfFailure("csrf_invalid_origin", 403, "Request origin is invalid.");
  }

  return { ok: true };
}

function readCookieValue(headers: Headers, name: string) {
  const cookieHeader = headers.get("cookie");
  if (!cookieHeader) {
    return null;
  }

  const pair = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`));

  if (!pair) {
    return null;
  }

  return decodeURIComponent(pair.slice(name.length + 1));
}

function signCsrfToken(token: string, secret: string) {
  return createHmac("sha256", secret).update(token).digest("base64url");
}

function safeEqual(actual: string, expected: string) {
  const actualBuffer = Buffer.from(actual);
  const expectedBuffer = Buffer.from(expected);

  if (actualBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return timingSafeEqual(actualBuffer, expectedBuffer);
}

function normalizeHost(value: string | null) {
  return value?.split(",")[0]?.trim().toLowerCase() ?? "";
}

function csrfFailure(
  code: Exclude<CsrfVerificationResult, { ok: true }>["code"],
  status: Exclude<CsrfVerificationResult, { ok: true }>["status"],
  message: string,
): CsrfVerificationResult {
  return {
    ok: false,
    status,
    code,
    message,
  };
}
