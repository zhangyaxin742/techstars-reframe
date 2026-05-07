import { createHmac } from "node:crypto";

export class IntakeEmailHashConfigError extends Error {
  constructor(message = "Intake email hash configuration is missing.") {
    super(message);
    this.name = "IntakeEmailHashConfigError";
  }
}

export function normalizeIntakeEmail(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const email = value.trim().toLowerCase();
  if (!email || email.length > 254) {
    return null;
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return null;
  }

  return email;
}

export function maskIntakeEmail(email: string) {
  const [localPart, domain] = email.split("@");
  if (!localPart || !domain) {
    return "your email";
  }

  return `${localPart.slice(0, 1)}***@${domain}`;
}

export function hashIntakeEmail(
  email: string,
  secret = readIntakeEmailHashSecret(),
) {
  return createHmac("sha256", secret).update(email).digest("hex");
}

export function readIntakeEmailHashSecret() {
  const secret =
    process.env.REFRAME_EMAIL_HASH_SECRET?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!secret || secret.length < 32) {
    throw new IntakeEmailHashConfigError(
      "Set REFRAME_EMAIL_HASH_SECRET or a 32+ character SUPABASE_SERVICE_ROLE_KEY before enabling intake auth.",
    );
  }

  return secret;
}
