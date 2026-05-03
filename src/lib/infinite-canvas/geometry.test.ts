import {
  calculateSelectionBounds,
  expandBounds,
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

  it("centers a horizontal trend video group as the viewport focus", () => {
    const recipeNodes: CanvasNode[] = [
      {
        id: "recipe-1",
        kind: "video",
        title: "Founder confessional",
        video: { src: "/videos/trend1.mp4", label: "trend" },
        position: { x: 1096, y: 0 },
        size: { width: 220, height: 391 },
      },
      {
        id: "recipe-2",
        kind: "video",
        title: "Process cutdown",
        video: { src: "/videos/trend2.mp4", label: "trend" },
        position: { x: 1356, y: 0 },
        size: { width: 220, height: 391 },
      },
      {
        id: "recipe-3",
        kind: "video",
        title: "Customer proof remix",
        video: { src: "/videos/trend3.mp4", label: "trend" },
        position: { x: 1616, y: 0 },
        size: { width: 220, height: 391 },
      },
    ];
    const bounds = calculateSelectionBounds(
      recipeNodes,
      new Set(["recipe-1", "recipe-2", "recipe-3"])
    );
    const viewport = fitBoundsToViewport(bounds!, { width: 900, height: 600 }, 120, 0.25, 0.95);
    const recipeGroupCenter = worldToScreen({ x: 1466, y: 195.5 }, viewport);

    expect(recipeGroupCenter.x).toBeCloseTo(450);
    expect(recipeGroupCenter.y).toBeCloseTo(300);
  });

  it("supports asymmetric padding for a right-side overlay while fitting a focused node", () => {
    const brandNode: CanvasNode = {
      id: "brand-ctx",
      kind: "brand-context",
      title: "Brand Context",
      position: { x: 0, y: 0 },
      size: { width: 1000, height: 700 },
    };
    const viewportWidth = 900;
    const rightOverlayPadding = 384;
    const bounds = calculateSelectionBounds([brandNode], new Set(["brand-ctx"]));
    const viewport = fitBoundsToViewport(
      bounds!,
      { width: viewportWidth, height: 600 },
      { top: 104, right: rightOverlayPadding, bottom: 104, left: 72 },
      0.25,
      0.72
    );
    const leftEdge = worldToScreen({ x: 0, y: 350 }, viewport).x;
    const rightEdge = worldToScreen({ x: 1000, y: 350 }, viewport).x;

    expect(viewport.zoom).toBeLessThan(0.5);
    expect(leftEdge).toBeGreaterThanOrEqual(72);
    expect(rightEdge).toBeLessThanOrEqual(viewportWidth - rightOverlayPadding);
  });

  it("expands bounds to include overlay content outside the focused node", () => {
    const previewNode: CanvasNode = {
      id: "preview-1",
      kind: "preview",
      title: "Preview",
      position: { x: 1640, y: 533 },
      size: { width: 210, height: 380 },
    };
    const bounds = calculateSelectionBounds([previewNode], new Set(["preview-1"]));
    const expandedBounds = expandBounds(bounds!, { bottom: 112 });
    const viewport = fitBoundsToViewport(
      expandedBounds,
      { width: 900, height: 600 },
      { top: 80, right: 120, bottom: 120, left: 120 },
      0.25,
      0.72
    );
    const previewTop = worldToScreen({ x: 1745, y: 533 }, viewport).y;
    const statusCardBottom = worldToScreen({ x: 1745, y: 1025 }, viewport).y;

    expect(previewTop).toBeGreaterThanOrEqual(80);
    expect(statusCardBottom).toBeLessThanOrEqual(480);
    expect(viewport.zoom).toBeLessThanOrEqual(0.72);
  });
});
