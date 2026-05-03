import { render, screen } from "@testing-library/react";
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
    expect(screen.getByText("What product should we match to a trend?")).toBeInTheDocument();
    expect(screen.getByText("No uploads yet. Reframe will ask for clips after it finds the format.")).toBeInTheDocument();
    expect(screen.queryByTestId("media-options")).not.toBeInTheDocument();
  });

  it("shows source badges and a matched trend after submitting product context", async () => {
    const user = userEvent.setup();
    render(<LandingIntakeChat />);

    await user.type(screen.getByTestId("intake-input"), "petiteoutdoors.com");
    await user.click(screen.getByRole("button", { name: "Submit" }));

    expect(screen.getByTestId("source-badges")).toBeInTheDocument();
    expect(screen.getByText("petiteoutdoors.com")).toBeInTheDocument();
    expect(screen.getByText("Matched trend format")).toBeInTheDocument();
    expect(screen.getByText(/founder problem -> product proof -> field test -> preorder CTA/)).toBeInTheDocument();
    expect(screen.queryByTestId("media-options")).not.toBeInTheDocument();
  });

  it("shows media options after continuing past the trend match", async () => {
    const user = userEvent.setup();
    render(<LandingIntakeChat />);

    await user.type(screen.getByTestId("intake-input"), "petiteoutdoors.com");
    await user.click(screen.getByRole("button", { name: "Submit" }));
    await user.click(screen.getByText("Choose clips to map ->"));

    expect(screen.getByTestId("media-options")).toBeInTheDocument();
    expect(screen.getByText("Product footage")).toBeInTheDocument();
    expect(screen.getByText("Founder footage")).toBeInTheDocument();
    expect(screen.getByText("To build it, I'll need any clips you already have for these moments. I'll map what fits and flag what's missing.")).toBeInTheDocument();
  });

  it("navigates to /app on final submit", async () => {
    const user = userEvent.setup();
    render(<LandingIntakeChat />);

    await user.type(screen.getByTestId("intake-input"), "petiteoutdoors.com");
    await user.click(screen.getByRole("button", { name: "Submit" }));
    await user.click(screen.getByText("Choose clips to map ->"));
    await user.click(screen.getByText("Assemble in workspace ->"));

    await vi.waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/app");
    }, { timeout: 2000 });
  });
});
