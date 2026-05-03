"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { ChatHistoryPanel } from "./components/app-shell/chat-history-panel";
import { InfiniteCanvas, isTrendSourceNode, type NodeMoveUpdate } from "./components/infinite-canvas";
import type { PreviewPublishState } from "./components/infinite-canvas/canvas-node-view";
import { TimelineBottomDrawer } from "./components/timeline/timeline-bottom-drawer";
import { Toaster } from "./components/ui/sonner";
import type { CanvasConnection, CanvasNode, CanvasViewportFocus } from "./lib/infinite-canvas/types";
import {
  type AiFlowStep,
  type ChatMessage,
  type ExportTarget,
  type MediaAsset,
  type SimulatedToolCall,
  type TimelineSegment,
  chatHistory,
  exportTargets,
  initialAiToolCalls,
  promptAiToolCalls,
  recipeAiToolCalls,
  reframeDemoConnections,
  reframeDemoNodes,
  timelineSegments as seededTimelineSegments,
  trendSearchAiToolCalls,
} from "./data/reframe-demo";

type ToolSequenceConfig = {
  messageId: string;
  content: string;
  thinkingText: string;
  step: AiFlowStep;
  toolCalls: SimulatedToolCall[];
  doneContent: string;
  onDone?: () => void;
};

function toolCallsThroughIndex(
  toolCalls: SimulatedToolCall[],
  activeIndex: number
): SimulatedToolCall[] {
  return toolCalls.slice(0, activeIndex + 1).map((toolCall, index) => ({
    ...toolCall,
    state: index < activeIndex ? "completed" : "running",
  }));
}

function completedToolCallsThroughIndex(
  toolCalls: SimulatedToolCall[],
  completedIndex: number
): SimulatedToolCall[] {
  return toolCalls
    .slice(0, completedIndex + 1)
    .map((toolCall) => ({ ...toolCall, state: "completed" as const }));
}

