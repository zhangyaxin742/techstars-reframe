import { render, screen, waitFor } from "@testing-library/react";
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
    expect(screen.getByLabelText("Timeline preview video")).not.toHaveAttribute("muted");
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
    expect(screen.getByLabelText("Timeline preview video")).not.toHaveAttribute("muted");
  });

  it("seeks the preview video when a timeline scrub time is provided", async () => {
    render(
      <MockVideoPreview
        segments={timelineSegments}
        open
        variant="floating"
        previewTimeMs={9000}
      />
    );

    const video = screen.getByLabelText("Timeline preview video") as HTMLVideoElement;

    await waitFor(() => expect(video.currentTime).toBe(9));
    expect(screen.getByText("9.0s / 18.0s")).toBeInTheDocument();
  });

  it("shows a black missing-shot frame while scrubbing over a missing segment", async () => {
    render(
      <MockVideoPreview
        segments={timelineSegments}
        open
        variant="floating"
        previewTimeMs={7000}
      />
    );

    const video = screen.getByLabelText("Timeline preview video") as HTMLVideoElement;

    await waitFor(() => expect(video.currentTime).toBe(7));
    expect(screen.getByTestId("preview-missing-shot-frame")).toHaveClass("bg-black");
    expect(screen.getByText("shot missing")).toBeInTheDocument();
  });

  it("removes the missing-shot frame after the missing segment is filled", () => {
    render(
      <MockVideoPreview
        segments={timelineSegments.map((segment) =>
          segment.id === "ts-4"
            ? {
                ...segment,
                kind: "clip" as const,
                mediaAssetId: "final-3",
                thumbnail: "/assets/trending%20demo%20timeline/final_3.jpg",
              }
            : segment
        )}
        open
        variant="floating"
        previewTimeMs={7000}
      />
    );

    expect(screen.queryByTestId("preview-missing-shot-frame")).not.toBeInTheDocument();
  });
});
