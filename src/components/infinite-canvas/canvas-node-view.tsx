import React, { memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FilmSlate, Play, Target, TrendUp } from "@phosphor-icons/react";
import { cn } from "../../lib/utils";
import type { CanvasNode, CanvasPoint } from "../../lib/infinite-canvas/types";
import { CanvasPromptBox } from "./canvas-prompt-box";
import { BrandContextCard } from "./brand-context-card";
import { BrandContextCardSkeleton } from "./brand-context-card-skeleton";
import { brandContext } from "../../data/reframe-demo";

export type BrandCtxPhase = "skeleton" | "revealing";
export type TrendRecipePhase = "hidden" | "skeleton" | "revealing";

interface CanvasNodeViewProps {
  node: CanvasNode;
  position: CanvasPoint;
  zoom: number;
  selected: boolean;
  brandCtxPhase?: BrandCtxPhase;
  trendRecipePhase?: TrendRecipePhase;
  resolveImageUrl?: (node: CanvasNode) => string | undefined;
  onPointerDown: (event: React.PointerEvent, node: CanvasNode) => void;
  onClick: (event: React.MouseEvent, node: CanvasNode) => void;
  onPromptChange?: (node: CanvasNode, value: string) => void;
  onPromptSubmit?: (node: CanvasNode, value: string) => void;
}

// Icon and label for each node kind that should show a floating header
const kindMeta: Partial<Record<string, { Icon: React.ElementType; label: string }>> = {
  "brand-context": { Icon: Target, label: "Brand Context" },
  "trend-recipe": { Icon: TrendUp, label: "Trend Recipe" },
  timeline: { Icon: FilmSlate, label: "Timeline" },
  preview: { Icon: Play, label: "Preview" },
};

function TrendRecipeCardSkeleton() {
  return (
    <div className="flex h-full animate-pulse flex-col justify-between p-3 text-xs" aria-label="Loading trend recipe">
      <div className="space-y-3">
        <div className="h-3 w-2/3 rounded bg-muted/80" />
        <div className="space-y-2">
          <div className="h-2.5 w-full rounded bg-muted/70" />
          <div className="h-2.5 w-5/6 rounded bg-muted/70" />
          <div className="h-2.5 w-4/6 rounded bg-muted/70" />
        </div>
        <div className="space-y-2 pt-2">
          <div className="h-2 w-full rounded bg-muted/60" />
          <div className="h-2 w-3/4 rounded bg-muted/60" />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <div className="h-5 w-12 rounded-full bg-muted/70" />
        <div className="h-5 w-16 rounded-full bg-muted/60" />
      </div>
    </div>
  );
}

export const CanvasNodeView = memo(function CanvasNodeView({
  node,
  position,
  zoom,
  selected,
  brandCtxPhase,
  trendRecipePhase = "revealing",
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

  const meta = kindMeta[node.kind];

  return (
    <motion.article
      data-testid={`canvas-node-${node.id}`}
      data-node-id={node.id}
      // overflow-visible so the floating label can escape above the card boundary
      className="absolute select-none overflow-visible"
      style={transformStyle}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      onPointerDown={(event) => onPointerDown(event, node)}
      onClick={(event) => onClick(event, node)}
    >
      {/* ── Floating kind label (Figma section-header style) ────────────────
          Zero-height anchor at the card's top-left edge; inner div sits below
          that anchor and inverse-scales from its bottom-left corner so the
          label reads at the same visual size regardless of canvas zoom.
          ─────────────────────────────────────────────────────────────────── */}
      {meta && (
        <div className="pointer-events-none absolute left-0 top-0 h-0 overflow-visible">
          <div
            className="absolute bottom-0 left-0 origin-bottom-left"
            style={{ transform: `scale(${1 / zoom})` }}
          >
            <div className="mb-1.5 flex items-center gap-1 whitespace-nowrap rounded border border-border bg-card px-1.5 py-0.5 text-[11px] font-medium text-foreground/60 shadow-[rgba(0,0,0,0.06)_0px_1px_3px_0px]">
              <meta.Icon className="size-3 shrink-0" weight="bold" />
              <span>{meta.label}</span>
              {node.kind === "brand-context" && (
                <span className="text-foreground/35">· {brandContext.name}</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Card body ───────────────────────────────────────────────────────
          overflow-hidden here (not on the article) keeps rounded-corner
          clipping while letting the floating label escape above.
          ─────────────────────────────────────────────────────────────────── */}
      <div
        className={cn(
          "h-full w-full overflow-hidden rounded-xl border bg-card text-card-foreground",
          "shadow-[rgba(0,0,0,0.08)_0px_1px_1px_0px,rgba(0,0,0,0.08)_0px_4px_5px_0px]",
          "transition-[border-color,box-shadow] duration-150",
          selected
            ? "border-accent shadow-[rgba(0,0,0,0.08)_0px_1px_1px_0px,rgba(0,0,0,0.12)_0px_6px_12px_0px] ring-2 ring-ring"
            : "hover:border-[#b4b8b4]"
        )}
      >
        {node.kind === "image" && imageUrl ? (
          <img
            src={imageUrl}
            alt=""
            className="h-24 w-full object-cover"
            draggable={Boolean(0)}
          />
        ) : null}

        {node.kind === "brand-context" ? (
          <AnimatePresence mode="wait">
            {brandCtxPhase === "skeleton" ? (
              <motion.div
                key="skeleton"
                initial={{ opacity: 1 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.65, ease: "easeOut" }}
              >
                <BrandContextCardSkeleton />
              </motion.div>
            ) : (
              <motion.div
                key="card"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, ease: "easeOut" }}
              >
                <BrandContextCard data={brandContext.card} animateIn />
              </motion.div>
            )}
          </AnimatePresence>
        ) : node.kind === "trend-recipe" ? (
          <>
            {trendRecipePhase === "skeleton" ? (
              <motion.div
                key="recipe-skeleton"
                data-testid={`trend-recipe-skeleton-${node.id}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.55, ease: "easeOut" }}
              >
                <TrendRecipeCardSkeleton />
              </motion.div>
            ) : (
              <motion.div
                key="recipe-card"
                className="space-y-1 p-3"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
              >
                <motion.div
                  className="truncate text-sm font-semibold"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.45, delay: 0.1, ease: "easeOut" }}
                >
                  {node.title}
                </motion.div>
                {node.body ? (
                  <motion.p
                    className="line-clamp-5 whitespace-pre-line text-pretty text-xs leading-5 text-muted-foreground"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.2, ease: "easeOut" }}
                  >
                    {node.body}
                  </motion.p>
                ) : null}
              </motion.div>
            )}
          </>
        ) : (
          <div className="space-y-1 p-3">
            <div className="truncate text-sm font-semibold">{node.title}</div>
            {node.body ? (
              <p className="line-clamp-5 whitespace-pre-line text-pretty text-xs leading-5 text-muted-foreground">
                {node.body}
              </p>
            ) : null}
          </div>
        )}
      </div>
    </motion.article>
  );
});
