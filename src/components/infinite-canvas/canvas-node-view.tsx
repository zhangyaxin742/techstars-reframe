import React, { memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FilmSlate, Play, Target, TrendUp } from "@phosphor-icons/react";
import { cn } from "../../lib/utils";
import type { CanvasNode, CanvasPoint } from "../../lib/infinite-canvas/types";
import { CanvasPromptBox } from "./canvas-prompt-box";
import { BrandContextCard } from "./brand-context-card";
import { Skeleton } from "../ui/skeleton";
import { MockVideoPreview } from "../preview/mock-video-preview";
import { brandContext, type TimelineSegment } from "../../data/reframe-demo";

export type BrandCtxPhase = "skeleton" | "revealing";
export type TrendRecipePhase = "hidden" | "skeleton" | "revealing";
export type TimelinePhase = "hidden" | "skeleton" | "revealing";

interface CanvasNodeViewProps {
  node: CanvasNode;
  position: CanvasPoint;
  zoom: number;
  selected: boolean;
  brandCtxPhase?: BrandCtxPhase;
  trendRecipePhase?: TrendRecipePhase;
  timelinePhase?: TimelinePhase;
  previewSegments?: TimelineSegment[];
  resolveImageUrl?: (node: CanvasNode) => string | undefined;
  onPointerDown: (event: React.PointerEvent, node: CanvasNode) => void;
  onClick: (event: React.MouseEvent, node: CanvasNode) => void;
  timelineSourceNodeId?: string;
  onCreateTimelineFromTrend?: (node: CanvasNode) => void;
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

const cardRevealContainer = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.56,
      ease: "easeOut" as const,
      staggerChildren: 0.085,
      delayChildren: 0.12,
    },
  },
};

const cardRevealSection = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.48, ease: "easeOut" as const },
  },
};

const cardRevealSoftSection = {
  hidden: { opacity: 0, y: 6 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.42, ease: "easeOut" as const },
  },
};

