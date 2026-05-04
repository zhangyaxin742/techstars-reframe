const { submitWaitlistEmail } = vi.hoisted(() => ({
  submitWaitlistEmail: vi.fn(),
}));

vi.mock("@/lib/waitlist/submit", async () => {
  const actual = await vi.importActual<typeof import("@/lib/waitlist/submit")>(
    "@/lib/waitlist/submit",
  );

  return {
    ...actual,
    submitWaitlistEmail,
  };
});

import { WaitlistProviderNotConfiguredError } from "@/lib/waitlist/submit";
import { resetWaitlistRateLimiter } from "@/lib/waitlist/rate-limit";
import { POST } from "./route";

describe("POST /api/waitlist", () => {
  beforeEach(() => {
    submitWaitlistEmail.mockReset();
    resetWaitlistRateLimiter();
  });

  it("rejects a missing company URL", async () => {
    const request = new Request("https://reframe.ai/api/waitlist", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: "founder@example.com",
        growthChallenge: "Need more distribution.",
      }),
    });

    const response = await POST(request);

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: "Enter a valid company URL.",
    });
  });

  it("normalizes the payload and stamps metadata before submitting", async () => {
    submitWaitlistEmail.mockResolvedValue(undefined);

    const request = new Request("https://reframe.ai/api/waitlist", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        referer: "https://reframe.ai/?utm_source=twitter",
      },
      body: JSON.stringify({
        email: " Founder@Example.com ",
        companyUrl: "acme.com",
        growthChallenge: " Need a repeatable content loop. ",
        metadata: {
          landingPage: "/?utm_source=twitter",
          utmSource: "twitter",
          utmMedium: "social",
          utmCampaign: "launch",
          referrer: "https://x.com/reframe",
        },
      }),
    });

    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(submitWaitlistEmail).toHaveBeenCalledWith({
      email: "founder@example.com",
      companyUrl: "https://acme.com/",
      growthChallenge: "Need a repeatable content loop.",
      metadata: {
        createdAt: expect.any(String),
        source: "reframe-landing",
        landingPage: "/?utm_source=twitter",
        utmSource: "twitter",
        utmMedium: "social",
        utmCampaign: "launch",
        referrer: "https://x.com/reframe",
      },
    }, {
      ipAddress: null,
      userAgent: null,
    });
  });

  it("returns 503 when the waitlist provider is not configured", async () => {
    submitWaitlistEmail.mockRejectedValue(
      new WaitlistProviderNotConfiguredError(),
    );

    const request = new Request("https://reframe.ai/api/waitlist", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: "founder@example.com",
        companyUrl: "https://acme.com",
        growthChallenge: "Need more qualified inbound demand.",
      }),
    });

    const response = await POST(request);

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: "Waitlist delivery is not configured yet.",
    });
  });

  it("treats filled honeypot fields as a silent success and skips submission", async () => {
    const request = new Request("https://reframe.ai/api/waitlist", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: "founder@example.com",
        companyUrl: "https://acme.com",
        growthChallenge: "Need more qualified inbound demand.",
        website: "https://spam.example",
      }),
    });

    const response = await POST(request);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });
    expect(submitWaitlistEmail).not.toHaveBeenCalled();
  });

  it("rate limits repeated attempts from the same email", async () => {
    submitWaitlistEmail.mockResolvedValue(undefined);

    const buildRequest = () =>
      new Request("https://reframe.ai/api/waitlist", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-forwarded-for": "203.0.113.10",
        },
        body: JSON.stringify({
          email: "founder@example.com",
          companyUrl: "https://acme.com",
          growthChallenge: "Need more qualified inbound demand.",
        }),
      });

    await POST(buildRequest());
    await POST(buildRequest());
    await POST(buildRequest());
    const response = await POST(buildRequest());

    expect(response.status).toBe(429);
    expect(submitWaitlistEmail).toHaveBeenCalledTimes(3);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: "Too many waitlist attempts. Please try again later.",
    });
  });
});
