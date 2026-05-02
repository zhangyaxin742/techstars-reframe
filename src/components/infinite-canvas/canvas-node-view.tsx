import { memo } from "react";
import { cn } from "@/src/lib/utils";
import type { CanvasNode, CanvasPoint } from "@/src/lib/infinite-canvas/types";
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

  return (
    <article
      data-testid={`canvas-node-${node.id}`}
      data-node-id={node.id}
      className={cn(
        "absolute select-none overflow-hidden rounded-lg border bg-card text-card-foreground shadow-sm",
        "transition-[border-color,box-shadow] duration-150",
        selected && "border-accent shadow-md ring-2 ring-ring"
      )}
      style={{
        ...transformStyle,
      }}
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
      <div className="space-y-1 p-3">
        <div className="truncate text-sm font-semibold">{node.title}</div>
        {node.body ? (
          <p className="line-clamp-3 text-pretty text-xs leading-5 text-muted-foreground">
            {node.body}
          </p>
        ) : null}
      </div>
      <div
        className="pointer-events-none absolute bottom-2 right-2 rounded-sm bg-secondary px-1.5 py-0.5 text-[10px] font-medium uppercase text-muted-foreground"
        style={{ transform: `scale(${1 / zoom})`, transformOrigin: "bottom right" }}
      >
        {node.kind}
      </div>
    </article>
  );
});
