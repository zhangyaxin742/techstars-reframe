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
  });

  it("shows source badges after submitting brand context", async () => {
    const user = userEvent.setup();
    render(<LandingIntakeChat />);

    await user.type(screen.getByTestId("intake-input"), "petiteoutdoors.com");
    await user.click(screen.getByRole("button", { name: "Submit" }));

    expect(screen.getByTestId("source-badges")).toBeInTheDocument();
    expect(screen.getByText("petiteoutdoors.com")).toBeInTheDocument();
  });

  it("shows media options after continuing past sources", async () => {
    const user = userEvent.setup();
    render(<LandingIntakeChat />);

    await user.type(screen.getByTestId("intake-input"), "petiteoutdoors.com");
    await user.click(screen.getByRole("button", { name: "Submit" }));
    await user.click(screen.getByText("Connect media sources →"));

    expect(screen.getByTestId("media-options")).toBeInTheDocument();
    expect(screen.getByText("Upload Folder")).toBeInTheDocument();
    expect(screen.getByText("Phone Camera Roll")).toBeInTheDocument();
    expect(screen.getByText("Google Drive")).toBeInTheDocument();
    expect(screen.getByText("Shopify")).toBeInTheDocument();
    expect(screen.getByText("Instagram")).toBeInTheDocument();
    expect(screen.getByText("TikTok")).toBeInTheDocument();
    expect(screen.getByText("YouTube")).toBeInTheDocument();
  });

  it("navigates to /app on final submit", async () => {
    const user = userEvent.setup();
    render(<LandingIntakeChat />);

    await user.type(screen.getByTestId("intake-input"), "petiteoutdoors.com");
    await user.click(screen.getByRole("button", { name: "Submit" }));
    await user.click(screen.getByText("Connect media sources →"));
    await user.click(screen.getByText("Start building →"));

    await vi.waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/app");
    }, { timeout: 2000 });
  });
});
