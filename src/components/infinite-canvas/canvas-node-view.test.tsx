import { render, screen, within } from "@testing-library/react";
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
  });

  it("reveals trend recipe cards as separate animated content sections", () => {
    renderNode({
      id: "recipe-1",
      kind: "trend-recipe",
      title: "Side-by-Side Fit Failure Demo",
      body: "\"Most outdoor brands vs. gear made for your actual frame.\"\n\nFormat: Split-screen proof\nLength: 18s\nMatch: 94%",
      position: { x: 0, y: 0 },
      size: { width: 300, height: 200 },
    });

    expect(screen.getByTestId("trend-recipe-reveal-recipe-1")).toBeInTheDocument();
    expect(screen.getByTestId("trend-recipe-section-recipe-1-title")).toHaveTextContent(
      "Side-by-Side Fit Failure Demo"
    );
    expect(screen.getByTestId("trend-recipe-section-recipe-1-hook")).toHaveTextContent(
      "Most outdoor brands"
    );
    expect(within(screen.getByTestId("trend-recipe-section-recipe-1-details")).getByText("Format")).toBeInTheDocument();
    expect(screen.getByTestId("trend-recipe-detail-recipe-1-1")).toHaveTextContent("18s");
  });

  it("renders the timeline node as a compact non-editable visual preview", () => {
    renderNode(
      {
        id: "timeline-1",
        kind: "timeline",
        title: "Side-by-Side Fit Failure Demo — Timeline",
        body: "6 clips · 1 missing shot · 2 text overlays · 1 audio track\n18s total",
        position: { x: 0, y: 0 },
        size: { width: 480, height: 280 },
      },
      { timelinePhase: "revealing", previewSegments: timelineSegments }
    );

    const timelineNode = screen.getByTestId("timeline-reveal-timeline-1");
    expect(timelineNode).toBeInTheDocument();
    expect(screen.getByTestId("timeline-section-timeline-1-title")).toHaveTextContent(
      "Side-by-Side Fit Failure Demo"
    );
    expect(screen.getByText("Timeline ready")).toBeInTheDocument();
    expect(screen.getByTestId("timeline-gap-pill-timeline-1")).toHaveTextContent("1 gap");

    expect(screen.getByTestId("timeline-node-clip-ts-1")).toContainElement(
      screen.getByAltText(timelineSegments[0].label)
    );
    expect(screen.getByTestId("timeline-node-clip-ts-4")).toHaveClass("bg-black");
    expect(screen.getByTestId("timeline-node-clip-ts-4")).toHaveTextContent("film missing shot");
    expect(screen.getByTestId("timeline-node-clip-ts-4")).toHaveTextContent("Drop media here");
    expect(screen.getByTestId("timeline-overlay-row-timeline-1")).toBeInTheDocument();
    expect(screen.getByTestId("timeline-overlay-track-timeline-1")).toHaveClass("inset-x-2");
    expect(screen.getByTestId("timeline-node-overlay-ts-2")).toHaveTextContent(
      timelineSegments[1].overlayText ?? ""
    );
    expect(screen.getByTestId("timeline-audio-preview-timeline-1")).toBeInTheDocument();
    expect(screen.getByTestId("timeline-audio-preview-timeline-1")).toHaveClass("h-10");
    expect(screen.getByTestId("timeline-audio-preview-timeline-1")).toHaveClass("bg-black");
    expect(screen.getByTestId("timeline-audio-preview-timeline-1").firstElementChild).toHaveAttribute(
      "src",
      "/assets/trending%20demo%20timeline/image%2012.png"
    );

    expect(screen.getByTestId("timeline-node-metric-timeline-1-0")).toHaveClass("rounded-full");
    expect(screen.getByTestId("timeline-node-metric-timeline-1-0")).toHaveClass("bg-secondary");
    expect(screen.getByTestId("timeline-node-metric-timeline-1-0")).toHaveTextContent("18s");
    expect(screen.getByTestId("timeline-node-metric-timeline-1-1")).toHaveTextContent("6 clips");
    expect(screen.getByTestId("timeline-node-metric-timeline-1-2")).toHaveTextContent("1 gap");
    expect(screen.getByTestId("timeline-node-metric-timeline-1-3")).toHaveTextContent("2 overlays");
    expect(within(timelineNode).queryAllByRole("button")).toHaveLength(0);
  });
});
