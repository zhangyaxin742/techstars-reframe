"use client";

import {
  ArrowLeft,
  CaretRight,
  ClockCounterClockwise,
  FolderSimple,
  MagnifyingGlass,
  Plus,
  Robot,
  Star,
  TrendUp,
} from "@phosphor-icons/react";
import { AnimatePresence, motion } from "framer-motion";
import React, { memo, useState } from "react";
import { cn } from "../../lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../ui/tooltip";

const SLIDE_EASE = [0.22, 1, 0.36, 1] as const;
const SLIDE_DURATION = 0.2;
const SLIDE_DISTANCE = 8;
const SLIDE_BLUR = 3;

type SlideDirection = "forward" | "back";

const slideVariants = {
  initial: (dir: SlideDirection) => ({
    opacity: 0,
    x: dir === "forward" ? SLIDE_DISTANCE : -SLIDE_DISTANCE,
    filter: `blur(${SLIDE_BLUR}px)`,
  }),
  animate: {
    opacity: 1,
    x: 0,
    filter: "blur(0px)",
  },
  exit: (dir: SlideDirection) => ({
    opacity: 0,
    x: dir === "forward" ? -SLIDE_DISTANCE : SLIDE_DISTANCE,
    filter: `blur(${SLIDE_BLUR}px)`,
  }),
};

const slideTransition = { duration: SLIDE_DURATION, ease: SLIDE_EASE };

const railItemClass =
  "relative flex size-9 shrink-0 items-center justify-center rounded-full text-muted-foreground outline-none transition-colors hover:bg-secondary hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring";

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
  "Character",
  "Scene",
  "Item",
  "Style",
  "Sound Effect",
  "Others",
] as const;

function LibraryPanelContent({ onBack }: { onBack: () => void }) {
  const [activeTab, setActiveTab] = useState<"private" | "team">("private");

  return (
    <div className="flex w-60 flex-col py-3">
      {/* Header */}
      <div className="flex items-center gap-1 px-2 pb-3">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back to navigation"
          className="flex size-7 shrink-0 items-center justify-center rounded-full text-muted-foreground outline-none transition-colors hover:bg-secondary hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ArrowLeft className="size-4" />
        </button>
        <span className="flex-1 text-sm font-semibold">Library</span>
        <button
          type="button"
          className="flex shrink-0 items-center gap-1 rounded-full border bg-secondary px-2 py-1 text-[10px] font-medium transition-colors hover:bg-secondary/80"
        >
          <Robot className="size-3 shrink-0" />
          AI Character
        </button>
        <button
          type="button"
          aria-label="New"
          className="flex size-6 shrink-0 items-center justify-center rounded-full text-muted-foreground outline-none transition-colors hover:bg-secondary hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Plus className="size-3.5" weight="bold" />
        </button>
      </div>

      {/* Private / Team tabs */}
      <div className="mx-2.5 mb-3 flex rounded-lg bg-secondary p-0.5">
        {(["private", "team"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={cn(
              "flex-1 rounded-md py-1 text-xs font-medium capitalize transition-colors",
              activeTab === tab
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {tab === "private" ? "Private" : "Team"}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="mx-2.5 mb-3 flex items-center gap-2 rounded-lg border bg-secondary/40 px-2.5 py-2">
        <MagnifyingGlass className="size-3.5 shrink-0 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">Search</span>
      </div>

      {/* Favorite */}
      <button
        type="button"
        className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium transition-colors hover:bg-secondary"
      >
        <Star className="size-4 shrink-0 text-amber-400" weight="fill" />
        Favorite
      </button>

      {/* Folder section */}
      <p className="px-3 pb-1 pt-2.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        Folder
      </p>

      {LIBRARY_FOLDERS.map((folder) => (
        <button
          key={folder}
          type="button"
          className="flex items-center gap-2 px-3 py-1.5 text-sm transition-colors hover:bg-secondary"
        >
          <CaretRight className="size-3 shrink-0 text-muted-foreground" />
          <FolderSimple className="size-4 shrink-0 text-muted-foreground" />
          <span>{folder}</span>
        </button>
      ))}
    </div>
  );
}

export const CanvasNavigationRail = memo(function CanvasNavigationRail() {
  const [activePage, setActivePage] = useState<"rail" | "library">("rail");
  const [direction, setDirection] = useState<SlideDirection>("forward");

  const goToLibrary = () => {
    setDirection("forward");
    setActivePage("library");
  };

  const goBack = () => {
    setDirection("back");
    setActivePage("rail");
  };

  const stopCanvasInteraction = (event: React.SyntheticEvent) => {
    event.stopPropagation();
  };

  return (
    <nav
      aria-label="Canvas navigation"
      className="pointer-events-none absolute top-1/2 z-20 -translate-y-1/2"
      style={{ left: "max(1rem, env(safe-area-inset-left))" }}
    >
      <TooltipProvider delayDuration={120}>
        <motion.div
          layout
          transition={{ layout: slideTransition }}
          className="pointer-events-auto relative overflow-hidden border bg-card shadow-lg"
          animate={{ borderRadius: activePage === "library" ? 12 : 9999 }}
          onClick={stopCanvasInteraction}
          onMouseDown={stopCanvasInteraction}
          onPointerDown={stopCanvasInteraction}
        >
          <AnimatePresence custom={direction} mode="sync" initial={false}>
            {activePage === "rail" ? (
              <motion.div
                key="rail"
                custom={direction}
                variants={slideVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={slideTransition}
                className="flex h-64 w-14 flex-col items-center p-2"
              >
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      aria-label="Add new canvas item"
                      className="flex size-10 shrink-0 items-center justify-center rounded-full bg-foreground text-background shadow-sm outline-none ring-1 ring-border transition-colors hover:bg-foreground/90 focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <Plus className="size-4" weight="bold" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right">Add new</TooltipContent>
                </Tooltip>

                <div className="mt-4 flex w-full shrink-0 flex-col items-center gap-3">
                  <RailItem label="Library" active onClick={goToLibrary}>
                    <FolderSimple className="size-5" weight="regular" />
                  </RailItem>
                  <RailItem label="Trends">
                    <TrendUp className="size-5" weight="regular" />
                  </RailItem>
                  <RailItem label="History">
                    <ClockCounterClockwise className="size-5" weight="regular" />
                  </RailItem>
                </div>

                <button
                  type="button"
                  aria-label="Open profile"
                  className="mt-auto flex size-10 shrink-0 items-center justify-center rounded-full bg-secondary p-0.5 outline-none ring-1 ring-border transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring"
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
              </motion.div>
            ) : (
              <motion.div
                key="library"
                custom={direction}
                variants={slideVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={slideTransition}
              >
                <LibraryPanelContent onBack={goBack} />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </TooltipProvider>
    </nav>
  );
});
