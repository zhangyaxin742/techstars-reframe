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
    expect(screen.getByText("Opening frame: hem problem")).toBeInTheDocument();
    expect(screen.getByText("Mirror fit check")).toBeInTheDocument();
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
    expect(screen.getByText("Product macro detail")).toBeInTheDocument();
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
    await user.click(screen.getByTestId("alternate-alt-2"));
    expect(onSwapClip).toHaveBeenCalledTimes(1);
    expect(onSwapClip).toHaveBeenCalledWith("ts-1", expect.objectContaining({ id: "alt-2" }));
  });
});
