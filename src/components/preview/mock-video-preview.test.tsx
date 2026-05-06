import { render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { timelineSegments } from "../../data/reframe-demo";
import { REFRAME_DEMO_YOUTUBE_VIDEO_ID } from "../../lib/demo-video";
import { MockVideoPreview } from "./mock-video-preview";

describe("MockVideoPreview", () => {
  it("renders the hosted YouTube demo in the preview player", () => {
    render(<MockVideoPreview segments={timelineSegments} open variant="floating" />);

    expect(screen.getByTestId("mock-video-preview")).toHaveAttribute(
      "data-preview-variant",
      "floating"
    );
    expect(screen.getByLabelText("Timeline preview video")).toHaveAttribute(
      "src",
      expect.stringContaining(`youtube.com/embed/${REFRAME_DEMO_YOUTUBE_VIDEO_ID}`)
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
      expect.stringContaining(`youtube.com/embed/${REFRAME_DEMO_YOUTUBE_VIDEO_ID}`)
    );
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

    await waitFor(() => expect(screen.getByText("9.0s / 18.0s")).toBeInTheDocument());
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

    await waitFor(() => expect(screen.getByText("7.0s / 18.0s")).toBeInTheDocument());
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
