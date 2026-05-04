import {
  WaitlistProviderNotConfiguredError,
  submitWaitlistEmail,
} from "./submit";

describe("submitWaitlistEmail", () => {
  const originalFetch = global.fetch;
  const originalEnv = {
    WAITLIST_PROVIDER: process.env.WAITLIST_PROVIDER,
    LOOPS_API_KEY: process.env.LOOPS_API_KEY,
    LOOPS_WAITLIST_LIST_ID: process.env.LOOPS_WAITLIST_LIST_ID,
  };

  beforeEach(() => {
    process.env.WAITLIST_PROVIDER = "loops";
    process.env.LOOPS_API_KEY = "loops_test_key";
    process.env.LOOPS_WAITLIST_LIST_ID = "list_123";
  });

  afterEach(() => {
    global.fetch = originalFetch;
    process.env.WAITLIST_PROVIDER = originalEnv.WAITLIST_PROVIDER;
    process.env.LOOPS_API_KEY = originalEnv.LOOPS_API_KEY;
    process.env.LOOPS_WAITLIST_LIST_ID = originalEnv.LOOPS_WAITLIST_LIST_ID;
  });

  it("uses the Loops update endpoint so repeated submits stay idempotent", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => "",
    });
    global.fetch = fetchMock as typeof fetch;

    await submitWaitlistEmail({
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
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://app.loops.so/api/v1/contacts/update",
      {
        method: "PUT",
        headers: {
          Authorization: "Bearer loops_test_key",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: "founder@example.com",
          companyUrl: "https://acme.com/",
          growthChallenge: "Repeatable top-of-funnel acquisition.",
          createdAt: "2026-05-04T14:00:00.000Z",
          source: "reframe-landing",
          landingPage: "/",
          utmSource: "twitter",
          utmMedium: "social",
          utmCampaign: "launch",
          referrer: "https://x.com/reframe",
          mailingLists: {
            list_123: true,
          },
        }),
        cache: "no-store",
      },
    );
  });

  it("throws when Loops env vars are missing", async () => {
    process.env.LOOPS_API_KEY = "";

    await expect(
      submitWaitlistEmail({
        email: "founder@example.com",
        companyUrl: "https://acme.com/",
        growthChallenge: "Repeatable top-of-funnel acquisition.",
        metadata: {
          createdAt: "2026-05-04T14:00:00.000Z",
          source: "reframe-landing",
          landingPage: "/",
        },
      }),
    ).rejects.toBeInstanceOf(WaitlistProviderNotConfiguredError);
  });
});
