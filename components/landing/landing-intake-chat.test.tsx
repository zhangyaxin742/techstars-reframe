import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { LandingIntakeChat } from "./landing-intake-chat";

const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

describe("LandingIntakeChat", () => {
  beforeEach(() => {
    mockPush.mockClear();
  });

  it("renders the intake input", () => {
    render(<LandingIntakeChat />);
    expect(screen.getByTestId("intake-input")).toBeInTheDocument();
  });

  it("queues import sources from the attach menu", async () => {
    const user = userEvent.setup();
    render(<LandingIntakeChat />);

    await user.click(screen.getByRole("button", { name: "Attach" }));
    expect(screen.getByText("Link")).toBeInTheDocument();
    expect(screen.getByText("Upload")).toBeInTheDocument();
    expect(screen.queryByText("Google Drive")).not.toBeInTheDocument();

    await user.click(screen.getByText("Upload"));
    await user.click(screen.getByText("Google Drive"));

    expect(screen.getByTestId("queued-imports")).toBeInTheDocument();
    expect(screen.getAllByText("Google Drive")[0]).toBeInTheDocument();
  });

  it("shows social link sources under the link submenu", async () => {
    const user = userEvent.setup();
    render(<LandingIntakeChat />);

    await user.click(screen.getByRole("button", { name: "Attach" }));
    await user.click(screen.getByText("Link"));

    expect(screen.getByText("Instagram")).toBeInTheDocument();
    expect(screen.getByText("TikTok")).toBeInTheDocument();
    expect(screen.getByText("YouTube")).toBeInTheDocument();
    expect(screen.getByText("Shopify / Website")).toBeInTheDocument();
    expect(screen.queryByText("iCloud Drive")).not.toBeInTheDocument();
  });

  it("highlights the attach trigger while the import menu is open", async () => {
    const user = userEvent.setup();
    render(<LandingIntakeChat />);

    const trigger = screen.getByRole("button", { name: "Attach" });
    expect(trigger).toHaveAttribute("aria-pressed", "false");

    await user.click(trigger);

    expect(trigger).toHaveAttribute("aria-pressed", "true");
    expect(trigger).toHaveClass("bg-gold/12");
  });

  it("auto-expands the intake textarea as more text is entered", async () => {
    render(<LandingIntakeChat />);

    const textarea = screen.getByTestId("intake-input") as HTMLTextAreaElement;
    Object.defineProperty(textarea, "scrollHeight", {
      configurable: true,
      value: 144,
    });

    fireEvent.change(textarea, {
      target: { value: "line one\nline two\nline three\nline four" },
    });

    expect(textarea.style.height).toBe("144px");
  });

  it("shows source badges after submitting brand context", async () => {
    const user = userEvent.setup();
    render(<LandingIntakeChat />);

    await user.type(screen.getByTestId("intake-input"), "petiteoutdoors.com");
    await user.click(screen.getByRole("button", { name: "Submit" }));

    expect(screen.getByTestId("source-badges")).toBeInTheDocument();
    expect(screen.getByText("petiteoutdoors.com")).toBeInTheDocument();
  });

  it("shows the final start-building action after submitting brand context", async () => {
    const user = userEvent.setup();
    render(<LandingIntakeChat />);

    await user.type(screen.getByTestId("intake-input"), "petiteoutdoors.com");
    await user.click(screen.getByRole("button", { name: "Submit" }));

    expect(screen.getByRole("button", { name: /Start building/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Connect media sources/i })).not.toBeInTheDocument();
  });

  it("navigates to /app on final submit", async () => {
    const user = userEvent.setup();
    render(<LandingIntakeChat />);

    await user.type(screen.getByTestId("intake-input"), "petiteoutdoors.com");
    await user.click(screen.getByRole("button", { name: "Submit" }));
    await user.click(screen.getByRole("button", { name: /Start building/i }));

    await vi.waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/app");
    }, { timeout: 2000 });
  });
});
