import { FilmSlate, Pause, Play, X } from "@phosphor-icons/react";
import React, { useCallback, useEffect, useRef, useState } from "react";
import type { TimelineSegment } from "../../data/reframe-demo";
import { cn } from "../../lib/utils";

interface MockVideoPreviewProps {
  segments: TimelineSegment[];
  open: boolean;
  onClose?: () => void;
  variant?: "modal" | "floating" | "node";
  videoSrc?: string;
  previewTimeMs?: number | null;
  className?: string;
}

function findMissingScrubSegment(segments: TimelineSegment[], previewTimeMs: number | null) {
  if (previewTimeMs === null) return undefined;

  return segments.find(
    (segment) =>
      segment.kind === "missing" &&
      previewTimeMs >= segment.startMs &&
      previewTimeMs < segment.endMs
  );
}

export function MockVideoPreview({
  segments,
  open,
  onClose,
  variant = "modal",
  videoSrc = "/videos/final.mp4",
  previewTimeMs = null,
  className,
}: MockVideoPreviewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [currentMs, setCurrentMs] = useState(0);
  const [durationMs, setDurationMs] = useState(() => Math.max(...segments.map((s) => s.endMs), 1));
  const totalMs = Math.max(durationMs, 1);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (!open || !playing) {
      video.pause();
      return;
    }

    void video.play().catch(() => setPlaying(false));
  }, [open, playing]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || previewTimeMs === null) return;

    const nextTimeMs = Math.min(Math.max(previewTimeMs, 0), totalMs);
    const nextTimeSeconds = nextTimeMs / 1000;

    if (Math.abs(video.currentTime - nextTimeSeconds) > 0.02) {
      video.currentTime = nextTimeSeconds;
    }
    setCurrentMs(nextTimeMs);
  }, [previewTimeMs, totalMs]);

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
  const isNode = variant === "node";
  const isInline = isFloating || isNode;
  const missingScrubSegment = findMissingScrubSegment(segments, previewTimeMs);

  const player = (
    <div
      className={cn(
        "relative overflow-hidden bg-neutral-950 shadow-2xl",
        isNode
          ? "flex h-full w-full flex-col rounded-none border-0 shadow-none"
          : isFloating
          ? "flex h-full w-auto flex-col rounded-2xl border border-white/10"
          : "w-full max-w-sm rounded-2xl",
        className
      )}
      data-testid="mock-video-preview"
      data-preview-variant={variant}
      aria-label={isInline ? "Timeline video preview" : undefined}
    >
      {onClose && !isInline ? (
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
          isInline ? "min-h-0 flex-1" : "aspect-[9/16]"
        )}
      >
        <video
          ref={videoRef}
          src={videoSrc}
          className="absolute inset-0 size-full object-cover"
          playsInline
          preload="metadata"
          aria-label="Timeline preview video"
          onLoadedMetadata={handleLoadedMetadata}
          onTimeUpdate={handleTimeUpdate}
          onEnded={handleEnded}
        />
        {missingScrubSegment ? (
          <div
            className="absolute inset-0 flex flex-col items-center justify-center bg-black text-white"
            data-testid="preview-missing-shot-frame"
          >
            <FilmSlate className="mb-3 size-10 text-white/70" weight="thin" />
            <span className="text-sm font-medium text-white/85">shot missing</span>
          </div>
        ) : null}
      </div>

      {/* Controls */}
      <div className={cn("bg-neutral-950", isInline ? "px-3 py-2" : "px-4 py-3")}>
        {/* Progress bar */}
        <div className={cn("overflow-hidden rounded-full bg-neutral-800", isInline ? "mb-2 h-0.5" : "mb-3 h-1")}>
          <div
            className="h-full rounded-full bg-white transition-[width] duration-100"
            style={{ width: `${progressPct}%` }}
          />
        </div>

        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              togglePlay();
            }}
            className={cn(
              "flex items-center justify-center rounded-full bg-white text-black transition hover:bg-neutral-200",
              isInline ? "size-8" : "size-10"
            )}
            aria-label={playing ? "Pause" : "Play"}
          >
            {playing ? (
              <Pause className={cn(isInline ? "size-4" : "size-5")} weight="fill" />
            ) : (
              <Play className={cn(isInline ? "size-4" : "size-5")} weight="fill" />
            )}
          </button>
          <span className="text-xs tabular-nums text-neutral-400">
            {(currentMs / 1000).toFixed(1)}s / {(totalMs / 1000).toFixed(1)}s
          </span>
          {!isInline ? <span className="text-xs text-neutral-500">final.mp4</span> : null}
        </div>
      </div>
    </div>
  );

  if (isInline) {
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
