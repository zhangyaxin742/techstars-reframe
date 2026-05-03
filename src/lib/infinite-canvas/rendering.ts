import { getNodeCenter } from "./geometry";
import type {
  CanvasConnection,
  CanvasNode,
  CanvasPoint,
  CanvasSize,
  CanvasViewportState,
} from "./types";

export function setupCanvas(canvas: HTMLCanvasElement, size: CanvasSize) {
  const ratio = window.devicePixelRatio || 1;
  canvas.width = Math.floor(size.width * ratio);
  canvas.height = Math.floor(size.height * ratio);
  canvas.style.width = `${size.width}px`;
  canvas.style.height = `${size.height}px`;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Canvas 2D context is unavailable");
  }

  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  return context;
}

export function drawBackground(
  context: CanvasRenderingContext2D,
  viewport: CanvasViewportState,
  size: CanvasSize
) {
  const spacing = 32 * viewport.zoom;
  if (spacing < 8) return;

  const startX = -((viewport.offset.x * viewport.zoom) % spacing);
  const startY = -((viewport.offset.y * viewport.zoom) % spacing);

  // Steel Gray dot grid — #dee2de at low opacity for a refined, near-invisible guide
  context.fillStyle = "rgba(180, 184, 180, 0.55)";
  for (let x = startX; x < size.width; x += spacing) {
    for (let y = startY; y < size.height; y += spacing) {
      context.beginPath();
      context.arc(x, y, 1, 0, Math.PI * 2);
      context.fill();
    }
  }
}

export function drawConnections({
  context,
  nodes,
  connections,
  viewport,
  positions,
}: {
  context: CanvasRenderingContext2D;
  nodes: CanvasNode[];
  connections: CanvasConnection[];
  viewport: CanvasViewportState;
  positions: Map<string, CanvasPoint>;
}) {
  const nodeMap = new Map(nodes.map((node) => [node.id, node]));

  context.save();
  context.translate(-viewport.offset.x * viewport.zoom, -viewport.offset.y * viewport.zoom);
  context.scale(viewport.zoom, viewport.zoom);
  // Steel Gray connector lines — #dee2de at moderate opacity
  context.lineWidth = 1.5 / viewport.zoom;
  context.strokeStyle = "rgba(180, 184, 180, 0.75)";

  connections.forEach((connection) => {
    const source = nodeMap.get(connection.sourceNodeId);
    const target = nodeMap.get(connection.targetNodeId);
    if (!source || !target) return;

    const sourceCenter = getNodeCenter(source, positions.get(source.id));
    const targetCenter = getNodeCenter(target, positions.get(target.id));
    const midpointX = (sourceCenter.x + targetCenter.x) / 2;

    context.beginPath();
    context.moveTo(sourceCenter.x, sourceCenter.y);
    context.bezierCurveTo(
      midpointX,
      sourceCenter.y,
      midpointX,
      targetCenter.y,
      targetCenter.x,
      targetCenter.y
    );
    context.stroke();
  });

  context.restore();
}
