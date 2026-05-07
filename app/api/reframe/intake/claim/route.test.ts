import { POST } from "./route";

import {
  hashIntakeDraftToken,
  REFRAME_INTAKE_DRAFT_COOKIE,
} from "@/lib/reframe/intake/draft-cookie";
import { hashIntakeEmail } from "@/lib/reframe/intake/email";
import { resetIntakeRateLimiter } from "@/lib/reframe/intake/rate-limit";
import {
  issueCsrfToken,
  REFRAME_CSRF_COOKIE,
  REFRAME_CSRF_HEADER,
} from "@/lib/security/csrf";
import { createSupabaseRouteClient } from "@/lib/supabase/route";

vi.mock("@/lib/supabase/route", () => ({
  createSupabaseRouteClient: vi.fn(),
}));

const CSRF_SECRET = "csrf_claim_test_secret_32_characters";
const SERVICE_ROLE_KEY = "service_role_key_32_characters_min";
const DRAFT_TOKEN = "claim_draft_token_abcdefghijklmnopqrstuvwxyz0123456789";
const EXPIRES_AT = "2026-05-08T12:00:00.000Z";

const getClaimsMock = vi.fn();
const getUserMock = vi.fn();
const rpcMock = vi.fn();
const createRouteClientMock = vi.mocked(createSupabaseRouteClient);

describe("intake claim route", () => {
  const originalFetch = global.fetch;
  const originalEnv = {
    SUPABASE_URL: process.env.SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    REFRAME_CSRF_SECRET: process.env.REFRAME_CSRF_SECRET,
    REFRAME_DRAFT_TOKEN_SECRET: process.env.REFRAME_DRAFT_TOKEN_SECRET,
    REFRAME_EMAIL_HASH_SECRET: process.env.REFRAME_EMAIL_HASH_SECRET,
  };

  beforeEach(() => {
    resetIntakeRateLimiter();
    process.env.SUPABASE_URL = "https://project.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://project.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "publishable_key";
    process.env.SUPABASE_SERVICE_ROLE_KEY = SERVICE_ROLE_KEY;
    process.env.REFRAME_CSRF_SECRET = CSRF_SECRET;
    process.env.REFRAME_DRAFT_TOKEN_SECRET = SERVICE_ROLE_KEY;
    process.env.REFRAME_EMAIL_HASH_SECRET = SERVICE_ROLE_KEY;
    getClaimsMock.mockResolvedValue({
      data: {
        claims: {
          sub: "user_123",
        },
      },
      error: null,
    });
    getUserMock.mockResolvedValue({
      data: {
        user: {
          email: "founder@example.com",
        },
      },
      error: null,
    });
    rpcMock.mockResolvedValue({
      data: [
        {
          workspace_slug: "my-workspace",
          project_slug: "campaign-abc123",
          reused_existing_project: true,
        },
      ],
      error: null,
    });
    createRouteClientMock.mockReturnValue({
      supabase: {
        auth: {
          getClaims: getClaimsMock,
          getUser: getUserMock,
        },
        rpc: rpcMock,
      },
      applyToResponse(response) {
        return response;
      },
    } as unknown as ReturnType<typeof createSupabaseRouteClient>);
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.clearAllMocks();
    process.env.SUPABASE_URL = originalEnv.SUPABASE_URL;
    process.env.NEXT_PUBLIC_SUPABASE_URL = originalEnv.NEXT_PUBLIC_SUPABASE_URL;
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY =
      originalEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    process.env.SUPABASE_SERVICE_ROLE_KEY =
      originalEnv.SUPABASE_SERVICE_ROLE_KEY;
    process.env.REFRAME_CSRF_SECRET = originalEnv.REFRAME_CSRF_SECRET;
    process.env.REFRAME_DRAFT_TOKEN_SECRET =
      originalEnv.REFRAME_DRAFT_TOKEN_SECRET;
    process.env.REFRAME_EMAIL_HASH_SECRET =
      originalEnv.REFRAME_EMAIL_HASH_SECRET;
  });

  it("claims a valid draft for the current authenticated user", async () => {
    const draftTokenHash = hashIntakeDraftToken(DRAFT_TOKEN, SERVICE_ROLE_KEY);
    const emailHash = hashIntakeEmail("founder@example.com", SERVICE_ROLE_KEY);
    const fetchMock = vi.fn().mockResolvedValueOnce(restoredDraftResponse());
    global.fetch = fetchMock as typeof fetch;

    const response = await POST(buildClaimRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      ok: true,
      redirectTo: "/app/my-workspace/projects/campaign-abc123",
      project: {
        workspaceSlug: "my-workspace",
        projectSlug: "campaign-abc123",
        reusedExistingProject: true,
      },
    });
    expect(getClaimsMock).toHaveBeenCalled();
    expect(rpcMock).toHaveBeenCalledWith("claim_intake_draft", {
      p_token_hash: draftTokenHash,
      p_email_display: "founder@example.com",
      p_email_hash: emailHash,
      p_workspace_name: "My Workspace",
    });
    expect(response.headers.get("set-cookie")).toContain(
      `${REFRAME_INTAKE_DRAFT_COOKIE}=;`,
    );
  });

  it("returns auth required before claim when the session is missing", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(restoredDraftResponse());
    global.fetch = fetchMock as typeof fetch;
    getClaimsMock.mockResolvedValueOnce({
      data: {
        claims: null,
      },
      error: null,
    });

    const response = await POST(buildClaimRequest());
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body).toEqual({
      ok: false,
      state: "auth_required",
    });
    expect(rpcMock).not.toHaveBeenCalled();
  });
});

function buildClaimRequest() {
  const csrf = issueCsrfToken({
    secret: CSRF_SECRET,
    randomBytesFn: (size) => Buffer.alloc(size, 10),
  });

  return new Request("https://app.example.com/api/reframe/intake/claim", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: [
        `${REFRAME_CSRF_COOKIE}=${encodeURIComponent(csrf.cookie.value)}`,
        `${REFRAME_INTAKE_DRAFT_COOKIE}=${encodeURIComponent(DRAFT_TOKEN)}`,
      ].join("; "),
      host: "app.example.com",
      origin: "https://app.example.com",
      "sec-fetch-site": "same-origin",
      "x-forwarded-for": "203.0.113.10",
      [REFRAME_CSRF_HEADER]: csrf.token,
    },
    body: JSON.stringify({}),
  });
}

function restoredDraftResponse() {
  return new Response(
    JSON.stringify([
      {
        status: "draft",
        business_url: "https://petiteoutdoors.com/",
        product_url: null,
        campaign_goal: "Open preorders.",
        founder_note: "",
        source_references: [],
        expires_at: EXPIRES_AT,
      },
    ]),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    },
  );
}
