import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  calculateSelectionBounds,
  expandBounds,
  fitBoundsToViewport,
  getNodesInRect,
  normalizeRect,
  screenToWorld,
} from "../../lib/infinite-canvas/geometry";
import { useCanvasViewport } from "../../lib/infinite-canvas/use-canvas-viewport";
import {
  isTrendSourceNode,
  type CanvasConnection,
  type CanvasNode,
  type CanvasPoint,
  type CanvasPromptBoxData,
  type CanvasRect,
  type CanvasSize,
  type CanvasViewportFocus,
  type NodeMoveUpdate,
} from "../../lib/infinite-canvas/types";
import type { ExportTarget, TimelineSegment } from "../../data/reframe-demo";
import { cn } from "../../lib/utils";
import { Canvas2DLayer } from "./canvas-2d-layer";
import { CanvasNavigationRail } from "./canvas-navigation-rail";
import {
  CanvasNodeView,
  type BrandCtxPhase,
  type PreviewPublishState,
  type TimelinePhase,
  type TrendRecipePhase,
} from "./canvas-node-view";
import { CanvasPromptBox } from "./canvas-prompt-box";
import { MarqueeOverlay } from "./marquee-overlay";
import { SelectionToolbar } from "./selection-toolbar";

interface InfiniteCanvasProps {
  nodes: CanvasNode[];
  connections?: CanvasConnection[];
  selectedNodeIds?: Set<string>;
  onSelectionChange?: (nodeIds: Set<string>) => void;
  onNodeMove?: (updates: NodeMoveUpdate[]) => void;
  onDeleteSelected?: (nodeIds: Set<string>) => void;
  exportTargets?: ExportTarget[];
  onExportTimeline?: (targetId: ExportTarget["id"], nodeIds: Set<string>) => void;
  onDownloadPreview?: (nodeIds: Set<string>) => void;
  onPublishPreview?: (nodeIds: Set<string>) => void;
  bottomPromptBox?: CanvasPromptBoxData;
  onBottomPromptChange?: (value: string) => void;
  onBottomPromptSubmit?: (value: string) => void;
  onPromptChange?: (nodeId: string, value: string) => void;
  onPromptSubmit?: (nodeId: string, value: string) => void;
  timelineSourceNodeId?: string;
  viewportFocus?: CanvasViewportFocus;
  onCreateTimelineFromTrend?: (node: CanvasNode) => void;
  onOpenTimelineNode?: (node: CanvasNode) => void;
  animatedConnectionIds?: Set<string>;
  resolveImageUrl?: (node: CanvasNode) => string | undefined;
  brandCtxPhase?: BrandCtxPhase;
  trendRecipePhase?: TrendRecipePhase;
  timelinePhase?: TimelinePhase;
  previewSegments?: TimelineSegment[];
  previewPublishState?: PreviewPublishState;
  chromeHidden?: boolean;
  className?: string;
}

const EMPTY_EXPORT_TARGETS: ExportTarget[] = [];

interface DragState {
  pointerId: number;
  startScreen: CanvasPoint;
  nodeIds: string[];
  startPositions: Map<string, CanvasPoint>;
}

interface ConnectionPathSpec {
  d: string;
  isTimelineConnection: boolean;
  isBrandFeedConnection: boolean;
}

function isTextEditingTarget(target: EventTarget | null) {
  return (
    target instanceof HTMLElement &&
    Boolean(target.closest("input, textarea, select, [contenteditable]"))
  );
}

