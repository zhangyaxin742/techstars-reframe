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

  it("renders the landing background with a top-half video and shows the demo video section", () => {
    const { container } = render(<Hero />);

    expect(screen.getByTestId("landing-background")).toBeInTheDocument();
    expect(screen.getByTestId("landing-background-video")).toBeInTheDocument();
    expect(container.querySelector('source[src="/assets/landing-video.mp4"]')).toBeInTheDocument();
    expect(container.querySelector('img[src="/assets/start-frame.png"]')).toBeInTheDocument();
    expect(container.querySelector('img[src="/assets/end-frame.png"]')).not.toBeInTheDocument();
    expect(screen.queryByTestId("landing-intake-chat")).not.toBeInTheDocument();
    expect(screen.getByTestId("landing-demo-video")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Join the waitlist" })).toBeInTheDocument();
  });
});
