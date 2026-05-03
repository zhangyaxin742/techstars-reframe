import { render, screen } from "@testing-library/react";
import React from "react";
import { timelineSegments } from "../../data/reframe-demo";
import { MockVideoPreview } from "./mock-video-preview";

describe("MockVideoPreview", () => {
  beforeEach(() => {
    vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue(undefined);
    vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders the final video asset in the preview player", () => {
    render(<MockVideoPreview segments={timelineSegments} open variant="floating" />);

    expect(screen.getByTestId("mock-video-preview")).toHaveAttribute(
      "data-preview-variant",
      "floating"
    );
    expect(screen.getByLabelText("Timeline preview video")).toHaveAttribute(
      "src",
      "/videos/final.mp4"
    );
  });

  it("does not render timeline text over the preview video", () => {
    render(<MockVideoPreview segments={timelineSegments} open variant="floating" />);

    expect(screen.queryByText("Preorder now → petiteoutdoors.com")).not.toBeInTheDocument();
  });

  it("renders as an inline canvas node player", () => {
    render(<MockVideoPreview segments={timelineSegments} open variant="node" />);

    expect(screen.getByTestId("mock-video-preview")).toHaveAttribute(
      "data-preview-variant",
      "node"
    );
    expect(screen.getByTestId("mock-video-preview")).toHaveClass("h-full");
    expect(screen.getByLabelText("Timeline preview video")).toHaveAttribute(
      "src",
      "/videos/final.mp4"
    );
  });
});
