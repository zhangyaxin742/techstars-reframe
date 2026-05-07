import { isValidWorkspaceInviteToken } from "./tokens";
import { type InviteRole } from "./types";
import { normalizeAccountEmail } from "./email";

export const ACCOUNT_AUTH_MAX_PAYLOAD_BYTES = 2_000;
export const ACCOUNT_MUTATION_MAX_PAYLOAD_BYTES = 4_000;

type ValidationFailure = {
  ok: false;
  status: 400 | 413;
  errors: Record<string, string>;
};

export type AccountValidationResult<T> =
  | { ok: true; value: T }
  | ValidationFailure;

export type OtpStartPayload = {
  email: string;
  mode: "public_account" | "invite_accept" | "recovery";
  inviteToken?: string;
  returnTo?: "/account" | "/intake/verify";
};

export type OtpVerifyPayload = {
  email: string;
  token: string;
  returnTo?: "/account" | "/intake/verify";
};

export type ProfileUpdatePayload = {
  displayName: string | null;
};

export type ActiveWorkspacePayload = {
  workspaceId: string;
};

export type WorkspaceCreatePayload = {
  name?: string;
};

export type WorkspaceInvitePayload = {
  email: string;
  role: InviteRole;
};

export type InviteAcceptPayload = {
  token: string;
};

export async function parseJsonPayload<T>(
  request: Request,
  maxBytes: number,
  validate: (payload: unknown) => AccountValidationResult<T>,
): Promise<AccountValidationResult<T>> {
  const rawBody = await request.text();
  if (Buffer.byteLength(rawBody, "utf8") > maxBytes) {
    return {
      ok: false,
      status: 413,
      errors: {
        body: "Request payload is too large.",
      },
    };
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return {
      ok: false,
      status: 400,
      errors: {
        body: "Request body must be valid JSON.",
      },
    };
  }

  return validate(payload);
}

export function validateOtpStartPayload(
  payload: unknown,
): AccountValidationResult<OtpStartPayload> {
  if (!isRecord(payload)) {
    return invalidBody();
  }

  const errors: Record<string, string> = {};
  const email = normalizeAccountEmail(payload.email);
  const mode =
    payload.mode === "public_account" ||
    payload.mode === "invite_accept" ||
    payload.mode === "recovery"
      ? payload.mode
      : null;
  const returnTo = normalizeReturnTo(payload.returnTo);
  const inviteToken =
    typeof payload.inviteToken === "string" ? payload.inviteToken.trim() : "";

  if (!email) {
    errors.email = "Enter a valid email address.";
  }

  if (!mode) {
    errors.mode = "Choose a supported OTP mode.";
  }

  if (payload.returnTo != null && !returnTo) {
    errors.returnTo = "Unsupported return path.";
  }

  if (mode === "invite_accept" && !isValidWorkspaceInviteToken(inviteToken)) {
    errors.inviteToken = "Invite token is invalid.";
  }

  if (Object.keys(errors).length > 0 || !email || !mode) {
    return {
      ok: false,
      status: 400,
      errors,
    };
  }

  return {
    ok: true,
    value: {
      email,
      mode,
      ...(inviteToken ? { inviteToken } : {}),
      ...(returnTo ? { returnTo } : {}),
    },
  };
}

export function validateOtpVerifyPayload(
  payload: unknown,
): AccountValidationResult<OtpVerifyPayload> {
  if (!isRecord(payload)) {
    return invalidBody();
  }

  const errors: Record<string, string> = {};
  const email = normalizeAccountEmail(payload.email);
  const token = typeof payload.token === "string" ? payload.token.trim() : "";
  const returnTo = normalizeReturnTo(payload.returnTo);

  if (!email) {
    errors.email = "Enter a valid email address.";
  }

  if (!/^\d{6}$/.test(token)) {
    errors.token = "Enter the six-digit code.";
  }

  if (payload.returnTo != null && !returnTo) {
    errors.returnTo = "Unsupported return path.";
  }

  if (Object.keys(errors).length > 0 || !email) {
    return {
      ok: false,
      status: 400,
      errors,
    };
  }

  return {
    ok: true,
    value: {
      email,
      token,
      ...(returnTo ? { returnTo } : {}),
    },
  };
}

