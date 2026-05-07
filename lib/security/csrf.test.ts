import {
  CSRF_MAX_AGE_SECONDS,
  issueCsrfToken,
  REFRAME_CSRF_COOKIE,
  REFRAME_CSRF_HEADER,
  readCsrfSecret,
  verifyCsrfRequest,
  verifyCsrfToken,
} from "./csrf";

const SECRET = "csrf_test_secret_32_characters_minimum";
const NOW = new Date("2026-05-07T12:00:00.000Z");

function issueFixedToken() {
  return issueCsrfToken({
    secret: SECRET,
    now: NOW,
    randomBytesFn: (size) => Buffer.alloc(size, 7),
  });
}

function buildRequest(headers: HeadersInit = {}) {
  const issued = issueFixedToken();

  return new Request("https://app.example.com/api/reframe/intake/drafts", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: `${REFRAME_CSRF_COOKIE}=${encodeURIComponent(issued.cookie.value)}`,
      host: "app.example.com",
      origin: "https://app.example.com",
      "sec-fetch-site": "same-origin",
      [REFRAME_CSRF_HEADER]: issued.token,
      ...headers,
    },
  });
}

describe("CSRF helpers", () => {
  const originalEnv = {
    REFRAME_CSRF_SECRET: process.env.REFRAME_CSRF_SECRET,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  };

  afterEach(() => {
    process.env.REFRAME_CSRF_SECRET = originalEnv.REFRAME_CSRF_SECRET;
    process.env.SUPABASE_SERVICE_ROLE_KEY =
      originalEnv.SUPABASE_SERVICE_ROLE_KEY;
  });

  it("issues a raw token plus an HttpOnly HMAC cookie", () => {
    const issued = issueFixedToken();

    expect(issued.token).toMatch(/^v1\.[A-Za-z0-9_-]+\.\d+$/);
    expect(issued.cookie).toEqual({
      name: REFRAME_CSRF_COOKIE,
      value: expect.stringMatching(/^v1\.\d+\.[A-Za-z0-9_-]+$/),
      options: {
        httpOnly: true,
        secure: true,
        sameSite: "lax",
        path: "/",
        maxAge: CSRF_MAX_AGE_SECONDS,
      },
    });
    expect(issued.cookie.value).not.toContain(issued.token);
  });

  it("verifies a matching token and cookie pair", () => {
    const issued = issueFixedToken();

    expect(
      verifyCsrfToken({
        token: issued.token,
        cookieValue: issued.cookie.value,
        secret: SECRET,
        now: NOW,
      }),
    ).toEqual({ ok: true });
  });

  it("rejects missing, malformed, mismatched, and expired token pairs", () => {
    const issued = issueFixedToken();

    expect(
      verifyCsrfToken({
        token: null,
        cookieValue: issued.cookie.value,
        secret: SECRET,
        now: NOW,
      }),
    ).toMatchObject({ ok: false, code: "csrf_missing_token" });

    expect(
      verifyCsrfToken({
        token: "broken",
        cookieValue: issued.cookie.value,
        secret: SECRET,
        now: NOW,
      }),
    ).toMatchObject({ ok: false, code: "csrf_invalid_token" });

    expect(
      verifyCsrfToken({
        token: issued.token,
        cookieValue: issueCsrfToken({
          secret: "different_test_secret_32_characters",
          now: NOW,
          randomBytesFn: (size) => Buffer.alloc(size, 9),
        }).cookie.value,
        secret: SECRET,
        now: NOW,
      }),
    ).toMatchObject({ ok: false, code: "csrf_invalid_token" });

    expect(
      verifyCsrfToken({
        token: issued.token,
        cookieValue: issued.cookie.value,
        secret: SECRET,
        now: new Date(NOW.getTime() + (CSRF_MAX_AGE_SECONDS + 1) * 1_000),
      }),
    ).toMatchObject({ ok: false, code: "csrf_expired" });
  });

  it("validates the full mutating request contract", () => {
    expect(verifyCsrfRequest(buildRequest(), { secret: SECRET, now: NOW })).toEqual({
      ok: true,
    });
  });

  it("accepts a matching x-forwarded-host behind a proxy", () => {
    const request = buildRequest({
      host: "internal.vercel.app",
      "x-forwarded-host": "app.example.com",
    });

    expect(verifyCsrfRequest(request, { secret: SECRET, now: NOW })).toEqual({
      ok: true,
    });
  });

  it("rejects invalid method, content type, origin, fetch site, token, and cookie", () => {
    expect(
      verifyCsrfRequest(
        new Request("https://app.example.com/api/reframe/intake/drafts", {
          method: "GET",
        }),
        { secret: SECRET, now: NOW },
      ),
    ).toMatchObject({ ok: false, status: 405, code: "csrf_method_not_allowed" });

    expect(
      verifyCsrfRequest(buildRequest({ "content-type": "text/plain" }), {
        secret: SECRET,
        now: NOW,
      }),
    ).toMatchObject({
      ok: false,
      status: 415,
      code: "csrf_invalid_content_type",
    });

    expect(
      verifyCsrfRequest(buildRequest({ origin: "https://evil.example" }), {
        secret: SECRET,
        now: NOW,
      }),
    ).toMatchObject({ ok: false, status: 403, code: "csrf_invalid_origin" });

    expect(
      verifyCsrfRequest(buildRequest({ "sec-fetch-site": "cross-site" }), {
        secret: SECRET,
        now: NOW,
      }),
    ).toMatchObject({
      ok: false,
      status: 403,
      code: "csrf_invalid_fetch_site",
    });

    expect(
      verifyCsrfRequest(buildRequest({ [REFRAME_CSRF_HEADER]: "" }), {
        secret: SECRET,
        now: NOW,
      }),
    ).toMatchObject({ ok: false, status: 403, code: "csrf_missing_token" });

    expect(
      verifyCsrfRequest(buildRequest({ cookie: "other=value" }), {
        secret: SECRET,
        now: NOW,
      }),
    ).toMatchObject({ ok: false, status: 403, code: "csrf_missing_cookie" });
  });

  it("reads a dedicated CSRF secret before falling back to the service role key", () => {
    process.env.REFRAME_CSRF_SECRET = SECRET;
    process.env.SUPABASE_SERVICE_ROLE_KEY = "";
    expect(readCsrfSecret()).toBe(SECRET);

    process.env.REFRAME_CSRF_SECRET = "";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service_role_key_32_characters_minimum";
    expect(readCsrfSecret()).toBe("service_role_key_32_characters_minimum");

    process.env.SUPABASE_SERVICE_ROLE_KEY = "too-short";
    expect(() => readCsrfSecret()).toThrow(
      "Set REFRAME_CSRF_SECRET or a 32+ character SUPABASE_SERVICE_ROLE_KEY",
    );
  });
});
