import { render, screen, within } from "@testing-library/react";
import React from "react";
import { CanvasNodeView } from "./canvas-node-view";
import type { CanvasNode } from "../../lib/infinite-canvas/types";

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

  it("reveals timeline cards section by section after the loading state", () => {
    renderNode(
      {
        id: "timeline-1",
        kind: "timeline",
        title: "Side-by-Side Fit Failure Demo — Timeline",
        body: "6 clips · 1 missing shot · 2 text overlays · 1 audio track\n18s total",
        position: { x: 0, y: 0 },
        size: { width: 480, height: 280 },
      },
      { timelinePhase: "revealing" }
    );

    expect(screen.getByTestId("timeline-reveal-timeline-1")).toBeInTheDocument();
    expect(screen.getByTestId("timeline-section-timeline-1-title")).toHaveTextContent(
      "Side-by-Side Fit Failure Demo"
    );
    expect(screen.getByTestId("timeline-section-timeline-1-0")).toHaveTextContent("6 clips");
    expect(screen.getByTestId("timeline-section-timeline-1-1")).toHaveTextContent("18s total");
  });
});
