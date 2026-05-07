import React from "react";
import { CaretDown, DownloadSimple, Export, FileText, InstagramLogo, Trash } from "@phosphor-icons/react";
import type { ExportTarget } from "../../data/reframe-demo";
import { Button } from "../ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../ui/tooltip";
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
  labels?: {
    exportTimeline?: string;
    downloadPreview?: string;
    publishPreview?: string;
    deleteSelected?: string;
  };
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
  labels,
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

  const exportLabel = labels?.exportTimeline ?? "Export timeline";
  const downloadLabel = labels?.downloadPreview ?? "Download preview";
  const publishLabel = labels?.publishPreview ?? "Post to Instagram";
  const deleteLabel = labels?.deleteSelected ?? "Delete selected nodes";

  return (
    <TooltipProvider delayDuration={120}>
      <div
        data-testid="selection-toolbar"
        className="absolute z-30 flex -translate-x-1/2 items-center gap-1 rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-[rgba(0,0,0,0.08)_0px_1px_1px_0px,rgba(0,0,0,0.08)_0px_4px_5px_0px]"
        style={{ left, top }}
        onPointerDown={(event) => event.stopPropagation()}
      >
        {showTimelineExport ? (
          <DropdownMenu>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="w-auto gap-1.5 px-2.5"
                    aria-label={exportLabel}
                    disabled={!onExportTimeline}
                  >
                    <Export />
                    <CaretDown className="size-3" />
                  </Button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent side="top">{exportLabel}</TooltipContent>
            </Tooltip>
            <DropdownMenuContent align="center">
              {exportTargets.map((target) => (
                <DropdownMenuItem
                  key={target.id}
                  onSelect={() => onExportTimeline?.(target.id)}
                  className="gap-2"
                >
                  {target.id === "capcut" ||
                  target.id === "premiere-pro" ||
                  target.id === "davinci-resolve" ? (
                    <EditorLogo targetId={target.id} className="size-4 rounded-sm object-contain" />
                  ) : (
                    <FileText className="size-4 text-accent" weight="bold" />
                  )}
                  <span>{target.editor}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
        {showPreviewActions ? (
          <>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={downloadLabel}
                  onClick={onDownloadPreview}
                  disabled={!onDownloadPreview}
                >
                  <DownloadSimple />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">{downloadLabel}</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={publishLabel}
                  onClick={onPublishPreview}
                  disabled={!onPublishPreview}
                >
                  <InstagramLogo />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">{publishLabel}</TooltipContent>
            </Tooltip>
          </>
        ) : null}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={deleteLabel}
              onClick={onDelete}
              disabled={!onDelete}
            >
              <Trash />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">{deleteLabel}</TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}
