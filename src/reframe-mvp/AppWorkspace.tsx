"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle } from "@phosphor-icons/react";
import { toast } from "sonner";
import { ChatHistoryPanel } from "@/src/components/app-shell/chat-history-panel";
import { InfiniteCanvas, isTrendSourceNode, type NodeMoveUpdate } from "@/src/components/infinite-canvas";
import type { PreviewPublishState } from "@/src/components/infinite-canvas/canvas-node-view";
import { TimelineBottomDrawer } from "@/src/components/timeline/timeline-bottom-drawer";
import { Toaster } from "@/src/components/ui/sonner";
import type { CanvasConnection, CanvasNode, CanvasViewportFocus } from "@/src/lib/infinite-canvas/types";
import type { AiFlowStep, ChatMessage, ExportTarget, MediaAsset, SimulatedToolCall, TimelineSegment } from "@/src/data/reframe-demo";
import {
  mvpBrandContext,
  mvpChatHistory,
  mvpConnections,
  mvpExportTargets,
  mvpFormatToolCalls,
  mvpInitialToolCalls,
  mvpLibraryAssets,
  mvpNodes,
  mvpStepLabels,
  mvpStoryboardToolCalls,
  mvpTimelineSegments,
} from "./data";
import {
  downloadTextFile,
  serializeMvpJsonPackage,
  serializeMvpMarkdownBrief,
  serializeMvpScript,
  serializeMvpShotListCsv,
} from "./export";

type ToolSequenceConfig = {
  messageId: string;
  content: string;
  thinkingText: string;
  step: AiFlowStep;
  toolCalls: SimulatedToolCall[];
  doneContent: string;
  onDone?: () => void;
};

type PreviewCameraIntentKind = "preview-close-handoff" | "visible-canvas-overview";

type PreviewCameraIntent = {
  kind: PreviewCameraIntentKind;
  sequence: number;
};

type EditorialMemory = {
  preference: string;
  source: string;
};

interface AppWorkspaceProps {
  workspaceSlug: string;
  projectSlug: string;
}

const BRAND_CONTEXT_HANDOFF_PAUSE_MS = 2400;
const CONNECTION_DRAW_IN_MS = 550;

function toolCallsThroughIndex(toolCalls: SimulatedToolCall[], activeIndex: number): SimulatedToolCall[] {
  return toolCalls.slice(0, activeIndex + 1).map((toolCall, index) => ({
    ...toolCall,
    state: index < activeIndex ? ("completed" as const) : ("running" as const),
  }));
}

function completedToolCallsThroughIndex(toolCalls: SimulatedToolCall[], completedIndex: number) {
  return toolCalls
    .slice(0, completedIndex + 1)
    .map((toolCall) => ({ ...toolCall, state: "completed" as const }));
}

function upsertMessageById(currentMessages: ChatMessage[], nextMessage: ChatMessage) {
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
}

function selectedNodeImage(nodes: CanvasNode[], selectedNodeIds: Set<string>) {
  if (selectedNodeIds.size !== 1) return undefined;
  const selectedId = selectedNodeIds.values().next().value as string | undefined;
  const node = selectedId ? nodes.find((candidate) => candidate.id === selectedId) : undefined;
  return node?.imageUrl?.trim() ? node.imageUrl : undefined;
}