function buildConnectionPath({
  sourceNode,
  targetNode,
  sourcePosition,
  targetPosition,
  viewport,
}: {
  sourceNode: CanvasNode;
  targetNode: CanvasNode;
  sourcePosition: CanvasPoint;
  targetPosition: CanvasPoint;
  viewport: { offset: CanvasPoint; zoom: number };
}): ConnectionPathSpec {
  const connectsTrendToTimeline = isTrendSourceNode(sourceNode) && targetNode.kind === "timeline";
  const connectsBrandToTrend =
    sourceNode.kind === "brand-context" && isTrendSourceNode(targetNode);

  const sourceX = connectsTrendToTimeline
    ? (sourcePosition.x + sourceNode.size.width / 2 - viewport.offset.x) * viewport.zoom
    : (sourcePosition.x + sourceNode.size.width - viewport.offset.x) * viewport.zoom;
  const sourceY = connectsTrendToTimeline
    ? (sourcePosition.y + sourceNode.size.height - viewport.offset.y) * viewport.zoom
    : (sourcePosition.y + sourceNode.size.height / 2 - viewport.offset.y) * viewport.zoom;
  const targetX = connectsTrendToTimeline
    ? (targetPosition.x + targetNode.size.width / 2 - viewport.offset.x) * viewport.zoom
    : (targetPosition.x - viewport.offset.x) * viewport.zoom;
  const targetY = connectsTrendToTimeline
    ? (targetPosition.y - viewport.offset.y) * viewport.zoom
    : (targetPosition.y + targetNode.size.height / 2 - viewport.offset.y) * viewport.zoom;

  if (connectsTrendToTimeline) {
    const midpointY = (sourceY + targetY) / 2;
    return {
      d: `M ${sourceX} ${sourceY} C ${sourceX} ${midpointY}, ${targetX} ${midpointY}, ${targetX} ${targetY}`,
      isTimelineConnection: true,
      isBrandFeedConnection: false,
    };
  }

  if (connectsBrandToTrend) {
    const gap = Math.max(targetX - sourceX, 0);
    const lead = Math.min(Math.max(gap * 0.34, 18), 36);
    const nearTargetX = Math.max(targetX - lead, sourceX + lead);
    return {
      d: `M ${sourceX} ${sourceY} L ${sourceX + lead} ${sourceY} L ${nearTargetX} ${targetY} L ${targetX} ${targetY}`,
      isTimelineConnection: false,
      isBrandFeedConnection: true,
    };
  }

  const midpointX = (sourceX + targetX) / 2;
  return {
    d: `M ${sourceX} ${sourceY} C ${midpointX} ${sourceY}, ${midpointX} ${targetY}, ${targetX} ${targetY}`,
    isTimelineConnection: sourceNode.kind === "timeline" && targetNode.kind === "preview",
    isBrandFeedConnection: false,
  };
}

