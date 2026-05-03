import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React, { useState } from "react";
import { InfiniteCanvas } from "./infinite-canvas";
import type { CanvasNode } from "../../lib/infinite-canvas/types";
import { exportTargets } from "../../data/reframe-demo";

const nodes: CanvasNode[] = [
  {
    id: "a",
    kind: "note",
    title: "A",
    body: "First",
    position: { x: 0, y: 0 },
    size: { width: 120, height: 100 },
  },
  {
    id: "b",
    kind: "note",
    title: "B",
    body: "Second",
    position: { x: 220, y: 0 },
    size: { width: 120, height: 100 },
  },
];

function renderCanvas(props: Partial<React.ComponentProps<typeof InfiniteCanvas>> = {}) {
  const result = render(
    <div style={{ width: 900, height: 600 }}>
      <InfiniteCanvas nodes={nodes} {...props} />
    </div>
  );
  const canvas = screen.getByTestId("infinite-canvas");
  vi.spyOn(canvas, "getBoundingClientRect").mockReturnValue({
    x: 0,
    y: 0,
    width: 900,
    height: 600,
    top: 0,
    left: 0,
    right: 900,
    bottom: 600,
    toJSON: () => ({}),
  });
  return { ...result, canvas };
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

describe("InfiniteCanvas", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("prevents default wheel behavior for canvas navigation", () => {
    const { canvas } = renderCanvas();
    const event = new WheelEvent("wheel", {
      deltaY: 100,
      bubbles: true,
      cancelable: true,
    });

    canvas.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
  });

  it("uses vertical wheel delta for horizontal panning when shift is held", async () => {
    const { canvas } = renderCanvas();
    const transformLayer = screen.getByTestId("canvas-node-a").parentElement;
    const initialTransform = transformLayer?.style.transform;
    const event = new WheelEvent("wheel", {
      deltaX: 0,
      deltaY: 120,
      shiftKey: true,
      bubbles: true,
      cancelable: true,
    });

    canvas.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
    await waitFor(() => {
      expect(transformLayer?.style.transform).not.toBe(initialTransform);
    });
  });

  it("uses horizontal wheel delta for shift panning when the browser supplies it", async () => {
    const { canvas } = renderCanvas();
    const transformLayer = screen.getByTestId("canvas-node-a").parentElement;
    const initialTransform = transformLayer?.style.transform;
    const event = new WheelEvent("wheel", {
      deltaX: 120,
      deltaY: 0,
      shiftKey: true,
      bubbles: true,
      cancelable: true,
    });

    canvas.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
    await waitFor(() => {
      expect(transformLayer?.style.transform).not.toBe(initialTransform);
    });
  });

  it("pans instead of marquee selecting while space is held", async () => {
    const { canvas } = renderCanvas();
    const transformLayer = screen.getByTestId("canvas-node-a").parentElement;
    const initialTransform = transformLayer?.style.transform;

    fireEvent.keyDown(window, { key: " ", code: "Space" });
    fireEvent.pointerDown(canvas, { button: 0, clientX: 100, clientY: 100, pointerId: 1 });
    fireEvent.pointerMove(canvas, { clientX: 160, clientY: 130, pointerId: 1 });

    expect(screen.queryByTestId("marquee-overlay")).not.toBeInTheDocument();
    await waitFor(() => {
      expect(transformLayer?.style.transform).not.toBe(initialTransform);
    });

    fireEvent.pointerUp(canvas, { clientX: 160, clientY: 130, pointerId: 1 });
    fireEvent.keyUp(window, { key: " ", code: "Space" });
  });

  it("pans instead of dragging a node while space is held", async () => {
    const onNodeMove = vi.fn();
    const { canvas } = renderCanvas({ selectedNodeIds: new Set(["a"]), onNodeMove });
    const node = screen.getByTestId("canvas-node-a");
    const transformLayer = node.parentElement;
    const initialTransform = transformLayer?.style.transform;

    fireEvent.keyDown(window, { key: " ", code: "Space" });
    fireEvent.pointerDown(node, { button: 0, clientX: 100, clientY: 100, pointerId: 1 });
    fireEvent.pointerMove(canvas, { clientX: 160, clientY: 130, pointerId: 1 });
    fireEvent.pointerUp(canvas, { clientX: 160, clientY: 130, pointerId: 1 });
    fireEvent.click(node);
    fireEvent.keyUp(window, { key: " ", code: "Space" });

    expect(onNodeMove).not.toHaveBeenCalled();
    await waitFor(() => {
      expect(transformLayer?.style.transform).not.toBe(initialTransform);
    });
  });

  it("keeps space key handling out of text editing targets", async () => {
    const { canvas } = renderCanvas({
      bottomPromptBox: {
        value: "Start here",
        placeholder: "Describe your edit...",
        actionLabel: "Generate",
      },
    });
    const textarea = screen.getByPlaceholderText("Describe your edit...");

    fireEvent.keyDown(textarea, { key: " ", code: "Space" });
    fireEvent.pointerDown(canvas, { button: 0, clientX: 10, clientY: 10, pointerId: 1 });

    await waitFor(() => expect(screen.getByTestId("marquee-overlay")).toBeInTheDocument());
    fireEvent.pointerUp(canvas, { clientX: 10, clientY: 10, pointerId: 1 });
  });

  it("selects nodes with a marquee drag", async () => {
    function ControlledCanvas() {
      const [selectedNodeIds, setSelectedNodeIds] = useState<Set<string>>(new Set());
      return (
        <div style={{ width: 900, height: 600 }}>
          <InfiniteCanvas
            nodes={nodes}
            selectedNodeIds={selectedNodeIds}
            onSelectionChange={setSelectedNodeIds}
            onDeleteSelected={vi.fn()}
          />
        </div>
      );
    }

    render(<ControlledCanvas />);
    const canvas = screen.getByTestId("infinite-canvas");
    vi.spyOn(canvas, "getBoundingClientRect").mockReturnValue({
      x: 0,
      y: 0,
      width: 900,
      height: 600,
      top: 0,
      left: 0,
      right: 900,
      bottom: 600,
      toJSON: () => ({}),
    });

    fireEvent.pointerDown(canvas, { button: 0, clientX: 10, clientY: 10, pointerId: 1 });
    await waitFor(() => expect(screen.getByTestId("marquee-overlay")).toBeInTheDocument());
    fireEvent.pointerMove(canvas, { clientX: 220, clientY: 170, pointerId: 1 });
    fireEvent.pointerUp(canvas, { clientX: 220, clientY: 170, pointerId: 1 });
    fireEvent.click(canvas);

    expect(screen.queryByLabelText("Export timeline")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Delete selected nodes")).toBeEnabled();
  });

  it("places the selection toolbar higher above the selected node", () => {
    renderCanvas({
      nodes: [
        {
          ...nodes[0],
          position: { x: 100, y: 160 },
        },
      ],
      selectedNodeIds: new Set(["a"]),
    });

    expect(screen.getByTestId("selection-toolbar")).toHaveStyle({ top: "128px" });
  });

  it("shows only delete for ordinary selected nodes", () => {
    renderCanvas({ selectedNodeIds: new Set(["a"]), onDeleteSelected: vi.fn() });

    expect(screen.queryByLabelText("Export timeline")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Download preview")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Publish preview")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Post to Instagram")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Delete selected nodes")).toBeEnabled();
  });

  it("shows download and publish actions for a selected preview node", () => {
    const onDownloadPreview = vi.fn();
    const onPublishPreview = vi.fn();
    renderCanvas({
      nodes: [
        {
          id: "preview-1",
          kind: "preview",
          title: "Preview",
          position: { x: 100, y: 160 },
          size: { width: 210, height: 380 },
        },
      ],
      selectedNodeIds: new Set(["preview-1"]),
      onDeleteSelected: vi.fn(),
      onDownloadPreview,
      onPublishPreview,
    });

    fireEvent.click(screen.getByLabelText("Download preview"));
    fireEvent.click(screen.getByLabelText("Post to Instagram"));

    expect(screen.queryByLabelText("Export timeline")).not.toBeInTheDocument();
    expect(onDownloadPreview).toHaveBeenCalledWith(new Set(["preview-1"]));
    expect(onPublishPreview).toHaveBeenCalledWith(new Set(["preview-1"]));
    expect(screen.getByLabelText("Delete selected nodes")).toBeEnabled();
  });

  it("shows hover tooltips for preview toolbar actions", async () => {
    const user = userEvent.setup();
    const labels = ["Download preview", "Post to Instagram", "Delete selected nodes"];

    for (const label of labels) {
      renderCanvas({
        nodes: [
          {
            id: "preview-1",
            kind: "preview",
            title: "Preview",
            position: { x: 100, y: 160 },
            size: { width: 210, height: 380 },
          },
        ],
        selectedNodeIds: new Set(["preview-1"]),
        onDeleteSelected: vi.fn(),
        onDownloadPreview: vi.fn(),
        onPublishPreview: vi.fn(),
      });

      await user.hover(screen.getByLabelText(label));
      expect((await screen.findAllByText(label)).length).toBeGreaterThan(0);

      cleanup();
    }
  });

  it("shows editor export options for a selected timeline node", async () => {
    const user = userEvent.setup();
    const onExportTimeline = vi.fn();
    renderCanvas({
      nodes: [
        {
          id: "timeline-1",
          kind: "timeline",
          title: "Timeline",
          position: { x: 100, y: 160 },
          size: { width: 480, height: 280 },
        },
      ],
      selectedNodeIds: new Set(["timeline-1"]),
      exportTargets,
      onExportTimeline,
      onDeleteSelected: vi.fn(),
    });

    await user.click(screen.getByLabelText("Export timeline"));

    expect(screen.getByLabelText("Export timeline")).toHaveClass("w-auto");
    expect(screen.getByLabelText("Export timeline")).toHaveClass("px-2.5");
    expect(screen.getByText("CapCut")).toBeInTheDocument();
    expect(screen.getByText("Adobe Premiere Pro")).toBeInTheDocument();
    expect(screen.getByText("DaVinci Resolve")).toBeInTheDocument();

    await user.click(screen.getByText("CapCut"));

    expect(onExportTimeline).toHaveBeenCalledWith("capcut", new Set(["timeline-1"]));
    expect(screen.getByLabelText("Delete selected nodes")).toBeEnabled();
  });

  it("shows a hover tooltip for the timeline export action", async () => {
    const user = userEvent.setup();
    renderCanvas({
      nodes: [
        {
          id: "timeline-1",
          kind: "timeline",
          title: "Timeline",
          position: { x: 100, y: 160 },
          size: { width: 480, height: 280 },
        },
      ],
      selectedNodeIds: new Set(["timeline-1"]),
      exportTargets,
      onExportTimeline: vi.fn(),
      onDeleteSelected: vi.fn(),
    });

    await user.hover(screen.getByLabelText("Export timeline"));

    expect((await screen.findAllByText("Export timeline")).length).toBeGreaterThan(0);
  });

  it("reports node drag updates", () => {
    const onNodeMove = vi.fn();
    const selectedNodeIds = new Set(["a"]);
    const { canvas } = renderCanvas({ selectedNodeIds, onNodeMove });
    const node = screen.getByTestId("canvas-node-a");

    fireEvent.pointerDown(node, { button: 0, clientX: 100, clientY: 100, pointerId: 1 });
    fireEvent.pointerMove(canvas, { clientX: 160, clientY: 120, pointerId: 1 });
    fireEvent.pointerUp(canvas, { clientX: 160, clientY: 120, pointerId: 1 });

    expect(onNodeMove).toHaveBeenCalledTimes(1);
    expect(onNodeMove.mock.calls[0][0][0].nodeId).toBe("a");
  });

  it("renders the sticky bottom prompt composer", async () => {
    const user = userEvent.setup();
    const onBottomPromptSubmit = vi.fn();

    function ControlledCanvas() {
      const [prompt, setPrompt] = useState("Start here");
      return (
        <div style={{ width: 900, height: 600 }}>
          <InfiniteCanvas
            nodes={nodes}
            bottomPromptBox={{
              value: prompt,
              placeholder: "Describe your edit...",
              actionLabel: "Generate",
            }}
            onBottomPromptChange={setPrompt}
            onBottomPromptSubmit={onBottomPromptSubmit}
          />
        </div>
      );
    }

    render(<ControlledCanvas />);

    await user.clear(screen.getByPlaceholderText("Describe your edit..."));
    await user.type(screen.getByPlaceholderText("Describe your edit..."), "Refine this path");
    await user.click(screen.getByRole("button", { name: "Generate" }));

    expect(onBottomPromptSubmit).toHaveBeenCalledWith("Refine this path");
  });

  it("renders the floating canvas navigation rail without starting canvas selection", () => {
    const { canvas } = renderCanvas();

    fireEvent.pointerDown(screen.getByLabelText("Add new canvas item"), {
      button: 0,
      clientX: 24,
      clientY: 240,
      pointerId: 1,
    });
    fireEvent.click(screen.getByLabelText("Add new canvas item"));

    expect(screen.getByRole("navigation", { name: "Canvas navigation" })).toBeInTheDocument();
    expect(screen.getByLabelText("Library")).toHaveAttribute("aria-current", "page");
    expect(screen.getByLabelText("Trends")).toBeInTheDocument();
    expect(screen.getByLabelText("History")).toBeInTheDocument();
    expect(screen.queryByTestId("marquee-overlay")).not.toBeInTheDocument();
    expect(canvas).toBeInTheDocument();
  });

  it("opens a compact trending video drawer from the navigation rail", async () => {
    const user = userEvent.setup();
    renderCanvas();

    await user.click(screen.getByLabelText("Trends"));

    expect(screen.getByText("Trending")).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.queryByRole("navigation", { name: "Canvas navigation" })).not.toBeInTheDocument();
    });
    expect(screen.getByTestId("trending-rail-grid")).toHaveClass("grid-cols-2");
    expect(screen.queryByText("Private")).not.toBeInTheDocument();
    expect(screen.queryByText("Team")).not.toBeInTheDocument();
    expect(screen.queryByText("Favorite")).not.toBeInTheDocument();
    expect(screen.queryByText("Trail Clips")).not.toBeInTheDocument();

    const videos = screen.getAllByTestId("trending-rail-video") as HTMLVideoElement[];
    expect(videos).toHaveLength(8);
    for (const video of videos) {
      expect(video.loop).toBe(true);
      expect(video.muted).toBe(true);
      expect(video.autoplay).toBe(true);
      expect(video.playsInline).toBe(true);
    }

    await user.click(screen.getByLabelText("Back"));

    await waitFor(() => {
      expect(screen.queryByText("Trending")).not.toBeInTheDocument();
    });
    expect(screen.getByRole("navigation", { name: "Canvas navigation" })).toBeInTheDocument();
  });

  it("shows hover tooltips for navigation rail items", async () => {
    const user = userEvent.setup();

    for (const label of ["Library", "Trends", "History"]) {
      renderCanvas();

      await user.hover(screen.getByLabelText(label));
      expect((await screen.findAllByText(label)).length).toBeGreaterThan(0);

      cleanup();
    }
  });

  it("centers a requested viewport focus target", async () => {
    mockCanvasBounds();

    render(
      <div style={{ width: 900, height: 600 }}>
        <InfiniteCanvas
          nodes={nodes}
          viewportFocus={{
            id: "focus-a",
            nodeIds: ["a"],
            padding: 0,
            maxZoom: 1,
            delayMs: 0,
            durationMs: 0,
          }}
        />
      </div>
    );

    const transformLayer = screen.getByTestId("canvas-node-a").parentElement;

    await waitFor(() => {
      expect(transformLayer?.style.transform).toBe("translate(390px, 250px) scale(1)");
    });
  });

  it("does not refocus repeatedly when the focus id is reused", async () => {
    mockCanvasBounds();
    const { rerender } = render(
      <div style={{ width: 900, height: 600 }}>
        <InfiniteCanvas
          nodes={nodes}
          viewportFocus={{
            id: "focus-a",
            nodeIds: ["a"],
            padding: 0,
            maxZoom: 1,
            delayMs: 0,
            durationMs: 0,
          }}
        />
      </div>
    );

    const initialTransformLayer = screen.getByTestId("canvas-node-a").parentElement;
    await waitFor(() => {
      expect(initialTransformLayer?.style.transform).toBe("translate(390px, 250px) scale(1)");
    });

    rerender(
      <div style={{ width: 900, height: 600 }}>
        <InfiniteCanvas
          nodes={[
            { ...nodes[0], position: { x: 500, y: 500 } },
            nodes[1],
          ]}
          viewportFocus={{
            id: "focus-a",
            nodeIds: ["a"],
            padding: 0,
            maxZoom: 1,
            delayMs: 0,
            durationMs: 0,
          }}
        />
      </div>
    );

    expect(screen.getByTestId("canvas-node-a").parentElement?.style.transform).toBe(
      "translate(390px, 250px) scale(1)"
    );
  });

  it("lets manual wheel movement supersede a pending viewport focus animation", async () => {
    vi.useFakeTimers();
    mockCanvasBounds();

    render(
      <div style={{ width: 900, height: 600 }}>
        <InfiniteCanvas
          nodes={nodes}
          viewportFocus={{
            id: "focus-a",
            nodeIds: ["a"],
            padding: 0,
            maxZoom: 1,
            delayMs: 500,
            durationMs: 1000,
          }}
        />
      </div>
    );

    const canvas = screen.getByTestId("infinite-canvas");
    const transformLayer = screen.getByTestId("canvas-node-a").parentElement;
    const event = new WheelEvent("wheel", {
      deltaY: 120,
      bubbles: true,
      cancelable: true,
    });

    canvas.dispatchEvent(event);
    act(() => {
      vi.advanceTimersByTime(1800);
    });

    expect(event.defaultPrevented).toBe(true);
    expect(transformLayer?.style.transform).not.toBe("translate(390px, 250px) scale(1)");
  });
});
