import { fireEvent, render, screen, within } from "@testing-library/react";
import React from "react";
import { CanvasNodeView } from "./canvas-node-view";
import type { CanvasNode } from "../../lib/infinite-canvas/types";
import { timelineSegments } from "../../data/reframe-demo";

const noopPointerDown = vi.fn();
const noopClick = vi.fn();

function renderNode(node: CanvasNode, props: Partial<React.ComponentProps<typeof CanvasNodeView>> = {}) {
  return render(
    <CanvasNodeView
      node={node}
      position={node.position}
      zoom={1}
      selected={false}
      onPointerDown={noopPointerDown}
      onClick={noopClick}
      {...props}
    />
  );
}

describe("CanvasNodeView", () => {
  afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  it("reveals trend recipe cards as separate animated content sections", () => {
    renderNode({
      id: "recipe-1",
      kind: "trend-recipe",
      title: "Founder Confessional",
      body: "\"Most outdoor brands vs. gear made for your actual frame.\"\n\nFormat: Split-screen proof\nLength: 18s\nMatch: 94%",
      position: { x: 0, y: 0 },
      size: { width: 300, height: 200 },
    });

    expect(screen.getByTestId("trend-recipe-reveal-recipe-1")).toBeInTheDocument();
    expect(screen.getByTestId("trend-recipe-section-recipe-1-title")).toHaveTextContent(
      "Founder Confessional"
    );
    expect(screen.getByTestId("trend-recipe-section-recipe-1-hook")).toHaveTextContent(
      "Most outdoor brands"
    );
    expect(within(screen.getByTestId("trend-recipe-section-recipe-1-details")).getByText("Format")).toBeInTheDocument();
    expect(screen.getByTestId("trend-recipe-detail-recipe-1-1")).toHaveTextContent("18s");
  });

  it("plays trend video nodes on hover and keeps the plus action outside the video", () => {
    const play = vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue(undefined);
    const pause = vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => undefined);
    const onCreateTimelineFromTrend = vi.fn();

    renderNode(
      {
        id: "recipe-1",
        kind: "video",
        title: "Founder confessional",
        body: "\"This is why regular hiking pants never worked for me.\"",
        video: {
          src: "/videos/trend1.mp4",
          label: "trend",
          meta: "Hook refresh",
        },
        position: { x: 0, y: 0 },
        size: { width: 220, height: 391 },
      },
      { onCreateTimelineFromTrend }
    );

    const videoCard = screen.getByTestId("trend-video-reveal-recipe-1");
    const video = screen.getByTestId("canvas-node-video-recipe-1") as HTMLVideoElement;
    const plusButton = screen.getByTestId("canvas-node-create-timeline-recipe-1");
    const badges = screen.getByTestId("trend-video-badges-recipe-1");
    const bottomOverlay = screen.getByTestId("trend-video-bottom-overlay-recipe-1");

    expect(screen.getByTestId("canvas-node-recipe-1")).toHaveStyle({
      width: "220px",
      height: "391px",
    });
    expect(video).toHaveAttribute("src", "/videos/trend1.mp4");
    expect(video.loop).toBe(true);
    expect(video.muted).toBe(true);
    expect(video.playsInline).toBe(true);
    expect(plusButton).toHaveClass("top-full");
    expect(plusButton).toHaveClass("mt-3");
    expect(screen.queryByRole("button", { name: /more info/i })).not.toBeInTheDocument();
    expect(
      within(screen.getByTestId("canvas-node-card-recipe-1")).queryByTestId(
        "canvas-node-create-timeline-recipe-1"
      )
    ).not.toBeInTheDocument();

    fireEvent.mouseEnter(videoCard);
    expect(play).toHaveBeenCalledTimes(1);
    expect(badges).toHaveAttribute("data-chrome-state", "hidden");
    expect(bottomOverlay).toHaveAttribute("data-chrome-state", "hidden");

    video.currentTime = 1.2;
    fireEvent.mouseLeave(videoCard);
    expect(pause).toHaveBeenCalledTimes(1);
    expect(video.currentTime).toBe(0);
    expect(badges).toHaveAttribute("data-chrome-state", "visible");
    expect(bottomOverlay).toHaveAttribute("data-chrome-state", "visible");

    fireEvent.click(plusButton);
    expect(onCreateTimelineFromTrend).toHaveBeenCalledTimes(1);
  });

  it("opens a trend breakdown dialog from the founder confessional video", () => {
    const onCreateTimelineFromTrend = vi.fn();

    renderNode(
      {
        id: "recipe-1",
        kind: "video",
        title: "Founder confessional",
        body: "\"This is why regular hiking pants never worked for me.\"",
        video: {
          src: "/videos/trend1.mp4",
          label: "trend",
          meta: "Hook refresh",
          detailsImage: {
            src: "/assets/trending%20demo%20timeline/founder_confessional.png",
            alt: "Detailed breakdown of the Founder Confessional video trend",
          },
        },
        position: { x: 0, y: 0 },
        size: { width: 220, height: 391 },
      },
      { onCreateTimelineFromTrend }
    );

    const moreInfoButton = screen.getByRole("button", { name: /more info/i });

    fireEvent.pointerDown(moreInfoButton);
    fireEvent.click(moreInfoButton);

    expect(screen.getByRole("dialog", { name: /founder confessional trend breakdown/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /close trend breakdown/i })).toHaveClass("-top-12");
    expect(screen.getByRole("button", { name: /close trend breakdown/i })).toHaveClass("right-0");
    expect(screen.getByAltText("Detailed breakdown of the Founder Confessional video trend")).toHaveAttribute(
      "src",
      "/assets/trending%20demo%20timeline/founder_confessional.png"
    );
    expect(onCreateTimelineFromTrend).not.toHaveBeenCalled();
  });

  it("renders the timeline node as a compact non-editable visual preview", () => {
    renderNode(
      {
        id: "timeline-1",
        kind: "timeline",
        title: "Founder Confessional",
        body: "6 clips · 1 missing shot · 1 text overlay · 1 audio track\n18s total",
        position: { x: 0, y: 0 },
        size: { width: 480, height: 280 },
      },
      { timelinePhase: "revealing", previewSegments: timelineSegments }
    );

    const timelineNode = screen.getByTestId("timeline-reveal-timeline-1");
    expect(timelineNode).toBeInTheDocument();
    expect(screen.getByTestId("timeline-section-timeline-1-title")).toHaveTextContent(
      "Founder Confessional"
    );
    expect(screen.queryByText("Timeline ready")).not.toBeInTheDocument();
    expect(screen.getByTestId("timeline-gap-pill-timeline-1")).toHaveTextContent("1 gap");
    expect(
      within(screen.getByTestId("timeline-gap-pill-timeline-1")).getByTestId(
        "timeline-gap-pill-timeline-1-warning"
      )
    ).toBeInTheDocument();

    expect(screen.getByTestId("timeline-node-clip-ts-1")).toContainElement(
      screen.getByAltText(timelineSegments[0].label)
    );
    expect(screen.getByTestId("timeline-node-clip-ts-4")).toHaveClass("bg-black");
    expect(screen.getByTestId("timeline-node-clip-ts-4")).toHaveTextContent("shot missing");
    expect(screen.getByTestId("timeline-node-clip-ts-4")).not.toHaveTextContent("Drop media here");
    expect(screen.getByTestId("timeline-overlay-row-timeline-1")).toBeInTheDocument();
    expect(screen.getByTestId("timeline-overlay-track-timeline-1")).toHaveClass("inset-x-2");
    expect(screen.getByTestId("timeline-node-overlay-ts-2")).toHaveTextContent(
      timelineSegments[1].overlayText ?? ""
    );
    expect(screen.getByTestId("timeline-audio-preview-timeline-1")).toBeInTheDocument();
    expect(screen.getByTestId("timeline-audio-preview-timeline-1")).toHaveClass("h-10");
    expect(screen.getByTestId("timeline-audio-preview-timeline-1")).toHaveClass("bg-transparent");
    expect(screen.getByTestId("timeline-audio-preview-timeline-1")).not.toHaveClass("p-1");
    expect(screen.getByTestId("timeline-audio-preview-timeline-1").firstElementChild).toHaveClass("object-cover");
    expect(screen.getByTestId("timeline-audio-preview-timeline-1").firstElementChild).toHaveAttribute(
      "src",
      "/assets/trending%20demo%20timeline/Rectangle.png"
    );

    expect(screen.getByTestId("timeline-node-metric-timeline-1-0")).toHaveClass("rounded-full");
    expect(screen.getByTestId("timeline-node-metric-timeline-1-0")).toHaveClass("bg-secondary");
    expect(screen.getByTestId("timeline-node-metric-timeline-1-0")).toHaveTextContent("18s");
    expect(screen.getByTestId("timeline-node-metric-timeline-1-1")).toHaveTextContent("6 clips");
    expect(screen.getByTestId("timeline-node-metric-timeline-1-2")).toHaveTextContent("1 overlay");
    expect(screen.queryByTestId("timeline-node-metric-timeline-1-3")).not.toBeInTheDocument();
    expect(within(timelineNode).queryAllByRole("button")).toHaveLength(0);
  });
});
