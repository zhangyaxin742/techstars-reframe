import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { timelineSegments } from "../../data/reframe-demo";
import { TimelineAssembly } from "./timeline-assembly";

function mockTimelineTrackRect(element: HTMLElement) {
  vi.spyOn(element, "getBoundingClientRect").mockReturnValue({
    bottom: 198,
    height: 198,
    left: 0,
    right: 1120,
    top: 0,
    width: 1120,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  } as DOMRect);
}

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
    expect(screen.getByText("Hook - Fit problem")).toBeInTheDocument();
    expect(screen.getByText("Product reveal")).toBeInTheDocument();
    expect(screen.getByAltText("Hook - Fit problem")).toHaveAttribute(
      "src",
      "/assets/trending%20demo%20timeline/final_1.jpg"
    );
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

  it("shows alternate clips when final 4 is selected", () => {
    render(
      <TimelineAssembly
        segments={timelineSegments}
        selectedSegmentId="ts-5"
        onSelectSegment={vi.fn()}
        onSwapClip={vi.fn()}
      />
    );
    expect(screen.getByTestId("alternate-clips")).toBeInTheDocument();
    expect(screen.getByText("Final 4 alternative 1")).toBeInTheDocument();
    expect(screen.getByText("Final 4 alternative 2")).toBeInTheDocument();
  });

  it("calls onSwapClip when a final 4 alternate is clicked", async () => {
    const onSwapClip = vi.fn();
    const user = userEvent.setup();
    render(
      <TimelineAssembly
        segments={timelineSegments}
        selectedSegmentId="ts-5"
        onSelectSegment={vi.fn()}
        onSwapClip={onSwapClip}
      />
    );
    await user.click(screen.getByTestId("alternate-final-4-alt-1"));
    expect(onSwapClip).toHaveBeenCalledTimes(1);
    expect(onSwapClip).toHaveBeenCalledWith(
      "ts-5",
      expect.objectContaining({
        id: "final-4-alt-1",
        thumbnail: "/assets/trending%20demo%20timeline/final_4_alternative_1.jpg",
      })
    );
  });

  it("shows missing-shot fill actions when the missing segment is selected", () => {
    render(
      <TimelineAssembly
        segments={timelineSegments}
        selectedSegmentId="ts-4"
        onSelectSegment={vi.fn()}
        onSwapClip={vi.fn()}
      />
    );

    expect(screen.getByTestId("missing-shot-actions")).toBeInTheDocument();
    expect(screen.getByTestId("missing-shot-generate-ai")).toHaveClass("h-16");
    expect(screen.getByTestId("missing-shot-upload")).toHaveClass("h-16");
    expect(screen.getByText("Generate with AI")).toBeInTheDocument();
    expect(screen.getByText("Drag and drop or click to upload video")).toBeInTheDocument();
  });

  it("starts AI generation without swapping the missing shot directly", async () => {
    const onSwapClip = vi.fn();
    const onGenerateMissingShotWithAi = vi.fn();
    const user = userEvent.setup();
    render(
      <TimelineAssembly
        segments={timelineSegments}
        selectedSegmentId="ts-4"
        onSelectSegment={vi.fn()}
        onSwapClip={onSwapClip}
        onGenerateMissingShotWithAi={onGenerateMissingShotWithAi}
      />
    );

    await user.click(screen.getByTestId("missing-shot-generate-ai"));
    expect(onSwapClip).not.toHaveBeenCalled();
    expect(onGenerateMissingShotWithAi).toHaveBeenCalledWith(
      "ts-4",
      expect.objectContaining({
        id: "final-3",
        thumbnail: "/assets/trending%20demo%20timeline/final_3.jpg",
      })
    );
  });

  it("fills the missing shot from the upload demo action", async () => {
    const onSwapClip = vi.fn();
    const user = userEvent.setup();
    render(
      <TimelineAssembly
        segments={timelineSegments}
        selectedSegmentId="ts-4"
        onSelectSegment={vi.fn()}
        onSwapClip={onSwapClip}
      />
    );

    await user.click(screen.getByTestId("missing-shot-upload"));
    expect(onSwapClip).toHaveBeenCalledWith("ts-4", expect.objectContaining({ id: "final-3" }));
  });

  it("shows inline AI generation progress for the selected missing shot", () => {
    render(
      <TimelineAssembly
        segments={timelineSegments}
        selectedSegmentId="ts-4"
        onSelectSegment={vi.fn()}
        onSwapClip={vi.fn()}
        onGenerateMissingShotWithAi={vi.fn()}
        aiGeneratingSegmentId="ts-4"
      />
    );

    expect(screen.getByTestId("missing-shot-generate-ai")).toBeDisabled();
    expect(screen.getByTestId("missing-shot-generate-ai")).toHaveAttribute("aria-busy", "true");
    expect(screen.getByText("Generating shot...")).toBeInTheDocument();
  });

  it("marks filled AI-generated segments inline", () => {
    const generatedSegments = timelineSegments.map((segment) =>
      segment.id === "ts-4"
        ? {
            ...segment,
            kind: "clip" as const,
            mediaAssetId: "final-3",
            selectedAssetLabel: "Final 3 - Generated missing shot",
            thumbnail: "/assets/trending%20demo%20timeline/final_3.jpg",
          }
        : segment
    );

    render(
      <TimelineAssembly
        segments={generatedSegments}
        selectedSegmentId="ts-4"
        onSelectSegment={vi.fn()}
        aiGeneratedSegmentIds={new Set(["ts-4"])}
      />
    );

    expect(screen.getByTestId("timeline-segment-ts-4-ai-generated")).toHaveTextContent(
      "AI generated"
    );
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
    expect(screen.getByTestId("timeline-track-surface")).toHaveStyle({
      width: "100%",
      minWidth: "1120px",
    });
    expect(screen.getByTestId("timeline-segment-ts-4")).toHaveClass("border-yellow-500/50");
    expect(screen.getByTestId("timeline-segment-ts-4")).toHaveTextContent("shot missing");
    expect(screen.getByTestId("timeline-segment-ts-4")).not.toHaveTextContent("Drop media here");
    expect(screen.getByTestId("timeline-segment-ts-2")).toHaveTextContent(
      "I couldn't find hiking pants that fit so I made my own."
    );
    expect(screen.queryByTestId("timeline-segment-ts-7")).not.toBeInTheDocument();
    expect(screen.queryByText("Preorder now → petiteoutdoors.com")).not.toBeInTheDocument();
    expect(screen.getByTestId("timeline-segment-ts-9")).toHaveTextContent("Upbeat acoustic");
    expect(screen.getByTestId("timeline-audio-waveform-ts-9")).toHaveAttribute(
      "src",
      "/assets/trending%20demo%20timeline/Rectangle.png"
    );
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
      left: `${(3200 / 18000) * 100}%`,
    });
    expect(screen.getByTestId("audio-beat-marker-6000")).toBeInTheDocument();
    expect(screen.getByTestId("audio-beat-marker-8000")).toBeInTheDocument();
    expect(screen.getByTestId("audio-beat-marker-12100")).toBeInTheDocument();
    expect(screen.getByTestId("audio-beat-marker-15600")).toBeInTheDocument();
  });

  it("shows a red hover scrubber with the current drawer timecode", () => {
    const onScrubPreviewTimeChange = vi.fn();
    render(
      <TimelineAssembly
        segments={timelineSegments}
        selectedSegmentId={null}
        onSelectSegment={vi.fn()}
        onScrubPreviewTimeChange={onScrubPreviewTimeChange}
        variant="drawer"
      />
    );

    const trackSurface = screen.getByTestId("timeline-track-surface");
    mockTimelineTrackRect(trackSurface);

    fireEvent.pointerMove(trackSurface, { clientX: 560 });

    expect(screen.getByTestId("timeline-hover-scrubber")).toBeInTheDocument();
    expect(screen.getByTestId("timeline-hover-scrubber-line")).toHaveClass("bg-destructive");
    expect(screen.getByTestId("timeline-hover-scrubber-line")).toHaveStyle({ left: "50%" });
    expect(screen.getByTestId("timeline-hover-scrubber-time")).toHaveTextContent("0:09");
    expect(onScrubPreviewTimeChange).toHaveBeenCalledWith(9000);
  });

  it("hides the drawer scrubber when the pointer leaves the timeline", () => {
    const onScrubPreviewTimeChange = vi.fn();
    render(
      <TimelineAssembly
        segments={timelineSegments}
        selectedSegmentId={null}
        onSelectSegment={vi.fn()}
        onScrubPreviewTimeChange={onScrubPreviewTimeChange}
        variant="drawer"
      />
    );

    const trackSurface = screen.getByTestId("timeline-track-surface");
    mockTimelineTrackRect(trackSurface);

    fireEvent.pointerMove(trackSurface, { clientX: 560 });
    expect(screen.getByTestId("timeline-hover-scrubber")).toBeInTheDocument();

    fireEvent.pointerLeave(trackSurface);
    expect(screen.queryByTestId("timeline-hover-scrubber")).not.toBeInTheDocument();
    expect(onScrubPreviewTimeChange).toHaveBeenLastCalledWith(null);
  });

  it("keeps drawer segment selection working while the scrubber is visible", async () => {
    const onSelectSegment = vi.fn();
    const user = userEvent.setup();
    render(
      <TimelineAssembly
        segments={timelineSegments}
        selectedSegmentId={null}
        onSelectSegment={onSelectSegment}
        variant="drawer"
      />
    );

    const trackSurface = screen.getByTestId("timeline-track-surface");
    mockTimelineTrackRect(trackSurface);
    fireEvent.pointerMove(trackSurface, { clientX: 560 });

    await user.click(screen.getByTestId("timeline-segment-ts-1"));

    expect(screen.getByTestId("timeline-hover-scrubber")).toBeInTheDocument();
    expect(onSelectSegment).toHaveBeenCalledWith("ts-1");
  });

  it("shows the swapped asset label when provided", () => {
    render(
      <TimelineAssembly
        segments={timelineSegments.map((segment) =>
          segment.id === "ts-5"
            ? { ...segment, selectedAssetLabel: "Final 4 alternative 1" }
            : segment
        )}
        selectedSegmentId={null}
        onSelectSegment={vi.fn()}
        variant="drawer"
      />
    );

    expect(screen.getByTestId("timeline-segment-ts-5")).toHaveTextContent("Final 4 alternative 1");
  });
});
