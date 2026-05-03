import { act, fireEvent, render, screen, within } from "@testing-library/react";
import React from "react";
import { App } from "./App";
import { brandContext } from "./data/reframe-demo";

describe("App", () => {
  afterEach(() => {
    vi.useRealTimers();
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

  it("renders the AI chat sidebar and canvas without the navigation menu", () => {
    vi.useFakeTimers();
    render(<App />);

    expect(screen.getByTestId("chat-history-panel")).toHaveTextContent("Building Brand Context");
    expect(screen.getByTestId("infinite-canvas")).toBeInTheDocument();
    expect(screen.queryByText("Preparing your creative canvas")).not.toBeInTheDocument();
    expect(screen.getByTestId("canvas-node-brand-ctx")).toBeInTheDocument();
    expect(screen.queryByText("Side-by-Side Fit Failure Demo")).not.toBeInTheDocument();
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
    expect(screen.queryByText("Side-by-Side Fit Failure Demo")).not.toBeInTheDocument();
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

  it("shows trend recipe skeletons during search before revealing generated cards", () => {
    vi.useFakeTimers();
    render(<App />);

    act(() => {
      vi.advanceTimersByTime(10600);
    });

    expect(screen.getByTestId("simulated-tool-tool-search-web")).toHaveAttribute(
      "data-tool-state",
      "running"
    );
    expect(screen.getByTestId("trend-recipe-skeleton-recipe-1")).toBeInTheDocument();
    expect(screen.queryByText("Side-by-Side Fit Failure Demo")).not.toBeInTheDocument();

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
    expect(screen.getByTestId("canvas-node-recipe-2").style.transform).toBe("translate(1096px, 280px)");
    expect(screen.getByTestId("canvas-node-recipe-3").style.transform).toBe("translate(1096px, 560px)");
    expect(screen.getByTestId("canvas-node-timeline-ghost-recipe-1")).toHaveAttribute(
      "data-preview-mode",
      "preview"
    );
    const timelinePreview = within(
      screen.getByTestId("canvas-node-timeline-ghost-recipe-1")
    ).getByLabelText("Timeline preview");
    expect(timelinePreview).toHaveAttribute("data-slot", "skeleton");
    expect(timelinePreview).not.toHaveClass("animate-skeleton-shimmer");
    expect(timelinePreview).toHaveStyle("background-image: none");
    expect(timelinePreview.getAttribute("style")).toContain("--skeleton-darker-light-bg");
    expect(
      within(screen.getByTestId("canvas-node-timeline-ghost-recipe-1")).queryByLabelText(
        "Loading timeline"
      )
    ).not.toBeInTheDocument();
    expect(screen.getByText("Side-by-Side Fit Failure Demo")).toBeInTheDocument();
    expect(screen.queryByTestId("trend-recipe-skeleton-recipe-1")).not.toBeInTheDocument();
  });

  it("clicking a trend recipe plus action runs the timeline generation flow", () => {
    vi.useFakeTimers();
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
    expect(screen.queryByTestId("canvas-node-create-timeline-recipe-1")).not.toBeInTheDocument();
    expect(screen.getByTestId("canvas-connection-r1-tl")).toBeInTheDocument();
    expect(screen.getByTestId("canvas-node-connector-recipe-1")).toBeInTheDocument();
    expect(screen.getByTestId("timeline-node-skeleton-timeline-1")).toBeInTheDocument();
    expect(screen.getByLabelText("Loading timeline")).toBeInTheDocument();
    expect(screen.getByLabelText("Loading timeline")).toHaveClass("animate-skeleton-shimmer");
    expect(screen.getByTestId("canvas-node-timeline-1").style.transform).toBe("translate(1492px, 0px)");
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
    expect(screen.getByTestId("canvas-node-connector-recipe-1")).toBeInTheDocument();
    expect(screen.getByText("Side-by-Side Fit Failure Demo — Timeline")).toBeInTheDocument();
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
    expect(screen.getByText("Opening frame: hem problem")).toBeInTheDocument();
    expect(screen.getByText(/Upbeat acoustic/)).toBeInTheDocument();
    expect(screen.queryByTestId("chat-history-panel")).not.toBeInTheDocument();
    expect(screen.queryByRole("navigation", { name: "Canvas navigation" })).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText("Ask Reframe anything...")).not.toBeInTheDocument();
    expect(screen.queryByTestId("workspace-top-label")).not.toBeInTheDocument();
    expect(screen.queryByTestId("workspace-top-fade")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Export selected nodes")).not.toBeInTheDocument();
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
    expect(screen.getByTestId("chat-history-panel")).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Canvas navigation" })).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Ask Reframe anything...")).toBeInTheDocument();
    expect(screen.getByTestId("workspace-top-label")).toBeInTheDocument();
    expect(screen.getByTestId("workspace-top-fade")).toBeInTheDocument();
  });

  it("updates the drawer timeline when swapping a selected clip", () => {
    vi.useFakeTimers();
    render(<App />);

    revealTimeline();
    fireEvent.click(screen.getByTestId("canvas-node-timeline-1"));
    fireEvent.click(screen.getByTestId("timeline-segment-ts-1"));
    fireEvent.click(screen.getByTestId("alternate-alt-2"));

    expect(screen.getByTestId("timeline-segment-ts-1")).toHaveTextContent("Product macro detail");
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
