import { createHmac, randomBytes } from "node:crypto";

export const WORKSPACE_INVITE_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;

export class WorkspaceInviteTokenConfigError extends Error {
  constructor(message = "Workspace invite token configuration is missing.") {
    super(message);
    this.name = "WorkspaceInviteTokenConfigError";
  }
}

export function createWorkspaceInviteToken() {
  return randomBytes(32).toString("base64url");
}

export function isValidWorkspaceInviteToken(value: string | null): value is string {
  return Boolean(value && /^[A-Za-z0-9_-]{32,256}$/.test(value));
}

export function hashWorkspaceInviteToken(
  token: string,
  secret = readWorkspaceInviteTokenSecret(),
) {
  return createHmac("sha256", secret).update(token).digest("hex");
}

export function readWorkspaceInviteTokenSecret() {
  const secret =
    process.env.REFRAME_INVITE_TOKEN_SECRET?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!secret || secret.length < 32) {
    throw new WorkspaceInviteTokenConfigError(
      "Set REFRAME_INVITE_TOKEN_SECRET or a 32+ character SUPABASE_SERVICE_ROLE_KEY before enabling workspace invites.",
    );
  }

  return secret;
}

export function getWorkspaceInviteExpiresAt(now = new Date()) {
  return new Date(now.getTime() + WORKSPACE_INVITE_MAX_AGE_SECONDS * 1_000);
}