export function AppWorkspace({ workspaceSlug, projectSlug }: AppWorkspaceProps) {
  const [nodes, setNodes] = useState(mvpNodes);
  const [connections, setConnections] = useState(mvpConnections);
  const [selectedNodeIds, setSelectedNodeIds] = useState<Set<string>>(new Set());
  const [bottomPrompt, setBottomPrompt] = useState("");
  const [flowStep, setFlowStep] = useState<AiFlowStep>("analysis");
  const [brandCtxPhase, setBrandCtxPhase] = useState<"skeleton" | "revealing">("skeleton");
  const [trendRecipePhase, setTrendRecipePhase] = useState<"hidden" | "skeleton" | "revealing">("hidden");
  const [timelinePhase, setTimelinePhase] = useState<"hidden" | "skeleton" | "revealing">("hidden");
  const [messages, setMessages] = useState<ChatMessage[]>(() => [mvpChatHistory[0]]);
  const [recipeSequenceStarted, setRecipeSequenceStarted] = useState(false);
  const [timelineSourceNodeId, setTimelineSourceNodeId] = useState<string | null>(null);
  const [animatedConnectionIds, setAnimatedConnectionIds] = useState<Set<string>>(new Set());
  const [timelineDrawerOpen, setTimelineDrawerOpen] = useState(false);
  const [selectedTimelineSegmentId, setSelectedTimelineSegmentId] = useState<string | null>(null);
  const [timelineDraftSegments, setTimelineDraftSegments] = useState<TimelineSegment[]>(
    () => mvpTimelineSegments
  );
  const [suggestingSegmentId, setSuggestingSegmentId] = useState<string | null>(null);
  const [suggestedSegmentIds, setSuggestedSegmentIds] = useState<Set<string>>(new Set());
  const [pendingPreviewCloseHandoff, setPendingPreviewCloseHandoff] = useState(false);
  const [previewCameraIntent, setPreviewCameraIntent] = useState<PreviewCameraIntent | null>(null);
  const [editorialMemory, setEditorialMemory] = useState<EditorialMemory | null>(null);
  const timeoutIdsRef = useRef<number[]>([]);
  const initialSequenceStartedRef = useRef(false);
  const previewCameraIntentSequenceRef = useRef(0);

  const queueTimeout = useCallback((callback: () => void, delay: number) => {
    const timeoutId = window.setTimeout(callback, delay);
    timeoutIdsRef.current.push(timeoutId);
  }, []);

  useEffect(() => {
    return () => {
      timeoutIdsRef.current.forEach((timeoutId) => window.clearTimeout(timeoutId));
      timeoutIdsRef.current = [];
    };
  }, []);

  const triggerPreviewCameraIntent = useCallback((kind: PreviewCameraIntentKind) => {
    previewCameraIntentSequenceRef.current += 1;
    setPreviewCameraIntent({
      kind,
      sequence: previewCameraIntentSequenceRef.current,
    });
  }, []);

  const startToolSequence = useCallback(
    ({ messageId, content, thinkingText, step, toolCalls, doneContent, onDone }: ToolSequenceConfig) => {
      setMessages((currentMessages) =>
        upsertMessageById(currentMessages, {
          id: messageId,
          role: "assistant",
          content,
          timestamp: Date.now(),
          step,
          thinkingText,
          toolCalls: toolCallsThroughIndex(toolCalls, 0),
        })
      );

      let elapsed = 0;
      const nextToolPauseMs = 500;
      const completionPauseMs = 650;

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
    [queueTimeout]
  );

  useEffect(() => {
    if (initialSequenceStartedRef.current) return;
    initialSequenceStartedRef.current = true;

    startToolSequence({
      messageId: "auto-analysis",
      content: "I am extracting context from the saved intake and proof assets.",
      thinkingText: "Building business context",
      step: "analysis",
      toolCalls: mvpInitialToolCalls,
      doneContent: mvpChatHistory[1].content,
      onDone: () => {
        setFlowStep("brand-context-ready");
        setBrandCtxPhase("revealing");
        queueTimeout(() => {
          setFlowStep("trend-search");
          setTrendRecipePhase("skeleton");
          startToolSequence({
            messageId: "auto-format-match",
            content: mvpChatHistory[2].content,
            thinkingText: "Matching curated formats",
            step: "trend-search",
            toolCalls: mvpFormatToolCalls,
            doneContent: mvpChatHistory[3].content,
            onDone: () => {
              setFlowStep("recipes-ready");
              setTrendRecipePhase("revealing");
              setAnimatedConnectionIds(new Set(["ctx-r1", "ctx-r2", "ctx-r3"]));
              queueTimeout(() => setAnimatedConnectionIds(new Set()), CONNECTION_DRAW_IN_MS);
            },
          });
        }, BRAND_CONTEXT_HANDOFF_PAUSE_MS);
      },
    });

    return () => {
      initialSequenceStartedRef.current = false;
    };
  }, [queueTimeout, startToolSequence]);

  const visibleNodes = useMemo(() => {
    if (flowStep === "analysis" || flowStep === "media-connect" || flowStep === "source-intake") {
      return nodes.filter((node) => node.kind === "brand-context");
    }

    if (flowStep === "brand-context-ready") {
      return nodes.filter((node) => node.kind === "brand-context" || node.kind === "media");
    }

    if (flowStep === "trend-search" || flowStep === "recipes-ready") {
      return nodes.filter(
        (node) => node.kind === "brand-context" || node.kind === "media" || isTrendSourceNode(node)
      );
    }

    if (flowStep === "recipe-selected") {
      return nodes.filter(
        (node) =>
          node.kind === "brand-context" ||
          node.kind === "media" ||
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
    if (previewCameraIntent?.kind === "visible-canvas-overview") {
      return {
        id: `visible-canvas-overview-${previewCameraIntent.sequence}`,
        nodeIds: visibleNodes.map((node) => node.id),
        padding: { top: 88, right: 384, bottom: 120, left: 88 },
        minZoom: 0.24,
        maxZoom: 0.82,
        delayMs: 220,
        durationMs: 1150,
      };
    }

    if (previewCameraIntent?.kind === "preview-close-handoff") {
      return {
        id: `preview-close-handoff-${previewCameraIntent.sequence}`,
        nodeIds: ["preview-1"],
        padding: { top: 72, right: 384, bottom: 72, left: 96 },
        minZoom: 0.55,
        maxZoom: 1.12,
        delayMs: 180,
        durationMs: 1050,
      };
    }

    if (timelinePhase !== "hidden") {
      return {
        id: `storyboard-${timelinePhase}-${timelineSourceNodeId ?? "selected"}`,
        nodeIds: timelinePhase === "revealing" ? ["timeline-1", "preview-1"] : ["timeline-1"],
        padding: 140,
        maxZoom: 0.95,
        delayMs: 240,
        durationMs: 1050,
      };
    }

    if (trendRecipePhase !== "hidden") {
      return {
        id: "founder-led-recipes",
        nodeIds: ["recipe-1", "recipe-2", "recipe-3"],
        padding: { top: 80, right: 120, bottom: 430, left: 120 },
        maxZoom: 0.95,
        delayMs: 220,
        durationMs: 1050,
      };
    }

    const brandContextNodeIds =
      flowStep === "brand-context-ready" ? ["brand-ctx", "library"] : ["brand-ctx"];

    return {
      id: flowStep === "brand-context-ready" ? "business-context-library" : "business-context",
      nodeIds: brandContextNodeIds,
      padding: { top: 104, right: 384, bottom: 104, left: 72 },
      maxZoom: 0.72,
      delayMs: 180,
      durationMs: 950,
    };
  }, [flowStep, previewCameraIntent, timelinePhase, timelineSourceNodeId, trendRecipePhase, visibleNodes]);

  const isBusy = messages.some(
    (message) => message.thinkingText || message.toolCalls?.some((toolCall) => toolCall.state === "running")
  );

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

  const exportInput = useMemo(
    () => ({ workspaceSlug, projectSlug, segments: timelineDraftSegments }),
    [projectSlug, timelineDraftSegments, workspaceSlug]
  );

  const handleExportTimeline = useCallback(
    async (targetId: ExportTarget["id"]) => {
      const fileBase = `${projectSlug}-reframe`;

      if (targetId === "markdown-brief") {
        downloadTextFile(`${fileBase}-brief.md`, serializeMvpMarkdownBrief(exportInput), "text/markdown");
        toast.success("Content brief downloaded");
        return;
      }

      if (targetId === "json-package") {
        downloadTextFile(`${fileBase}-package.json`, serializeMvpJsonPackage(exportInput), "application/json");
        toast.success("JSON package downloaded");
        return;
      }

      if (targetId === "shot-list-csv") {
        downloadTextFile(`${fileBase}-shot-list.csv`, serializeMvpShotListCsv(exportInput), "text/csv");
        toast.success("Shot list downloaded");
        return;
      }

      if (targetId === "copy-script") {
        const script = serializeMvpScript(exportInput);
        if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(script);
          toast.success("Script copied");
        } else {
          downloadTextFile(`${fileBase}-script.txt`, script, "text/plain");
          toast.success("Script downloaded");
        }
      }
    },
    [exportInput, projectSlug]
  );

  const handleDownloadBrief = useCallback(() => {
    downloadTextFile(
      `${projectSlug}-content-brief.md`,
      serializeMvpMarkdownBrief(exportInput),
      "text/markdown"
    );
    toast.success("Content brief downloaded");
  }, [exportInput, projectSlug]);

  const handleOpenTimelineNode = useCallback(
    (node: CanvasNode) => {
      if (node.kind !== "timeline" || timelinePhase !== "revealing") return;
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
      const swappedSegment = timelineDraftSegments.find((segment) => segment.id === segmentId);
      const shouldTriggerPreviewCloseHandoff = swappedSegment?.kind === "missing";

      applyTimelineClipSwap(segmentId, newAsset);
      setSuggestedSegmentIds((currentSegmentIds) => {
        if (!currentSegmentIds.has(segmentId)) return currentSegmentIds;
        const nextSegmentIds = new Set(currentSegmentIds);
        nextSegmentIds.delete(segmentId);
        return nextSegmentIds;
      });
      if (shouldTriggerPreviewCloseHandoff) setPendingPreviewCloseHandoff(true);
    },
    [applyTimelineClipSwap, timelineDraftSegments]
  );

  const handleSelectTimelineCaption = useCallback((segmentId: string, caption: string) => {
    setTimelineDraftSegments((currentSegments) =>
      currentSegments.map((segment) =>
        segment.id === segmentId && segment.kind === "text-overlay"
          ? { ...segment, overlayText: caption }
          : segment
      )
    );
    setSelectedTimelineSegmentId(segmentId);
  }, []);

  const handleSuggestMissingShot = useCallback(
    (segmentId: string, newAsset: MediaAsset) => {
      if (suggestingSegmentId !== null) return;

      setSuggestingSegmentId(segmentId);
      queueTimeout(() => {
        applyTimelineClipSwap(segmentId, newAsset);
        setSuggestedSegmentIds((currentSegmentIds) => {
          const nextSegmentIds = new Set(currentSegmentIds);
          nextSegmentIds.add(segmentId);
          return nextSegmentIds;
        });
        setSuggestingSegmentId(null);
        setPendingPreviewCloseHandoff(true);
      }, 500);
    },
    [applyTimelineClipSwap, queueTimeout, suggestingSegmentId]
  );

  const handleTimelineDrawerOpenChange = useCallback(
    (nextOpen: boolean) => {
      setTimelineDrawerOpen(nextOpen);
      if (!nextOpen && pendingPreviewCloseHandoff) {
        setPendingPreviewCloseHandoff(false);
        triggerPreviewCameraIntent("preview-close-handoff");
      }
    },
    [pendingPreviewCloseHandoff, triggerPreviewCameraIntent]
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

  const startStoryboardFromRecipe = useCallback(
    (recipeNode: CanvasNode) => {
      if (recipeSequenceStarted || flowStep !== "recipes-ready") return;

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
      setSuggestingSegmentId(null);
      setSuggestedSegmentIds(new Set());
      setPendingPreviewCloseHandoff(false);
      setPreviewCameraIntent(null);
      setRecipeSequenceStarted(true);
      setFlowStep("recipe-selected");
      setTimelinePhase("skeleton");
      setNodes((currentNodes) =>
        currentNodes.map((node) =>
          node.id === "timeline-1"
            ? {
                ...node,
                position: timelinePosition,
                size: { width: timelineWidth, height: timelineHeight },
              }
            : node.id === "preview-1"
              ? {
                  ...node,
                  position: {
                    x: timelinePosition.x + timelineWidth + previewNodeGap,
                    y: timelinePosition.y + (timelineHeight - previewHeight) / 2,
                  },
                  size: { width: previewWidth, height: previewHeight },
                }
              : node
        )
      );
      setConnections((currentConnections) => upsertTimelineConnection(currentConnections, recipeNodeId));
      setAnimatedConnectionIds(new Set([connectionId]));
      queueTimeout(() => setAnimatedConnectionIds(new Set()), CONNECTION_DRAW_IN_MS);
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
        messageId: "auto-storyboard",
        content: "Great pick. I am matching proof assets and drafting the storyboard.",
        thinkingText: "Drafting storyboard",
        step: "timeline-ready",
        toolCalls: mvpStoryboardToolCalls,
        doneContent:
          "Storyboard is ready. I marked one movement proof shot to film and found alternate clips for swaps.",
        onDone: () => {
          setTimelinePhase("revealing");
          setFlowStep("timeline-ready");
        },
      });
    },
    [flowStep, nodes, queueTimeout, recipeSequenceStarted, startToolSequence, upsertTimelineConnection]
  );

  const savePreference = useCallback((preference: string, source: string) => {
    setEditorialMemory({ preference, source });
    setMessages((currentMessages) => [
      ...currentMessages,
      {
        id: `memory-${Date.now()}`,
        role: "assistant",
        content: `Saved to Editorial Memory: ${preference}`,
        timestamp: Date.now(),
        step: "timeline-ready",
      },
    ]);
  }, []);

  const updateOverlay = useCallback((segmentId: string, overlayText: string) => {
    setTimelineDraftSegments((currentSegments) =>
      currentSegments.map((segment) =>
        segment.id === segmentId && segment.kind === "text-overlay"
          ? { ...segment, overlayText }
          : segment
      )
    );
    setSelectedTimelineSegmentId(segmentId);
  }, []);

  const appendAssistantMessage = useCallback((content: string) => {
    setMessages((currentMessages) => [
      ...currentMessages,
      {
        id: `prompt-response-${Date.now()}`,
        role: "assistant",
        content,
        timestamp: Date.now(),
        step: flowStep,
      },
    ]);
  }, [flowStep]);

  const handleBottomPromptSubmit = useCallback(
    (value: string) => {
      const promptText = value.trim();
      if (!promptText || isBusy) return;

      const lowerPrompt = promptText.toLowerCase();
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

      if (lowerPrompt.includes("make hook more direct")) {
        updateOverlay("ts-2", "Regular hiking pants never fit my 5'2 frame, so I built the pair I needed.");
        savePreference(
          "Use direct fit-proof hooks over generic empowerment copy.",
          "You asked for a more direct hook."
        );
        appendAssistantMessage("I made the hook more direct and saved that preference.");
        return;
      }

      if (lowerPrompt.includes("make this more founder-led")) {
        updateOverlay("ts-2", "I could not find technical hiking pants for my frame, so I started testing my own.");
        savePreference(
          "Use first-person founder language when explaining product origin.",
          "You revised the hook toward founder POV."
        );
        appendAssistantMessage("I rewrote the hook in a clearer founder-led voice.");
        return;
      }

      if (lowerPrompt.includes("use a stronger cta")) {
        updateOverlay("ts-7", "Join the preorder before the first petite hiking pant production run closes.");
        savePreference(
          "Use specific preorder CTAs with urgency tied to the first production run.",
          "You requested a stronger CTA."
        );
        appendAssistantMessage("I strengthened the CTA and saved that CTA preference.");
        return;
      }

      if (lowerPrompt.includes("show me 3 alternates")) {
        setSelectedTimelineSegmentId("ts-5");
        setTimelineDrawerOpen(true);
        appendAssistantMessage("I opened the storyboard beat with alternate movement clips.");
        return;
      }

      if (lowerPrompt.includes("save this as my style")) {
        savePreference(
          "Keep copy direct, proof-led, and grounded in the founder's fit problem.",
          "You saved the current storyboard direction as style."
        );
        appendAssistantMessage("Saved this storyboard direction as your style.");
        return;
      }

      appendAssistantMessage(
        "Try one of these commands: make hook more direct, make this more founder-led, use a stronger CTA, show me 3 alternates, or save this as my style."
      );
    },
    [appendAssistantMessage, flowStep, isBusy, savePreference, updateOverlay]
  );

  const previewPublishState = undefined as PreviewPublishState | undefined;

  return (
    <div className="reframe-workspace flex h-dvh min-h-0 overflow-hidden bg-background text-foreground">
      <ChatHistoryPanel
        messages={messages}
        promptValue={bottomPrompt}
        promptBusy={isBusy}
        promptPlaceholder="Ask Reframe to revise this post..."
        promptSourceImageUrl={selectedNodeImage(nodes, selectedNodeIds)}
        stepLabels={mvpStepLabels}
        chromeHidden={timelineDrawerOpen}
        onPromptChange={setBottomPrompt}
        onPromptSubmit={handleBottomPromptSubmit}
      />
      <main className="relative min-h-0 min-w-0 flex-1 overflow-hidden">
        <InfiniteCanvas
          nodes={visibleNodes}
          connections={visibleConnections}
          selectedNodeIds={selectedNodeIds}
          onSelectionChange={setSelectedNodeIds}
          onNodeMove={handleNodeMove}
          onDeleteSelected={handleDeleteSelected}
          exportTargets={mvpExportTargets}
          onExportTimeline={handleExportTimeline}
          onDownloadPreview={handleDownloadBrief}
          timelineSourceNodeId={timelineSourceNodeId ?? undefined}
          viewportFocus={viewportFocus}
          onCreateTimelineFromTrend={startStoryboardFromRecipe}
          onOpenTimelineNode={handleOpenTimelineNode}
          animatedConnectionIds={animatedConnectionIds}
          brandCtxPhase={brandCtxPhase}
          trendRecipePhase={trendRecipePhase}
          timelinePhase={timelinePhase}
          previewSegments={timelineDraftSegments}
          previewPublishState={previewPublishState}
          toolbarLabels={{
            exportTimeline: "Download handoff",
            downloadPreview: "Download content brief",
          }}
          nodeViewLabels={{
            kindLabels: {
              "brand-context": "Extracted Business Context",
              media: "Labeled Media",
              video: "Format Example",
              timeline: "Storyboard",
              preview: "Storyboard Preview",
              "trend-recipe": "Founder-Led Recipe",
            },
            createTimelineLabel: (title) => `Build storyboard from ${title}`,
            brandContextLoadingLabel: "Loading extracted business context",
            recipeLoadingLabel: "Loading founder-led recipe",
            formatLoadingLabel: "Loading format example",
            timelineLoadingLabel: "Loading storyboard",
            timelinePreviewLabel: "Storyboard preview",
            libraryTagLabel: "proof labels",
            libraryMatchLabel: "Matched to proof moments",
            libraryReadyLabel: "Ready for storyboard swaps",
            brandTrendSignalsTitle: "Content Format Fit Signals",
            videoAriaLabel: (title) => `${title} format example`,
            detailsTitle: (title) => `${title} content format breakdown`,
            detailsDescription: (title) => `Detailed visual breakdown of the ${title} content format.`,
            detailsCloseLabel: "Close format breakdown",
          }}
          brandContextCardData={mvpBrandContext.card}
          brandName={mvpBrandContext.name}
          libraryAssets={mvpLibraryAssets}
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
                {mvpBrandContext.name}
              </span>
              <span className="ml-2 text-xs text-muted-foreground">
                {workspaceSlug}/{projectSlug}
              </span>
            </div>
          </>
        ) : null}
        {editorialMemory ? (
          <div
            data-testid="editorial-memory-card"
            className="pointer-events-none absolute bottom-6 left-7 z-30 w-80 rounded-lg border border-border bg-card p-3 text-card-foreground shadow-[rgba(0,0,0,0.10)_0px_4px_14px_0px]"
          >
            <div className="flex items-center gap-2 text-xs font-semibold">
              <CheckCircle className="size-4 text-accent" weight="fill" />
              Saved to Editorial Memory
            </div>
            <p className="mt-2 text-xs leading-5 text-foreground">
              Preference: {editorialMemory.preference}
            </p>
            <p className="mt-1 text-[11px] leading-4 text-muted-foreground">
              Source: {editorialMemory.source}
            </p>
            <p className="mt-1 text-[11px] leading-4 text-muted-foreground">
              Next drafts will apply this preference.
            </p>
          </div>
        ) : null}
      </main>
      <TimelineBottomDrawer
        open={timelineDrawerOpen}
        segments={timelineDraftSegments}
        selectedSegmentId={selectedTimelineSegmentId}
        onOpenChange={handleTimelineDrawerOpenChange}
        onSelectSegment={setSelectedTimelineSegmentId}
        onSwapClip={handleSwapTimelineClip}
        onSelectCaption={handleSelectTimelineCaption}
        onGenerateMissingShotWithAi={handleSuggestMissingShot}
        aiGeneratingSegmentId={suggestingSegmentId}
        aiGeneratedSegmentIds={suggestedSegmentIds}
        title="Founder Confessional Storyboard"
        description="Edit matched clips, shot-to-film placeholders, overlays, and optional beat timing."
        assemblyLabels={{
          missingShotGenerate: "Suggest shot to film",
          missingShotGenerating: "Suggesting shot...",
          missingShotUpload: "Use placeholder",
          generatedBadge: "Suggested",
        }}
      />
      <Toaster />
    </div>
  );
}
