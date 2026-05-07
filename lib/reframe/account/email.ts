import { createHmac } from "node:crypto";

const RESEND_EMAILS_ENDPOINT = "https://api.resend.com/emails";

export class AccountEmailHashConfigError extends Error {
  constructor(message = "Account email hash configuration is missing.") {
    super(message);
    this.name = "AccountEmailHashConfigError";
  }
}

export class WorkspaceInviteEmailConfigError extends Error {
  constructor(message = "Workspace invite email configuration is missing.") {
    super(message);
    this.name = "WorkspaceInviteEmailConfigError";
  }
}

export function normalizeAccountEmail(value: unknown) {
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

export function maskAccountEmail(email: string) {
  const [localPart, domain] = email.split("@");
  if (!localPart || !domain) {
    return "your email";
  }

  return `${localPart.slice(0, 1)}***@${domain}`;
}

export function hashAccountEmail(
  email: string,
  secret = readAccountEmailHashSecret(),
) {
  return createHmac("sha256", secret).update(email).digest("hex");
}

export function readAccountEmailHashSecret() {
  const secret =
    process.env.REFRAME_EMAIL_HASH_SECRET?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!secret || secret.length < 32) {
    throw new AccountEmailHashConfigError(
      "Set REFRAME_EMAIL_HASH_SECRET or a 32+ character SUPABASE_SERVICE_ROLE_KEY before enabling account auth.",
    );
  }

  return secret;
}

export type WorkspaceInviteEmailInput = {
  inviteId: string;
  email: string;
  token: string;
  workspaceName: string;
  inviterName?: string | null;
  role: "admin" | "member";
  expiresAt: string;
};

export async function sendWorkspaceInviteEmail(input: WorkspaceInviteEmailInput) {
  const config = readWorkspaceInviteEmailConfig();
  const inviteUrl = `${config.appUrl}/account?invite=${encodeURIComponent(input.token)}`;
  const response = await fetch(RESEND_EMAILS_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": `workspace-invite/${input.inviteId}`,
    },
    body: JSON.stringify({
      from: config.from,
      to: [input.email],
      subject: `You're invited to ${input.workspaceName} on Reframe`,
      html: buildInviteHtml(input, inviteUrl),
      text: buildInviteText(input, inviteUrl),
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(await readEmailError(response));
  }

  const data = (await response.json()) as { id?: string };
  return data.id ?? null;
}

function readWorkspaceInviteEmailConfig() {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from =
    process.env.REFRAME_INVITE_EMAIL_FROM?.trim() ||
    process.env.WAITLIST_NOTIFICATION_FROM?.trim();
  const appUrl = (
    process.env.REFRAME_APP_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    ""
  ).replace(/\/+$/, "");

  if (!apiKey || !from || !appUrl) {
    throw new WorkspaceInviteEmailConfigError(
      "Set RESEND_API_KEY, REFRAME_INVITE_EMAIL_FROM, and REFRAME_APP_URL before sending workspace invites.",
    );
  }

  return {
    apiKey,
    from,
    appUrl,
  };
}

function buildInviteHtml(input: WorkspaceInviteEmailInput, inviteUrl: string) {
  const inviter = input.inviterName?.trim() || "A Reframe workspace admin";
  const expires = new Date(input.expiresAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return `
    <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #111827;">
      <h1 style="font-size: 20px; margin: 0 0 12px;">Join ${escapeHtml(input.workspaceName)} on Reframe</h1>
      <p>${escapeHtml(inviter)} invited you as ${articleFor(input.role)} ${escapeHtml(input.role)}.</p>
      <p>This invite expires on ${escapeHtml(expires)}.</p>
      <p><a href="${escapeHtml(inviteUrl)}">Accept the invite</a></p>
      <p style="color: #6b7280; font-size: 13px;">If you were not expecting this invite, you can ignore this email.</p>
    </div>
  `.trim();
}

function buildInviteText(input: WorkspaceInviteEmailInput, inviteUrl: string) {
  const inviter = input.inviterName?.trim() || "A Reframe workspace admin";
  return [
    `Join ${input.workspaceName} on Reframe`,
    `${inviter} invited you as ${articleFor(input.role)} ${input.role}.`,
    `This invite expires on ${new Date(input.expiresAt).toISOString()}.`,
    `Accept the invite: ${inviteUrl}`,
    "If you were not expecting this invite, you can ignore this email.",
  ].join("\n");
}

async function readEmailError(response: Response) {
  const text = await response.text();
  return text.slice(0, 1000) || `Workspace invite email failed with ${response.status}.`;
}

function articleFor(role: string) {
  return role === "admin" ? "an" : "a";
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
