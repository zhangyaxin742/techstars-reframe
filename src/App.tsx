"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChatHistoryPanel } from "./components/app-shell/chat-history-panel";
import { ExportHandoffPanel } from "./components/export/export-handoff-panel";
import { InfiniteCanvas, type NodeMoveUpdate } from "./components/infinite-canvas";
import { MediaLibraryPanel } from "./components/media/media-library-panel";
import { MockVideoPreview } from "./components/preview/mock-video-preview";
import { TimelineAssembly } from "./components/timeline/timeline-assembly";
import { Toaster } from "./components/ui/sonner";
import {
  type AiFlowStep,
  type ChatMessage,
  type MediaAsset,
  type SimulatedToolCall,
  chatHistory,
  exportTargets,
  initialAiToolCalls,
  mediaAssets,
  promptAiToolCalls,
  recipeAiToolCalls,
  reframeDemoConnections,
  reframeDemoNodes,
  timelineSegments,
  trendRecipes,
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

type TimedAssistantMessageConfig = {
  message: ChatMessage;
  startDelay: number;
  thinkingDelay: number;
  thinkingText: string;
};

function toolCallsAtIndex(
  toolCalls: SimulatedToolCall[],
  activeIndex: number
): SimulatedToolCall[] {
  return toolCalls.map((toolCall, index) => ({
    ...toolCall,
    state:
      index < activeIndex
        ? "completed"
        : index === activeIndex
          ? "running"
          : "pending",
  }));
}

function completeToolCalls(toolCalls: SimulatedToolCall[]): SimulatedToolCall[] {
  return toolCalls.map((toolCall) => ({ ...toolCall, state: "completed" as const }));
}

const connectedMediaUserMessage: ChatMessage = {
  ...chatHistory[3],
  role: "user",
  content: "Connect website, Instagram, TikTok, Shopify, Google Drive, and Phone Camera Roll.",
};

export function App() {
  const [nodes, setNodes] = useState(reframeDemoNodes);
  const [connections, setConnections] = useState(reframeDemoConnections);
  const [selectedNodeIds, setSelectedNodeIds] = useState<Set<string>>(new Set());
  const [bottomPrompt, setBottomPrompt] = useState("");
  const [flowStep, setFlowStep] = useState<AiFlowStep>("analysis");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [recipeSequenceStarted, setRecipeSequenceStarted] = useState(false);
  const [timeline, setTimeline] = useState(timelineSegments);
  const [selectedSegmentId, setSelectedSegmentId] = useState<string | null>(null);
  const [mediaOpen, setMediaOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const timeoutIdsRef = useRef<number[]>([]);
  const initialSequenceStartedRef = useRef(false);

  useEffect(() => {
    return () => {
      timeoutIdsRef.current.forEach((timeoutId) => window.clearTimeout(timeoutId));
    };
  }, []);

  const queueTimeout = useCallback((callback: () => void, delay: number) => {
    const timeoutId = window.setTimeout(callback, delay);
    timeoutIdsRef.current.push(timeoutId);
  }, []);

  const queueMessage = useCallback(
    (message: ChatMessage, delay: number) => {
      queueTimeout(() => {
        setMessages((currentMessages) => [
          ...currentMessages,
          { ...message, timestamp: Date.now() },
        ]);
      }, delay);
    },
    [queueTimeout]
  );

  const queueAssistantMessage = useCallback(
    ({ message, startDelay, thinkingDelay, thinkingText }: TimedAssistantMessageConfig) => {
      queueTimeout(() => {
        setMessages((currentMessages) => [
          ...currentMessages,
          {
            ...message,
            content: "",
            timestamp: Date.now(),
            thinkingText,
          },
        ]);
      }, startDelay);

      queueTimeout(() => {
        setMessages((currentMessages) =>
          currentMessages.map((currentMessage) =>
            currentMessage.id === message.id
              ? {
                  ...currentMessage,
                  content: message.content,
                  thinkingText: undefined,
                }
              : currentMessage
          )
        );
      }, startDelay + thinkingDelay);
    },
    [queueTimeout]
  );

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
      setMessages((currentMessages) => [
        ...currentMessages,
        {
          id: messageId,
          role: "assistant",
          content,
          timestamp: startedAt,
          step,
          thinkingText,
          toolCalls: toolCallsAtIndex(toolCalls, 0),
        },
      ]);

      let elapsed = 0;
      toolCalls.forEach((toolCall, index) => {
        elapsed += toolCall.durationMs ?? 500;
        queueTimeout(() => {
          const nextActiveIndex = index + 1;
          const isDone = nextActiveIndex >= toolCalls.length;
          setMessages((currentMessages) =>
            currentMessages.map((message) =>
              message.id === messageId
                ? {
                    ...message,
                    content: isDone ? doneContent : message.content,
                    thinkingText: isDone ? undefined : message.thinkingText,
                    toolCalls: isDone
                      ? completeToolCalls(toolCalls)
                      : toolCallsAtIndex(toolCalls, nextActiveIndex),
                  }
                : message
            )
          );
          if (isDone) {
            onDone?.();
          }
        }, elapsed);
      });
    },
    [queueTimeout]
  );

  useEffect(() => {
    if (initialSequenceStartedRef.current) return;
    initialSequenceStartedRef.current = true;

    queueAssistantMessage({
      message: chatHistory[0],
      startDelay: 300,
      thinkingDelay: 900,
      thinkingText: "Starting Reframe",
    });
    queueMessage(chatHistory[1], 2600);
    queueAssistantMessage({
      message: chatHistory[2],
      startDelay: 3800,
      thinkingDelay: 1000,
      thinkingText: "Checking available connectors",
    });
    queueMessage(connectedMediaUserMessage, 6200);
    queueTimeout(() => {
      startToolSequence({
        messageId: "auto-analysis",
        content: "I am reading those sources and connected clips now.",
        thinkingText: "Building your Reframe workspace",
        step: "analysis",
        toolCalls: initialAiToolCalls,
        doneContent: "Brand context and trend recipes are ready. Pick one recipe to auto-fill the timeline.",
        onDone: () => {
          setFlowStep("recipes-ready");
          queueMessage(chatHistory[5], 900);
          queueAssistantMessage({
            message: chatHistory[6],
            startDelay: 1800,
            thinkingDelay: 850,
            thinkingText: "Choosing recipes that match Petite Outdoors",
          });
        },
      });
    }, 7600);
  }, [queueAssistantMessage, queueMessage, queueTimeout, startToolSequence]);

  const visibleNodes = useMemo(() => {
    if (flowStep === "analysis" || flowStep === "media-connect" || flowStep === "source-intake") {
      return [];
    }

    if (flowStep === "recipes-ready" || flowStep === "recipe-selected") {
      return nodes.filter((node) => node.kind === "brand-context" || node.kind === "trend-recipe");
    }

    return nodes;
  }, [flowStep, nodes]);

  const visibleConnections = useMemo(() => {
    const nodeIds = new Set(visibleNodes.map((node) => node.id));
    return connections.filter(
      (connection) => nodeIds.has(connection.sourceNodeId) && nodeIds.has(connection.targetNodeId)
    );
  }, [connections, visibleNodes]);

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
    const updateMap = new Map(updates.map((update) => [update.nodeId, update.position]));
    setNodes((currentNodes) =>
      currentNodes.map((node) => {
        const position = updateMap.get(node.id);
        return position ? { ...node, position } : node;
      })
    );
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

  const handleExportSelected = useCallback((_nodeIds: Set<string>) => {
    setExportOpen(true);
  }, []);

  const handleSelectionChange = useCallback(
    (nodeIds: Set<string>) => {
      setSelectedNodeIds(nodeIds);
      const selectedRecipe = nodes.find(
        (node) => nodeIds.has(node.id) && node.kind === "trend-recipe"
      );
      if (!selectedRecipe || recipeSequenceStarted || flowStep !== "recipes-ready") {
        return;
      }

      setRecipeSequenceStarted(true);
      setFlowStep("recipe-selected");
      setMessages((currentMessages) => [
        ...currentMessages,
        {
          id: "recipe-choice",
          role: "user",
          content: `Use ${trendRecipes[0].title}.`,
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
          setFlowStep("timeline-ready");
          setMediaOpen(true);
        },
      });
    },
    [flowStep, nodes, recipeSequenceStarted, startToolSequence]
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

  const handleSwapClip = useCallback((segmentId: string, newAsset: MediaAsset) => {
    setTimeline((currentTimeline) =>
      currentTimeline.map((segment) =>
        segment.id === segmentId
          ? {
              ...segment,
              label: newAsset.label,
              mediaAssetId: newAsset.id,
              thumbnail: newAsset.thumbnail,
            }
          : segment
      )
    );
    setFlowStep("export-ready");
    setMessages((currentMessages) => [
      ...currentMessages,
      {
        id: `swap-${Date.now()}`,
        role: "assistant",
        content: `Swapped in ${newAsset.label}. Preview and export are ready when you are.`,
        timestamp: Date.now(),
        step: "export-ready",
      },
    ]);
  }, []);

  return (
    <div className="flex h-dvh min-h-0 overflow-hidden bg-background text-foreground">
      <ChatHistoryPanel messages={messages} />
      <main className="relative min-h-0 min-w-0 flex-1 overflow-hidden">
        <InfiniteCanvas
          nodes={visibleNodes}
          connections={visibleConnections}
          selectedNodeIds={selectedNodeIds}
          onSelectionChange={handleSelectionChange}
          onNodeMove={handleNodeMove}
          onDeleteSelected={handleDeleteSelected}
          onExportSelected={handleExportSelected}
          bottomPromptBox={{
            value: bottomPrompt,
            placeholder: "Ask Reframe to build, edit, or remix...",
            actionLabel: "Generate",
            busyLabel: "Building",
            sourceImageUrl: bottomPromptSourceImageUrl,
            sourceAlt: "",
            disabled: isAiBusy,
            busy: isAiBusy,
          }}
          onBottomPromptChange={handleBottomPromptChange}
          onBottomPromptSubmit={handleBottomPromptSubmit}
        />
        {flowStep === "analysis" ? (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-6">
            <div className="pointer-events-auto w-full max-w-sm rounded-lg border bg-card p-4 shadow-lg">
              <p className="text-sm font-medium">Preparing your creative canvas</p>
              <p className="mt-1 text-pretty text-xs leading-5 text-muted-foreground">
                Reframe is reading your sources, syncing media, and building trend recipes.
              </p>
            </div>
          </div>
        ) : null}
        {flowStep === "timeline-ready" || flowStep === "export-ready" ? (
          <div className="absolute right-4 top-4 z-20 w-full max-w-md rounded-lg border bg-card p-3 shadow-lg">
            <div className="mb-2 flex items-center justify-between gap-2">
              <div>
                <p className="text-xs font-medium">Timeline Auto-Fills</p>
                <p className="text-[10px] text-muted-foreground">Swap, preview, or export</p>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setPreviewOpen(true)}
                  className="rounded-md border px-2 py-1 text-[10px] font-medium transition hover:bg-secondary"
                >
                  Preview
                </button>
                <button
                  type="button"
                  onClick={() => setExportOpen(true)}
                  className="rounded-md bg-primary px-2 py-1 text-[10px] font-medium text-primary-foreground transition hover:bg-primary/90"
                >
                  Export
                </button>
              </div>
            </div>
            <TimelineAssembly
              segments={timeline}
              selectedSegmentId={selectedSegmentId}
              onSelectSegment={setSelectedSegmentId}
              onSwapClip={handleSwapClip}
            />
          </div>
        ) : null}
        {!mediaOpen && (flowStep === "timeline-ready" || flowStep === "export-ready") ? (
          <button
            type="button"
            onClick={() => setMediaOpen(true)}
            className="absolute bottom-28 right-4 z-20 rounded-md border bg-card px-3 py-2 text-xs font-medium shadow-sm transition hover:bg-secondary"
          >
            Open media
          </button>
        ) : null}
      </main>
      <MediaLibraryPanel
        assets={mediaAssets}
        open={mediaOpen}
        onClose={() => setMediaOpen(false)}
        onSelectAsset={(asset) => selectedSegmentId && handleSwapClip(selectedSegmentId, asset)}
      />
      <MockVideoPreview
        segments={timeline}
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
      />
      <ExportHandoffPanel
        targets={exportTargets}
        open={exportOpen}
        onClose={() => setExportOpen(false)}
      />
      <Toaster />
    </div>
  );
}
