import { Pause, Play, X } from "@phosphor-icons/react";
import React, { useCallback, useEffect, useState } from "react";
import type { TimelineSegment } from "../../data/reframe-demo";
import { cn } from "../../lib/utils";

interface MockVideoPreviewProps {
  segments: TimelineSegment[];
  open: boolean;
  onClose?: () => void;
  variant?: "modal" | "floating";
  className?: string;
}

export function MockVideoPreview({
  segments,
  open,
  onClose,
  variant = "modal",
  className,
}: MockVideoPreviewProps) {
  const [playing, setPlaying] = useState(false);
  const [currentMs, setCurrentMs] = useState(0);

  const totalMs = Math.max(...segments.map((s) => s.endMs), 1);
  const clipSegments = segments.filter((s) => s.kind === "clip" || s.kind === "missing");
  const overlaySegments = segments.filter((s) => s.kind === "text-overlay");

  const currentClip = clipSegments.find((s) => currentMs >= s.startMs && currentMs < s.endMs);
  const currentOverlay = overlaySegments.find(
    (s) => currentMs >= s.startMs && currentMs < s.endMs
  );

  useEffect(() => {
    if (!playing || !open) return;
    const interval = setInterval(() => {
      setCurrentMs((prev) => {
        const next = prev + 100;
        if (next >= totalMs) {
          setPlaying(false);
          return 0;
        }
        return next;
      });
    }, 100);
    return () => clearInterval(interval);
  }, [playing, open, totalMs]);

  const togglePlay = useCallback(() => {
    if (currentMs >= totalMs) setCurrentMs(0);
    setPlaying((v) => !v);
  }, [currentMs, totalMs]);

  if (!open) return null;

  const progressPct = (currentMs / totalMs) * 100;
  const isFloating = variant === "floating";

  const player = (
    <div
      className={cn(
        "relative w-full overflow-hidden bg-neutral-950 shadow-2xl",
        isFloating ? "rounded-2xl border border-white/10" : "max-w-sm rounded-2xl",
        className
      )}
      data-testid="mock-video-preview"
      data-preview-variant={variant}
      aria-label={isFloating ? "Timeline video preview" : undefined}
    >
      {onClose && !isFloating ? (
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 z-10 flex size-8 items-center justify-center rounded-full bg-black/50 text-white transition hover:bg-black/80"
          aria-label="Close preview"
        >
          <X className="size-4" />
        </button>
      ) : null}

      {/* 9:16 aspect ratio preview */}
      <div className="relative aspect-[9/16] w-full overflow-hidden bg-neutral-900">
        {currentClip?.thumbnail ? (
          <img
            src={currentClip.thumbnail}
            alt={currentClip.label}
            className="absolute inset-0 size-full object-cover"
            draggable={false}
          />
        ) : (
          <div className="flex size-full items-center justify-center text-neutral-600">
            <span className="text-sm">No clip</span>
          </div>
        )}

        {currentOverlay && (
          <div className="absolute inset-x-0 bottom-16 flex justify-center px-4">
            <p className="rounded-lg bg-black/60 px-4 py-2 text-center text-sm font-semibold text-white backdrop-blur-sm">
              {currentOverlay.overlayText}
            </p>
          </div>
        )}

        {currentClip?.kind === "missing" && (
          <div className="absolute inset-0 flex items-center justify-center bg-yellow-900/30">
            <span className="rounded bg-yellow-500/80 px-2 py-1 text-xs font-bold text-black">
              MISSING SHOT
            </span>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className={cn("bg-neutral-950", isFloating ? "px-3 py-2" : "px-4 py-3")}>
        {/* Progress bar */}
        <div className={cn("overflow-hidden rounded-full bg-neutral-800", isFloating ? "mb-2 h-0.5" : "mb-3 h-1")}>
          <div
            className="h-full rounded-full bg-white transition-[width] duration-100"
            style={{ width: `${progressPct}%` }}
          />
        </div>

        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={togglePlay}
            className={cn(
              "flex items-center justify-center rounded-full bg-white text-black transition hover:bg-neutral-200",
              isFloating ? "size-8" : "size-10"
            )}
            aria-label={playing ? "Pause" : "Play"}
          >
            {playing ? (
              <Pause className={cn(isFloating ? "size-4" : "size-5")} weight="fill" />
            ) : (
              <Play className={cn(isFloating ? "size-4" : "size-5")} weight="fill" />
            )}
          </button>
          <span className="text-xs tabular-nums text-neutral-400">
            {(currentMs / 1000).toFixed(1)}s / {(totalMs / 1000).toFixed(1)}s
          </span>
          {!isFloating ? (
            <span className="text-xs text-neutral-500">
              {currentClip?.label ?? "—"}
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );

  if (isFloating) {
    return player;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
    >
      {player}
    </div>
  );
}
