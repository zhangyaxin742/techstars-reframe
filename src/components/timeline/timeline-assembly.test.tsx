import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { timelineSegments } from "../../data/reframe-demo";
import { TimelineAssembly } from "./timeline-assembly";

describe("TimelineAssembly", () => {
  it("renders timeline segments", () => {
    render(
      <TimelineAssembly
        segments={timelineSegments}
        selectedSegmentId={null}
        onSelectSegment={vi.fn()}
      />
    );
    expect(screen.getByTestId("timeline-assembly")).toBeInTheDocument();
    expect(screen.getByText("Hook – Trail energy")).toBeInTheDocument();
    expect(screen.getByText("Product reveal")).toBeInTheDocument();
  });

  it("selects a segment on click", async () => {
    const onSelectSegment = vi.fn();
    const user = userEvent.setup();
    render(
      <TimelineAssembly
        segments={timelineSegments}
        selectedSegmentId={null}
        onSelectSegment={onSelectSegment}
      />
    );
    await user.click(screen.getByTestId("timeline-segment-ts-1"));
    expect(onSelectSegment).toHaveBeenCalledWith("ts-1");
  });

  it("shows alternate clips when a segment is selected", () => {
    render(
      <TimelineAssembly
        segments={timelineSegments}
        selectedSegmentId="ts-1"
        onSelectSegment={vi.fn()}
        onSwapClip={vi.fn()}
      />
    );
    expect(screen.getByTestId("alternate-clips")).toBeInTheDocument();
    expect(screen.getByText("Alternate trail angle")).toBeInTheDocument();
  });

  it("calls onSwapClip when an alternate is clicked", async () => {
    const onSwapClip = vi.fn();
    const user = userEvent.setup();
    render(
      <TimelineAssembly
        segments={timelineSegments}
        selectedSegmentId="ts-1"
        onSelectSegment={vi.fn()}
        onSwapClip={onSwapClip}
      />
    );
    await user.click(screen.getByTestId("alternate-alt-1"));
    expect(onSwapClip).toHaveBeenCalledTimes(1);
    expect(onSwapClip).toHaveBeenCalledWith("ts-1", expect.objectContaining({ id: "alt-1" }));
  });

  it("renders the drawer variant with separate timeline tracks", () => {
    render(
      <TimelineAssembly
        segments={timelineSegments}
        selectedSegmentId={null}
        onSelectSegment={vi.fn()}
        variant="drawer"
      />
    );

    expect(screen.getByText("Video Track")).toBeInTheDocument();
    expect(screen.getByText("Text Overlay")).toBeInTheDocument();
    expect(screen.getByText("Audio (Beat)")).toBeInTheDocument();
    expect(screen.getByText("0:18")).toBeInTheDocument();
    expect(screen.queryByText("0:21")).not.toBeInTheDocument();
    expect(screen.getByTestId("timeline-segment-ts-4")).toHaveClass("border-yellow-500/50");
    expect(screen.getByTestId("timeline-segment-ts-9")).toHaveTextContent("Upbeat acoustic");
  });

  it("aligns audio beat markers to clip transition boundaries", () => {
    render(
      <TimelineAssembly
        segments={timelineSegments}
        selectedSegmentId={null}
        onSelectSegment={vi.fn()}
        variant="drawer"
      />
    );

    expect(screen.getByTestId("audio-beat-marker-3200")).toHaveStyle({
      left: `${(3200 / 21000) * 100}%`,
    });
    expect(screen.getByTestId("audio-beat-marker-6000")).toBeInTheDocument();
    expect(screen.getByTestId("audio-beat-marker-8000")).toBeInTheDocument();
    expect(screen.getByTestId("audio-beat-marker-12100")).toBeInTheDocument();
    expect(screen.getByTestId("audio-beat-marker-15600")).toBeInTheDocument();
  });

  it("shows the swapped asset label when provided", () => {
    render(
      <TimelineAssembly
        segments={timelineSegments.map((segment) =>
          segment.id === "ts-1"
            ? { ...segment, selectedAssetLabel: "Alternate trail angle" }
            : segment
        )}
        selectedSegmentId={null}
        onSelectSegment={vi.fn()}
        variant="drawer"
      />
    );

    expect(screen.getByTestId("timeline-segment-ts-1")).toHaveTextContent("Alternate trail angle");
  });
});
