import { ClockCounterClockwise, FolderSimple, Plus } from "@phosphor-icons/react";
import React, { memo } from "react";
import { cn } from "../../lib/utils";

const railItemClass =
  "relative flex size-9 shrink-0 items-center justify-center rounded-full text-muted-foreground outline-none transition-colors hover:bg-secondary hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring";

export const CanvasNavigationRail = memo(function CanvasNavigationRail() {
  const stopCanvasInteraction = (event: React.SyntheticEvent) => {
    event.stopPropagation();
  };

  return (
    <nav
      aria-label="Canvas navigation"
      className="pointer-events-none absolute top-1/2 z-20 -translate-y-1/2"
      style={{ left: "max(1rem, env(safe-area-inset-left))" }}
    >
      <div
        className="pointer-events-auto flex h-56 w-16 flex-col items-center rounded-full border bg-card p-2 shadow-lg"
        onClick={stopCanvasInteraction}
        onMouseDown={stopCanvasInteraction}
        onPointerDown={stopCanvasInteraction}
      >
        <button
          type="button"
          aria-label="Add new canvas item"
          className="flex size-10 shrink-0 items-center justify-center rounded-full bg-foreground text-background shadow-sm outline-none ring-1 ring-border transition-colors hover:bg-foreground/90 focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Plus className="size-4" weight="bold" />
        </button>

        <div className="mt-5 flex w-full shrink-0 flex-col items-center gap-4">
          <button
            type="button"
            aria-label="Documents"
            aria-current="page"
            className={cn(railItemClass, "text-foreground")}
          >
            <span className="absolute left-1 h-4 w-0.5 rounded-full bg-accent" aria-hidden="true" />
            <FolderSimple className="h-4 w-5" weight="regular" />
          </button>
          <button
            type="button"
            aria-label="History"
            className={railItemClass}
          >
            <ClockCounterClockwise className="size-5" weight="regular" />
          </button>
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
      </div>
    </nav>
  );
});
