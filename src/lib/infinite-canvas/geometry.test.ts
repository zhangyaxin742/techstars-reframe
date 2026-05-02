import {
  calculateSelectionBounds,
  getNodesInRect,
  normalizeRect,
  screenToWorld,
  worldToScreen,
} from "./geometry";
import type { CanvasNode } from "./types";

const nodes: CanvasNode[] = [
  {
    id: "a",
    kind: "note",
    title: "A",
    position: { x: 10, y: 20 },
    size: { width: 100, height: 80 },
  },
  {
    id: "b",
    kind: "note",
    title: "B",
    position: { x: 200, y: 120 },
    size: { width: 120, height: 90 },
  },
];

describe("infinite canvas geometry", () => {
  it("converts between screen and world coordinates", () => {
    const viewport = { offset: { x: 100, y: 50 }, zoom: 2 };
    const world = screenToWorld({ x: 20, y: 30 }, viewport);

    expect(world).toEqual({ x: 110, y: 65 });
    expect(worldToScreen(world, viewport)).toEqual({ x: 20, y: 30 });
  });

  it("normalizes drag rectangles and finds intersecting nodes", () => {
    const rect = normalizeRect({ x: 180, y: 180 }, { x: 0, y: 0 });

    expect(rect).toEqual({ x: 0, y: 0, width: 180, height: 180 });
    expect(getNodesInRect(nodes, rect)).toEqual(["a"]);
  });

  it("calculates selected node bounds with moved positions", () => {
    const bounds = calculateSelectionBounds(
      nodes,
      new Set(["a", "b"]),
      new Map([["b", { x: 160, y: 100 }]])
    );

    expect(bounds).toEqual({ x: 10, y: 20, width: 270, height: 170 });
  });
});
