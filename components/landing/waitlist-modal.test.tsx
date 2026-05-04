import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { WaitlistModal } from "./waitlist-modal";

describe("WaitlistModal", () => {
  const originalFetch = global.fetch;
  const onOpenChange = vi.fn();

  beforeEach(() => {
    onOpenChange.mockReset();
    window.history.replaceState({}, "", "/?utm_source=twitter&utm_medium=social&utm_campaign=launch");
    Object.defineProperty(document, "referrer", {
      configurable: true,
      value: "https://x.com/reframe_launch",
    });
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("requires company URL and growth challenge before submitting", async () => {
    const user = userEvent.setup();

    render(<WaitlistModal open onOpenChange={onOpenChange} />);

    await user.type(screen.getByPlaceholderText("Email address"), "founder@example.com");
    await user.click(screen.getByRole("button", { name: "Join waitlist" }));

    expect(screen.getByText("Enter your company URL.")).toBeInTheDocument();
  });

  it("submits qualification fields and tracking metadata", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true }),
    });
    global.fetch = fetchMock as typeof fetch;

    render(<WaitlistModal open onOpenChange={onOpenChange} />);

    await user.type(screen.getByPlaceholderText("Email address"), "founder@example.com");
    await user.type(screen.getByPlaceholderText("https://company.com"), "acme.com");
    await user.type(
      screen.getByPlaceholderText(/What is hardest right now/i),
      "We have product-market fit but no repeatable acquisition motion.",
    );
    await user.click(screen.getByRole("button", { name: "Join waitlist" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/waitlist",
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: "founder@example.com",
            companyUrl: "acme.com",
            growthChallenge:
              "We have product-market fit but no repeatable acquisition motion.",
            metadata: {
              landingPage: "/?utm_source=twitter&utm_medium=social&utm_campaign=launch",
              utmSource: "twitter",
              utmMedium: "social",
              utmCampaign: "launch",
              referrer: "https://x.com/reframe_launch",
            },
          }),
        }),
      );
    });
    expect(
      screen.getByText(/You're in! In the meantime, try our/i),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "demo" })).toHaveAttribute(
      "href",
      "https://use-reframe.com/demo",
    );
  });
});
