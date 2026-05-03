"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChatHistoryPanel } from "./components/app-shell/chat-history-panel";
import { ExportHandoffPanel } from "./components/export/export-handoff-panel";
import { InfiniteCanvas, type NodeMoveUpdate } from "./components/infinite-canvas";
import { MockVideoPreview } from "./components/preview/mock-video-preview";
import { Toaster } from "./components/ui/sonner";
import type { CanvasConnection, CanvasNode } from "./lib/infinite-canvas/types";
import {
  type AiFlowStep,
  type ChatMessage,
  type SimulatedToolCall,
  chatHistory,
  exportTargets,
  initialAiToolCalls,
  promptAiToolCalls,
  recipeAiToolCalls,
  reframeDemoConnections,
  reframeDemoNodes,
  timelineSegments,
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

type TimedAssistantMessageConfig = {
  message: ChatMessage;
  startDelay: number;
  thinkingDelay: number;
  thinkingText: string;
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
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [recipeSequenceStarted, setRecipeSequenceStarted] = useState(false);
  const [animatedConnectionIds, setAnimatedConnectionIds] = useState<Set<string>>(new Set());
  const [previewOpen, setPreviewOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const timeoutIdsRef = useRef<number[]>([]);
  const initialSequenceStartedRef = useRef(false);

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

  const queueMessage = useCallback(
    (message: ChatMessage, delay: number) => {
      queueTimeout(() => {
        setMessages((currentMessages) =>
          upsertMessageById(currentMessages, { ...message, timestamp: Date.now() })
        );
      }, delay);
    },
    [queueTimeout, upsertMessageById]
  );

  const queueAssistantMessage = useCallback(
    ({ message, startDelay, thinkingDelay, thinkingText }: TimedAssistantMessageConfig) => {
      queueTimeout(() => {
        setMessages((currentMessages) =>
          upsertMessageById(currentMessages, {
            ...message,
            content: "",
            timestamp: Date.now(),
            thinkingText,
          })
        );
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
    [queueTimeout, upsertMessageById]
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

    queueAssistantMessage({
      message: chatHistory[0],
      startDelay: 300,
      thinkingDelay: 900,
      thinkingText: "Starting Reframe",
    });
    queueMessage(chatHistory[1], 2600);
    queueTimeout(() => {
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
    }, 4200);

    return () => {
      initialSequenceStartedRef.current = false;
    };
  }, [
    queueAssistantMessage,
    queueMessage,
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

    if (flowStep === "trend-search" || flowStep === "recipes-ready" || flowStep === "recipe-selected") {
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

  const handleSelectionChange = useCallback((nodeIds: Set<string>) => {
    setSelectedNodeIds(nodeIds);
  }, []);

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
      setSelectedNodeIds(new Set([recipeNodeId]));
      setRecipeSequenceStarted(true);
      setFlowStep("recipe-selected");
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
          setFlowStep("timeline-ready");
        },
      });
    },
    [flowStep, queueTimeout, recipeSequenceStarted, startToolSequence, upsertTimelineConnection]
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
          onExportSelected={handleExportSelected}
          onCreateTimelineFromTrend={startTimelineFromRecipe}
          animatedConnectionIds={animatedConnectionIds}
          brandCtxPhase={brandCtxPhase}
          trendRecipePhase={trendRecipePhase}
        />
        <div
          className="pointer-events-none absolute inset-x-0 top-0 z-20 h-28"
          style={{ background: "linear-gradient(to bottom, color-mix(in srgb, var(--color-background) 92%, transparent) 0%, transparent 100%)" }}
        />
        <div className="pointer-events-none absolute left-7 top-4 z-30">
          <span className="text-sm font-semibold text-foreground/90">
            Petite Outdoors
          </span>
        </div>
      </main>
      <MockVideoPreview
        segments={timelineSegments}
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
