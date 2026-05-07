import {
  validateActiveWorkspacePayload,
  validateOtpStartPayload,
  validateProfileUpdatePayload,
  validateWorkspaceInvitePayload,
} from "./validation";

describe("account validation", () => {
  it("validates OTP start modes and never accepts password fields", () => {
    expect(
      validateOtpStartPayload({
        email: " Founder@Example.com ",
        mode: "public_account",
        password: "not-used",
      }),
    ).toEqual({
      ok: true,
      value: {
        email: "founder@example.com",
        mode: "public_account",
      },
    });

    expect(
      validateOtpStartPayload({
        email: "founder@example.com",
        mode: "recovery",
      }),
    ).toMatchObject({
      ok: true,
      value: {
        mode: "recovery",
      },
    });
  });

  it("requires an invite token for invite acceptance OTP start", () => {
    expect(
      validateOtpStartPayload({
        email: "founder@example.com",
        mode: "invite_accept",
      }),
    ).toMatchObject({
      ok: false,
      errors: {
        inviteToken: "Invite token is invalid.",
      },
    });
  });

  it("limits profile and workspace payloads to safe fields", () => {
    expect(
      validateProfileUpdatePayload({
        displayName: "  Ada Founder  ",
        email: "other@example.com",
      }),
    ).toEqual({
      ok: true,
      value: {
        displayName: "Ada Founder",
      },
    });

    expect(
      validateActiveWorkspacePayload({
        workspaceId: "not-a-uuid",
      }),
    ).toMatchObject({
      ok: false,
      errors: {
        workspaceId: "Workspace is invalid.",
      },
    });
  });

  it("allows only admin or member invite roles", () => {
    expect(
      validateWorkspaceInvitePayload({
        email: "teammate@example.com",
        role: "owner",
      }),
    ).toMatchObject({
      ok: false,
      errors: {
        role: "Choose admin or member.",
      },
    });

    expect(
      validateWorkspaceInvitePayload({
        email: "Teammate@Example.com",
        role: "member",
      }),
    ).toEqual({
      ok: true,
      value: {
        email: "teammate@example.com",
        role: "member",
      },
    });
  });
});
