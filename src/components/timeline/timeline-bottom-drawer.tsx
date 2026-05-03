import * as DialogPrimitive from "@radix-ui/react-dialog";
import { FilmSlate, X } from "@phosphor-icons/react";
import { motion } from "framer-motion";
import React from "react";
import type { MediaAsset, TimelineSegment } from "../../data/reframe-demo";
import { cn } from "../../lib/utils";
import { TimelineAssembly } from "./timeline-assembly";

interface TimelineBottomDrawerProps {
  open: boolean;
  segments: TimelineSegment[];
  selectedSegmentId: string | null;
  onOpenChange: (open: boolean) => void;
  onSelectSegment: (segmentId: string | null) => void;
  onSwapClip: (segmentId: string, newAsset: MediaAsset) => void;
  className?: string;
}

export function TimelineBottomDrawer({
  open,
  segments,
  selectedSegmentId,
  onOpenChange,
  onSelectSegment,
  onSwapClip,
  className,
}: TimelineBottomDrawerProps) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      {open ? (
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay asChild>
            <motion.div
              className="fixed inset-0 z-40 bg-foreground/35"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.16, ease: "easeOut" }}
            />
          </DialogPrimitive.Overlay>
          <DialogPrimitive.Content asChild>
            <motion.section
              data-testid="timeline-bottom-drawer"
              className={cn(
                "fixed inset-x-0 bottom-0 z-50 max-h-dvh overflow-hidden rounded-t-lg border bg-card text-card-foreground shadow-2xl",
                className
              )}
              initial={{ y: "100%", opacity: 0.98 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
            >
              <div className="flex h-full max-h-dvh flex-col">
                <div className="flex items-center justify-between border-b px-5 py-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-md border bg-secondary text-muted-foreground">
                      <FilmSlate className="size-4" weight="bold" />
                    </span>
                    <div className="min-w-0">
                      <DialogPrimitive.Title className="truncate text-sm font-semibold">
                        Side-by-Side Fit Failure Demo Timeline
                      </DialogPrimitive.Title>
                      <DialogPrimitive.Description className="truncate text-xs text-muted-foreground">
                        Inspect matched clips, missing shots, overlays, and audio timing.
                      </DialogPrimitive.Description>
                    </div>
                  </div>
                  <DialogPrimitive.Close
                    className="flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    aria-label="Close timeline drawer"
                  >
                    <X className="size-4" />
                  </DialogPrimitive.Close>
                </div>
                <div className="min-h-0 flex-1 overflow-auto p-5">
                  <TimelineAssembly
                    segments={segments}
                    selectedSegmentId={selectedSegmentId}
                    onSelectSegment={onSelectSegment}
                    onSwapClip={onSwapClip}
                    variant="drawer"
                  />
                </div>
              </div>
            </motion.section>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      ) : null}
    </DialogPrimitive.Root>
  );
}
