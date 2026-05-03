import React, { memo, useCallback, useEffect, useRef, useState } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookmarkSimple,
  CheckCircle,
  Eye,
  FilmSlate,
  Heart,
  ImageSquare,
  Info,
  InstagramLogo,
  PaperPlaneTilt,
  Play,
  Target,
  TrendUp,
  Warning,
  X,
} from "@phosphor-icons/react";
import { cn } from "../../lib/utils";
import { isTrendSourceNode, type CanvasNode, type CanvasPoint } from "../../lib/infinite-canvas/types";
import { CanvasPromptBox } from "./canvas-prompt-box";
import { BrandContextCard } from "./brand-context-card";
import { Skeleton } from "../ui/skeleton";
import { MockVideoPreview } from "../preview/mock-video-preview";
import { brandContext, libraryMediaAssets, type MediaAsset, type TimelineSegment } from "../../data/reframe-demo";

export type BrandCtxPhase = "skeleton" | "revealing";
export type TrendRecipePhase = "hidden" | "skeleton" | "revealing";
export type TimelinePhase = "hidden" | "skeleton" | "revealing";
export type PreviewPublishStatus = "idle" | "publishing" | "published";

const videoChromeTransition = { duration: 0.2, ease: [0.22, 1, 0.36, 1] as const };
const dialogMotionTransition = { duration: 0.2, ease: [0.22, 1, 0.36, 1] as const };
const dialogExitDurationMs = dialogMotionTransition.duration * 1000;
const instagramProgressGradient =
  "linear-gradient(90deg, #f9ce34 0%, #ee2a7b 38%, #c837ab 68%, #4f5bd5 100%)";

export interface PreviewPublishState {
  status: PreviewPublishStatus;
  progress: number;
  views: number;
  likes: number;
  saves: number;
  shares: number;
  reach: number;
}

interface CanvasNodeViewProps {
  node: CanvasNode;
  position: CanvasPoint;
  zoom: number;
  selected: boolean;
  brandCtxPhase?: BrandCtxPhase;
  trendRecipePhase?: TrendRecipePhase;
  timelinePhase?: TimelinePhase;
  previewSegments?: TimelineSegment[];
  previewPublishState?: PreviewPublishState;
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
  media: { Icon: ImageSquare, label: "Library" },
  video: { Icon: Play, label: "Trend Video" },
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
  style,
}: {
  label: string;
  className?: string;
  shimmer?: boolean;
  variant?: React.ComponentProps<typeof Skeleton>["variant"];
  style?: React.CSSProperties;
}) {
  return (
    <Skeleton
      aria-label={label}
      shimmer={shimmer}
      variant={variant}
      className={cn("h-full w-full rounded-none", className)}
      style={style}
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
      className="rounded-xl border border-dashed border-border/80"
      style={{
        "--skeleton-darker-light-bg": "color-mix(in srgb, var(--color-card) 82%, var(--color-muted) 18%)",
        "--skeleton-darker-highlight": "color-mix(in srgb, var(--color-card) 92%, var(--color-muted) 8%)",
      } as React.CSSProperties}
    />
  );
}

function formatTimelineDuration(ms: number): string {
  const totalSecs = Math.round(ms / 1000);
  if (totalSecs < 60) return `${totalSecs}s`;

  const mins = Math.floor(totalSecs / 60);
  const secs = totalSecs % 60;
  return secs === 0 ? `${mins}m` : `${mins}m ${String(secs).padStart(2, "0")}s`;
}

function getSegmentWidth(segment: TimelineSegment, totalMs: number) {
  if (totalMs <= 0) return "0%";
  return `${((segment.endMs - segment.startMs) / totalMs) * 100}%`;
}

function formatMetricCount(value: number) {
  return new Intl.NumberFormat("en", {
    notation: value >= 1000 ? "compact" : "standard",
    maximumFractionDigits: value >= 1000 ? 1 : 0,
  }).format(value);
}

