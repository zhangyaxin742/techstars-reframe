import { GET } from "./route";

describe("CSRF bootstrap route", () => {
  const originalEnv = {
    REFRAME_CSRF_SECRET: process.env.REFRAME_CSRF_SECRET,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  };

  afterEach(() => {
    process.env.REFRAME_CSRF_SECRET = originalEnv.REFRAME_CSRF_SECRET;
    process.env.SUPABASE_SERVICE_ROLE_KEY =
      originalEnv.SUPABASE_SERVICE_ROLE_KEY;
  });

  it("returns a raw CSRF token and sets only the HMAC cookie", async () => {
    process.env.REFRAME_CSRF_SECRET = "csrf_bootstrap_secret_32_characters";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "";

    const response = GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      ok: true,
      csrfToken: expect.stringMatching(/^v1\.[A-Za-z0-9_-]+\.\d+$/),
    });
    const setCookie = response.headers.get("set-cookie") ?? "";
    expect(setCookie).toContain("reframe_csrf=");
    expect(setCookie).toContain("HttpOnly");
    expect(setCookie).toContain("Secure");
    expect(setCookie).not.toContain(body.csrfToken);
  });
});