export function InfiniteCanvas({
  nodes,
  connections = [],
  selectedNodeIds,
  onSelectionChange,
  onNodeMove,
  onDeleteSelected,
  exportTargets = EMPTY_EXPORT_TARGETS,
  onExportTimeline,
  onDownloadPreview,
  onPublishPreview,
  bottomPromptBox,
  onBottomPromptChange,
  onBottomPromptSubmit,
  onPromptChange,
  onPromptSubmit,
  timelineSourceNodeId,
  viewportFocus,
  onCreateTimelineFromTrend,
  onOpenTimelineNode,
  animatedConnectionIds,
  resolveImageUrl,
  brandCtxPhase,
  trendRecipePhase,
  timelinePhase,
  previewSegments,
  previewPublishState,
  chromeHidden = false,
  className,
}: InfiniteCanvasProps) {
  const {
    containerRef,
    viewport,
    animateViewportTo,
    stopViewportAnimation,
    panByScreenDelta,
    wheelPan,
    zoomAtPoint,
  } =
    useCanvasViewport();
  const [containerSize, setContainerSize] = useState<CanvasSize>({
    width: 0,
    height: 0,
  });
  const [internalSelection, setInternalSelection] = useState<Set<string>>(new Set());
  const [localPositions, setLocalPositions] = useState<Map<string, CanvasPoint>>(new Map());
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [panStart, setPanStart] = useState<CanvasPoint | null>(null);
  const [spacePanMode, setSpacePanMode] = useState(Boolean(0));
  const [marqueeStart, setMarqueeStart] = useState<CanvasPoint | null>(null);
  const [marqueeRect, setMarqueeRect] = useState<CanvasRect | null>(null);
  const lastPointerRef = useRef<CanvasPoint | null>(null);
  const suppressNextCanvasClickRef = useRef(Boolean(0));
  const lastViewportFocusIdRef = useRef<string | null>(null);

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

  const selectedNodes = useMemo(
    () => nodes.filter((node) => selection.has(node.id)),
    [nodes, selection]
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

    if (!viewportFocus || lastViewportFocusIdRef.current === viewportFocus.id) {
      return;
    }

    const bounds = calculateSelectionBounds(nodes, new Set(viewportFocus.nodeIds));
    if (!bounds) return;
    const focusBounds = viewportFocus.boundsInset
      ? expandBounds(bounds, viewportFocus.boundsInset)
      : bounds;

    lastViewportFocusIdRef.current = viewportFocus.id;
    animateViewportTo(
      fitBoundsToViewport(
        focusBounds,
        containerSize,
        viewportFocus.padding ?? 96,
        viewportFocus.minZoom ?? 0.25,
        viewportFocus.maxZoom ?? 0.95
      ),
      {
        delayMs: viewportFocus.delayMs,
        durationMs: viewportFocus.durationMs,
      }
    );
  }, [animateViewportTo, containerSize, nodes, viewportFocus]);

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

      // Normalize across deltaMode: 0=pixel (default), 1=line (~16px), 2=page (~300px)
      const lineSize = 16;
      const pageSize = 300;
      const multiplier = event.deltaMode === 1 ? lineSize : event.deltaMode === 2 ? pageSize : 1;

      if (event.metaKey || event.ctrlKey) {
        zoomAtPoint(event.deltaY * multiplier, point);
        return;
      }

      if (event.shiftKey) {
        const horizontalDelta = event.deltaX !== 0 ? event.deltaX : event.deltaY;
        wheelPan({ x: horizontalDelta * multiplier, y: 0 });
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

  const startPanning = useCallback((event: React.PointerEvent<Element>) => {
    const target = event.currentTarget as HTMLElement;
    target.setPointerCapture(event.pointerId);
    setPanStart({ x: event.clientX, y: event.clientY });
    lastPointerRef.current = { x: event.clientX, y: event.clientY };
  }, []);

  const handleNodeClick = useCallback(
    (event: React.MouseEvent, node: CanvasNode) => {
      event.stopPropagation();
      if (dragState || panStart || spacePanMode || suppressNextCanvasClickRef.current) {
        suppressNextCanvasClickRef.current = Boolean(0);
        return;
      }

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
      if (node.kind === "timeline") {
        onOpenTimelineNode?.(node);
      }
    },
    [dragState, onOpenTimelineNode, panStart, selection, setSelection, spacePanMode]
  );

  const handleNodePointerDown = useCallback(
    (event: React.PointerEvent, node: CanvasNode) => {
      if (event.button !== 0) return;
      event.stopPropagation();
      stopViewportAnimation();

      if (spacePanMode) {
        startPanning(event);
        return;
      }

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
    [nodePosition, nodes, selection, spacePanMode, startPanning, stopViewportAnimation]
  );

  const handlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (event.button === 1 || (event.button === 0 && (event.altKey || spacePanMode))) {
        startPanning(event);
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
    [spacePanMode, startPanning]
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
        const delta = {
          x: current.x - lastPointerRef.current.x,
          y: current.y - lastPointerRef.current.y,
        };
        if (Math.abs(delta.x) > 4 || Math.abs(delta.y) > 4) {
          suppressNextCanvasClickRef.current = true;
        }
        panByScreenDelta({
          x: delta.x,
          y: delta.y,
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
      if (isTextEditingTarget(event.target)) {
        return;
      }

      if (event.code === "Space" || event.key === " ") {
        event.preventDefault();
        setSpacePanMode(true);
        return;
      }

      if ((event.key === "Backspace" || event.key === "Delete") && selection.size > 0) {
        event.preventDefault();
        onDeleteSelected?.(new Set(selection));
      }

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "e") {
        event.preventDefault();
        const selectedTimelineNode =
          selectedNodes.length === 1 && selectedNodes[0].kind === "timeline"
            ? selectedNodes[0]
            : null;
        const defaultTarget = exportTargets[0];
        if (selectedTimelineNode && defaultTarget) {
          onExportTimeline?.(defaultTarget.id, new Set([selectedTimelineNode.id]));
        }
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (isTextEditingTarget(event.target)) {
        return;
      }

      if (event.code === "Space" || event.key === " ") {
        event.preventDefault();
        setSpacePanMode(Boolean(0));
      }
    };

    const handleWindowBlur = () => setSpacePanMode(Boolean(0));

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", handleWindowBlur);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", handleWindowBlur);
    };
  }, [exportTargets, onDeleteSelected, onExportTimeline, selectedNodes, selection]);

  const positions = useMemo(() => {
    const next = new Map<string, CanvasPoint>();
    nodes.forEach((node) => next.set(node.id, nodePosition(node)));
    return next;
  }, [nodePosition, nodes]);

  const selectionBounds = calculateSelectionBounds(nodes, selection, positions);
  const nodeMap = useMemo(() => new Map(nodes.map((node) => [node.id, node])), [nodes]);
  const connectionPaths = useMemo(
    () =>
      connections
        .map((connection) => {
          const sourceNode = nodeMap.get(connection.sourceNodeId);
          const targetNode = nodeMap.get(connection.targetNodeId);
          if (!sourceNode || !targetNode) {
            return null;
          }

          const sourcePosition = positions.get(sourceNode.id) ?? sourceNode.position;
          const targetPosition = positions.get(targetNode.id) ?? targetNode.position;
          const path = buildConnectionPath({
            sourceNode,
            targetNode,
            sourcePosition,
            targetPosition,
            viewport,
          });

          return {
            id: connection.id,
            d: path.d,
            isTimelineConnection: path.isTimelineConnection,
            isBrandFeedConnection: path.isBrandFeedConnection,
          };
        })
        .filter(
          (
            path
          ): path is {
            id: string;
            d: string;
            isTimelineConnection: boolean;
            isBrandFeedConnection: boolean;
          } =>
            path !== null
        ),
    [connections, nodeMap, positions, viewport.offset.x, viewport.offset.y, viewport.zoom]
  );

  return (
    <div
      ref={containerRef}
      data-testid="infinite-canvas"
      data-viewport-focus-id={viewportFocus?.id}
      data-viewport-focus-nodes={viewportFocus?.nodeIds.join(" ")}
      className={cn(
        "relative h-full min-h-0 w-full overflow-hidden bg-background outline-none",
        spacePanMode || panStart ? "cursor-grab active:cursor-grabbing" : "cursor-default",
        panStart && "cursor-grabbing",
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
      <svg
        className="pointer-events-none absolute inset-0"
        width={containerSize.width}
        height={containerSize.height}
        viewBox={`0 0 ${containerSize.width} ${containerSize.height}`}
        aria-hidden="true"
      >
        {connectionPaths.map((connectionPath) => {
          const animateIn = animatedConnectionIds?.has(connectionPath.id) ?? false;
          return (
            <motion.path
              key={`${connectionPath.id}-${animateIn ? "animated" : "static"}`}
              data-testid={`canvas-connection-${connectionPath.id}`}
              d={connectionPath.d}
              fill="none"
              stroke={
                connectionPath.isTimelineConnection
                  ? "rgb(0, 129, 192)"
                  : connectionPath.isBrandFeedConnection
                    ? "rgba(0, 129, 192, 0.52)"
                  : "rgba(180, 184, 180, 0.78)"
              }
              strokeWidth={
                connectionPath.isTimelineConnection
                  ? 2
                  : connectionPath.isBrandFeedConnection
                    ? 2.25
                    : 1.5
              }
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={animateIn ? { pathLength: 0, opacity: 0.4 } : false}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={animateIn ? { duration: 0.45, ease: "easeOut" } : { duration: 0 }}
            />
          );
        })}
      </svg>
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
            brandCtxPhase={brandCtxPhase}
            trendRecipePhase={trendRecipePhase}
            timelinePhase={timelinePhase}
            previewSegments={previewSegments}
            previewPublishState={previewPublishState}
            resolveImageUrl={resolveImageUrl}
            onPointerDown={handleNodePointerDown}
            onClick={handleNodeClick}
            timelineSourceNodeId={timelineSourceNodeId}
            onCreateTimelineFromTrend={onCreateTimelineFromTrend}
            onPromptChange={(node, value) => onPromptChange?.(node.id, value)}
            onPromptSubmit={(node, value) => onPromptSubmit?.(node.id, value)}
          />
        ))}
      </div>
      <MarqueeOverlay rect={marqueeRect} />
      {!chromeHidden ? (
        <SelectionToolbar
          bounds={selectionBounds}
          viewport={viewport}
          size={containerSize}
          selectedNodes={selectedNodes}
          exportTargets={exportTargets}
          onDelete={selection.size > 0 && onDeleteSelected ? () => onDeleteSelected(new Set(selection)) : undefined}
          onExportTimeline={
            selectedNodes.length === 1 && selectedNodes[0].kind === "timeline" && onExportTimeline
              ? (targetId) => onExportTimeline(targetId, new Set(selection))
              : undefined
          }
          onDownloadPreview={
            selectedNodes.length === 1 && selectedNodes[0].kind === "preview" && onDownloadPreview
              ? () => onDownloadPreview(new Set(selection))
              : undefined
          }
          onPublishPreview={
            selectedNodes.length === 1 && selectedNodes[0].kind === "preview" && onPublishPreview
              ? () => onPublishPreview(new Set(selection))
              : undefined
          }
        />
      ) : null}
      {!chromeHidden ? <CanvasNavigationRail /> : null}
      {bottomPromptBox && !chromeHidden ? (
        <div className="pointer-events-none absolute bottom-6 left-1/2 z-20 w-full max-w-[672px] -translate-x-1/2 px-4">
          <div className="pointer-events-auto">
            <CanvasPromptBox
              data={bottomPromptBox}
              onChange={onBottomPromptChange}
              onSubmit={onBottomPromptSubmit}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
