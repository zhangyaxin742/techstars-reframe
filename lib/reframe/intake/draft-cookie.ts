import { createHmac, randomBytes } from "node:crypto";

export const REFRAME_INTAKE_DRAFT_COOKIE = "reframe_intake_draft";
export const INTAKE_DRAFT_MAX_AGE_SECONDS = 24 * 60 * 60;

export type IntakeDraftCookieOptions = {
  httpOnly: true;
  secure: true;
  sameSite: "lax";
  path: "/";
  maxAge: number;
  expires?: Date;
};

export class IntakeDraftTokenConfigError extends Error {
  constructor(message = "Intake draft token configuration is missing.") {
    super(message);
    this.name = "IntakeDraftTokenConfigError";
  }
}

export function createIntakeDraftToken() {
  return randomBytes(32).toString("base64url");
}

export function isValidIntakeDraftToken(value: string | null): value is string {
  return Boolean(value && /^[A-Za-z0-9_-]{32,256}$/.test(value));
}

export function hashIntakeDraftToken(
  token: string,
  secret = readIntakeDraftTokenSecret(),
) {
  return createHmac("sha256", secret).update(token).digest("hex");
}

export function readIntakeDraftTokenSecret() {
  const secret =
    process.env.REFRAME_DRAFT_TOKEN_SECRET?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!secret || secret.length < 32) {
    throw new IntakeDraftTokenConfigError(
      "Set REFRAME_DRAFT_TOKEN_SECRET or a 32+ character SUPABASE_SERVICE_ROLE_KEY before enabling intake drafts.",
    );
  }

  return secret;
}

export function getIntakeDraftCookieOptions(): IntakeDraftCookieOptions {
  return {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: INTAKE_DRAFT_MAX_AGE_SECONDS,
  };
}

export function getExpiredIntakeDraftCookieOptions(): IntakeDraftCookieOptions {
  return {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
    expires: new Date(0),
  };
}