export function App() {
  const [nodes, setNodes] = useState(reframeDemoNodes);
  const [connections, setConnections] = useState(reframeDemoConnections);
  const [selectedNodeIds, setSelectedNodeIds] = useState<Set<string>>(new Set());
  const [bottomPrompt, setBottomPrompt] = useState("");
  const [flowStep, setFlowStep] = useState<AiFlowStep>("analysis");
  const [brandCtxPhase, setBrandCtxPhase] = useState<"skeleton" | "revealing">("skeleton");
  const [trendRecipePhase, setTrendRecipePhase] = useState<"hidden" | "skeleton" | "revealing">("hidden");
  const [timelinePhase, setTimelinePhase] = useState<"hidden" | "skeleton" | "revealing">("hidden");
  const [messages, setMessages] = useState<ChatMessage[]>(() => [chatHistory[1]]);
  const [recipeSequenceStarted, setRecipeSequenceStarted] = useState(false);
  const [timelineSourceNodeId, setTimelineSourceNodeId] = useState<string | null>(null);
  const [animatedConnectionIds, setAnimatedConnectionIds] = useState<Set<string>>(new Set());
  const [timelineDrawerOpen, setTimelineDrawerOpen] = useState(false);
  const [selectedTimelineSegmentId, setSelectedTimelineSegmentId] = useState<string | null>(null);
  const [previewPublishState, setPreviewPublishState] = useState<PreviewPublishState>({
    status: "idle",
    progress: 0,
    views: 0,
    likes: 0,
  });
  const [timelineDraftSegments, setTimelineDraftSegments] = useState<TimelineSegment[]>(
    () => seededTimelineSegments
  );
  const [aiGeneratingSegmentId, setAiGeneratingSegmentId] = useState<string | null>(null);
  const [aiGeneratedSegmentIds, setAiGeneratedSegmentIds] = useState<Set<string>>(new Set());
  const timeoutIdsRef = useRef<number[]>([]);
  const initialSequenceStartedRef = useRef(false);
  const previewPublishRunRef = useRef(0);

  const upsertMessageById = useCallback(
    (currentMessages: ChatMessage[], nextMessage: ChatMessage) => {
      const existingIndex = currentMessages.findIndex((message) => message.id === nextMessage.id);
      if (existingIndex === -1) {
        return [...currentMessages, nextMessage];
      }

      const updatedMessages = [...currentMessages];
      updatedMessages[existingIndex] = {
        ...updatedMessages[existingIndex],
        ...nextMessage,
      };
      return updatedMessages;
    },
    []
  );

  useEffect(() => {
    return () => {
      timeoutIdsRef.current.forEach((timeoutId) => window.clearTimeout(timeoutId));
      timeoutIdsRef.current = [];
    };
  }, []);

  const queueTimeout = useCallback((callback: () => void, delay: number) => {
    const timeoutId = window.setTimeout(callback, delay);
    timeoutIdsRef.current.push(timeoutId);
  }, []);

  const startToolSequence = useCallback(
    ({
      messageId,
      content,
      thinkingText,
      step,
      toolCalls,
      doneContent,
      onDone,
    }: ToolSequenceConfig) => {
      const startedAt = Date.now();
      setMessages((currentMessages) =>
        upsertMessageById(currentMessages, {
          id: messageId,
          role: "assistant",
          content,
          timestamp: startedAt,
          step,
          thinkingText,
          toolCalls: toolCallsThroughIndex(toolCalls, 0),
        })
      );

      let elapsed = 0;
      const nextToolPauseMs = 700;
      const completionPauseMs = 900;

      toolCalls.forEach((toolCall, index) => {
        elapsed += toolCall.durationMs ?? 500;
        queueTimeout(() => {
          setMessages((currentMessages) =>
            currentMessages.map((message) =>
              message.id === messageId
                ? {
                    ...message,
                    toolCalls: completedToolCallsThroughIndex(toolCalls, index),
                  }
                : message
            )
          );
        }, elapsed);

        if (index < toolCalls.length - 1) {
          elapsed += nextToolPauseMs;
          queueTimeout(() => {
            setMessages((currentMessages) =>
              currentMessages.map((message) =>
                message.id === messageId
                  ? {
                      ...message,
                      toolCalls: toolCallsThroughIndex(toolCalls, index + 1),
                    }
                  : message
              )
            );
          }, elapsed);
        } else {
          elapsed += completionPauseMs;
          queueTimeout(() => {
            setMessages((currentMessages) =>
              upsertMessageById(
                currentMessages.map((message) =>
                  message.id === messageId
                    ? {
                        ...message,
                        thinkingText: undefined,
                        toolCalls: completedToolCallsThroughIndex(toolCalls, index),
                      }
                    : message
                ),
                {
                  id: `${messageId}-complete`,
                  role: "assistant",
                  content: doneContent,
                  timestamp: Date.now(),
                  step,
                }
              )
            );
            onDone?.();
          }, elapsed);
        }
      });
    },
    [queueTimeout, upsertMessageById]
  );

  useEffect(() => {
    if (initialSequenceStartedRef.current) return;
    initialSequenceStartedRef.current = true;

    startToolSequence({
      messageId: "auto-analysis",
      content: "I am reading those sources and connected clips now.",
      thinkingText: "Building brand context",
      step: "analysis",
      toolCalls: initialAiToolCalls,
      doneContent: chatHistory[2].content,
      onDone: () => {
        setFlowStep("brand-context-ready");
        setBrandCtxPhase("revealing");
        queueTimeout(() => {
          setFlowStep("trend-search");
          setTrendRecipePhase("skeleton");
          startToolSequence({
            messageId: "auto-trend-search",
            content: chatHistory[3].content,
            thinkingText: "Searching for trend recipes",
            step: "trend-search",
            toolCalls: trendSearchAiToolCalls,
            doneContent: chatHistory[4].content,
            onDone: () => {
              setFlowStep("recipes-ready");
              setTrendRecipePhase("revealing");
            },
          });
        }, 2400);
      },
    });

    return () => {
      initialSequenceStartedRef.current = false;
    };
  }, [
    queueTimeout,
    startToolSequence,
  ]);

  const visibleNodes = useMemo(() => {
    if (
      flowStep === "analysis" ||
      flowStep === "media-connect" ||
      flowStep === "source-intake" ||
      flowStep === "brand-context-ready"
    ) {
      return nodes.filter((node) => node.kind === "brand-context");
    }

    if (flowStep === "trend-search" || flowStep === "recipes-ready") {
      return nodes.filter((node) => node.kind === "brand-context" || isTrendSourceNode(node));
    }

    if (flowStep === "recipe-selected") {
      return nodes.filter(
        (node) =>
          node.kind === "brand-context" ||
          isTrendSourceNode(node) ||
          node.kind === "timeline"
      );
    }

    return nodes;
  }, [flowStep, nodes]);

  const visibleConnections = useMemo(() => {
    const nodeIds = new Set(visibleNodes.map((node) => node.id));
    return connections.filter(
      (connection) => nodeIds.has(connection.sourceNodeId) && nodeIds.has(connection.targetNodeId)
    );
  }, [connections, visibleNodes]);

  const viewportFocus = useMemo<CanvasViewportFocus>(() => {
    if (timelinePhase !== "hidden") {
      const timelineFocusNodeIds =
        timelinePhase === "revealing" ? ["timeline-1", "preview-1"] : ["timeline-1"];
      return {
        id: `timeline-${timelinePhase}-${timelineSourceNodeId ?? "selected"}`,
        nodeIds: timelineFocusNodeIds,
        padding: 140,
        maxZoom: 0.95,
        delayMs: 240,
        durationMs: 1050,
      };
    }

    if (trendRecipePhase !== "hidden") {
      return {
        id: "trend-recipes",
        nodeIds: ["recipe-1", "recipe-2", "recipe-3"],
        padding: { top: 80, right: 120, bottom: 430, left: 120 },
        maxZoom: 0.95,
        delayMs: 220,
        durationMs: 1050,
      };
    }

    return {
      id: "brand-context",
      nodeIds: ["brand-ctx"],
      padding: { top: 104, right: 384, bottom: 104, left: 72 },
      maxZoom: 0.72,
      delayMs: 180,
      durationMs: 950,
    };
  }, [timelinePhase, timelineSourceNodeId, trendRecipePhase]);

  const isAiBusy = messages.some((message) =>
    Boolean(message.thinkingText) ||
    message.toolCalls?.some((toolCall) => toolCall.state === "running")
  );

  const bottomPromptSourceImageUrl = useMemo(() => {
    if (selectedNodeIds.size !== 1) return undefined;
    const selectedId = selectedNodeIds.values().next().value as string | undefined;
    const node = selectedId ? nodes.find((candidate) => candidate.id === selectedId) : undefined;
    return node?.imageUrl?.trim() ? node.imageUrl : undefined;
  }, [nodes, selectedNodeIds]);

  const handleNodeMove = useCallback((updates: NodeMoveUpdate[]) => {
    setNodes((currentNodes) => {
      const updateMap = new Map(updates.map((update) => [update.nodeId, update.position]));
      const timelineUpdate = updateMap.get("timeline-1");
      if (timelineUpdate && !updateMap.has("preview-1")) {
        const timelineNode = currentNodes.find((node) => node.id === "timeline-1");
        const previewNode = currentNodes.find((node) => node.id === "preview-1");
        if (timelineNode && previewNode) {
          updateMap.set("preview-1", {
            x: previewNode.position.x + timelineUpdate.x - timelineNode.position.x,
            y: previewNode.position.y + timelineUpdate.y - timelineNode.position.y,
          });
        }
      }

      return currentNodes.map((node) => {
        const position = updateMap.get(node.id);
        return position ? { ...node, position } : node;
      });
    });
  }, []);

  const handleDeleteSelected = useCallback((nodeIds: Set<string>) => {
    setNodes((currentNodes) => currentNodes.filter((node) => !nodeIds.has(node.id)));
    setConnections((currentConnections) =>
      currentConnections.filter(
        (connection) =>
          !nodeIds.has(connection.sourceNodeId) && !nodeIds.has(connection.targetNodeId)
      )
    );
    setSelectedNodeIds(new Set());
  }, []);

  const handleExportTimeline = useCallback((targetId: ExportTarget["id"]) => {
    const target = exportTargets.find((candidate) => candidate.id === targetId);
    toast.success(`Prepared ${target?.editor ?? "timeline"} export`);
  }, []);

  const handleDownloadPreview = useCallback(() => {
    toast.success("Preview download ready");
  }, []);

  const handlePublishPreview = useCallback(() => {
    const runId = previewPublishRunRef.current + 1;
    previewPublishRunRef.current = runId;

    setPreviewPublishState({
      status: "publishing",
      progress: 18,
      views: 0,
      likes: 0,
    });
    toast.success("Preview publish queued");

    queueTimeout(() => {
      if (previewPublishRunRef.current !== runId) return;
      setPreviewPublishState((currentState) => ({
        ...currentState,
        status: "publishing",
        progress: 46,
      }));
    }, 700);

    queueTimeout(() => {
      if (previewPublishRunRef.current !== runId) return;
      setPreviewPublishState((currentState) => ({
        ...currentState,
        status: "publishing",
        progress: 78,
      }));
    }, 1600);

    queueTimeout(() => {
      if (previewPublishRunRef.current !== runId) return;
      setPreviewPublishState({
        status: "published",
        progress: 100,
        views: 48,
        likes: 9,
      });
    }, 2800);

    queueTimeout(() => {
      if (previewPublishRunRef.current !== runId) return;
      setPreviewPublishState((currentState) => ({
        ...currentState,
        views: 312,
        likes: 58,
      }));
    }, 5300);
  }, [queueTimeout]);

  const handleSelectionChange = useCallback((nodeIds: Set<string>) => {
    setSelectedNodeIds(nodeIds);
  }, []);

  const handleOpenTimelineNode = useCallback(
    (node: CanvasNode) => {
      if (node.kind !== "timeline" || timelinePhase !== "revealing") {
        return;
      }
      setTimelineDrawerOpen(true);
    },
    [timelinePhase]
  );

  const applyTimelineClipSwap = useCallback((segmentId: string, newAsset: MediaAsset) => {
    setTimelineDraftSegments((currentSegments) =>
      currentSegments.map((segment) =>
        segment.id === segmentId
          ? {
              ...segment,
              kind: "clip" as const,
              mediaAssetId: newAsset.id,
              selectedAssetLabel: newAsset.label,
              thumbnail: newAsset.thumbnail,
            }
          : segment
      )
    );
    setSelectedTimelineSegmentId(segmentId);
  }, []);

  const handleSwapTimelineClip = useCallback(
    (segmentId: string, newAsset: MediaAsset) => {
      applyTimelineClipSwap(segmentId, newAsset);
      setAiGeneratedSegmentIds((currentSegmentIds) => {
        if (!currentSegmentIds.has(segmentId)) return currentSegmentIds;
        const nextSegmentIds = new Set(currentSegmentIds);
        nextSegmentIds.delete(segmentId);
        return nextSegmentIds;
      });
    },
    [applyTimelineClipSwap]
  );

  const handleGenerateMissingShotWithAi = useCallback(
    (segmentId: string, newAsset: MediaAsset) => {
      if (aiGeneratingSegmentId !== null) return;

      setAiGeneratingSegmentId(segmentId);
      queueTimeout(() => {
        applyTimelineClipSwap(segmentId, newAsset);
        setAiGeneratedSegmentIds((currentSegmentIds) => {
          const nextSegmentIds = new Set(currentSegmentIds);
          nextSegmentIds.add(segmentId);
          return nextSegmentIds;
        });
        setAiGeneratingSegmentId(null);
      }, 650);
    },
    [aiGeneratingSegmentId, applyTimelineClipSwap, queueTimeout]
  );

  const upsertTimelineConnection = useCallback((currentConnections: CanvasConnection[], recipeId: string) => {
    const connectionId = recipeId === "recipe-1" ? "r1-tl" : `${recipeId}-tl`;
    const filteredConnections = currentConnections.filter(
      (connection) =>
        !(connection.sourceNodeId.startsWith("recipe-") && connection.targetNodeId === "timeline-1")
    );
    return [
      ...filteredConnections,
      {
        id: connectionId,
        sourceNodeId: recipeId,
        targetNodeId: "timeline-1",
      },
    ];
  }, []);

  const startTimelineFromRecipe = useCallback(
    (recipeNode: CanvasNode) => {
      if (recipeSequenceStarted || flowStep !== "recipes-ready") {
        return;
      }

      const recipeNodeId = recipeNode.id;
      const connectionId = recipeNodeId === "recipe-1" ? "r1-tl" : `${recipeNodeId}-tl`;
      const timelineWidth = 480;
      const timelineHeight = 280;
      const previewWidth = 210;
      const previewHeight = 380;
      const verticalTimelineGap = 192;
      const previewNodeGap = 64;
      const timelineAnchorNode =
        nodes.find((node) => node.id === "recipe-1" && isTrendSourceNode(node)) ?? recipeNode;
      const timelinePosition = {
        x: timelineAnchorNode.position.x,
        y: timelineAnchorNode.position.y + timelineAnchorNode.size.height + verticalTimelineGap,
      };
      setSelectedNodeIds(new Set([recipeNodeId]));
      setTimelineSourceNodeId(recipeNodeId);
      setAiGeneratingSegmentId(null);
      setAiGeneratedSegmentIds(new Set());
      setRecipeSequenceStarted(true);
      setFlowStep("recipe-selected");
      setTimelinePhase("skeleton");
      setNodes((currentNodes) =>
        currentNodes.map((node) =>
          node.id === "timeline-1"
            ? {
                ...node,
                position: timelinePosition,
                size: {
                  width: timelineWidth,
                  height: timelineHeight,
                },
              }
            : node.id === "preview-1"
              ? {
                  ...node,
                  position: {
                    x: timelinePosition.x + timelineWidth + previewNodeGap,
                    y: timelinePosition.y + (timelineHeight - previewHeight) / 2,
                  },
                  size: {
                    width: previewWidth,
                    height: previewHeight,
                  },
                }
              : node
        )
      );
      setConnections((currentConnections) => upsertTimelineConnection(currentConnections, recipeNodeId));
      setAnimatedConnectionIds(new Set([connectionId]));
      queueTimeout(() => setAnimatedConnectionIds(new Set()), 550);
      setMessages((currentMessages) => [
        ...currentMessages,
        {
          id: "recipe-choice",
          role: "user",
          content: `Use ${recipeNode.title}.`,
          timestamp: Date.now(),
          step: "recipe-selected",
        },
      ]);
      startToolSequence({
        messageId: "auto-timeline",
        content: "Great pick. I am matching clips and assembling the timeline now.",
        thinkingText: "Auto-filling the timeline",
        step: "timeline-ready",
        toolCalls: recipeAiToolCalls,
        doneContent:
          "Timeline is filled. I left one missing uphill-movement shot and found alternate clips for swaps.",
        onDone: () => {
          setTimelinePhase("revealing");
          setFlowStep("timeline-ready");
        },
      });
    },
    [flowStep, nodes, queueTimeout, recipeSequenceStarted, startToolSequence, upsertTimelineConnection]
  );

  const handleBottomPromptChange = useCallback((value: string) => {
    setBottomPrompt(value);
  }, []);

  const handleBottomPromptSubmit = useCallback(
    (value: string) => {
      const promptText = value.trim();
      if (!promptText || isAiBusy) return;

      setBottomPrompt("");
      setMessages((currentMessages) => [
        ...currentMessages,
        {
          id: `prompt-${Date.now()}`,
          role: "user",
          content: promptText,
          timestamp: Date.now(),
          step: flowStep,
        },
      ]);
      startToolSequence({
        messageId: `prompt-response-${Date.now()}`,
        content: "I will use the current canvas context for that.",
        thinkingText: "Working from your current canvas",
        step: flowStep,
        toolCalls: promptAiToolCalls,
        doneContent:
          "Done. I would use the selected recipe, keep the missing-shot prompt visible, and review alternates before export.",
      });
    },
    [flowStep, isAiBusy, startToolSequence]
  );

  return (
    <div className="reframe-workspace flex h-dvh min-h-0 overflow-hidden bg-background text-foreground">
      <ChatHistoryPanel
        messages={messages}
        promptValue={bottomPrompt}
        promptBusy={isAiBusy}
        promptPlaceholder="Ask Reframe anything..."
        promptSourceImageUrl={bottomPromptSourceImageUrl}
        chromeHidden={timelineDrawerOpen}
        onPromptChange={handleBottomPromptChange}
        onPromptSubmit={handleBottomPromptSubmit}
      />
      <main className="relative min-h-0 min-w-0 flex-1 overflow-hidden">
        <InfiniteCanvas
          nodes={visibleNodes}
          connections={visibleConnections}
          selectedNodeIds={selectedNodeIds}
          onSelectionChange={handleSelectionChange}
          onNodeMove={handleNodeMove}
          onDeleteSelected={handleDeleteSelected}
          exportTargets={exportTargets}
          onExportTimeline={handleExportTimeline}
          onDownloadPreview={handleDownloadPreview}
          onPublishPreview={handlePublishPreview}
          timelineSourceNodeId={timelineSourceNodeId ?? undefined}
          viewportFocus={viewportFocus}
          onCreateTimelineFromTrend={startTimelineFromRecipe}
          onOpenTimelineNode={handleOpenTimelineNode}
          animatedConnectionIds={animatedConnectionIds}
          brandCtxPhase={brandCtxPhase}
          trendRecipePhase={trendRecipePhase}
          timelinePhase={timelinePhase}
          previewSegments={timelineDraftSegments}
          previewPublishState={previewPublishState}
          chromeHidden={timelineDrawerOpen}
        />
        {!timelineDrawerOpen ? (
          <>
            <div
              data-testid="workspace-top-fade"
              className="pointer-events-none absolute inset-x-0 top-0 z-20 h-28"
              style={{ background: "linear-gradient(to bottom, color-mix(in srgb, var(--color-background) 92%, transparent) 0%, transparent 100%)" }}
            />
            <div
              data-testid="workspace-top-label"
              className="pointer-events-none absolute left-7 top-4 z-30"
            >
              <span className="text-sm font-semibold text-foreground/90">
                Petite Outdoors
              </span>
            </div>
          </>
        ) : null}
      </main>
      <TimelineBottomDrawer
        open={timelineDrawerOpen}
        segments={timelineDraftSegments}
        selectedSegmentId={selectedTimelineSegmentId}
        onOpenChange={setTimelineDrawerOpen}
        onSelectSegment={setSelectedTimelineSegmentId}
        onSwapClip={handleSwapTimelineClip}
        onGenerateMissingShotWithAi={handleGenerateMissingShotWithAi}
        aiGeneratingSegmentId={aiGeneratingSegmentId}
        aiGeneratedSegmentIds={aiGeneratedSegmentIds}
      />
      <Toaster />
    </div>
  );
}
