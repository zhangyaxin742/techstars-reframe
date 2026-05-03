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

  it("renders the landing background as a single image instead of video", () => {
    const { container } = render(<Hero />);

    expect(container.querySelector("video")).not.toBeInTheDocument();
    expect(screen.getByTestId("landing-background")).toBeInTheDocument();
    expect(container.querySelector('img[src="/assets/start-frame.png"]')).toBeInTheDocument();
    expect(container.querySelector('img[src="/assets/end-frame.png"]')).not.toBeInTheDocument();
  });
});
