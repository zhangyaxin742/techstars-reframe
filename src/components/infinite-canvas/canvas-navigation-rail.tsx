import { ClockCounterClockwise, FolderSimple, Plus, TrendUp } from "@phosphor-icons/react";
import React, { memo } from "react";
import { cn } from "../../lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../ui/tooltip";

const railItemClass =
  "relative flex size-9 shrink-0 items-center justify-center rounded-full text-muted-foreground outline-none transition-colors hover:bg-secondary hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring";

type RailItemProps = {
  label: string;
  active?: boolean;
  children: React.ReactNode;
};

function RailItem({ label, active, children }: RailItemProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={label}
          aria-current={active ? "page" : undefined}
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
      <TooltipProvider delayDuration={120}>
        <div
          className="pointer-events-auto flex h-64 w-16 flex-col items-center rounded-full border bg-card p-2 shadow-lg"
          onClick={stopCanvasInteraction}
          onMouseDown={stopCanvasInteraction}
          onPointerDown={stopCanvasInteraction}
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
            <RailItem label="Library" active>
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
        </div>
      </TooltipProvider>
    </nav>
  );
});
