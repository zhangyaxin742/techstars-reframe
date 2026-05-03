import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React, { useState } from "react";
import { InfiniteCanvas } from "./infinite-canvas";
import type { CanvasNode } from "../../lib/infinite-canvas/types";

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

describe("InfiniteCanvas", () => {
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
            onExportSelected={vi.fn()}
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

    expect(screen.getByLabelText("Export selected nodes")).toBeEnabled();
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
    expect(screen.getByLabelText("Documents")).toHaveAttribute("aria-current", "page");
    expect(screen.queryByTestId("marquee-overlay")).not.toBeInTheDocument();
    expect(canvas).toBeInTheDocument();
  });
});
