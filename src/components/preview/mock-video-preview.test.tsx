import { fireEvent, render, screen } from "@testing-library/react";
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

  it("renders active timeline text as white video text without a background chip", () => {
    render(<MockVideoPreview segments={timelineSegments} open variant="floating" />);

    const video = screen.getByLabelText("Timeline preview video") as HTMLVideoElement;
    video.currentTime = 16;
    fireEvent.timeUpdate(video);

    const ctaOverlay = screen.getByText("Preorder now → petiteoutdoors.com");
    expect(ctaOverlay).toHaveClass("text-white");
    expect(ctaOverlay).not.toHaveClass("bg-black/60");
  });
});
