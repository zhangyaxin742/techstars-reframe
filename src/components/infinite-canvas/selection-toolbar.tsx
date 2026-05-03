import React from "react";
import { CaretDown, DownloadSimple, Export, Play, Trash } from "@phosphor-icons/react";
import type { ExportTarget } from "../../data/reframe-demo";
import { Button } from "../ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { EditorLogo } from "../export/editor-logo";
import { worldToScreen } from "../../lib/infinite-canvas/geometry";
import type {
  CanvasNode,
  CanvasRect,
  CanvasSize,
  CanvasViewportState,
} from "../../lib/infinite-canvas/types";

interface SelectionToolbarProps {
  bounds: CanvasRect | null;
  viewport: CanvasViewportState;
  size: CanvasSize;
  selectedNodes: CanvasNode[];
  exportTargets: ExportTarget[];
  onDelete?: () => void;
  onExportTimeline?: (targetId: ExportTarget["id"]) => void;
  onDownloadPreview?: () => void;
  onPublishPreview?: () => void;
}

export function SelectionToolbar({
  bounds,
  viewport,
  size,
  selectedNodes,
  exportTargets,
  onDelete,
  onExportTimeline,
  onDownloadPreview,
  onPublishPreview,
}: SelectionToolbarProps) {
  if (!bounds) return null;

  const singleSelectedNode = selectedNodes.length === 1 ? selectedNodes[0] : null;
  const showTimelineExport = singleSelectedNode?.kind === "timeline" && exportTargets.length > 0;
  const showPreviewActions = singleSelectedNode?.kind === "preview";

  const topCenter = worldToScreen(
    { x: bounds.x + bounds.width / 2, y: bounds.y },
    viewport
  );
  const left = Math.min(Math.max(topCenter.x, 80), Math.max(80, size.width - 80));
  const top = Math.max(12, topCenter.y - 76);

  return (
    <div
      data-testid="selection-toolbar"
      className="absolute z-30 flex -translate-x-1/2 items-center gap-1 rounded-lg border bg-popover p-1 text-popover-foreground shadow-md"
      style={{ left, top }}
      onPointerDown={(event) => event.stopPropagation()}
    >
      {showTimelineExport ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="w-auto gap-1.5 px-2.5"
              aria-label="Export timeline"
              disabled={!onExportTimeline}
            >
              <Export />
              <CaretDown className="size-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="center">
            {exportTargets.map((target) => (
              <DropdownMenuItem
                key={target.id}
                onSelect={() => onExportTimeline?.(target.id)}
                className="gap-2"
              >
                <EditorLogo targetId={target.id} className="size-4 rounded-sm object-contain" />
                <span>{target.editor}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}
      {showPreviewActions ? (
        <>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Download preview"
            onClick={onDownloadPreview}
            disabled={!onDownloadPreview}
          >
            <DownloadSimple />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Publish preview"
            onClick={onPublishPreview}
            disabled={!onPublishPreview}
          >
            <Play />
          </Button>
        </>
      ) : null}
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label="Delete selected nodes"
        onClick={onDelete}
        disabled={!onDelete}
      >
        <Trash />
      </Button>
    </div>
  );
}
