import { Pause, Play, X } from "@phosphor-icons/react";
import React, { useCallback, useEffect, useRef, useState } from "react";
import type { TimelineSegment } from "../../data/reframe-demo";
import { cn } from "../../lib/utils";

interface MockVideoPreviewProps {
  segments: TimelineSegment[];
  open: boolean;
  onClose?: () => void;
  variant?: "modal" | "floating";
  videoSrc?: string;
  className?: string;
}

export function MockVideoPreview({
  segments,
  open,
  onClose,
  variant = "modal",
  videoSrc = "/videos/final.mp4",
  className,
}: MockVideoPreviewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [currentMs, setCurrentMs] = useState(0);
  const [durationMs, setDurationMs] = useState(() => Math.max(...segments.map((s) => s.endMs), 1));
  const totalMs = Math.max(durationMs, 1);
  const currentOverlay = segments.find(
    (segment) =>
      segment.kind === "text-overlay" && currentMs >= segment.startMs && currentMs < segment.endMs
  );

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (!open || !playing) {
      video.pause();
      return;
    }

    void video.play().catch(() => setPlaying(false));
  }, [open, playing]);

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (video && currentMs >= totalMs - 100) {
      video.currentTime = 0;
      setCurrentMs(0);
    }
    setPlaying((v) => !v);
  }, [currentMs, totalMs]);

  const handleLoadedMetadata = useCallback(() => {
    const duration = videoRef.current?.duration;
    if (duration && Number.isFinite(duration)) {
      setDurationMs(duration * 1000);
    }
  }, []);

  const handleTimeUpdate = useCallback(() => {
    const currentTime = videoRef.current?.currentTime ?? 0;
    setCurrentMs(currentTime * 1000);
  }, []);

  const handleEnded = useCallback(() => {
    const video = videoRef.current;
    if (video) video.currentTime = 0;
    setCurrentMs(0);
    setPlaying(false);
  }, []);

  if (!open) return null;

  const progressPct = (currentMs / totalMs) * 100;
  const isFloating = variant === "floating";

  const player = (
    <div
      className={cn(
        "relative overflow-hidden bg-neutral-950 shadow-2xl",
        isFloating
          ? "flex h-full w-auto flex-col rounded-2xl border border-white/10"
          : "w-full max-w-sm rounded-2xl",
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

      {/* 9:16 actual video preview */}
      <div
        className={cn(
          "relative w-full overflow-hidden bg-neutral-900",
          isFloating ? "min-h-0 flex-1" : "aspect-[9/16]"
        )}
      >
        <video
          ref={videoRef}
          src={videoSrc}
          className="absolute inset-0 size-full object-cover"
          playsInline
          muted
          preload="metadata"
          aria-label="Timeline preview video"
          onLoadedMetadata={handleLoadedMetadata}
          onTimeUpdate={handleTimeUpdate}
          onEnded={handleEnded}
        />

        {currentOverlay ? (
          <div className="absolute inset-x-0 bottom-16 flex justify-center px-5">
            <p className="max-w-[92%] text-center text-lg font-semibold leading-tight text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.75)]">
              {currentOverlay.overlayText}
            </p>
          </div>
        ) : null}
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
          {!isFloating ? <span className="text-xs text-neutral-500">final.mp4</span> : null}
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