function formatMetricPercent(value: number) {
  return new Intl.NumberFormat("en", {
    minimumFractionDigits: value >= 10 ? 0 : 1,
    maximumFractionDigits: 1,
  }).format(value);
}

const metricEyebrowClassName = "text-[9px] font-medium uppercase tracking-[0.12em] text-foreground/68";

function AnimatedMetricNumber({ value, testId }: { value: number; testId: string }) {
  return (
    <span
      key={value}
      className="t-digit-group is-animating tabular-nums tracking-tight text-foreground"
      data-testid={testId}
    >
      {formatMetricCount(value).split("").map((digit, index) => (
        <span
          key={`${digit}-${index}`}
          className="t-digit"
          data-stagger={index}
          style={{ "--digit-delay": `calc(var(--digit-stagger) * ${index})` } as React.CSSProperties}
        >
          {digit}
        </span>
      ))}
    </span>
  );
}

function PreviewPublishCard({ state }: { state: PreviewPublishState }) {
  if (state.status === "idle") return null;

  const isPublished = state.status === "published";
  const progress = Math.min(Math.max(state.progress, 0), 100);
  const engagementRate =
    state.reach > 0 ? ((state.likes + state.saves + state.shares) / state.reach) * 100 : 0;

  return (
    <motion.div
      data-testid="preview-publish-status"
      className="pointer-events-none absolute left-0 top-full mt-2 w-full rounded-lg border border-border bg-card p-2.5 text-card-foreground shadow-[rgba(0,0,0,0.08)_0px_4px_10px_0px]"
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          {isPublished ? (
            <CheckCircle className="size-4 shrink-0 text-accent" weight="fill" />
          ) : (
            <InstagramLogo className="size-4 shrink-0 text-accent" weight="bold" />
          )}
          <span className="truncate text-xs font-medium">
            {isPublished ? "Published" : "Publishing to Instagram"}
          </span>
        </div>
        <span className="shrink-0 text-[10px] font-medium tabular-nums tracking-tight text-muted-foreground">
          {isPublished ? (
            <span className="flex items-center gap-1" data-testid="preview-publish-live-label">
              <span className="relative flex size-2 items-center justify-center" aria-hidden="true">
                <motion.span
                  className="absolute inline-flex size-2 rounded-full bg-emerald-500/35"
                  animate={{ scale: [1, 1.9], opacity: [0.7, 0] }}
                  transition={{ duration: 1.6, repeat: Number.POSITIVE_INFINITY, ease: "easeOut" }}
                />
                <span className="relative inline-flex size-1.5 rounded-full bg-emerald-600" />
              </span>
              Live
            </span>
          ) : (
            `${progress}%`
          )}
        </span>
      </div>

      {!isPublished ? (
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-secondary">
          <motion.div
            data-testid="preview-publish-progress"
            className="h-full rounded-full"
            style={{ backgroundImage: instagramProgressGradient }}
            initial={false}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.35, ease: "easeOut" }}
          />
        </div>
      ) : null}

      {isPublished ? (
        <div className="mt-2 space-y-2">
          <div className="rounded-md border border-accent/15 bg-accent/[0.06] p-2">
            <div className={`flex items-center gap-1.5 ${metricEyebrowClassName}`}>
              <span className="flex size-5 items-center justify-center rounded-full bg-accent/12 text-accent">
                <Eye className="size-3.5" weight="fill" />
              </span>
              Views
            </div>
            <div className="mt-1">
              <div className="text-lg font-semibold leading-none text-foreground">
                <AnimatedMetricNumber value={state.views} testId="preview-publish-views-count" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 text-[10px]">
            <div className="rounded-md border border-border bg-secondary/75 px-3 py-2 text-foreground">
              <div className={`flex items-center gap-1 ${metricEyebrowClassName}`}>
                <span className="flex size-4 items-center justify-center rounded-full bg-rose-500/14 text-rose-600">
                  <Heart className="size-2.5" weight="fill" />
                </span>
                Likes
              </div>
              <div className="mt-1 text-sm font-semibold text-foreground">
                <AnimatedMetricNumber value={state.likes} testId="preview-publish-likes-count" />
              </div>
            </div>
            <div className="rounded-md border border-border bg-secondary/75 px-3 py-2 text-foreground">
              <div className={`flex items-center gap-1 ${metricEyebrowClassName}`}>
                <span className="flex size-4 items-center justify-center rounded-full bg-emerald-500/14 text-emerald-700">
                  <BookmarkSimple className="size-2.5" weight="fill" />
                </span>
                Saves
              </div>
              <div className="mt-1 text-sm font-semibold text-foreground">
                <AnimatedMetricNumber value={state.saves} testId="preview-publish-saves-count" />
              </div>
            </div>
            <div className="rounded-md border border-border bg-secondary/75 px-3 py-2 text-foreground">
              <div className={`flex items-center gap-1 ${metricEyebrowClassName}`}>
                <span className="flex size-4 items-center justify-center rounded-full bg-amber-500/16 text-amber-700">
                  <PaperPlaneTilt className="size-2.5" weight="fill" />
                </span>
                Shares
              </div>
              <div className="mt-1 text-sm font-semibold text-foreground">
                <AnimatedMetricNumber value={state.shares} testId="preview-publish-shares-count" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[10px] font-medium text-muted-foreground">
            <div className="rounded-md border border-border bg-secondary/65 px-2 py-1.5">
              <span className={`block ${metricEyebrowClassName}`}>Reach</span>
              <span className="mt-1 block text-sm font-semibold text-foreground tabular-nums tracking-tight">
                {formatMetricCount(state.reach)}
              </span>
            </div>
            <div className="rounded-md border border-border bg-secondary/65 px-2 py-1.5">
              <span className={`block ${metricEyebrowClassName}`}>Engagement</span>
              <span
                className="mt-1 block text-sm font-semibold text-foreground tabular-nums tracking-tight"
                data-testid="preview-publish-engagement-rate"
              >
                {formatMetricPercent(engagementRate)}%
              </span>
            </div>
          </div>
        </div>
      ) : null}
    </motion.div>
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
    <>
      <div
        data-testid={`canvas-node-timeline-ghost-connector-${nodeId}`}
        className={cn(
          "pointer-events-none absolute left-1/2 top-full z-10 h-48 w-0.5 -translate-x-1/2 rounded-full bg-accent",
          "origin-top transition-[opacity,transform] duration-200",
          persistent
            ? "scale-y-100 opacity-100"
            : "scale-y-0 opacity-0 peer-hover:scale-y-100 peer-hover:opacity-100 peer-focus-visible:scale-y-100 peer-focus-visible:opacity-100"
        )}
      />
      <div
        data-testid={`canvas-node-timeline-ghost-${nodeId}`}
        data-preview-mode="preview"
        className={cn(
          "pointer-events-none absolute left-0 top-full z-10 mt-48 h-[280px] w-[480px] origin-top",
          "transition-[opacity,transform] duration-200",
          persistent
            ? "scale-100 opacity-100"
            : "scale-95 opacity-0 peer-hover:scale-100 peer-hover:opacity-100 peer-focus-visible:scale-100 peer-focus-visible:opacity-100"
        )}
      >
        <TimelinePreviewSurface mode="preview" />
      </div>
    </>
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

