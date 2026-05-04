import {
  WaitlistProviderNotConfiguredError,
  submitWaitlistEmail,
} from "./submit";

describe("submitWaitlistEmail", () => {
  const originalFetch = global.fetch;
  const originalEnv = {
    SUPABASE_URL: process.env.SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    WAITLIST_NOTIFICATION_FROM: process.env.WAITLIST_NOTIFICATION_FROM,
    WAITLIST_NOTIFICATION_TO: process.env.WAITLIST_NOTIFICATION_TO,
    WAITLIST_NOTIFICATION_REPLY_TO: process.env.WAITLIST_NOTIFICATION_REPLY_TO,
  };

  beforeEach(() => {
    process.env.SUPABASE_URL = "https://project.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_URL = "";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "supabase_service_role_key";
    process.env.RESEND_API_KEY = "re_test_key";
    process.env.WAITLIST_NOTIFICATION_FROM = "Reframe <waitlist@reframe.ai>";
    process.env.WAITLIST_NOTIFICATION_TO = "[email protected]";
    process.env.WAITLIST_NOTIFICATION_REPLY_TO = "[email protected]";
  });

  afterEach(() => {
    global.fetch = originalFetch;
    process.env.SUPABASE_URL = originalEnv.SUPABASE_URL;
    process.env.NEXT_PUBLIC_SUPABASE_URL = originalEnv.NEXT_PUBLIC_SUPABASE_URL;
    process.env.SUPABASE_SERVICE_ROLE_KEY = originalEnv.SUPABASE_SERVICE_ROLE_KEY;
    process.env.RESEND_API_KEY = originalEnv.RESEND_API_KEY;
    process.env.WAITLIST_NOTIFICATION_FROM =
      originalEnv.WAITLIST_NOTIFICATION_FROM;
    process.env.WAITLIST_NOTIFICATION_TO = originalEnv.WAITLIST_NOTIFICATION_TO;
    process.env.WAITLIST_NOTIFICATION_REPLY_TO =
      originalEnv.WAITLIST_NOTIFICATION_REPLY_TO;
  });

  it("persists the full signup to Supabase before notifying via Resend", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify([]), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      )
      .mockResolvedValueOnce(new Response(null, { status: 201 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ id: "email_123" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      )
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    global.fetch = fetchMock as typeof fetch;

    await submitWaitlistEmail(
      {
        email: "founder@example.com",
        companyUrl: "https://acme.com/",
        growthChallenge: "Repeatable top-of-funnel acquisition.",
        metadata: {
          createdAt: "2026-05-04T14:00:00.000Z",
          source: "reframe-landing",
          landingPage: "/",
          utmSource: "twitter",
          utmMedium: "social",
          utmCampaign: "launch",
          referrer: "https://x.com/reframe",
        },
      },
      {
        ipAddress: "203.0.113.10",
        userAgent: "Vitest Browser",
      },
    );

    expect(fetchMock).toHaveBeenCalledTimes(4);

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "https://project.supabase.co/rest/v1/waitlist_signups?select=first_submitted_at,submission_count&email=eq.founder%40example.com&limit=1",
      expect.objectContaining({
        headers: {
          apikey: "supabase_service_role_key",
          Authorization: "Bearer supabase_service_role_key",
        },
      }),
    );

    const upsertCall = fetchMock.mock.calls[1];
    expect(upsertCall?.[0]).toBe(
      "https://project.supabase.co/rest/v1/waitlist_signups?on_conflict=email",
    );
    expect(upsertCall?.[1]).toEqual(
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          apikey: "supabase_service_role_key",
          Authorization: "Bearer supabase_service_role_key",
          "Content-Type": "application/json",
          Prefer: "resolution=merge-duplicates,return=minimal",
        }),
      }),
    );
    expect(JSON.parse(String(upsertCall?.[1]?.body))).toEqual(
      expect.objectContaining({
        email: "founder@example.com",
        company_url: "https://acme.com/",
        growth_challenge: "Repeatable top-of-funnel acquisition.",
        source: "reframe-landing",
        landing_page: "/",
        utm_source: "twitter",
        utm_medium: "social",
        utm_campaign: "launch",
        referrer: "https://x.com/reframe",
        first_submitted_at: "2026-05-04T14:00:00.000Z",
        last_submitted_at: "2026-05-04T14:00:00.000Z",
        submission_count: 1,
        user_agent: "Vitest Browser",
        notification_status: "pending",
      }),
    );

    const resendCall = fetchMock.mock.calls[2];
    expect(resendCall?.[0]).toBe("https://api.resend.com/emails");
    expect(resendCall?.[1]).toEqual(
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer re_test_key",
          "Content-Type": "application/json",
          "Idempotency-Key": expect.stringContaining("waitlist-signup/"),
        }),
      }),
    );
    expect(JSON.parse(String(resendCall?.[1]?.body))).toEqual(
      expect.objectContaining({
        from: "Reframe <waitlist@reframe.ai>",
        to: ["[email protected]"],
        subject: "New waitlist signup: founder@example.com",
        reply_to: "[email protected]",
      }),
    );

    const notificationUpdateCall = fetchMock.mock.calls[3];
    expect(notificationUpdateCall?.[0]).toBe(
      "https://project.supabase.co/rest/v1/waitlist_signups?email=eq.founder%40example.com",
    );
    expect(notificationUpdateCall?.[1]).toEqual(
      expect.objectContaining({
        method: "PATCH",
        headers: expect.objectContaining({
          Prefer: "return=minimal",
        }),
      }),
    );
    expect(JSON.parse(String(notificationUpdateCall?.[1]?.body))).toEqual({
      notification_status: "sent",
      notification_error: null,
      notification_email_id: "email_123",
      notified_at: expect.any(String),
    });
  });

  it("records the failure in Supabase when the Resend notification fails", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify([]), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      )
      .mockResolvedValueOnce(new Response(null, { status: 201 }))
      .mockResolvedValueOnce(new Response("resend exploded", { status: 500 }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    global.fetch = fetchMock as typeof fetch;

    await expect(
      submitWaitlistEmail(
        {
          email: "founder@example.com",
          companyUrl: "https://acme.com/",
          growthChallenge: "Repeatable top-of-funnel acquisition.",
          metadata: {
            createdAt: "2026-05-04T14:00:00.000Z",
            source: "reframe-landing",
            landingPage: "/",
          },
        },
        {
          ipAddress: "203.0.113.10",
          userAgent: null,
        },
      ),
    ).resolves.toBeUndefined();

    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(fetchMock).toHaveBeenNthCalledWith(
      4,
      "https://project.supabase.co/rest/v1/waitlist_signups?email=eq.founder%40example.com",
      expect.objectContaining({
        method: "PATCH",
      }),
    );
    expect(JSON.parse(String(fetchMock.mock.calls[3]?.[1]?.body))).toEqual({
      notification_status: "failed",
      notification_error: "resend exploded",
      notification_email_id: null,
      notified_at: null,
    });
  });

  it("throws when Supabase env vars are missing", async () => {
    process.env.SUPABASE_SERVICE_ROLE_KEY = "";

    await expect(
      submitWaitlistEmail(
        {
          email: "founder@example.com",
          companyUrl: "https://acme.com/",
          growthChallenge: "Repeatable top-of-funnel acquisition.",
          metadata: {
            createdAt: "2026-05-04T14:00:00.000Z",
            source: "reframe-landing",
            landingPage: "/",
          },
        },
        {
          ipAddress: null,
          userAgent: null,
        },
      ),
    ).rejects.toBeInstanceOf(WaitlistProviderNotConfiguredError);
  });
});
