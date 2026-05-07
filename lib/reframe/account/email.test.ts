import {
  hashAccountEmail,
  maskAccountEmail,
  normalizeAccountEmail,
  sendWorkspaceInviteEmail,
} from "./email";

const SECRET = "account_email_secret_32_characters";

describe("account email helpers", () => {
  const originalFetch = global.fetch;
  const originalEnv = {
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    REFRAME_INVITE_EMAIL_FROM: process.env.REFRAME_INVITE_EMAIL_FROM,
    REFRAME_APP_URL: process.env.REFRAME_APP_URL,
  };

  afterEach(() => {
    global.fetch = originalFetch;
    process.env.RESEND_API_KEY = originalEnv.RESEND_API_KEY;
    process.env.REFRAME_INVITE_EMAIL_FROM = originalEnv.REFRAME_INVITE_EMAIL_FROM;
    process.env.REFRAME_APP_URL = originalEnv.REFRAME_APP_URL;
  });

  it("normalizes, masks, and hashes emails without exposing raw values", () => {
    const email = normalizeAccountEmail(" Founder@Example.com ");
    expect(email).toBe("founder@example.com");
    expect(maskAccountEmail(email ?? "")).toBe("f***@example.com");

    const hash = hashAccountEmail(email ?? "", SECRET);
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
    expect(hash).not.toContain("founder@example.com");
  });

  it("sends workspace invites through Resend after app invite creation", async () => {
    process.env.RESEND_API_KEY = "re_test_key";
    process.env.REFRAME_INVITE_EMAIL_FROM = "Reframe <invites@example.com>";
    process.env.REFRAME_APP_URL = "https://app.example.com";
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ id: "email_123" }), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      }),
    );
    global.fetch = fetchMock as typeof fetch;

    await expect(
      sendWorkspaceInviteEmail({
        inviteId: "invite_123",
        email: "teammate@example.com",
        token: "raw_invite_token_abcdefghijklmnopqrstuvwxyz",
        workspaceName: "Petite Outdoors",
        role: "member",
        expiresAt: "2026-05-14T12:00:00.000Z",
      }),
    ).resolves.toBe("email_123");

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.resend.com/emails",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer re_test_key",
          "Idempotency-Key": "workspace-invite/invite_123",
        }),
      }),
    );
    expect(String(fetchMock.mock.calls[0]?.[1]?.body)).toContain(
      "https://app.example.com/account?invite=",
    );
  });
});
