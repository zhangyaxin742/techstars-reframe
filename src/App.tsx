"use client";

import {
  ArrowSquareOut,
  Eye,
  Gear,
  Graph,
  House,
  SquaresFour,
  Trash,
} from "@phosphor-icons/react";
import React, { useCallback, useMemo, useState } from "react";
import { AppShell, ChatHistoryPanel, type ShellNavItem } from "./components/app-shell";
import { ExportHandoffPanel } from "./components/export/export-handoff-panel";
import { InfiniteCanvas, type NodeMoveUpdate } from "./components/infinite-canvas";
import { MediaLibraryPanel } from "./components/media/media-library-panel";
import { MockVideoPreview } from "./components/preview/mock-video-preview";
import { TimelineAssembly } from "./components/timeline/timeline-assembly";
import { Button } from "./components/ui/button";
import { Toaster } from "./components/ui/sonner";
import type { MediaAsset, TimelineSegment } from "./data/reframe-demo";
import {
  chatHistory,
  exportTargets,
  mediaAssets,
  reframeDemoConnections,
  reframeDemoNodes,
  reframePromptSourceImage,
  timelineSegments as initialTimelineSegments,
} from "./data/reframe-demo";

export function App() {
  const [nodes, setNodes] = useState(reframeDemoNodes);
  const [connections, setConnections] = useState(reframeDemoConnections);
  const [selectedNodeIds, setSelectedNodeIds] = useState<Set<string>>(new Set());
  const [bottomPrompt, setBottomPrompt] = useState("");
  const [status, setStatus] = useState("Ready");
  const [mediaPanelOpen, setMediaPanelOpen] = useState(false);
  const [selectedSegmentId, setSelectedSegmentId] = useState<string | null>(null);
  const [segments, setSegments] = useState<TimelineSegment[]>(initialTimelineSegments);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);

  const navItems: ShellNavItem[] = [
    { id: "home", label: "Home", icon: House, href: "/" },
    { id: "canvas", label: "Canvas", icon: Graph, href: "#canvas", active: true },
    { id: "library", label: "Library", icon: SquaresFour, href: "#library" },
  ];

  const footerItems: ShellNavItem[] = [
    { id: "settings", label: "Settings", icon: Gear, href: "#settings" },
  ];

  const selectedCount = selectedNodeIds.size;
  const nodeCount = nodes.length;
  const connectionCount = connections.length;

  const handleNodeMove = useCallback((updates: NodeMoveUpdate[]) => {
    const updateMap = new Map(updates.map((update) => [update.nodeId, update.position]));
    setNodes((currentNodes) =>
      currentNodes.map((node) => {
        const position = updateMap.get(node.id);
        return position ? { ...node, position } : node;
      })
    );
    setStatus(`Moved ${updates.length} ${updates.length === 1 ? "node" : "nodes"}`);
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
    setStatus(`Deleted ${nodeIds.size} ${nodeIds.size === 1 ? "node" : "nodes"}`);
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
    setStatus(`Submitted prompt: ${promptText}`);
  }, []);

  const handleSwapClip = useCallback((segmentId: string, newAsset: MediaAsset) => {
    setSegments((prev) =>
      prev.map((seg) =>
        seg.id === segmentId
          ? { ...seg, mediaAssetId: newAsset.id, thumbnail: newAsset.thumbnail, label: newAsset.label }
          : seg
      )
    );
    setStatus(`Swapped clip: ${newAsset.label}`);
  }, []);

  const headerSummary = useMemo(
    () => `${nodeCount} nodes - ${connectionCount} links`,
    [connectionCount, nodeCount]
  );

  const showTimeline = selectedNodeIds.has("timeline-1") || selectedNodeIds.has("recipe-1");

  return (
    <AppShell
      brand={{ name: "Reframe" }}
      navItems={navItems}
      footerItems={footerItems}
    >
      <section className="flex min-h-0 flex-1 overflow-hidden">
        <ChatHistoryPanel messages={chatHistory} />
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <header className="flex h-14 shrink-0 items-center justify-between border-b bg-card px-4">
            <div className="min-w-0">
              <h1 className="truncate text-sm font-semibold">Canvas workspace</h1>
              <p className="text-xs text-muted-foreground">{headerSummary}</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="hidden rounded-md border px-2 py-1 text-xs text-muted-foreground md:block">
                <span className="tabular-nums tracking-tight">{selectedCount}</span> selected - {status}
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setPreviewOpen((v) => !v)}
              >
                <Eye />
                Preview
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setMediaPanelOpen((v) => !v)}
              >
                <SquaresFour />
                Media
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setExportOpen((v) => !v)}
              >
                <ArrowSquareOut />
                Export
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleDeleteSelected(new Set(selectedNodeIds))}
                disabled={selectedCount === 0}
              >
                <Trash />
                Delete
              </Button>
            </div>
          </header>

          <div className="flex min-h-0 flex-1 overflow-hidden">
            <div id="canvas" className="min-h-0 min-w-0 flex-1 overflow-hidden">
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
            </div>

            <MediaLibraryPanel
              assets={mediaAssets}
              open={mediaPanelOpen}
              onClose={() => setMediaPanelOpen(false)}
            />
          </div>

          {/* Timeline tray — shown when timeline/recipe node is selected */}
          {showTimeline && (
            <div className="shrink-0 border-t bg-card px-4 py-3" data-testid="timeline-tray">
              <TimelineAssembly
                segments={segments}
                selectedSegmentId={selectedSegmentId}
                onSelectSegment={setSelectedSegmentId}
                onSwapClip={handleSwapClip}
              />
            </div>
          )}
        </div>
      </section>
      <MockVideoPreview
        segments={segments}
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
      />
      <ExportHandoffPanel
        targets={exportTargets}
        open={exportOpen}
        onClose={() => setExportOpen(false)}
      />
      <Toaster />
    </AppShell>
  );
}
