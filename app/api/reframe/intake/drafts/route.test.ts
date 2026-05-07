import { GET as restoreDraft } from "../draft/route";
import { POST } from "./route";

import {
  hashIntakeDraftToken,
  REFRAME_INTAKE_DRAFT_COOKIE,
} from "@/lib/reframe/intake/draft-cookie";
import { resetIntakeRateLimiter } from "@/lib/reframe/intake/rate-limit";
import {
  issueCsrfToken,
  REFRAME_CSRF_COOKIE,
  REFRAME_CSRF_HEADER,
} from "@/lib/security/csrf";

const CSRF_SECRET = "csrf_route_test_secret_32_characters";
const SERVICE_ROLE_KEY = "service_role_key_32_characters_min";
const NOW = "2026-05-07T12:00:00.000Z";
const EXPIRES_AT = "2026-05-08T12:00:00.000Z";
const EXISTING_DRAFT_TOKEN =
  "existing_draft_token_abcdefghijklmnopqrstuvwxyz0123456789";

describe("intake draft routes", () => {
  const originalFetch = global.fetch;
  const originalEnv = {
    SUPABASE_URL: process.env.SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    REFRAME_CSRF_SECRET: process.env.REFRAME_CSRF_SECRET,
    REFRAME_DRAFT_TOKEN_SECRET: process.env.REFRAME_DRAFT_TOKEN_SECRET,
  };

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(NOW));
    resetIntakeRateLimiter();
    process.env.SUPABASE_URL = "https://project.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_URL = "";
    process.env.SUPABASE_SERVICE_ROLE_KEY = SERVICE_ROLE_KEY;
    process.env.REFRAME_CSRF_SECRET = CSRF_SECRET;
    process.env.REFRAME_DRAFT_TOKEN_SECRET = SERVICE_ROLE_KEY;
  });

  afterEach(() => {
    vi.useRealTimers();
    global.fetch = originalFetch;
    process.env.SUPABASE_URL = originalEnv.SUPABASE_URL;
    process.env.NEXT_PUBLIC_SUPABASE_URL = originalEnv.NEXT_PUBLIC_SUPABASE_URL;
    process.env.SUPABASE_SERVICE_ROLE_KEY =
      originalEnv.SUPABASE_SERVICE_ROLE_KEY;
    process.env.REFRAME_CSRF_SECRET = originalEnv.REFRAME_CSRF_SECRET;
    process.env.REFRAME_DRAFT_TOKEN_SECRET =
      originalEnv.REFRAME_DRAFT_TOKEN_SECRET;
  });

  it("creates a draft, stores only a token hash, and sets the secure draft cookie", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse([]))
      .mockResolvedValueOnce(
        jsonResponse([
          {
            id: "draft_1",
            status: "draft",
            expires_at: EXPIRES_AT,
          },
        ]),
      );
    global.fetch = fetchMock as typeof fetch;

    const response = await POST(buildDraftRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      ok: true,
      state: "draft_saved",
      expiresAt: EXPIRES_AT,
    });

    const setCookie = response.headers.get("set-cookie") ?? "";
    expect(setCookie).toContain(`${REFRAME_INTAKE_DRAFT_COOKIE}=`);
    expect(setCookie).toContain("HttpOnly");
    expect(setCookie).toContain("Secure");
    expect(setCookie.toLowerCase()).toContain("samesite=lax");
    expect(setCookie).toContain("Path=/");

    const insertCall = fetchMock.mock.calls[1];
    expect(insertCall?.[0]).toBe("https://project.supabase.co/rest/v1/intake_drafts");
    expect(insertCall?.[1]).toEqual(
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
          Prefer: "return=representation",
        }),
      }),
    );

    const insertBody = JSON.parse(String(insertCall?.[1]?.body));
    expect(insertBody.token_hash).toMatch(/^[a-f0-9]{64}$/);
    expect(insertBody.token_hash).not.toContain(REFRAME_INTAKE_DRAFT_COOKIE);
    expect(insertBody).toEqual(
      expect.objectContaining({
        status: "draft",
        business_url: "https://petiteoutdoors.com/",
        product_url: "https://petiteoutdoors.com/products/trail-pants",
        campaign_goal: "Open preorders for petite hiking pants.",
        founder_note: "Customers keep asking for shorter inseams.",
        source_references: [
          {
            label: "Launch post",
            url: "https://example.com/post",
          },
        ],
      }),
    );
  });

  it("updates an existing unexpired draft when a valid draft cookie is present", async () => {
    const tokenHash = hashIntakeDraftToken(EXISTING_DRAFT_TOKEN, SERVICE_ROLE_KEY);
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse([
          {
            id: "draft_existing",
            status: "draft",
            expires_at: EXPIRES_AT,
          },
        ]),
      )
      .mockResolvedValueOnce(
        jsonResponse([
          {
            id: "draft_existing",
            status: "draft",
            expires_at: EXPIRES_AT,
          },
        ]),
      );
    global.fetch = fetchMock as typeof fetch;

    const response = await POST(
      buildDraftRequest({
        draftCookie: EXISTING_DRAFT_TOKEN,
      }),
    );

    expect(response.status).toBe(200);
    expect(fetchMock.mock.calls[0]?.[0]).toContain(
      `token_hash=eq.${encodeURIComponent(tokenHash)}`,
    );
    expect(fetchMock.mock.calls[1]?.[0]).toBe(
      `https://project.supabase.co/rest/v1/intake_drafts?token_hash=eq.${encodeURIComponent(tokenHash)}`,
    );
    expect(fetchMock.mock.calls[1]?.[1]).toEqual(
      expect.objectContaining({
        method: "PATCH",
      }),
    );
  });

  it("rejects missing CSRF before calling Supabase", async () => {
    const fetchMock = vi.fn();
    global.fetch = fetchMock as typeof fetch;

    const response = await POST(
      new Request("https://app.example.com/api/reframe/intake/drafts", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          host: "app.example.com",
          origin: "https://app.example.com",
        },
        body: JSON.stringify(validDraftPayload()),
      }),
    );

    expect(response.status).toBe(403);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects invalid intake fields before calling Supabase", async () => {
    const fetchMock = vi.fn();
    global.fetch = fetchMock as typeof fetch;

    const response = await POST(
      buildDraftRequest({
        body: {
          businessUrl: "ftp://example.com",
          campaignGoal: "",
          founderNote: "",
          sourceReferences: [],
        },
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.fields).toEqual(
      expect.objectContaining({
        businessUrl: "Only http and https URLs are supported.",
        campaignGoal: "This field is required.",
      }),
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns expired and clears the draft cookie when the draft is stale", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse([
          {
            id: "draft_expired",
            status: "draft",
            expires_at: "2026-05-06T12:00:00.000Z",
          },
        ]),
      )
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    global.fetch = fetchMock as typeof fetch;

    const response = await POST(
      buildDraftRequest({
        draftCookie: EXISTING_DRAFT_TOKEN,
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(410);
    expect(body).toEqual({
      ok: false,
      state: "expired",
      expiresAt: "2026-05-06T12:00:00.000Z",
    });
    expect(response.headers.get("set-cookie")).toContain(
      `${REFRAME_INTAKE_DRAFT_COOKIE}=;`,
    );
  });

  it("restores only minimum safe draft fields", async () => {
    const tokenHash = hashIntakeDraftToken(EXISTING_DRAFT_TOKEN, SERVICE_ROLE_KEY);
    const fetchMock = vi.fn().mockResolvedValueOnce(
      jsonResponse([
        {
          status: "verification_pending",
          business_url: "https://petiteoutdoors.com/",
          product_url: "https://petiteoutdoors.com/products/trail-pants",
          campaign_goal: "Open preorders.",
          founder_note: "Founder note.",
          source_references: [{ label: "Post" }],
          expires_at: EXPIRES_AT,
          token_hash: "must_not_leak",
          claimed_project_id: "must_not_leak",
        },
      ]),
    );
    global.fetch = fetchMock as typeof fetch;

    const response = await restoreDraft(
      new Request("https://app.example.com/api/reframe/intake/draft", {
        headers: {
          cookie: `${REFRAME_INTAKE_DRAFT_COOKIE}=${encodeURIComponent(
            EXISTING_DRAFT_TOKEN,
          )}`,
        },
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      `https://project.supabase.co/rest/v1/intake_drafts?select=status,business_url,product_url,campaign_goal,founder_note,source_references,expires_at&token_hash=eq.${encodeURIComponent(tokenHash)}&limit=1`,
    );
    expect(body).toEqual({
      ok: true,
      state: "verification_pending",
      draft: {
        status: "verification_pending",
        businessUrl: "https://petiteoutdoors.com/",
        productUrl: "https://petiteoutdoors.com/products/trail-pants",
        campaignGoal: "Open preorders.",
        founderNote: "Founder note.",
        sourceReferences: [{ label: "Post" }],
        expiresAt: EXPIRES_AT,
      },
    });
    expect(JSON.stringify(body)).not.toContain("token_hash");
    expect(JSON.stringify(body)).not.toContain("claimed_project_id");
  });

  it("clears the draft cookie when restore finds an expired draft", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse([
          {
            status: "draft",
            business_url: "https://petiteoutdoors.com/",
            product_url: null,
            campaign_goal: "Open preorders.",
            founder_note: "",
            source_references: [],
            expires_at: "2026-05-06T12:00:00.000Z",
          },
        ]),
      )
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    global.fetch = fetchMock as typeof fetch;

    const response = await restoreDraft(
      new Request("https://app.example.com/api/reframe/intake/draft", {
        headers: {
          cookie: `${REFRAME_INTAKE_DRAFT_COOKIE}=${encodeURIComponent(
            EXISTING_DRAFT_TOKEN,
          )}`,
        },
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(410);
    expect(body).toEqual({
      ok: false,
      state: "expired",
      expiresAt: "2026-05-06T12:00:00.000Z",
    });
    expect(response.headers.get("set-cookie")).toContain(
      `${REFRAME_INTAKE_DRAFT_COOKIE}=;`,
    );
  });
});

function buildDraftRequest(input: {
  body?: Record<string, unknown>;
  draftCookie?: string;
} = {}) {
  const csrf = issueCsrfToken({
    secret: CSRF_SECRET,
    now: new Date(NOW),
    randomBytesFn: (size) => Buffer.alloc(size, 7),
  });
  const cookies = [
    `${REFRAME_CSRF_COOKIE}=${encodeURIComponent(csrf.cookie.value)}`,
  ];

  if (input.draftCookie) {
    cookies.push(
      `${REFRAME_INTAKE_DRAFT_COOKIE}=${encodeURIComponent(input.draftCookie)}`,
    );
  }

  return new Request("https://app.example.com/api/reframe/intake/drafts", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: cookies.join("; "),
      host: "app.example.com",
      origin: "https://app.example.com",
      "sec-fetch-site": "same-origin",
      "x-forwarded-for": "203.0.113.10",
      [REFRAME_CSRF_HEADER]: csrf.token,
    },
    body: JSON.stringify(input.body ?? validDraftPayload()),
  });
}

function validDraftPayload() {
  return {
    businessUrl: "petiteoutdoors.com",
    productUrl: "https://petiteoutdoors.com/products/trail-pants#reviews",
    campaignGoal: "Open preorders for petite hiking pants.",
    founderNote: "Customers keep asking for shorter inseams.",
    sourceReferences: [
      {
        label: "Launch post",
        url: "example.com/post",
      },
    ],
  };
}

function jsonResponse(value: unknown, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: {
      "Content-Type": "application/json",
    },
  });
}