function splitNodeBody(body?: string) {
  if (!body) return [];
  return body
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function NodeLoadingSkeleton({
  label,
  className,
  shimmer,
  variant,
}: {
  label: string;
  className?: string;
  shimmer?: boolean;
  variant?: React.ComponentProps<typeof Skeleton>["variant"];
}) {
  return (
    <Skeleton
      aria-label={label}
      shimmer={shimmer}
      variant={variant}
      className={cn("h-full w-full rounded-none", className)}
    />
  );
}

function TimelinePreviewSurface({ mode }: { mode: "preview" | "loading" }) {
  if (mode === "loading") {
    return (
      <NodeLoadingSkeleton
        label="Loading timeline"
        variant="darker"
        className="rounded-xl border border-dashed border-muted-foreground/45"
      />
    );
  }

  return (
    <NodeLoadingSkeleton
      label="Timeline preview"
      shimmer={false}
      variant="darker-light"
      className="rounded-xl border border-dashed border-muted-foreground/45"
    />
  );
}

function TimelineGhostPreview({
  nodeId,
  persistent,
}: {
  nodeId: string;
  persistent: boolean;
}) {
  return (
    <div
      data-testid={`canvas-node-timeline-ghost-${nodeId}`}
      data-preview-mode="preview"
      className={cn(
        "pointer-events-none absolute left-full top-0 z-10 ml-24 h-[280px] w-[480px] origin-left",
        "transition-[opacity,transform] duration-200",
        persistent
          ? "scale-100 opacity-100"
          : "scale-95 opacity-0 peer-hover:scale-100 peer-hover:opacity-100 peer-focus-visible:scale-100 peer-focus-visible:opacity-100"
      )}
    >
      <TimelinePreviewSurface mode="preview" />
    </div>
  );
}

function TrendRecipeRevealCard({ node }: { node: CanvasNode }) {
  const bodySections = splitNodeBody(node.body);
  const hook = bodySections[0];
  const details = bodySections.slice(1);

  return (
    <motion.div
      key="recipe-card"
      className="space-y-2 p-3"
      variants={cardRevealContainer}
      initial="hidden"
      animate="visible"
      data-testid={`trend-recipe-reveal-${node.id}`}
    >
      <motion.div
        className="truncate text-sm font-semibold"
        variants={cardRevealSection}
        data-testid={`trend-recipe-section-${node.id}-title`}
      >
        {node.title}
      </motion.div>
      {hook ? (
        <motion.p
          className="line-clamp-2 text-pretty text-xs leading-5 text-foreground/85"
          variants={cardRevealSection}
          data-testid={`trend-recipe-section-${node.id}-hook`}
        >
          {hook}
        </motion.p>
      ) : null}
      {details.length > 0 ? (
        <motion.div
          className="space-y-1.5 border-t pt-2"
          variants={cardRevealSoftSection}
          data-testid={`trend-recipe-section-${node.id}-details`}
        >
          {details.map((line, index) => (
            <motion.div
              key={line}
              className="flex min-w-0 items-center justify-between gap-2 text-xs leading-4 text-muted-foreground"
              variants={cardRevealSoftSection}
              data-testid={`trend-recipe-detail-${node.id}-${index}`}
            >
              {line.includes(":") ? (
                <>
                  <span className="shrink-0 font-medium text-foreground/70">
                    {line.slice(0, line.indexOf(":"))}
                  </span>
                  <span className="min-w-0 truncate text-right">{line.slice(line.indexOf(":") + 1).trim()}</span>
                </>
              ) : (
                <span className="min-w-0 truncate">{line}</span>
              )}
            </motion.div>
          ))}
        </motion.div>
      ) : null}
    </motion.div>
  );
}

function TimelineRevealCard({ node }: { node: CanvasNode }) {
  const bodySections = splitNodeBody(node.body);

  return (
    <motion.div
      key="timeline-card"
      className="space-y-2 p-3"
      variants={cardRevealContainer}
      initial="hidden"
      animate="visible"
      data-testid={`timeline-reveal-${node.id}`}
    >
      <motion.div
        className="truncate text-sm font-semibold"
        variants={cardRevealSection}
        data-testid={`timeline-section-${node.id}-title`}
      >
        {node.title}
      </motion.div>
      {bodySections.map((section, index) => (
        <motion.p
          key={`${section}-${index}`}
          className={cn(
            "text-pretty text-xs leading-5",
            index === 0 ? "text-foreground/85" : "text-muted-foreground"
          )}
          variants={cardRevealSoftSection}
          data-testid={`timeline-section-${node.id}-${index}`}
        >
          {section}
        </motion.p>
      ))}
    </motion.div>
  );
}

export const CanvasNodeView = memo(function CanvasNodeView({
  node,
  position,
  zoom,
  selected,
  brandCtxPhase,
  trendRecipePhase = "revealing",
  timelinePhase = "revealing",
  previewSegments = [],
  resolveImageUrl,
  onPointerDown,
  onClick,
  timelineSourceNodeId,
  onCreateTimelineFromTrend,
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
  const isTrendRecipe = node.kind === "trend-recipe" && trendRecipePhase === "revealing";
  const isTimelineSource = isTrendRecipe && timelineSourceNodeId === node.id;

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
      {isTrendRecipe && !isTimelineSource ? (
        <button
          type="button"
          data-testid={`canvas-node-create-timeline-${node.id}`}
          aria-label={`Generate timeline from ${node.title}`}
          className={cn(
            "peer absolute right-0 top-1/2 z-10 flex size-8 -translate-y-1/2 translate-x-1/2 items-center justify-center rounded-full border",
            "border-accent bg-accent text-accent-foreground shadow-[rgba(0,0,0,0.12)_0px_5px_12px_0px]",
            "transition-colors hover:bg-accent/90",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          )}
          onPointerDown={(event) => {
            event.stopPropagation();
          }}
          onClick={(event) => {
            event.stopPropagation();
            onCreateTimelineFromTrend?.(node);
          }}
        >
          <span aria-hidden="true" className="text-xl font-normal leading-none">+</span>
        </button>
      ) : null}
      {isTrendRecipe && !isTimelineSource ? (
        <>
          <TimelineGhostPreview nodeId={node.id} persistent={false} />
        </>
      ) : null}
      {isTimelineSource ? (
        <div
          data-testid={`canvas-node-connector-${node.id}`}
          className="pointer-events-none absolute left-full top-1/2 z-10 w-24 -translate-y-1/2"
        >
          <motion.div
            className="h-0.5 w-full rounded-full bg-accent"
            initial={{ scaleX: 0, opacity: 0 }}
            animate={{ scaleX: 1, opacity: 1 }}
            transition={{ duration: 0.45, ease: "easeOut" }}
            style={{ transformOrigin: "left center" }}
          />
        </div>
      ) : null}

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
          "paper relative h-full w-full overflow-hidden rounded-xl border bg-card text-card-foreground",
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
                className="h-full w-full"
                initial={{ opacity: 1 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.65, ease: "easeOut" }}
              >
                <NodeLoadingSkeleton label="Loading brand context" />
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
                className="h-full w-full"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.55, ease: "easeOut" }}
              >
                <NodeLoadingSkeleton label="Loading trend recipe" />
              </motion.div>
            ) : (
              <TrendRecipeRevealCard node={node} />
            )}
          </>
        ) : node.kind === "timeline" ? (
          <AnimatePresence>
            {timelinePhase === "skeleton" ? (
              <motion.div
                key="timeline-skeleton"
                data-testid={`timeline-node-skeleton-${node.id}`}
                className="h-full w-full"
                initial={{ opacity: 1 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.55, ease: "easeOut" }}
              >
                <TimelinePreviewSurface mode="loading" />
              </motion.div>
            ) : (
              <TimelineRevealCard node={node} />
            )}
          </AnimatePresence>
        ) : node.kind === "preview" ? (
          <MockVideoPreview
            segments={previewSegments}
            open
            variant="node"
          />
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