function TrendDetailsDialog({
  node,
  children,
}: {
  node: CanvasNode;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [exiting, setExiting] = useState(false);
  const closeTimeoutRef = useRef<number | null>(null);
  const detailsImage = node.video?.detailsImage;

  const clearCloseTimeout = useCallback(() => {
    if (closeTimeoutRef.current === null) return;
    window.clearTimeout(closeTimeoutRef.current);
    closeTimeoutRef.current = null;
  }, []);

  useEffect(() => clearCloseTimeout, [clearCloseTimeout]);

  const requestClose = useCallback(() => {
    if (exiting) return;
    setExiting(true);
    clearCloseTimeout();
    closeTimeoutRef.current = window.setTimeout(() => {
      closeTimeoutRef.current = null;
      setOpen(false);
      setExiting(false);
    }, dialogExitDurationMs);
  }, [clearCloseTimeout, exiting]);

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (nextOpen) {
        clearCloseTimeout();
        setExiting(false);
        setOpen(true);
        return;
      }

      requestClose();
    },
    [clearCloseTimeout, requestClose]
  );

  if (!detailsImage) return null;

  return (
    <DialogPrimitive.Root open={open} onOpenChange={handleOpenChange}>
      <DialogPrimitive.Trigger asChild>{children}</DialogPrimitive.Trigger>
      {open ? (
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay asChild>
            <motion.div
              data-testid={`trend-details-overlay-${node.id}`}
              className="fixed inset-0 z-40 bg-foreground/20 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={exiting ? { opacity: 0 } : { opacity: 1 }}
              transition={dialogMotionTransition}
              onPointerDown={requestClose}
            />
          </DialogPrimitive.Overlay>
          <DialogPrimitive.Content asChild>
            <motion.section
              className={cn(
                "fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-5xl overflow-visible pt-12 text-card-foreground",
                "max-h-[calc(100dvh-2rem)] focus-visible:outline-none"
              )}
              initial={{ opacity: 0, x: "-50%", y: "calc(-50% + 10px)", scale: 0.985 }}
              animate={
                exiting
                  ? { opacity: 0, x: "-50%", y: "calc(-50% + 10px)", scale: 0.985 }
                  : { opacity: 1, x: "-50%", y: "-50%", scale: 1 }
              }
              transition={dialogMotionTransition}
            >
              <DialogPrimitive.Title className="sr-only">{node.title} trend breakdown</DialogPrimitive.Title>
              <DialogPrimitive.Description className="sr-only">
                Detailed visual breakdown of the {node.title} video trend.
              </DialogPrimitive.Description>
              <button
                type="button"
                onPointerDown={(event) => {
                  event.stopPropagation();
                  requestClose();
                }}
                onClick={requestClose}
                className="absolute right-0 top-0 z-10 flex size-8 items-center justify-center rounded-md border border-white/20 bg-black/55 text-white/85 shadow-sm transition-colors hover:bg-black/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
                aria-label="Close trend breakdown"
              >
                <X className="size-4" />
              </button>
              <div className="paper overflow-hidden rounded-xl border bg-card p-3 shadow-2xl sm:p-4">
                <motion.img
                  src={detailsImage.src}
                  alt={detailsImage.alt}
                  width={detailsImage.width}
                  height={detailsImage.height}
                  className="h-auto max-h-[calc(100dvh-7rem)] w-full rounded-lg border border-border object-contain"
                  draggable={false}
                  initial={{ opacity: 0, y: 8, scale: 1.01 }}
                  animate={exiting ? { opacity: 0, y: 8, scale: 1.01 } : { opacity: 1, y: 0, scale: 1 }}
                  transition={{ ...dialogMotionTransition, delay: exiting ? 0 : 0.04 }}
                />
              </div>
            </motion.section>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      ) : null}
    </DialogPrimitive.Root>
  );
}

