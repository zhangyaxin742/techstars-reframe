import React from "react";
import { ArrowSquareOut, Trash } from "@phosphor-icons/react";
import { Button } from "../ui/button";
import { worldToScreen } from "../../lib/infinite-canvas/geometry";
import type {
  CanvasRect,
  CanvasSize,
  CanvasViewportState,
} from "../../lib/infinite-canvas/types";

interface SelectionToolbarProps {
  bounds: CanvasRect | null;
  viewport: CanvasViewportState;
  size: CanvasSize;
  onDelete?: () => void;
  onExport?: () => void;
}

export function SelectionToolbar({
  bounds,
  viewport,
  size,
  onDelete,
  onExport,
}: SelectionToolbarProps) {
  if (!bounds) return null;

  const topCenter = worldToScreen(
    { x: bounds.x + bounds.width / 2, y: bounds.y },
    viewport
  );
  const left = Math.min(Math.max(topCenter.x, 80), Math.max(80, size.width - 80));
  const top = Math.max(12, topCenter.y - 48);

  return (
    <div
      data-testid="selection-toolbar"
      className="absolute z-30 flex -translate-x-1/2 items-center gap-1 rounded-lg border bg-popover p-1 text-popover-foreground shadow-md"
      style={{ left, top }}
      onPointerDown={(event) => event.stopPropagation()}
    >
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label="Export selected nodes"
        onClick={onExport}
        disabled={!onExport}
      >
        <ArrowSquareOut />
      </Button>
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
