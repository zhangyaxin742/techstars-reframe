import React, { memo } from "react";
import { cn } from "../../lib/utils";
import type { CanvasNode, CanvasPoint } from "../../lib/infinite-canvas/types";
import { CanvasPromptBox } from "./canvas-prompt-box";

interface CanvasNodeViewProps {
  node: CanvasNode;
  position: CanvasPoint;
  zoom: number;
  selected: boolean;
  resolveImageUrl?: (node: CanvasNode) => string | undefined;
  onPointerDown: (event: React.PointerEvent, node: CanvasNode) => void;
  onClick: (event: React.MouseEvent, node: CanvasNode) => void;
  onPromptChange?: (node: CanvasNode, value: string) => void;
  onPromptSubmit?: (node: CanvasNode, value: string) => void;
}

const kindStyles: Partial<Record<string, { accent: string; badge: string; label: string }>> = {
  "brand-context": { accent: "border-l-emerald-500", badge: "bg-emerald-500/10 text-emerald-700", label: "Brand" },
  "trend-recipe": { accent: "border-l-amber-500", badge: "bg-amber-500/10 text-amber-700", label: "Recipe" },
  timeline: { accent: "border-l-blue-500", badge: "bg-blue-500/10 text-blue-700", label: "Timeline" },
  media: { accent: "border-l-purple-500", badge: "bg-purple-500/10 text-purple-700", label: "Media" },
  preview: { accent: "border-l-pink-500", badge: "bg-pink-500/10 text-pink-700", label: "Preview" },
};

export const CanvasNodeView = memo(function CanvasNodeView({
  node,
  position,
  zoom,
  selected,
  resolveImageUrl,
  onPointerDown,
  onClick,
  onPromptChange,
  onPromptSubmit,
}: CanvasNodeViewProps) {
  const imageUrl = resolveImageUrl?.(node) ?? node.imageUrl;
  const transformStyle = {
    transform: `translate(${position.x}px, ${position.y}px)`,
    width: node.size.width,
    height: node.size.height,
  };

  if (node.kind === "prompt") {
    return (
      <div
        data-testid={`canvas-node-${node.id}`}
        data-node-id={node.id}
        className="absolute select-none overflow-visible"
        style={transformStyle}
      >
        <CanvasPromptBox
          title={node.title}
          data={node.prompt ?? { value: node.body }}
          selected={selected}
          onChange={(value) => onPromptChange?.(node, value)}
          onSubmit={(value) => onPromptSubmit?.(node, value)}
          onSelect={(event) => onClick(event, node)}
          onDragHandlePointerDown={(event) => onPointerDown(event, node)}
        />
      </div>
    );
  }

  const style = kindStyles[node.kind];

  return (
    <article
      data-testid={`canvas-node-${node.id}`}
      data-node-id={node.id}
      className={cn(
        "absolute select-none overflow-hidden rounded-lg border bg-card text-card-foreground shadow-sm",
        "transition-[border-color,box-shadow] duration-150",
        selected && "border-accent shadow-md ring-2 ring-ring",
        style && `border-l-[3px] ${style.accent}`
      )}
      style={transformStyle}
      onPointerDown={(event) => onPointerDown(event, node)}
      onClick={(event) => onClick(event, node)}
    >
      {node.kind === "image" && imageUrl ? (
        <img
          src={imageUrl}
          alt=""
          className="h-24 w-full object-cover"
          draggable={Boolean(0)}
        />
      ) : null}

      {node.kind === "trend-recipe" && (
        <div className="flex items-center gap-2 border-b bg-amber-50/50 px-3 py-2 dark:bg-amber-950/20">
          <span className="text-lg">🔥</span>
          <span className="text-xs font-semibold text-amber-700 dark:text-amber-400">
            Trend Recipe
          </span>
        </div>
      )}

      {node.kind === "brand-context" && (
        <div className="flex items-center gap-2 border-b bg-emerald-50/50 px-3 py-2 dark:bg-emerald-950/20">
          <span className="text-lg">🎯</span>
          <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
            Brand Context
          </span>
        </div>
      )}

      {node.kind === "timeline" && (
        <div className="flex items-center gap-2 border-b bg-blue-50/50 px-3 py-2 dark:bg-blue-950/20">
          <span className="text-lg">🎬</span>
          <span className="text-xs font-semibold text-blue-700 dark:text-blue-400">
            Timeline Assembly
          </span>
        </div>
      )}

      {node.kind === "preview" && (
        <div className="flex items-center gap-2 border-b bg-pink-50/50 px-3 py-2 dark:bg-pink-950/20">
          <span className="text-lg">▶️</span>
          <span className="text-xs font-semibold text-pink-700 dark:text-pink-400">
            Preview
          </span>
        </div>
      )}

      <div className="space-y-1 p-3">
        <div className="truncate text-sm font-semibold">{node.title}</div>
        {node.body ? (
          <p className="line-clamp-5 whitespace-pre-line text-pretty text-xs leading-5 text-muted-foreground">
            {node.body}
          </p>
        ) : null}
      </div>

      <div
        className={cn(
          "pointer-events-none absolute bottom-2 right-2 rounded-sm px-1.5 py-0.5 text-[10px] font-medium uppercase",
          style ? style.badge : "bg-secondary text-muted-foreground"
        )}
        style={{ transform: `scale(${1 / zoom})`, transformOrigin: "bottom right" }}
      >
        {style?.label ?? node.kind}
      </div>
    </article>
  );
});
