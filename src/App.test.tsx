import { act, fireEvent, render, screen, within } from "@testing-library/react";
import React from "react";
import { App } from "./App";
import { brandContext } from "./data/reframe-demo";

describe("App", () => {
  beforeEach(() => {
    vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue(undefined);
    vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  function revealTimeline() {
    act(() => {
      vi.advanceTimersByTime(22000);
    });
    fireEvent.click(screen.getByTestId("canvas-node-create-timeline-recipe-1"));
    act(() => {
      vi.advanceTimersByTime(5000);
    });
  }

  function mockCanvasBounds(width = 900, height = 600) {
    return vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
      x: 0,
      y: 0,
      width,
      height,
      top: 0,
      left: 0,
      right: width,
      bottom: height,
      toJSON: () => ({}),
    });
  }

  function readTranslate(element: HTMLElement) {
    const match = /translate\(([-\d.]+)px, ([-\d.]+)px\)/.exec(element.style.transform);
    if (!match) {
      throw new Error(`Expected translate transform, received: ${element.style.transform}`);
    }

    return {
      x: Number(match[1]),
      y: Number(match[2]),
    };
  }

  it("renders the AI chat sidebar and canvas without the navigation menu", () => {
    vi.useFakeTimers();
    render(<App />);

    expect(screen.getByTestId("chat-history-panel")).toHaveTextContent("Building Brand Context");
    expect(screen.getByTestId("infinite-canvas")).toBeInTheDocument();
    expect(screen.getByTestId("infinite-canvas")).toHaveAttribute(
      "data-viewport-focus-id",
      "brand-context"
    );
    expect(screen.queryByText("Preparing your creative canvas")).not.toBeInTheDocument();
    expect(screen.getByTestId("canvas-node-brand-ctx")).toBeInTheDocument();
    expect(screen.queryByText("Founder Confessional")).not.toBeInTheDocument();
    expect(screen.queryByText("1. Paste Brand Sources")).not.toBeInTheDocument();
    expect(screen.queryByText("2. Connect Media")).not.toBeInTheDocument();
    expect(screen.queryByText("3. Analyze Brand")).not.toBeInTheDocument();
    expect(screen.getByTestId("simulated-tool-tool-read-sources")).toHaveAttribute(
      "data-tool-state",
      "running"
    );
    expect(screen.queryByRole("link", { name: "Home" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Canvas" })).not.toBeInTheDocument();
    expect(screen.queryByText("Canvas workspace")).not.toBeInTheDocument();
  });

  it("separates brand context creation from trend recipe generation", () => {
    vi.useFakeTimers();
    render(<App />);

    act(() => {
      vi.advanceTimersByTime(12500);
    });
    act(() => {
      vi.advanceTimersByTime(1200);
    });

    expect(screen.getByText("Okay, brand context created.")).toBeInTheDocument();
    expect(screen.getByTestId("canvas-node-brand-ctx")).toBeInTheDocument();
    expect(screen.queryByText("Founder Confessional")).not.toBeInTheDocument();
    expect(screen.getByTestId("simulated-tool-tool-build-brand-context")).toHaveAttribute(
      "data-tool-state",
      "completed"
    );
  });

  it("fills the visual proof library with a complete 3-by-3 tile set", () => {
    expect(brandContext.card.visualProof).toHaveLength(9);
    expect(brandContext.card.visualProof.at(-1)).toMatchObject({
      id: "vp-9",
      label: "back view fit check",
      tag: "SCALE PROOF",
      scoreLabel: "fit",
      imageUrl: "/assets/brand-context-images/back%20view.jpg",
    });
  });

  it("shows trend video skeletons during search before revealing hover-play videos", () => {
    vi.useFakeTimers();
    mockCanvasBounds();
    render(<App />);

    act(() => {
      vi.advanceTimersByTime(10600);
    });

    expect(screen.getByTestId("simulated-tool-tool-search-web")).toHaveAttribute(
      "data-tool-state",
      "running"
    );
    expect(screen.getByTestId("trend-video-skeleton-recipe-1")).toBeInTheDocument();
    expect(screen.getByTestId("infinite-canvas")).toHaveAttribute(
      "data-viewport-focus-id",
      "trend-recipes"
    );
    expect(screen.getByTestId("infinite-canvas")).toHaveAttribute(
      "data-viewport-focus-nodes",
      "recipe-1 recipe-2 recipe-3"
    );
    expect(screen.queryByText("Founder Confessional")).not.toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(7300);
    });

    expect(screen.getByTestId("simulated-tool-tool-build-recipes")).toHaveAttribute(
      "data-tool-state",
      "completed"
    );
    expect(screen.getByTestId("canvas-node-brand-ctx")).toBeInTheDocument();
    expect(screen.getByTestId("canvas-node-brand-ctx").style.transform).toBe("translate(0px, 0px)");
    expect(screen.getByTestId("canvas-node-recipe-1").style.transform).toBe("translate(1096px, 0px)");
    expect(screen.getByTestId("canvas-node-recipe-1")).toHaveStyle({
      width: "220px",
      height: "391px",
    });
    expect(screen.getByTestId("canvas-node-recipe-2").style.transform).toBe("translate(1356px, 0px)");
    expect(screen.getByTestId("canvas-node-recipe-3").style.transform).toBe("translate(1616px, 0px)");
    expect(screen.getByTestId("canvas-node-timeline-ghost-recipe-1")).toHaveAttribute(
      "data-preview-mode",
      "preview"
    );
    expect(screen.getByTestId("canvas-node-timeline-ghost-connector-recipe-1")).toHaveClass(
      "top-full"
    );
    expect(screen.getByTestId("canvas-node-timeline-ghost-connector-recipe-1")).toHaveClass(
      "h-24"
    );
    expect(screen.getByTestId("canvas-node-timeline-ghost-recipe-1")).toHaveClass("top-full");
    expect(screen.getByTestId("canvas-node-timeline-ghost-recipe-1")).toHaveClass("mt-24");
    const timelinePreview = within(
      screen.getByTestId("canvas-node-timeline-ghost-recipe-1")
    ).getByLabelText("Timeline preview");
    expect(timelinePreview).toHaveAttribute("data-slot", "skeleton");
    expect(timelinePreview).not.toHaveClass("animate-skeleton-shimmer");
    expect(timelinePreview).toHaveStyle("background-image: none");
    expect(timelinePreview.getAttribute("style")).toContain("--skeleton-darker-light-bg");
    expect(timelinePreview.getAttribute("style")).toContain("var(--color-card) 82%");
    expect(
      within(screen.getByTestId("canvas-node-timeline-ghost-recipe-1")).queryByLabelText(
        "Loading timeline"
      )
    ).not.toBeInTheDocument();
    expect(screen.getByTestId("canvas-node-video-recipe-1")).toHaveAttribute(
      "src",
      "/videos/trend1.mp4"
    );
    expect(screen.getByTestId("canvas-node-video-recipe-2")).toHaveAttribute(
      "src",
      "/videos/trend2.mp4"
    );
    expect(screen.getByTestId("canvas-node-video-recipe-3")).toHaveAttribute(
      "src",
      "/videos/trend3.mp4"
    );
    expect(screen.getByText("Founder confessional")).toBeInTheDocument();
    expect(screen.getByText("Process cutdown")).toBeInTheDocument();
    expect(screen.getByText("Customer proof remix")).toBeInTheDocument();
    expect(screen.queryByTestId("trend-video-skeleton-recipe-1")).not.toBeInTheDocument();
  });

  it("clicking a trend video plus action runs the timeline generation flow", () => {
    vi.useFakeTimers();
    mockCanvasBounds();
    render(<App />);

    act(() => {
      vi.advanceTimersByTime(22000);
    });
    const createTimelineButton = screen.getByTestId("canvas-node-create-timeline-recipe-1");
    expect(createTimelineButton).toHaveClass("size-8");
    expect(createTimelineButton).toHaveClass("bg-accent");
    expect(within(createTimelineButton).getByText("+")).toHaveClass("text-xl");
    fireEvent.click(createTimelineButton);

    expect(screen.getByText("Auto-filling the timeline")).toBeInTheDocument();
    expect(screen.getByTestId("infinite-canvas")).toHaveAttribute(
      "data-viewport-focus-id",
      "timeline-skeleton-recipe-1"
    );
    expect(screen.getByTestId("infinite-canvas")).toHaveAttribute(
      "data-viewport-focus-nodes",
      "timeline-1"
    );
    expect(screen.queryByTestId("canvas-node-create-timeline-recipe-1")).not.toBeInTheDocument();
    expect(screen.getByTestId("canvas-connection-r1-tl")).toBeInTheDocument();
    expect(screen.getByTestId("canvas-node-connector-recipe-1")).toBeInTheDocument();
    expect(screen.getByTestId("canvas-node-connector-recipe-1")).toHaveClass("top-full");
    expect(screen.getByTestId("canvas-node-connector-recipe-1")).toHaveClass("h-24");
    expect(screen.getByTestId("timeline-node-skeleton-timeline-1")).toBeInTheDocument();
    expect(screen.getByLabelText("Loading timeline")).toBeInTheDocument();
    expect(screen.getByLabelText("Loading timeline")).toHaveClass("animate-skeleton-shimmer");
    expect(screen.getByTestId("canvas-node-timeline-1").style.transform).toBe("translate(1096px, 487px)");
    expect(screen.getByTestId("simulated-tool-tool-match-clips")).toHaveAttribute(
      "data-tool-state",
      "running"
    );

    act(() => {
      vi.advanceTimersByTime(3600);
    });
    act(() => {
      vi.advanceTimersByTime(1400);
    });

    expect(screen.getByText(/Timeline is filled/)).toBeInTheDocument();
    expect(screen.getByTestId("canvas-connection-r1-tl")).toBeInTheDocument();
    expect(screen.getByTestId("canvas-connection-tl-prev")).toBeInTheDocument();
    expect(screen.getByTestId("canvas-connection-tl-prev")).toHaveAttribute(
      "stroke",
      "rgb(0, 129, 192)"
    );
    expect(screen.getByTestId("canvas-node-connector-recipe-1")).toBeInTheDocument();
    expect(screen.getByTestId("canvas-node-connector-timeline-1-preview")).toBeInTheDocument();
    expect(screen.getByTestId("canvas-node-timeline-1").style.transform).toBe("translate(1096px, 487px)");
    expect(screen.getByTestId("canvas-node-preview-1").style.transform).toBe("translate(1640px, 437px)");
    expect(
      within(screen.getByTestId("canvas-node-timeline-1")).getByText("Founder Confessional")
    ).toBeInTheDocument();
    expect(screen.getByTestId("infinite-canvas")).toHaveAttribute(
      "data-viewport-focus-nodes",
      "timeline-1 preview-1"
    );
    const previewNode = screen.getByTestId("canvas-node-preview-1");
    expect(
      within(previewNode).getByTestId("mock-video-preview")
    ).toHaveAttribute("data-preview-variant", "node");
    expect(within(previewNode).getByLabelText("Timeline preview video")).toHaveAttribute(
      "src",
      "/videos/final.mp4"
    );
  });

  it("keeps the preview node attached when the timeline node moves", () => {
    vi.useFakeTimers();
    mockCanvasBounds();
    render(<App />);

    revealTimeline();
    const canvas = screen.getByTestId("infinite-canvas");
    const timelineNode = screen.getByTestId("canvas-node-timeline-1");
    const previewNode = screen.getByTestId("canvas-node-preview-1");
    const initialTimelinePosition = readTranslate(timelineNode);
    const initialPreviewPosition = readTranslate(previewNode);

    fireEvent.pointerDown(timelineNode, {
      button: 0,
      pointerId: 1,
      clientX: 20,
      clientY: 20,
    });
    fireEvent.pointerMove(canvas, {
      pointerId: 1,
      clientX: 120,
      clientY: 70,
    });
    fireEvent.pointerUp(canvas, {
      pointerId: 1,
      clientX: 120,
      clientY: 70,
    });

    const movedTimelinePosition = readTranslate(screen.getByTestId("canvas-node-timeline-1"));
    const movedPreviewPosition = readTranslate(screen.getByTestId("canvas-node-preview-1"));
    expect(movedTimelinePosition.x).toBeGreaterThan(initialTimelinePosition.x);
    expect(movedTimelinePosition.y).toBeGreaterThan(initialTimelinePosition.y);
    expect(movedPreviewPosition.x - movedTimelinePosition.x).toBeCloseTo(
      initialPreviewPosition.x - initialTimelinePosition.x
    );
    expect(movedPreviewPosition.y - movedTimelinePosition.y).toBeCloseTo(
      initialPreviewPosition.y - initialTimelinePosition.y
    );
  });

  it("shows Instagram publishing progress under the preview node before publishing metrics", () => {
    vi.useFakeTimers();
    mockCanvasBounds();
    render(<App />);

    revealTimeline();
    fireEvent.click(screen.getByTestId("canvas-node-preview-1"));
    fireEvent.click(screen.getByLabelText("Post to Instagram"));

    const publishStatus = screen.getByTestId("preview-publish-status");
    expect(publishStatus).toHaveTextContent("Publishing to Instagram");
    expect(publishStatus).toHaveTextContent("18%");
    expect(screen.getByTestId("preview-publish-progress")).toBeInTheDocument();
    expect(within(publishStatus).queryByText("views")).not.toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(700);
    });
    expect(screen.getByTestId("preview-publish-status")).toHaveTextContent("46%");

    act(() => {
      vi.advanceTimersByTime(2100);
    });
    expect(screen.getByTestId("preview-publish-status")).toHaveTextContent("Published");
    expect(screen.getByTestId("preview-publish-status")).toHaveTextContent("48 views");
    expect(screen.getByTestId("preview-publish-status")).toHaveTextContent("9 likes");
    expect(screen.queryByTestId("preview-publish-progress")).not.toBeInTheDocument();
    expect(screen.getByTestId("preview-publish-views-count")).toHaveClass("t-digit-group");
    expect(screen.getByTestId("preview-publish-views-count")).toHaveClass("is-animating");
    expect(screen.getByTestId("preview-publish-views-count").children[1]).toHaveAttribute(
      "data-stagger",
      "1"
    );
    expect(screen.getByTestId("preview-publish-likes-count")).toHaveClass("t-digit-group");

    act(() => {
      vi.advanceTimersByTime(1500);
    });
    expect(screen.getByTestId("preview-publish-status")).toHaveTextContent("48 views");
    expect(screen.getByTestId("preview-publish-status")).toHaveTextContent("9 likes");

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.getByTestId("preview-publish-status")).toHaveTextContent("312 views");
    expect(screen.getByTestId("preview-publish-status")).toHaveTextContent("58 likes");
  });

  it("does not start timeline generation when clicking the recipe card body", () => {
    vi.useFakeTimers();
    render(<App />);

    act(() => {
      vi.advanceTimersByTime(22000);
    });

    fireEvent.click(screen.getByTestId("canvas-node-recipe-1"));

    expect(screen.queryByText("Auto-filling the timeline")).not.toBeInTheDocument();
    expect(screen.queryByTestId("simulated-tool-tool-match-clips")).not.toBeInTheDocument();
  });

  it("opens the timeline drawer from the revealed timeline node and hides workspace chrome", () => {
    vi.useFakeTimers();
    render(<App />);

    revealTimeline();
    fireEvent.click(screen.getByTestId("canvas-node-timeline-1"));

    expect(screen.getByTestId("timeline-bottom-drawer")).toBeInTheDocument();
    expect(screen.getByTestId("timeline-background-overlay")).toHaveClass("bg-foreground/20");
    expect(screen.getByTestId("timeline-background-overlay")).toHaveClass("backdrop-blur-sm");
    expect(screen.getByTestId("timeline-floating-preview")).toBeInTheDocument();
    expect(screen.getByTestId("timeline-floating-preview").getAttribute("style")).toContain(
      "aspect-ratio: 9 / 16"
    );
    expect(
      within(screen.getByTestId("timeline-floating-preview")).getByTestId("mock-video-preview")
    ).toHaveAttribute("data-preview-variant", "floating");
    expect(screen.getByText("Hook - Fit problem")).toBeInTheDocument();
    expect(screen.getByText(/Upbeat acoustic/)).toBeInTheDocument();
    expect(screen.getByTestId("chat-history-panel")).toHaveAttribute("data-chrome-hidden", "true");
    expect(screen.queryByRole("navigation", { name: "Canvas navigation" })).not.toBeInTheDocument();
    expect(screen.queryByTestId("workspace-top-label")).not.toBeInTheDocument();
    expect(screen.queryByTestId("workspace-top-fade")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Export timeline")).not.toBeInTheDocument();
  });

  it("restores workspace chrome after closing the timeline drawer", () => {
    vi.useFakeTimers();
    render(<App />);

    revealTimeline();
    fireEvent.click(screen.getByTestId("canvas-node-timeline-1"));
    fireEvent.click(screen.getByLabelText("Close timeline drawer"));

    expect(screen.getByTestId("timeline-bottom-drawer")).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(220);
    });

    expect(screen.queryByTestId("timeline-bottom-drawer")).not.toBeInTheDocument();
    expect(screen.queryByTestId("timeline-floating-preview")).not.toBeInTheDocument();
    expect(screen.getByTestId("chat-history-panel")).toBeInTheDocument();
    expect(screen.getByTestId("chat-history-panel")).toHaveAttribute("data-chrome-hidden", "false");
    expect(screen.getByRole("navigation", { name: "Canvas navigation" })).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Ask Reframe anything...")).toBeInTheDocument();
    expect(screen.getByTestId("workspace-top-label")).toBeInTheDocument();
    expect(screen.getByTestId("workspace-top-fade")).toBeInTheDocument();
  });

  it("fills the missing shot from the drawer demo action", () => {
    vi.useFakeTimers();
    render(<App />);

    revealTimeline();
    fireEvent.click(screen.getByTestId("canvas-node-timeline-1"));
    fireEvent.click(screen.getByTestId("timeline-segment-ts-4"));
    expect(screen.getByTestId("missing-shot-actions")).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("missing-shot-generate-ai"));
    expect(screen.getByText("Generating shot...")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(650);
    });

    expect(screen.getByTestId("timeline-segment-ts-4")).toHaveTextContent(
      "Final 3 - Generated missing shot"
    );
    expect(screen.getByTestId("timeline-segment-ts-4-ai-generated")).toHaveTextContent(
      "AI generated"
    );
    expect(screen.getByTestId("timeline-gap-pill-timeline-1")).toHaveTextContent("0 gaps");
  });

  it("updates the drawer timeline when swapping final 4", () => {
    vi.useFakeTimers();
    render(<App />);

    revealTimeline();
    fireEvent.click(screen.getByTestId("canvas-node-timeline-1"));
    fireEvent.click(screen.getByTestId("timeline-segment-ts-5"));
    fireEvent.click(screen.getByTestId("alternate-final-4-alt-1"));

    expect(screen.getByTestId("timeline-segment-ts-5")).toHaveTextContent(
      "Final 4 alternative 1"
    );
  });

  it("bottom prompt submit appends user prompt and simulated tool activity", async () => {
    vi.useFakeTimers();
    render(<App />);

    act(() => {
      vi.advanceTimersByTime(22000);
    });

    fireEvent.change(screen.getByPlaceholderText("Ask Reframe anything..."), {
      target: { value: "Suggest missing shots" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));

    expect(screen.getByText("Suggest missing shots")).toBeInTheDocument();
    expect(screen.getByTestId("simulated-tool-tool-refine-current-canvas")).toHaveAttribute(
      "data-tool-state",
      "running"
    );
  });

  it("renders user messages as dark chat cards without avatar icons", () => {
    vi.useFakeTimers();
    render(<App />);

    const userMessage = screen.getByText(/Here are the brand links and product media/);
    expect(userMessage).toHaveClass("bg-foreground");
    expect(userMessage).toHaveClass("text-background");
    expect(screen.queryByTestId("chat-message-avatar")).not.toBeInTheDocument();
  });

  it("starts from the submitted launch prompt with badges before analysis starts", () => {
    vi.useFakeTimers();
    render(<App />);

    expect(screen.getByText(/Create a pre-order launch video/)).toBeInTheDocument();
    expect(screen.getByText("Product media")).toBeInTheDocument();
    expect(screen.getByText("Camera roll")).toBeInTheDocument();
    expect(screen.queryByText("Starting Reframe")).not.toBeInTheDocument();
    expect(screen.queryByText(/What would you like to create/)).not.toBeInTheDocument();
    expect(screen.getByTestId("simulated-tool-tool-read-sources")).toHaveAttribute(
      "data-tool-state",
      "running"
    );

    act(() => {
      vi.advanceTimersByTime(1200);
    });
    expect(screen.getByTestId("simulated-tool-tool-read-sources")).toHaveAttribute(
      "data-tool-state",
      "completed"
    );
  });
});
