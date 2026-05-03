"use client";

import React, { useCallback, useState } from "react";
import { ChatHistoryPanel } from "./components/app-shell/chat-history-panel";
import { ExportHandoffPanel } from "./components/export/export-handoff-panel";
import { InfiniteCanvas, type NodeMoveUpdate } from "./components/infinite-canvas";
import { Toaster } from "./components/ui/sonner";
import {
  chatHistory,
  exportTargets,
  reframeDemoConnections,
  reframeDemoNodes,
  reframePromptSourceImage,
} from "./data/reframe-demo";

export function App() {
  const [nodes, setNodes] = useState(reframeDemoNodes);
  const [connections, setConnections] = useState(reframeDemoConnections);
  const [selectedNodeIds, setSelectedNodeIds] = useState<Set<string>>(new Set());
  const [bottomPrompt, setBottomPrompt] = useState("");
  const [exportOpen, setExportOpen] = useState(false);

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

  const handleBottomPromptChange = useCallback((value: string) => {
    setBottomPrompt(value);
  }, []);

  const handleBottomPromptSubmit = useCallback((value: string) => {
    const promptText = value.trim();
    setBottomPrompt(promptText);
  }, []);

  return (
    <div className="flex h-dvh min-h-0 overflow-hidden bg-background text-foreground">
      <ChatHistoryPanel messages={chatHistory} />
      <main className="min-h-0 min-w-0 flex-1 overflow-hidden">
        <InfiniteCanvas
          nodes={nodes}
          connections={connections}
          selectedNodeIds={selectedNodeIds}
          onSelectionChange={setSelectedNodeIds}
          onNodeMove={handleNodeMove}
          onDeleteSelected={handleDeleteSelected}
          onExportSelected={handleExportSelected}
          bottomPromptBox={{
            value: bottomPrompt,
            placeholder: "Ask Reframe to build, edit, or remix...",
            actionLabel: "Generate",
            busyLabel: "Building",
            sourceImageUrl: reframePromptSourceImage,
            sourceAlt: "",
            badges: ["Petite Outdoors", "Preorder Hype"],
            count: 1,
          }}
          onBottomPromptChange={handleBottomPromptChange}
          onBottomPromptSubmit={handleBottomPromptSubmit}
        />
      </main>
      <ExportHandoffPanel
        targets={exportTargets}
        open={exportOpen}
        onClose={() => setExportOpen(false)}
      />
      <Toaster />
    </div>
  );
}
