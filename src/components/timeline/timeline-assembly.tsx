import { ArrowsClockwise, SpeakerHigh, TextT, Warning } from "@phosphor-icons/react";
import React, { useCallback } from "react";
import type { MediaAsset, TimelineSegment } from "../../data/reframe-demo";
import { cn } from "../../lib/utils";

interface TimelineAssemblyProps {
  segments: TimelineSegment[];
  selectedSegmentId: string | null;
  onSelectSegment: (segmentId: string | null) => void;
  onSwapClip?: (segmentId: string, newAsset: MediaAsset) => void;
  className?: string;
}

function formatMs(ms: number): string {
  const secs = Math.floor(ms / 1000);
  const frac = Math.floor((ms % 1000) / 100);
  return `${secs}.${frac}s`;
}

export function TimelineAssembly({
  segments,
  selectedSegmentId,
  onSelectSegment,
  onSwapClip,
  className,
}: TimelineAssemblyProps) {
  const totalMs = Math.max(...segments.map((s) => s.endMs), 0);

  const handleSegmentClick = useCallback(
    (segmentId: string) => {
      onSelectSegment(selectedSegmentId === segmentId ? null : segmentId);
    },
    [onSelectSegment, selectedSegmentId]
  );

  const clipSegments = segments.filter((s) => s.kind === "clip" || s.kind === "missing");
  const overlaySegments = segments.filter((s) => s.kind === "text-overlay");
  const audioSegments = segments.filter((s) => s.kind === "audio");

  return (
    <div className={cn("space-y-3", className)} data-testid="timeline-assembly">
      {/* Timecode ruler */}
      <div className="flex items-center justify-between text-[9px] tabular-nums text-muted-foreground">
        <span>0:00</span>
        <span>{formatMs(totalMs / 2)}</span>
        <span>{formatMs(totalMs)}</span>
      </div>

      {/* Video track */}
      <div>
        <p className="mb-1 text-[10px] font-medium text-muted-foreground">Video</p>
        <div className="flex gap-0.5 overflow-hidden rounded-md">
          {clipSegments.map((seg) => {
            const widthPct = ((seg.endMs - seg.startMs) / totalMs) * 100;
            const isSelected = seg.id === selectedSegmentId;
            return (
              <button
                key={seg.id}
                type="button"
                onClick={() => handleSegmentClick(seg.id)}
                data-testid={`timeline-segment-${seg.id}`}
                className={cn(
                  "relative flex-shrink-0 overflow-hidden border-2 transition",
                  seg.kind === "missing"
                    ? "border-dashed border-yellow-500/50 bg-neutral-900"
                    : "border-transparent bg-neutral-200",
                  isSelected && "border-primary ring-1 ring-primary"
                )}
                style={{ width: `${widthPct}%`, minWidth: 40 }}
              >
                {seg.kind === "clip" && seg.thumbnail ? (
                  <img
                    src={seg.thumbnail}
                    alt={seg.label}
                    className="h-12 w-full object-cover"
                    draggable={false}
                  />
                ) : (
                  <div className="flex h-12 items-center justify-center">
                    <Warning className="size-4 text-yellow-500" />
                  </div>
                )}
                <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-1 py-0.5">
                  <p className="truncate text-[8px] text-white">{seg.label}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Text overlays */}
      {overlaySegments.length > 0 && (
        <div>
          <p className="mb-1 text-[10px] font-medium text-muted-foreground">Text Overlays</p>
          <div className="space-y-0.5">
            {overlaySegments.map((seg) => (
              <div
                key={seg.id}
                className="flex items-center gap-1.5 rounded border bg-secondary/50 px-2 py-1.5"
              >
                <TextT className="size-3 shrink-0 text-muted-foreground" />
                <p className="min-w-0 truncate text-[10px] text-foreground/80">
                  {seg.overlayText}
                </p>
                <span className="ml-auto whitespace-nowrap text-[8px] tabular-nums text-muted-foreground">
                  {formatMs(seg.startMs)}-{formatMs(seg.endMs)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Audio track */}
      {audioSegments.length > 0 && (
        <div>
          <p className="mb-1 text-[10px] font-medium text-muted-foreground">Audio</p>
          {audioSegments.map((seg) => (
            <div
              key={seg.id}
              className="flex items-center gap-1.5 rounded border bg-purple-50/50 px-2 py-1.5 dark:bg-purple-950/20"
            >
              <SpeakerHigh className="size-3 shrink-0 text-purple-600" />
              <p className="min-w-0 text-[10px] text-foreground/80">{seg.audioNote}</p>
            </div>
          ))}
        </div>
      )}

      {/* Alternate clips for selected segment */}
      {selectedSegmentId && (() => {
        const seg = segments.find((s) => s.id === selectedSegmentId);
        if (!seg || !seg.alternates || seg.alternates.length === 0) return null;
        return (
          <div data-testid="alternate-clips">
            <p className="mb-1 text-[10px] font-medium text-muted-foreground">
              Alternate clips for: {seg.label}
            </p>
            <div className="grid grid-cols-3 gap-1.5">
              {seg.alternates.map((alt) => (
                <button
                  key={alt.id}
                  type="button"
                  onClick={() => onSwapClip?.(selectedSegmentId, alt)}
                  className="group overflow-hidden rounded border bg-background text-left transition hover:border-primary"
                  data-testid={`alternate-${alt.id}`}
                >
                  <img
                    src={alt.thumbnail}
                    alt={alt.label}
                    className="aspect-video w-full object-cover"
                    draggable={false}
                  />
                  <div className="p-1">
                    <p className="truncate text-[8px] font-medium">{alt.label}</p>
                    <p className="text-[7px] text-muted-foreground">{alt.matchReason}</p>
                  </div>
                  <div className="flex items-center justify-center border-t py-1 text-[8px] text-primary opacity-0 transition group-hover:opacity-100">
                    <ArrowsClockwise className="mr-0.5 size-2.5" />
                    Swap
                  </div>
                </button>
              ))}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
