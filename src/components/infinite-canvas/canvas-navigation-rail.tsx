"use client";

import {
  ArrowLeft,
  CaretRight,
  ClockCounterClockwise,
  FolderSimple,
  MagnifyingGlass,
  Plus,
  Star,
  TrendUp,
} from "@phosphor-icons/react";
import { AnimatePresence, motion } from "framer-motion";
import React, { memo, useState } from "react";
import { trendingPageVideos, type TrendingVideo } from "../../data/trending-videos";
import { cn } from "../../lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../ui/tooltip";

const EASE = [0.22, 1, 0.36, 1] as const;
const DURATION = 0.2;

const transition = { duration: DURATION, ease: EASE };

const railItemClass =
  "relative flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground outline-none transition-colors hover:bg-secondary hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring";

type RailItemProps = {
  label: string;
  active?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
};

function RailItem({ label, active, onClick, children }: RailItemProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={label}
          aria-current={active ? "page" : undefined}
          onClick={onClick}
          className={cn(railItemClass, active && "text-foreground")}
        >
          {active ? (
            <span
              className="pointer-events-none absolute -left-1 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-accent"
              aria-hidden="true"
            />
          ) : null}
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  );
}

const LIBRARY_FOLDERS = [
  "Trail Clips",
  "Fit Proof",
  "Product Detail",
  "Founder POV",
  "Scenic B-Roll",
  "Gear & Pack",
] as const;

type ActivePanel = "library" | "trending" | null;

function TrendingRailVideo({ video }: { video: TrendingVideo }) {
  return (
    <article className="group overflow-hidden rounded-lg border bg-background shadow-sm transition-colors hover:border-primary/60">
      <div className="relative aspect-[4/5] bg-secondary">
        <video
          data-testid="trending-rail-video"
          aria-label={video.title}
          src={video.src}
          loop
          muted
          autoPlay
          playsInline
          preload="metadata"
          className="size-full object-cover"
        />
      </div>
      <div className="space-y-1 p-2">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-[9px] font-medium uppercase text-muted-foreground">
            {video.label}
          </span>
          <span className="shrink-0 text-[9px] text-muted-foreground">Looping</span>
        </div>
        <h3 className="truncate text-xs font-medium text-foreground">{video.title}</h3>
        <p className="truncate text-[10px] text-muted-foreground">{video.meta}</p>
      </div>
    </article>
  );
}

