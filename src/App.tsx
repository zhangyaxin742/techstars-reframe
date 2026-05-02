import { ArrowSquareOut, Gear, Graph, House, SquaresFour, Trash } from "@phosphor-icons/react";
import { useCallback, useMemo, useState } from "react";
import { AppShell, type ShellNavItem } from "@/components/app-shell";
import { InfiniteCanvas, type NodeMoveUpdate } from "@/components/infinite-canvas";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import { initialDemoConnections, initialDemoNodes } from "@/data/canvas-demo";

export function App() {
  const [nodes, setNodes] = useState(initialDemoNodes);
  const [connections, setConnections] = useState(initialDemoConnections);
  const [selectedNodeIds, setSelectedNodeIds] = useState<Set<string>>(new Set());
  const [status, setStatus] = useState("Ready");

  const navItems: ShellNavItem[] = [
    { id: "home", label: "Home", icon: House, href: "#home" },
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

  const handleExportSelected = useCallback((nodeIds: Set<string>) => {
    setStatus(`Exported ${nodeIds.size} ${nodeIds.size === 1 ? "node" : "nodes"}`);
  }, []);

  const headerSummary = useMemo(
    () => `${nodeCount} nodes · ${connectionCount} links`,
    [connectionCount, nodeCount]
  );

  return (
    <AppShell
      brand={{ name: "Reframe" }}
      navItems={navItems}
      footerItems={footerItems}
    >
      <section className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <header className="flex h-14 shrink-0 items-center justify-between border-b bg-card px-4">
          <div className="min-w-0">
            <h1 className="truncate text-sm font-semibold">Canvas workspace</h1>
            <p className="text-xs text-muted-foreground">{headerSummary}</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden rounded-md border px-2 py-1 text-xs text-muted-foreground md:block">
              <span className="tabular-nums tracking-tight">{selectedCount}</span> selected · {status}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleExportSelected(new Set(selectedNodeIds))}
              disabled={selectedCount === 0}
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
        <div id="canvas" className="min-h-0 flex-1 overflow-hidden">
          <InfiniteCanvas
            nodes={nodes}
            connections={connections}
            selectedNodeIds={selectedNodeIds}
            onSelectionChange={setSelectedNodeIds}
            onNodeMove={handleNodeMove}
            onDeleteSelected={handleDeleteSelected}
            onExportSelected={handleExportSelected}
          />
        </div>
      </section>
      <Toaster />
    </AppShell>
  );
}
