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
    await user.click(screen.getByRole("button", { name: "Join the waitlist" }));

    expect(screen.getByText("Enter your company URL.")).toBeInTheDocument();
  });

  it("rejects invalid email before submitting", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn();
    global.fetch = fetchMock as typeof fetch;

    render(<WaitlistModal open onOpenChange={onOpenChange} />);

    await user.type(screen.getByPlaceholderText("Email address"), "founder");
    await user.type(screen.getByPlaceholderText("https://company.com"), "acme.com");
    await user.selectOptions(
      screen.getByLabelText("Biggest growth challenge"),
      "distribution",
    );
    await user.click(screen.getByRole("button", { name: "Join the waitlist" }));

    expect(screen.getByText("Enter a valid email address.")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("prefills the email field from the landing form", () => {
    render(
      <WaitlistModal
        open
        onOpenChange={onOpenChange}
        initialEmail="founder@example.com"
      />,
    );

    expect(screen.getByPlaceholderText("Email address")).toHaveValue(
      "founder@example.com",
    );
  });

  it("submits selected growth challenge and tracking metadata", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true }),
    });
    global.fetch = fetchMock as typeof fetch;

    render(<WaitlistModal open onOpenChange={onOpenChange} />);

    await user.type(screen.getByPlaceholderText("Email address"), "founder@example.com");
    await user.type(screen.getByPlaceholderText("https://company.com"), "acme.com");
    await user.selectOptions(
      screen.getByLabelText("Biggest growth challenge"),
      "distribution",
    );
    await user.click(screen.getByRole("button", { name: "Join the waitlist" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/waitlist",
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: "founder@example.com",
            companyUrl: "acme.com",
            growthChallenge: "distribution",
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
      screen.getByText(/You're on the list. We'll reach out when your early access spot opens./i),
    ).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "demo" })).not.toBeInTheDocument();
  });

  it("shows a detail field for something else and submits the entered challenge", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true }),
    });
    global.fetch = fetchMock as typeof fetch;

    render(<WaitlistModal open onOpenChange={onOpenChange} />);

    await user.type(screen.getByPlaceholderText("Email address"), "founder@example.com");
    await user.type(screen.getByPlaceholderText("https://company.com"), "acme.com");
    await user.selectOptions(
      screen.getByLabelText("Biggest growth challenge"),
      "something else",
    );
    await user.type(
      screen.getByPlaceholderText("Tell us what is getting in the way."),
      "We need to understand which creator partners can convert.",
    );
    await user.click(screen.getByRole("button", { name: "Join the waitlist" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/waitlist",
        expect.objectContaining({
          body: JSON.stringify({
            email: "founder@example.com",
            companyUrl: "acme.com",
            growthChallenge:
              "We need to understand which creator partners can convert.",
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
  });
});
