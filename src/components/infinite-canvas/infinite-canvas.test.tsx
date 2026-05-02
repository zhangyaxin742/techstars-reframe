import { fireEvent, render, screen } from "@testing-library/react";
import { InfiniteCanvas } from "./infinite-canvas";
import type { CanvasNode } from "@/lib/infinite-canvas/types";

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

  it("selects nodes with a marquee drag", () => {
    const onSelectionChange = vi.fn();
    const { canvas } = renderCanvas({ onSelectionChange });

    fireEvent.pointerDown(canvas, { button: 0, clientX: 10, clientY: 10, pointerId: 1 });
    fireEvent.pointerMove(canvas, { clientX: 220, clientY: 170, pointerId: 1 });
    fireEvent.pointerUp(canvas, { clientX: 220, clientY: 170, pointerId: 1 });

    expect(onSelectionChange).toHaveBeenCalled();
    const lastSelection = onSelectionChange.mock.calls.at(-1)?.[0] as Set<string>;
    expect(Array.from(lastSelection)).toContain("a");
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
});
