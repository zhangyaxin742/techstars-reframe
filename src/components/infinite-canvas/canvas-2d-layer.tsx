import React, { memo, useEffect, useRef } from "react";
import { drawBackground, setupCanvas } from "../../lib/infinite-canvas/rendering";
import type {
  CanvasConnection,
  CanvasNode,
  CanvasPoint,
  CanvasSize,
  CanvasViewportState,
} from "../../lib/infinite-canvas/types";

interface Canvas2DLayerProps {
  nodes: CanvasNode[];
  connections: CanvasConnection[];
  viewport: CanvasViewportState;
  size: CanvasSize;
  positions: Map<string, CanvasPoint>;
}

export const Canvas2DLayer = memo(function Canvas2DLayer({
  nodes: _nodes,
  connections: _connections,
  viewport,
  size,
  positions: _positions,
}: Canvas2DLayerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || size.width === 0 || size.height === 0) return;

    const frame = requestAnimationFrame(() => {
      const context = setupCanvas(canvas, size);
      context.clearRect(0, 0, size.width, size.height);
      drawBackground(context, viewport, size);
    });

    return () => cancelAnimationFrame(frame);
  }, [size.width, size.height, viewport.offset.x, viewport.offset.y, viewport.zoom]);

  return (
    <canvas
      ref={canvasRef}
      data-testid="canvas-2d-layer"
      className="pointer-events-none absolute inset-0"
      aria-hidden="true"
    />
  );
});
