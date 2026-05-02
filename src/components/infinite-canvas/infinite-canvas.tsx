import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  calculateSelectionBounds,
  fitBoundsToViewport,
  getNodesInRect,
  normalizeRect,
  screenToWorld,
} from "@/src/lib/infinite-canvas/geometry";
import { useCanvasViewport } from "@/src/lib/infinite-canvas/use-canvas-viewport";
import type {
  CanvasConnection,
  CanvasNode,
  CanvasPoint,
  CanvasRect,
  CanvasSize,
  NodeMoveUpdate,
} from "@/src/lib/infinite-canvas/types";
import { cn } from "@/src/lib/utils";
import { Canvas2DLayer } from "./canvas-2d-layer";
import { CanvasNodeView } from "./canvas-node-view";
import { MarqueeOverlay } from "./marquee-overlay";
import { SelectionToolbar } from "./selection-toolbar";

interface InfiniteCanvasProps {
  nodes: CanvasNode[];
  connections?: CanvasConnection[];
  selectedNodeIds?: Set<string>;
  onSelectionChange?: (nodeIds: Set<string>) => void;
  onNodeMove?: (updates: NodeMoveUpdate[]) => void;
  onDeleteSelected?: (nodeIds: Set<string>) => void;
  onExportSelected?: (nodeIds: Set<string>) => void;
  resolveImageUrl?: (node: CanvasNode) => string | undefined;
  className?: string;
}

interface DragState {
  pointerId: number;
  startScreen: CanvasPoint;
  nodeIds: string[];
  startPositions: Map<string, CanvasPoint>;
}

