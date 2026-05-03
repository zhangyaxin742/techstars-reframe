import {
  calculateSelectionBounds,
  fitBoundsToViewport,
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

  it("centers a single timeline node in the viewport", () => {
    const timelineNode: CanvasNode = {
      id: "timeline-1",
      kind: "timeline",
      title: "Timeline",
      position: { x: 1000, y: 200 },
      size: { width: 320, height: 220 },
    };
    const bounds = calculateSelectionBounds([timelineNode], new Set(["timeline-1"]));
    const viewport = fitBoundsToViewport(bounds!, { width: 900, height: 600 }, 0, 0.25, 1);
    const nodeCenter = worldToScreen({ x: 1160, y: 310 }, viewport);

    expect(nodeCenter.x).toBeCloseTo(450);
    expect(nodeCenter.y).toBeCloseTo(300);
  });

  it("centers a trend recipe group as the viewport focus", () => {
    const recipeNodes: CanvasNode[] = [
      {
        id: "recipe-1",
        kind: "trend-recipe",
        title: "Recipe 1",
        position: { x: 1096, y: 0 },
        size: { width: 300, height: 200 },
      },
      {
        id: "recipe-2",
        kind: "trend-recipe",
        title: "Recipe 2",
        position: { x: 1096, y: 280 },
        size: { width: 300, height: 200 },
      },
      {
        id: "recipe-3",
        kind: "trend-recipe",
        title: "Recipe 3",
        position: { x: 1096, y: 560 },
        size: { width: 300, height: 200 },
      },
    ];
    const bounds = calculateSelectionBounds(
      recipeNodes,
      new Set(["recipe-1", "recipe-2", "recipe-3"])
    );
    const viewport = fitBoundsToViewport(bounds!, { width: 900, height: 600 }, 120, 0.25, 0.95);
    const recipeGroupCenter = worldToScreen({ x: 1246, y: 380 }, viewport);

    expect(recipeGroupCenter.x).toBeCloseTo(450);
    expect(recipeGroupCenter.y).toBeCloseTo(300);
  });
});