export function validateProfileUpdatePayload(
  payload: unknown,
): AccountValidationResult<ProfileUpdatePayload> {
  if (!isRecord(payload)) {
    return invalidBody();
  }

  if (payload.displayName == null || payload.displayName === "") {
    return {
      ok: true,
      value: {
        displayName: null,
      },
    };
  }

  if (typeof payload.displayName !== "string") {
    return fieldError("displayName", "Enter a name or leave it blank.");
  }

  const displayName = payload.displayName.trim();
  if (displayName.length > 120) {
    return fieldError("displayName", "Keep the display name under 120 characters.");
  }

  return {
    ok: true,
    value: {
      displayName: displayName || null,
    },
  };
}

export function validateActiveWorkspacePayload(
  payload: unknown,
): AccountValidationResult<ActiveWorkspacePayload> {
  if (!isRecord(payload)) {
    return invalidBody();
  }

  const workspaceId = typeof payload.workspaceId === "string" ? payload.workspaceId.trim() : "";
  if (!isUuid(workspaceId)) {
    return fieldError("workspaceId", "Workspace is invalid.");
  }

  return {
    ok: true,
    value: {
      workspaceId,
    },
  };
}

export function validateWorkspaceCreatePayload(
  payload: unknown,
): AccountValidationResult<WorkspaceCreatePayload> {
  if (!isRecord(payload)) {
    return invalidBody();
  }

  if (payload.name == null || payload.name === "") {
    return {
      ok: true,
      value: {},
    };
  }

  if (typeof payload.name !== "string") {
    return fieldError("name", "Enter a workspace name.");
  }

  const name = payload.name.trim();
  if (name.length < 2 || name.length > 80) {
    return fieldError("name", "Workspace name must be 2 to 80 characters.");
  }

  return {
    ok: true,
    value: {
      name,
    },
  };
}

export function validateWorkspaceInvitePayload(
  payload: unknown,
): AccountValidationResult<WorkspaceInvitePayload> {
  if (!isRecord(payload)) {
    return invalidBody();
  }

  const errors: Record<string, string> = {};
  const email = normalizeAccountEmail(payload.email);
  const role = payload.role === "admin" || payload.role === "member" ? payload.role : null;

  if (!email) {
    errors.email = "Enter a valid email address.";
  }

  if (!role) {
    errors.role = "Choose admin or member.";
  }

  if (Object.keys(errors).length > 0 || !email || !role) {
    return {
      ok: false,
      status: 400,
      errors,
    };
  }

  return {
    ok: true,
    value: {
      email,
      role,
    },
  };
}

export function validateInviteAcceptPayload(
  payload: unknown,
): AccountValidationResult<InviteAcceptPayload> {
  if (!isRecord(payload)) {
    return invalidBody();
  }

  const token = typeof payload.token === "string" ? payload.token.trim() : "";
  if (!isValidWorkspaceInviteToken(token)) {
    return fieldError("token", "Invite token is invalid.");
  }

  return {
    ok: true,
    value: {
      token,
    },
  };
}

export function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function normalizeReturnTo(value: unknown) {
  if (value == null || value === "") {
    return null;
  }

  return value === "/account" || value === "/intake/verify" ? value : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function invalidBody(): ValidationFailure {
  return {
    ok: false,
    status: 400,
    errors: {
      body: "Request body must be a JSON object.",
    },
  };
}

function fieldError(field: string, message: string): ValidationFailure {
  return {
    ok: false,
    status: 400,
    errors: {
      [field]: message,
    },
  };
}
