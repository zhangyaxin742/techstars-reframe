import type {
  CanvasNode,
  CanvasPoint,
  CanvasRect,
  CanvasSize,
  CanvasViewportPadding,
  CanvasViewportState,
} from "./types";

export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function screenToWorld(
  point: CanvasPoint,
  viewport: CanvasViewportState
): CanvasPoint {
  return {
    x: viewport.offset.x + point.x / viewport.zoom,
    y: viewport.offset.y + point.y / viewport.zoom,
  };
}

export function worldToScreen(
  point: CanvasPoint,
  viewport: CanvasViewportState
): CanvasPoint {
  return {
    x: (point.x - viewport.offset.x) * viewport.zoom,
    y: (point.y - viewport.offset.y) * viewport.zoom,
  };
}

export function normalizeRect(start: CanvasPoint, end: CanvasPoint): CanvasRect {
  const x = Math.min(start.x, end.x);
  const y = Math.min(start.y, end.y);

  return {
    x,
    y,
    width: Math.abs(end.x - start.x),
    height: Math.abs(end.y - start.y),
  };
}

export function rectsIntersect(a: CanvasRect, b: CanvasRect) {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

export function nodeRect(node: CanvasNode, position = node.position): CanvasRect {
  return {
    x: position.x,
    y: position.y,
    width: node.size.width,
    height: node.size.height,
  };
}

export function getNodeCenter(node: CanvasNode, position = node.position): CanvasPoint {
  return {
    x: position.x + node.size.width / 2,
    y: position.y + node.size.height / 2,
  };
}

export function getNodesInRect(nodes: CanvasNode[], rect: CanvasRect) {
  return nodes
    .filter((node) => rectsIntersect(rect, nodeRect(node)))
    .map((node) => node.id);
}

export function calculateSelectionBounds(
  nodes: CanvasNode[],
  selectedNodeIds: Set<string>,
  positions = new Map<string, CanvasPoint>()
): CanvasRect | null {
  const selectedNodes = nodes.filter((node) => selectedNodeIds.has(node.id));
  if (selectedNodes.length === 0) return null;

  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;

  selectedNodes.forEach((node) => {
    const position = positions.get(node.id) ?? node.position;
    minX = Math.min(minX, position.x);
    minY = Math.min(minY, position.y);
    maxX = Math.max(maxX, position.x + node.size.width);
    maxY = Math.max(maxY, position.y + node.size.height);
  });

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

export function expandBounds(
  bounds: CanvasRect,
  inset: number | CanvasViewportPadding = 0
): CanvasRect {
  const normalizedInset =
    typeof inset === "number"
      ? { top: inset, right: inset, bottom: inset, left: inset }
      : {
          top: inset.top ?? 0,
          right: inset.right ?? 0,
          bottom: inset.bottom ?? 0,
          left: inset.left ?? 0,
        };

  return {
    x: bounds.x - normalizedInset.left,
    y: bounds.y - normalizedInset.top,
    width: bounds.width + normalizedInset.left + normalizedInset.right,
    height: bounds.height + normalizedInset.top + normalizedInset.bottom,
  };
}

export function fitBoundsToViewport(
  bounds: CanvasRect,
  viewportSize: CanvasSize,
  padding: number | CanvasViewportPadding = 96,
  minZoom = 0.25,
  maxZoom = 1
): CanvasViewportState {
  const normalizedPadding =
    typeof padding === "number"
      ? { top: padding, right: padding, bottom: padding, left: padding }
      : {
          top: padding.top ?? 0,
          right: padding.right ?? 0,
          bottom: padding.bottom ?? 0,
          left: padding.left ?? 0,
        };
  const availableWidth = Math.max(
    1,
    viewportSize.width - normalizedPadding.left - normalizedPadding.right
  );
  const availableHeight = Math.max(
    1,
    viewportSize.height - normalizedPadding.top - normalizedPadding.bottom
  );
  const zoom = clamp(
    Math.min(availableWidth / bounds.width, availableHeight / bounds.height),
    minZoom,
    maxZoom
  );
  const targetCenterX = normalizedPadding.left + availableWidth / 2;
  const targetCenterY = normalizedPadding.top + availableHeight / 2;

  return {
    zoom,
    offset: {
      x: bounds.x + bounds.width / 2 - targetCenterX / zoom,
      y: bounds.y + bounds.height / 2 - targetCenterY / zoom,
    },
  };
}
