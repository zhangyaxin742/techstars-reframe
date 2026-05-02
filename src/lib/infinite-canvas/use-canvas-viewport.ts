import { useCallback, useRef, useState } from "react";
import { clamp, screenToWorld } from "./geometry";
import type { CanvasPoint, CanvasViewportState } from "./types";

const MIN_ZOOM = 0.2;
const MAX_ZOOM = 2.5;

export function useCanvasViewport(
  initialViewport: CanvasViewportState = {
    offset: { x: -80, y: -80 },
    zoom: 0.85,
  }
) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [viewport, setViewport] = useState(initialViewport);

  const panByScreenDelta = useCallback((delta: CanvasPoint) => {
    setViewport((current) => ({
      ...current,
      offset: {
        x: current.offset.x - delta.x / current.zoom,
        y: current.offset.y - delta.y / current.zoom,
      },
    }));
  }, []);

  const wheelPan = useCallback((delta: CanvasPoint) => {
    setViewport((current) => ({
      ...current,
      offset: {
        x: current.offset.x + delta.x / current.zoom,
        y: current.offset.y + delta.y / current.zoom,
      },
    }));
  }, []);

  const zoomAtPoint = useCallback((deltaY: number, screenPoint: CanvasPoint) => {
    setViewport((current) => {
      const nextZoom = clamp(
        current.zoom * Math.exp(-deltaY * 0.001),
        MIN_ZOOM,
        MAX_ZOOM
      );
      const worldPoint = screenToWorld(screenPoint, current);

      return {
        zoom: nextZoom,
        offset: {
          x: worldPoint.x - screenPoint.x / nextZoom,
          y: worldPoint.y - screenPoint.y / nextZoom,
        },
      };
    });
  }, []);

  return {
    containerRef,
    viewport,
    setViewport,
    panByScreenDelta,
    wheelPan,
    zoomAtPoint,
  };
}
