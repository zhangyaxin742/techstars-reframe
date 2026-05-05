import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { Hero } from "./hero";

const mockPush = vi.fn();
const originalFetch = global.fetch;

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

describe("Hero", () => {
  beforeEach(() => {
    mockPush.mockClear();
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("renders the scrollable landing page with video background and demo preview", () => {
    const { container } = render(<Hero />);

    expect(screen.getByTestId("landing-background")).toBeInTheDocument();
    expect(screen.getByTestId("landing-background-fallback")).toBeInTheDocument();
    expect(screen.getByTestId("landing-background-video")).not.toHaveAttribute("loop");
    expect(container.querySelector('source[src="/assets/landing-video.mp4"]')).toBeInTheDocument();
    expect(container.querySelector('video[poster="/assets/landing.png"]')).toBeInTheDocument();
    expect(container.querySelector('img[src="/assets/start-frame.png"]')).not.toBeInTheDocument();
    expect(screen.queryByTestId("landing-intake-chat")).not.toBeInTheDocument();
    expect(screen.getByPlaceholderText("Enter your email")).toBeInTheDocument();
    expect(screen.getByTestId("landing-demo-card")).toBeInTheDocument();
    expect(screen.getByTestId("landing-demo-poster")).toBeInTheDocument();
    expect(screen.getByTestId("landing-demo-video")).toBeInTheDocument();
    expect(container.querySelector('source[src="/assets/demo-4k-optimized.mp4"]')).toBeInTheDocument();
    expect(container.querySelector('source[src="/assets/demo_video.mp4"]')).toBeInTheDocument();
    expect(container.querySelector('video[poster="/assets/demo-4k-poster.jpg"]')).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Play demo video" })).toBeInTheDocument();
    expect(screen.queryByText("Play demo")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Join the waitlist" })).toBeInTheDocument();
  });

  it("opens the waitlist modal with the entered email", async () => {
    const user = userEvent.setup();

    render(<Hero />);

    await user.type(screen.getByPlaceholderText("Enter your email"), "founder@example.com");
    await user.click(screen.getByRole("button", { name: "Join the waitlist" }));

    expect(screen.getByRole("textbox", { name: "Email" })).toHaveValue(
      "founder@example.com",
    );
  });

  it("clears the landing email after the waitlist submission succeeds", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true }),
    });
    global.fetch = fetchMock as typeof fetch;

    render(<Hero />);

    const landingEmailInput = screen.getByPlaceholderText("Enter your email");

    await user.type(landingEmailInput, "founder@example.com");
    await user.click(screen.getByRole("button", { name: "Join the waitlist" }));
    await user.type(screen.getByPlaceholderText("https://company.com"), "acme.com");
    await user.selectOptions(
      screen.getByLabelText("Biggest growth challenge"),
      "distribution",
    );
    await user.click(screen.getAllByRole("button", { name: "Join the waitlist" })[1]);

    await waitFor(() => {
      expect(
        screen.getByText(/You're on the list. We'll reach out when your early access spot opens./i),
      ).toBeInTheDocument();
    });
    expect(landingEmailInput).toHaveValue("");
  });
});