function CanvasVideoNodeCard({ node }: { node: CanvasNode }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [active, setActive] = useState(false);

  const playVideo = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = true;
    setActive(true);
    void video.play().catch(() => {
      setActive(false);
    });
  }, []);

  const pauseVideo = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    video.pause();
    video.currentTime = 0;
    setActive(false);
  }, []);

  const handleCardFocus = useCallback((event: React.FocusEvent<HTMLDivElement>) => {
    if (event.currentTarget !== event.target) return;
    playVideo();
  }, [playVideo]);

  const handleCardBlur = useCallback((event: React.FocusEvent<HTMLDivElement>) => {
    if (event.currentTarget !== event.target) return;
    pauseVideo();
  }, [pauseVideo]);

  if (!node.video?.src) {
    return (
      <div className="space-y-1 p-3">
        <div className="truncate text-sm font-semibold">{node.title}</div>
        {node.body ? (
          <p className="line-clamp-5 whitespace-pre-line text-pretty text-xs leading-5 text-muted-foreground">
            {node.body}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div
      tabIndex={0}
      className="group/video relative h-full w-full overflow-hidden bg-neutral-950 outline-none"
      data-testid={`trend-video-reveal-${node.id}`}
      onMouseEnter={playVideo}
      onMouseLeave={pauseVideo}
      onFocus={handleCardFocus}
      onBlur={handleCardBlur}
    >
      <video
        ref={videoRef}
        data-testid={`canvas-node-video-${node.id}`}
        aria-label={`${node.title} trend video`}
        src={node.video.src}
        loop
        muted
        playsInline
        preload="metadata"
        draggable={false}
        className={cn(
          "absolute inset-0 size-full object-cover transition-transform duration-300",
          active ? "scale-105" : "scale-100"
        )}
      />
      <motion.div
        className="absolute left-3 top-3 flex items-center gap-2"
        data-testid={`trend-video-badges-${node.id}`}
        data-chrome-state={active ? "hidden" : "visible"}
        initial={false}
        animate={active ? { y: "-120%", opacity: 0 } : { y: 0, opacity: 1 }}
        transition={videoChromeTransition}
      >
        {node.video.label ? (
          <span className="rounded-md border border-white/15 bg-black/55 px-2 py-1 text-[10px] font-medium uppercase tracking-[0.18em] text-white/80 backdrop-blur-sm">
            {node.video.label}
          </span>
        ) : null}
        <span className="rounded-md border border-white/15 bg-black/55 px-2 py-1 text-[10px] font-medium text-white/75 backdrop-blur-sm">
          {active ? "Playing" : "Hover to play"}
        </span>
      </motion.div>
      <motion.div
        className="absolute inset-x-0 bottom-0 space-y-1 bg-black/65 p-3 text-white backdrop-blur-sm"
        data-testid={`trend-video-bottom-overlay-${node.id}`}
        data-chrome-state={active ? "hidden" : "visible"}
        initial={false}
        animate={active ? { y: "100%", opacity: 0 } : { y: 0, opacity: 1 }}
        transition={videoChromeTransition}
      >
        {node.video.meta ? (
          <p className="truncate text-[10px] font-medium uppercase tracking-[0.18em] text-white/65">
            {node.video.meta}
          </p>
        ) : null}
        <h3 className="truncate text-sm font-semibold">{node.title}</h3>
        {node.body ? (
          <p className="line-clamp-2 text-pretty text-xs leading-5 text-white/78">{node.body}</p>
        ) : null}
      </motion.div>
    </div>
  );
}

function LibraryCard({
  node,
  assets = libraryMediaAssets,
}: {
  node: CanvasNode;
  assets?: MediaAsset[];
}) {
  const visibleAssets = assets.slice(0, 30);
  const tagCount = new Set(visibleAssets.flatMap((asset) => asset.tags)).size;

  return (
    <motion.div
      key="library-card"
      className="flex h-full flex-col gap-2 p-3"
      variants={cardRevealContainer}
      initial="hidden"
      animate="visible"
      data-testid={`library-card-${node.id}`}
    >
      <motion.div
        className="flex items-start justify-between gap-3"
        variants={cardRevealSection}
      >
        <div className="min-w-0">
          <h3
            className="truncate text-base font-semibold text-foreground"
            data-testid={`library-card-title-${node.id}`}
          >
            {node.title}
          </h3>
          {node.body ? (
            <p className="mt-1 line-clamp-2 text-pretty text-xs leading-5 text-muted-foreground">
              {node.body}
            </p>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-1.5 rounded-md border border-border bg-secondary px-2 py-1 text-[10px] font-medium text-muted-foreground">
          <ImageSquare className="size-3 text-accent" weight="bold" />
          <span className="tabular-nums tracking-tight text-foreground">{visibleAssets.length}</span>
          photos
        </div>
      </motion.div>

      <motion.div
        className="grid min-h-0 flex-1 grid-cols-10 gap-1.5"
        variants={cardRevealSoftSection}
        data-testid={`library-grid-${node.id}`}
      >
        {visibleAssets.map((asset) => (
          <motion.article
            key={asset.id}
            className="group/library relative min-w-0 overflow-hidden rounded-md border border-border bg-background"
            variants={cardRevealSoftSection}
            data-testid={`library-asset-${asset.id}`}
            title={`${asset.label} - ${asset.trendFit}`}
          >
            <div className="relative aspect-square overflow-hidden bg-secondary">
              <img
                src={asset.thumbnail}
                alt={asset.label}
                className="size-full object-cover transition-transform duration-150 group-hover/library:scale-105"
                loading="lazy"
                decoding="async"
                draggable={false}
              />
              <span className="absolute inset-x-1 bottom-1 truncate rounded bg-card/90 px-1 py-0.5 text-[8px] font-medium text-foreground shadow-sm">
                {asset.tags[0]}
              </span>
            </div>
          </motion.article>
        ))}
      </motion.div>

      <motion.div
        className="flex flex-wrap items-center gap-2 border-t border-border pt-2 text-[10px] font-medium text-muted-foreground"
        variants={cardRevealSoftSection}
      >
        <span>
          <span className="tabular-nums tracking-tight text-foreground">{tagCount}</span> AI tags
        </span>
        <span>Matched to trend moments</span>
        <span>Ready for timeline swaps</span>
      </motion.div>
    </motion.div>
  );
}

function TimelineRevealCard({
  node,
  segments,
}: {
  node: CanvasNode;
  segments: TimelineSegment[];
}) {
  const bodySections = splitNodeBody(node.body);
  const totalMs = Math.max(...segments.map((segment) => segment.endMs), 0);
  const clipSegments = segments.filter((segment) => segment.kind === "clip" || segment.kind === "missing");
  const videoSlotCount = clipSegments.length;
  const gapCount = segments.filter((segment) => segment.kind === "missing").length;
  const overlaySegments = segments.filter((segment) => segment.kind === "text-overlay");
  const audioSegments = segments.filter((segment) => segment.kind === "audio");

  if (segments.length === 0) {
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

  return (
    <motion.div
      key="timeline-card"
      className="flex h-full flex-col gap-3 p-3"
      variants={cardRevealContainer}
      initial="hidden"
      animate="visible"
      data-testid={`timeline-reveal-${node.id}`}
    >
      <motion.div
        className="flex items-center justify-between gap-3"
        variants={cardRevealSection}
      >
        <div
          className="min-w-0 truncate text-sm font-semibold"
          data-testid={`timeline-section-${node.id}-title`}
        >
          {node.title}
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <span
            className="inline-flex items-center gap-1 rounded-md border border-dashed border-border bg-background px-2 py-1 text-[10px] font-medium text-muted-foreground"
            data-testid={`timeline-gap-pill-${node.id}`}
          >
            {gapCount > 0 ? (
              <Warning
                aria-hidden="true"
                className="size-3 shrink-0 text-yellow-600"
                data-testid={`timeline-gap-pill-${node.id}-warning`}
                weight="fill"
              />
            ) : null}
            {gapCount} {gapCount === 1 ? "gap" : "gaps"}
          </span>
        </div>
      </motion.div>

      <motion.div
        className="flex h-20 gap-0.5 overflow-hidden rounded-lg border border-border bg-secondary/40"
        variants={cardRevealSoftSection}
        aria-label="Timeline node video preview"
      >
        {clipSegments.map((segment) => {
          const segmentLabel = segment.selectedAssetLabel ?? segment.label;

          return (
            <div
              key={segment.id}
              className={cn(
                "relative min-w-10 overflow-hidden",
                segment.kind === "missing"
                  ? "border border-dashed border-yellow-500/50 bg-black"
                  : "bg-secondary"
              )}
              style={{ width: getSegmentWidth(segment, totalMs) }}
              data-testid={`timeline-node-clip-${segment.id}`}
              aria-label={segmentLabel}
            >
              {segment.kind === "clip" && segment.thumbnail ? (
                <img
                  src={segment.thumbnail}
                  alt={segmentLabel}
                  className="h-full w-full object-cover"
                  draggable={false}
                />
              ) : (
                <div className="flex h-full flex-col items-center justify-center gap-0.5 px-2 text-center">
                  <FilmSlate className="size-5 text-white/40" weight="thin" />
                  <span className="text-[9px] font-medium leading-tight text-white/60">
                    shot missing
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </motion.div>

      {overlaySegments.length > 0 ? (
        <motion.div variants={cardRevealSoftSection}>
          <div
            className="relative h-8 rounded-md border border-border bg-secondary/30"
            data-testid={`timeline-overlay-row-${node.id}`}
          >
            <div
              className="absolute inset-x-2 inset-y-1"
              data-testid={`timeline-overlay-track-${node.id}`}
            >
              {overlaySegments.map((segment) => (
                <div
                  key={segment.id}
                  className="absolute inset-y-0 flex min-w-12 items-center rounded border border-border bg-card px-1.5"
                  style={{
                    left: `${totalMs > 0 ? (segment.startMs / totalMs) * 100 : 0}%`,
                    width: getSegmentWidth(segment, totalMs),
                  }}
                  data-testid={`timeline-node-overlay-${segment.id}`}
                >
                  <span className="truncate text-[9px] font-medium text-foreground/75">
                    {segment.overlayText}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      ) : null}

      {audioSegments.length > 0 ? (
        <motion.div variants={cardRevealSoftSection}>
          <div
            className="flex h-10 items-center overflow-hidden rounded-md border border-border bg-transparent"
            data-testid={`timeline-audio-preview-${node.id}`}
            aria-label="Audio beat preview"
          >
            <img
              src="/assets/trending%20demo%20timeline/Rectangle.png"
              alt=""
              className="h-full w-full object-cover"
              draggable={false}
            />
          </div>
        </motion.div>
      ) : null}

      <motion.div
        className="mt-auto flex flex-wrap items-center gap-1.5"
        variants={cardRevealSoftSection}
      >
        {[
          formatTimelineDuration(totalMs),
          `${videoSlotCount} clips`,
          `${overlaySegments.length} ${overlaySegments.length === 1 ? "overlay" : "overlays"}`,
        ].map((metric, index) => (
          <div
            key={metric}
            className="rounded-full border border-border bg-secondary px-2 py-0.5 text-[10px] font-medium text-muted-foreground"
            data-testid={`timeline-node-metric-${node.id}-${index}`}
          >
            {metric}
          </div>
        ))}
      </motion.div>
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
  previewPublishState,
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
  const isTrendSource = isTrendSourceNode(node);
  const isRevealedTrendSource = isTrendSource && trendRecipePhase === "revealing";
  const isTimelineSource = isRevealedTrendSource && timelineSourceNodeId === node.id;
  const isRevealedTimeline = node.kind === "timeline" && timelinePhase === "revealing";

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
      {isRevealedTrendSource && !isTimelineSource ? (
        <button
          type="button"
          data-testid={`canvas-node-create-timeline-${node.id}`}
          aria-label={`Generate timeline from ${node.title}`}
          className={cn(
            "peer absolute left-1/2 top-full z-30 mt-3 flex size-8 -translate-x-1/2 items-center justify-center rounded-full border",
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
      {isRevealedTrendSource && !isTimelineSource ? (
        <>
          <TimelineGhostPreview nodeId={node.id} persistent={false} />
        </>
      ) : null}
      {isTimelineSource ? (
        <div
          data-testid={`canvas-node-connector-${node.id}`}
          className="pointer-events-none absolute left-1/2 top-full z-10 h-48 w-0.5 -translate-x-1/2"
        >
          <motion.div
            className="h-full w-full rounded-full bg-accent"
            initial={{ scaleY: 0, opacity: 0 }}
            animate={{ scaleY: 1, opacity: 1 }}
            transition={{ duration: 0.45, ease: "easeOut" }}
            style={{ transformOrigin: "top center" }}
          />
        </div>
      ) : null}
      {isRevealedTimeline ? (
        <div
          data-testid={`canvas-node-connector-${node.id}-preview`}
          className="pointer-events-none absolute left-full top-1/2 z-20 w-16 -translate-y-1/2"
        >
          <motion.div
            className="h-0.5 w-full rounded-full bg-accent shadow-[rgba(0,129,192,0.22)_0px_0px_0px_1px]"
            initial={{ scaleX: 0, opacity: 0 }}
            animate={{ scaleX: 1, opacity: 1 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
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
            <div className="mb-1.5 flex items-center gap-1.5 whitespace-nowrap">
              <div className="flex items-center gap-1 rounded border border-border bg-card px-1.5 py-0.5 text-[11px] font-medium text-foreground/60 shadow-[rgba(0,0,0,0.06)_0px_1px_3px_0px]">
                <meta.Icon className="size-3 shrink-0" weight="bold" />
                <span>{meta.label}</span>
                {node.kind === "brand-context" && (
                  <span className="text-foreground/35">· {brandContext.name}</span>
                )}
              </div>
              {node.video?.detailsImage ? (
                <TrendDetailsDialog node={node}>
                  <button
                    type="button"
                    data-testid={`trend-video-more-info-${node.id}`}
                    className={cn(
                      "pointer-events-auto flex items-center gap-1 rounded border border-border bg-card px-1.5 py-0.5",
                      "text-[11px] font-medium text-foreground/60 shadow-[rgba(0,0,0,0.06)_0px_1px_3px_0px]",
                      "transition-colors hover:border-accent hover:text-foreground",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    )}
                    onPointerDown={(event) => {
                      event.stopPropagation();
                    }}
                    onClick={(event) => {
                      event.stopPropagation();
                    }}
                  >
                    <Info className="size-3 shrink-0" weight="bold" />
                    <span>More details</span>
                  </button>
                </TrendDetailsDialog>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {/* ── Card body ───────────────────────────────────────────────────────
          overflow-hidden here (not on the article) keeps rounded-corner
          clipping while letting the floating label escape above.
          ─────────────────────────────────────────────────────────────────── */}
      <div
        data-testid={`canvas-node-card-${node.id}`}
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
        ) : node.kind === "video" ? (
          <>
            {isTrendSource && trendRecipePhase === "skeleton" ? (
              <motion.div
                key="trend-video-skeleton"
                data-testid={`trend-video-skeleton-${node.id}`}
                className="h-full w-full"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.55, ease: "easeOut" }}
              >
                <NodeLoadingSkeleton label="Loading trend video" />
              </motion.div>
            ) : (
              <CanvasVideoNodeCard node={node} />
            )}
          </>
        ) : node.kind === "media" ? (
          <LibraryCard node={node} />
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
              <TimelineRevealCard node={node} segments={previewSegments} />
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
      {node.kind === "preview" && previewPublishState ? (
        <PreviewPublishCard state={previewPublishState} />
      ) : null}
    </motion.article>
  );
});