export function InfiniteCanvas({
  nodes,
  connections = [],
  selectedNodeIds,
  onSelectionChange,
  onNodeMove,
  onDeleteSelected,
  onExportSelected,
  resolveImageUrl,
  className,
}: InfiniteCanvasProps) {
  const { containerRef, viewport, setViewport, panByScreenDelta, wheelPan, zoomAtPoint } =
    useCanvasViewport();
  const [containerSize, setContainerSize] = useState<CanvasSize>({
    width: 0,
    height: 0,
  });
  const [internalSelection, setInternalSelection] = useState<Set<string>>(new Set());
  const [localPositions, setLocalPositions] = useState<Map<string, CanvasPoint>>(new Map());
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [panStart, setPanStart] = useState<CanvasPoint | null>(null);
  const [marqueeStart, setMarqueeStart] = useState<CanvasPoint | null>(null);
  const [marqueeRect, setMarqueeRect] = useState<CanvasRect | null>(null);
  const lastPointerRef = useRef<CanvasPoint | null>(null);
  const suppressNextCanvasClickRef = useRef(Boolean(0));

  const selection = selectedNodeIds ?? internalSelection;

  const setSelection = useCallback(
    (nextSelection: Set<string>) => {
      if (!selectedNodeIds) {
        setInternalSelection(nextSelection);
      }
      onSelectionChange?.(nextSelection);
    },
    [onSelectionChange, selectedNodeIds]
  );

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const updateSize = () => {
      const rect = element.getBoundingClientRect();
      setContainerSize({ width: rect.width, height: rect.height });
    };

    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(element);
    return () => observer.disconnect();
  }, [containerRef]);

  useEffect(() => {
    if (nodes.length === 0 || containerSize.width === 0 || containerSize.height === 0) {
      return;
    }

    const bounds = calculateSelectionBounds(
      nodes,
      new Set(nodes.map((node) => node.id))
    );
    if (!bounds) return;

    setViewport(fitBoundsToViewport(bounds, containerSize, 96, 0.25, 0.95));
  }, [containerSize, nodes, setViewport]);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();
      const rect = element.getBoundingClientRect();
      const point = {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      };

      if (event.metaKey || event.ctrlKey) {
        zoomAtPoint(event.deltaY, point);
        return;
      }

      if (event.shiftKey) {
        wheelPan({ x: event.deltaY, y: 0 });
        return;
      }

      wheelPan({ x: event.deltaX, y: event.deltaY });
    };

    element.addEventListener("wheel", handleWheel, { passive: Boolean(0) });
    return () => element.removeEventListener("wheel", handleWheel);
  }, [containerRef, wheelPan, zoomAtPoint]);

  const nodePosition = useCallback(
    (node: CanvasNode) => localPositions.get(node.id) ?? node.position,
    [localPositions]
  );

  const handleNodeClick = useCallback(
    (event: React.MouseEvent, node: CanvasNode) => {
      event.stopPropagation();
      if (dragState) return;

      if (event.shiftKey || event.metaKey || event.ctrlKey) {
        const next = new Set(selection);
        if (next.has(node.id)) {
          next.delete(node.id);
        } else {
          next.add(node.id);
        }
        setSelection(next);
        return;
      }

      setSelection(new Set([node.id]));
    },
    [dragState, selection, setSelection]
  );

  const handleNodePointerDown = useCallback(
    (event: React.PointerEvent, node: CanvasNode) => {
      if (event.button !== 0) return;
      event.stopPropagation();
      event.currentTarget.setPointerCapture(event.pointerId);

      const nodeIds = selection.has(node.id) ? Array.from(selection) : [node.id];
      const startPositions = new Map<string, CanvasPoint>();
      nodeIds.forEach((nodeId) => {
        const matched = nodes.find((candidate) => candidate.id === nodeId);
        if (matched) {
          startPositions.set(nodeId, nodePosition(matched));
        }
      });

      setDragState({
        pointerId: event.pointerId,
        startScreen: { x: event.clientX, y: event.clientY },
        nodeIds,
        startPositions,
      });
    },
    [nodePosition, nodes, selection]
  );

  const handlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (event.button === 1 || (event.button === 0 && event.altKey)) {
        event.currentTarget.setPointerCapture(event.pointerId);
        setPanStart({ x: event.clientX, y: event.clientY });
        lastPointerRef.current = { x: event.clientX, y: event.clientY };
        return;
      }

      if (event.button !== 0) return;
      event.currentTarget.setPointerCapture(event.pointerId);
      const rect = event.currentTarget.getBoundingClientRect();
      const start = {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      };
      setMarqueeStart(start);
      setMarqueeRect({ x: start.x, y: start.y, width: 0, height: 0 });
    },
    []
  );

  const handlePointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (dragState) {
        const delta = {
          x: (event.clientX - dragState.startScreen.x) / viewport.zoom,
          y: (event.clientY - dragState.startScreen.y) / viewport.zoom,
        };
        const nextPositions = new Map(localPositions);
        dragState.nodeIds.forEach((nodeId) => {
          const start = dragState.startPositions.get(nodeId);
          if (!start) return;
          nextPositions.set(nodeId, {
            x: start.x + delta.x,
            y: start.y + delta.y,
          });
        });
        setLocalPositions(nextPositions);
        return;
      }

      if (panStart && lastPointerRef.current) {
        const current = { x: event.clientX, y: event.clientY };
        panByScreenDelta({
          x: current.x - lastPointerRef.current.x,
          y: current.y - lastPointerRef.current.y,
        });
        lastPointerRef.current = current;
        return;
      }

      if (marqueeStart) {
        const rect = event.currentTarget.getBoundingClientRect();
        const current = {
          x: event.clientX - rect.left,
          y: event.clientY - rect.top,
        };
        const nextRect = normalizeRect(marqueeStart, current);
        setMarqueeRect(nextRect);
        if (nextRect.width > 4 || nextRect.height > 4) {
          suppressNextCanvasClickRef.current = true;
        }

        const worldStart = screenToWorld({ x: nextRect.x, y: nextRect.y }, viewport);
        const worldEnd = screenToWorld(
          { x: nextRect.x + nextRect.width, y: nextRect.y + nextRect.height },
          viewport
        );
        const selectedIds = getNodesInRect(nodes, normalizeRect(worldStart, worldEnd));
        setSelection(new Set(selectedIds));
      }
    },
    [
      dragState,
      localPositions,
      marqueeStart,
      nodes,
      panByScreenDelta,
      panStart,
      setSelection,
      viewport,
    ]
  );

  const endPointerInteraction = useCallback(() => {
    if (dragState) {
      const updates = dragState.nodeIds
        .map((nodeId) => {
          const position = localPositions.get(nodeId);
          return position ? { nodeId, position } : null;
        })
        .filter((update): update is NodeMoveUpdate => update !== null);
      if (updates.length > 0) {
        onNodeMove?.(updates);
      }
    }

    setDragState(null);
    setPanStart(null);
    setMarqueeStart(null);
    setMarqueeRect(null);
    lastPointerRef.current = null;
  }, [dragState, localPositions, onNodeMove]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        target.closest("input, textarea, select, [contenteditable]")
      ) {
        return;
      }

      if ((event.key === "Backspace" || event.key === "Delete") && selection.size > 0) {
        event.preventDefault();
        onDeleteSelected?.(new Set(selection));
      }

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "e") {
        event.preventDefault();
        if (selection.size > 0) {
          onExportSelected?.(new Set(selection));
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onDeleteSelected, onExportSelected, selection]);

  const positions = useMemo(() => {
    const next = new Map<string, CanvasPoint>();
    nodes.forEach((node) => next.set(node.id, nodePosition(node)));
    return next;
  }, [nodePosition, nodes]);

  const selectionBounds = calculateSelectionBounds(nodes, selection, positions);

  return (
    <div
      ref={containerRef}
      data-testid="infinite-canvas"
      className={cn(
        "relative h-full min-h-0 w-full overflow-hidden bg-background outline-none",
        "cursor-grab active:cursor-grabbing",
        className
      )}
      tabIndex={0}
      onClick={() => {
        if (suppressNextCanvasClickRef.current) {
          suppressNextCanvasClickRef.current = Boolean(0);
          return;
        }
        if (!dragState && !marqueeStart) {
          setSelection(new Set());
        }
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={endPointerInteraction}
      onPointerCancel={endPointerInteraction}
      onPointerLeave={() => {
        if (panStart) {
          endPointerInteraction();
        }
      }}
    >
      <Canvas2DLayer
        nodes={nodes}
        connections={connections}
        viewport={viewport}
        size={containerSize}
        positions={positions}
      />
      <div
        className="absolute left-0 top-0 origin-top-left"
        style={{
          transform: `translate(${-viewport.offset.x * viewport.zoom}px, ${-viewport.offset.y * viewport.zoom}px) scale(${viewport.zoom})`,
        }}
      >
        {nodes.map((node) => (
          <CanvasNodeView
            key={node.id}
            node={node}
            position={nodePosition(node)}
            zoom={viewport.zoom}
            selected={selection.has(node.id)}
            resolveImageUrl={resolveImageUrl}
            onPointerDown={handleNodePointerDown}
            onClick={handleNodeClick}
          />
        ))}
      </div>
      <MarqueeOverlay rect={marqueeRect} />
      <SelectionToolbar
        bounds={selectionBounds}
        viewport={viewport}
        size={containerSize}
        onDelete={selection.size > 0 && onDeleteSelected ? () => onDeleteSelected(new Set(selection)) : undefined}
        onExport={selection.size > 0 && onExportSelected ? () => onExportSelected(new Set(selection)) : undefined}
      />
    </div>
  );
}
