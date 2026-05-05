import { render, screen } from "@testing-library/react";
import React from "react";
import { Hero } from "./hero";

const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

describe("Hero", () => {
  beforeEach(() => {
    mockPush.mockClear();
  });

  it("renders the scrollable landing page with video background and demo preview", () => {
    const { container } = render(<Hero />);

    expect(screen.getByTestId("landing-background")).toBeInTheDocument();
    expect(screen.getByTestId("landing-background-video")).not.toHaveAttribute("loop");
    expect(container.querySelector('source[src="/assets/landing-video.mp4"]')).toBeInTheDocument();
    expect(container.querySelector('video[poster="/assets/landing.png"]')).toBeInTheDocument();
    expect(container.querySelector('img[src="/assets/start-frame.png"]')).not.toBeInTheDocument();
    expect(screen.queryByTestId("landing-intake-chat")).not.toBeInTheDocument();
    expect(screen.getByPlaceholderText("Enter your email")).toBeInTheDocument();
    expect(screen.getByText("No spam. Just early access.")).toBeInTheDocument();
    expect(screen.getByTestId("landing-demo-card")).toBeInTheDocument();
    expect(screen.getByTestId("landing-demo-video")).toBeInTheDocument();
    expect(container.querySelector('source[src="/assets/demo-4k-optimized.mp4"]')).toBeInTheDocument();
    expect(container.querySelector('video[poster="/assets/demo-4k-poster.jpg"]')).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Play demo video" })).toBeInTheDocument();
    expect(screen.queryByText("Play demo")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Join the waitlist" })).toBeInTheDocument();
  });
});