export const CanvasNavigationRail = memo(function CanvasNavigationRail() {
  const [activePanel, setActivePanel] = useState<ActivePanel>(null);
  const [activeTab, setActiveTab] = useState<"private" | "team">("private");

  const stopCanvas = (e: React.SyntheticEvent) => e.stopPropagation();

  return (
    <TooltipProvider delayDuration={120}>
      {/* ── Nav pill ─────────────────────────────────────────────── */}
      <AnimatePresence>
        {!activePanel && (
          <motion.nav
            key="rail"
            aria-label="Canvas navigation"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={transition}
            className="pointer-events-none absolute top-1/2 z-20"
            style={{
              left: "max(1rem, env(safe-area-inset-left))",
              translateY: "-50%",
            }}
          >
            <div
              className="pointer-events-auto flex w-12 flex-col items-center rounded-full border border-border bg-card px-1 py-2 shadow-[rgba(0,0,0,0.15)_0px_2px_6px_0px]"
              onClick={stopCanvas}
              onMouseDown={stopCanvas}
              onPointerDown={stopCanvas}
            >
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    aria-label="Add new canvas item"
                    className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm outline-none transition-colors hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <Plus className="size-4" weight="bold" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right">Add new</TooltipContent>
              </Tooltip>

              <div className="mt-4 flex w-full shrink-0 flex-col items-center gap-2.5">
                <RailItem label="Library" active onClick={() => setActivePanel("library")}>
                  <FolderSimple className="size-5" weight="regular" />
                </RailItem>
                <RailItem label="Trends" onClick={() => setActivePanel("trending")}>
                  <TrendUp className="size-5" weight="regular" />
                </RailItem>
                <RailItem label="History">
                  <ClockCounterClockwise className="size-5" weight="regular" />
                </RailItem>
              </div>

              <button
                type="button"
                aria-label="Open profile"
                className="mt-2.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-secondary p-0.5 outline-none ring-1 ring-border transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span className="block size-full overflow-hidden rounded-full">
                  <img
                    src="/assets/sidebar-avatar.png"
                    alt=""
                    className="size-full object-cover"
                    draggable={Boolean(0)}
                  />
                </span>
              </button>
            </div>
          </motion.nav>
        )}
      </AnimatePresence>

      {/* ── Library panel ────────────────────────────────────────── */}
      <AnimatePresence>
        {activePanel === "library" && (
          <motion.div
            key="library"
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            transition={transition}
            className="pointer-events-auto absolute bottom-4 top-14 z-20 flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-[rgba(0,0,0,0.08)_0px_1px_1px_0px,rgba(0,0,0,0.08)_0px_4px_5px_0px]"
            style={{ left: "max(1rem, env(safe-area-inset-left))", width: 256 }}
            onClick={stopCanvas}
            onMouseDown={stopCanvas}
            onPointerDown={stopCanvas}
          >
            {/* Header */}
            <div className="flex h-11 shrink-0 items-center gap-2 border-b px-2">
              <button
                type="button"
                onClick={() => setActivePanel(null)}
                aria-label="Back"
                className="flex size-7 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              >
                <ArrowLeft className="size-4" />
              </button>
              <span className="flex-1 text-base font-semibold">Library</span>
            </div>

            {/* Body — scrollable */}
            <div className="min-h-0 flex-1 overflow-y-auto">
              {/* iOS-style segmented tabs */}
              <div className="px-3 pt-3">
                <div className="flex rounded-[10px] bg-secondary p-[3px] shadow-inner">
                  {(["private", "team"] as const).map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setActiveTab(tab)}
                      className={cn(
                        "relative flex-1 rounded-[7px] py-[5px] text-xs font-medium transition-all duration-200",
                        activeTab === tab
                          ? "bg-card text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground/70"
                      )}
                    >
                      {tab === "private" ? "Private" : "Team"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Search */}
              <div className="px-3 pt-2.5">
                <div className="flex items-center gap-2 rounded-lg border bg-secondary/40 px-2.5 py-2">
                  <MagnifyingGlass className="size-3.5 shrink-0 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Search</span>
                </div>
              </div>

              {/* Favorite */}
              <button
                type="button"
                className="mt-2 flex w-full items-center gap-2 px-3 py-1.5 text-sm font-medium transition-colors hover:bg-secondary"
              >
                <Star className="size-4 shrink-0 text-amber-400" weight="fill" />
                Favorite
              </button>

              {/* Folders */}
              <p className="px-3 pb-1 pt-3 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                Folder
              </p>
              {LIBRARY_FOLDERS.map((folder) => (
                <button
                  key={folder}
                  type="button"
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-sm transition-colors hover:bg-secondary"
                >
                  <CaretRight className="size-3 shrink-0 text-muted-foreground" />
                  <FolderSimple className="size-4 shrink-0 text-muted-foreground" />
                  <span>{folder}</span>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Trending panel ───────────────────────────────────────── */}
      <AnimatePresence>
        {activePanel === "trending" && (
          <motion.div
            key="trending"
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            transition={transition}
            className="paper pointer-events-auto absolute bottom-4 top-14 z-20 flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-[rgba(0,0,0,0.08)_0px_1px_1px_0px,rgba(0,0,0,0.08)_0px_4px_5px_0px]"
            style={{
              left: "max(1rem, env(safe-area-inset-left))",
              width: "min(calc(100vw - 2rem), 360px)",
            }}
            onClick={stopCanvas}
            onMouseDown={stopCanvas}
            onPointerDown={stopCanvas}
          >
            <div className="flex h-11 shrink-0 items-center gap-2 border-b px-2">
              <button
                type="button"
                onClick={() => setActivePanel(null)}
                aria-label="Back"
                className="flex size-7 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              >
                <ArrowLeft className="size-4" />
              </button>
              <span className="flex-1 text-base font-semibold">Trending</span>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-3">
              <div data-testid="trending-rail-grid" className="grid grid-cols-2 gap-2">
                {trendingPageVideos.map((video) => (
                  <TrendingRailVideo key={video.id} video={video} />
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </TooltipProvider>
  );
});
