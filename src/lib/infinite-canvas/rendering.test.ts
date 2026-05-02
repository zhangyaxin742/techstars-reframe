import { drawConnections } from "./rendering";
import type { CanvasConnection, CanvasNode } from "./types";

function createContext() {
  return {
    save: vi.fn(),
    restore: vi.fn(),
    translate: vi.fn(),
    scale: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    bezierCurveTo: vi.fn(),
    stroke: vi.fn(),
    lineWidth: 0,
    strokeStyle: "",
  } as unknown as CanvasRenderingContext2D;
}

describe("canvas rendering helpers", () => {
  it("draws a curve for each valid connection", () => {
    const nodes: CanvasNode[] = [
      {
        id: "a",
        kind: "note",
        title: "A",
        position: { x: 0, y: 0 },
        size: { width: 100, height: 80 },
      },
      {
        id: "b",
        kind: "note",
        title: "B",
        position: { x: 200, y: 0 },
        size: { width: 100, height: 80 },
      },
    ];
    const connections: CanvasConnection[] = [
      { id: "ab", sourceNodeId: "a", targetNodeId: "b" },
    ];
    const context = createContext();

    drawConnections({
      context,
      nodes,
      connections,
      viewport: { offset: { x: 0, y: 0 }, zoom: 1 },
      positions: new Map(),
    });

    expect(context.moveTo).toHaveBeenCalledWith(50, 40);
    expect(context.bezierCurveTo).toHaveBeenCalledWith(150, 40, 150, 40, 250, 40);
    expect(context.stroke).toHaveBeenCalledTimes(1);
  });
});
