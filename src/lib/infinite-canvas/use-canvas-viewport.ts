import { animate, useReducedMotion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
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
  const viewportRef = useRef(initialViewport);
  const activeAnimationRef = useRef<ReturnType<typeof animate> | null>(null);
  const shouldReduceMotion = useReducedMotion();
  const [viewport, setViewport] = useState(initialViewport);

  const setViewportState = useCallback(
    (next: CanvasViewportState | ((current: CanvasViewportState) => CanvasViewportState)) => {
      setViewport((current) => {
        const resolved = typeof next === "function" ? next(current) : next;
        viewportRef.current = resolved;
        return resolved;
      });
    },
    []
  );

  const stopViewportAnimation = useCallback(() => {
    activeAnimationRef.current?.stop();
    activeAnimationRef.current = null;
  }, []);

  useEffect(() => {
    viewportRef.current = viewport;
  }, [viewport]);

  useEffect(() => {
    return () => stopViewportAnimation();
  }, [stopViewportAnimation]);

  const animateViewportTo = useCallback(
    (
      target: CanvasViewportState,
      options: {
        delayMs?: number;
        durationMs?: number;
      } = {}
    ) => {
      stopViewportAnimation();

      const origin = viewportRef.current;
      const duration = options.durationMs ?? 1050;
      const delay = options.delayMs ?? 220;

      if (shouldReduceMotion || duration <= 0) {
        setViewportState(target);
        return;
      }

      activeAnimationRef.current = animate(0, 1, {
        delay: delay / 1000,
        duration: duration / 1000,
        ease: "easeInOut",
        onUpdate: (progress) => {
          setViewportState({
            zoom: origin.zoom + (target.zoom - origin.zoom) * progress,
            offset: {
              x: origin.offset.x + (target.offset.x - origin.offset.x) * progress,
              y: origin.offset.y + (target.offset.y - origin.offset.y) * progress,
            },
          });
        },
        onComplete: () => {
          activeAnimationRef.current = null;
        },
        onStop: () => {
          activeAnimationRef.current = null;
        },
      });
    },
    [setViewportState, shouldReduceMotion, stopViewportAnimation]
  );

  const panByScreenDelta = useCallback((delta: CanvasPoint) => {
    stopViewportAnimation();
    setViewportState((current) => ({
      ...current,
      offset: {
        x: current.offset.x - delta.x / current.zoom,
        y: current.offset.y - delta.y / current.zoom,
      },
    }));
  }, [setViewportState, stopViewportAnimation]);

  const wheelPan = useCallback((delta: CanvasPoint) => {
    stopViewportAnimation();
    setViewportState((current) => ({
      ...current,
      offset: {
        x: current.offset.x + delta.x / current.zoom,
        y: current.offset.y + delta.y / current.zoom,
      },
    }));
  }, [setViewportState, stopViewportAnimation]);

  const zoomAtPoint = useCallback((deltaY: number, screenPoint: CanvasPoint) => {
    stopViewportAnimation();
    setViewportState((current) => {
      const nextZoom = clamp(
        current.zoom * Math.exp(-deltaY * 0.0025),
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
  }, [setViewportState, stopViewportAnimation]);

  return {
    containerRef,
    viewport,
    setViewport: setViewportState,
    animateViewportTo,
    stopViewportAnimation,
    panByScreenDelta,
    wheelPan,
    zoomAtPoint,
  };
}
