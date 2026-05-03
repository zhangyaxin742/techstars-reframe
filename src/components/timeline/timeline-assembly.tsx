import { ArrowsClockwise, SpeakerHigh, TextT, Warning } from "@phosphor-icons/react";
import React, { useCallback } from "react";
import type { MediaAsset, TimelineSegment } from "../../data/reframe-demo";
import { cn } from "../../lib/utils";

interface TimelineAssemblyProps {
  segments: TimelineSegment[];
  selectedSegmentId: string | null;
  onSelectSegment: (segmentId: string | null) => void;
  onSwapClip?: (segmentId: string, newAsset: MediaAsset) => void;
  variant?: "compact" | "drawer";
  className?: string;
}

function formatMs(ms: number): string {
  const secs = Math.floor(ms / 1000);
  const frac = Math.floor((ms % 1000) / 100);
  return `${secs}.${frac}s`;
}

function getClipTransitionMarkers(segments: TimelineSegment[], totalMs: number): number[] {
  const markers = new Set<number>();

  segments.forEach((segment) => {
    if (segment.startMs > 0 && segment.startMs < totalMs) markers.add(segment.startMs);
    if (segment.endMs > 0 && segment.endMs < totalMs) markers.add(segment.endMs);
  });

  return Array.from(markers).sort((a, b) => a - b);
}

export function TimelineAssembly({
  segments,
  selectedSegmentId,
  onSelectSegment,
  onSwapClip,
  variant = "compact",
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
  const clipTransitionMarkers = getClipTransitionMarkers(clipSegments, totalMs);

  const renderAlternates = () => {
    if (!selectedSegmentId) return null;
    const seg = segments.find((s) => s.id === selectedSegmentId);
    if (!seg || !seg.alternates || seg.alternates.length === 0) return null;

    return (
      <div
        data-testid="alternate-clips"
        className={cn(
          "rounded-lg border bg-card",
          variant === "drawer" ? "p-3" : "border-transparent bg-transparent"
        )}
      >
        <p className="mb-2 text-[10px] font-medium text-muted-foreground">
          Alternate clips for: {seg.label}
        </p>
        <div className={cn("grid gap-2", variant === "drawer" ? "grid-cols-4" : "grid-cols-3")}>
          {seg.alternates.map((alt) => (
            <button
              key={alt.id}
              type="button"
              onClick={() => onSwapClip?.(selectedSegmentId, alt)}
              className="group overflow-hidden rounded-md border bg-background text-left transition hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              data-testid={`alternate-${alt.id}`}
            >
              <img
                src={alt.thumbnail}
                alt={alt.label}
                className="aspect-video w-full object-cover"
                draggable={false}
              />
              <div className="p-2">
                <p className="truncate text-xs font-medium">{alt.label}</p>
                <p className="line-clamp-2 text-[10px] leading-4 text-muted-foreground">
                  {alt.matchReason}
                </p>
              </div>
              <div className="flex items-center justify-center border-t py-1.5 text-[10px] text-primary opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100">
                <ArrowsClockwise className="mr-1 size-3" />
                Swap
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  };

  if (variant === "drawer") {
    const rulerMarks = [0, totalMs / 4, totalMs / 2, (totalMs * 3) / 4, totalMs];
    const trackWidth = 1120;

    return (
      <div className={cn("space-y-4", className)} data-testid="timeline-assembly">
        <div className="overflow-hidden rounded-lg border bg-secondary/40">
          <div className="flex min-h-80">
            <div className="w-36 shrink-0 border-r bg-card">
              <div className="h-12 border-b" />
              {["Video", "Text", "Audio"].map((track) => (
                <div
                  key={track}
                  className="flex h-20 items-center justify-between border-b px-4"
                >
                  <span className="text-xs font-medium text-foreground">{track}</span>
                  <span className="text-[10px] uppercase text-muted-foreground">
                    {track === "Video" ? "V1" : track === "Text" ? "T1" : "A1"}
                  </span>
                </div>
              ))}
            </div>
            <div className="scrollbar-hover-visible min-w-0 flex-1 overflow-x-auto">
              <div className="relative" style={{ width: trackWidth }}>
                <div className="relative h-12 border-b bg-card">
                  {rulerMarks.map((mark) => (
                    <div
                      key={mark}
                      className="absolute inset-y-0 border-l"
                      style={{ left: `${(mark / totalMs) * 100}%` }}
                    >
                      <span className="absolute left-2 top-2 text-[10px] tabular-nums text-muted-foreground">
                        {formatMs(mark)}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="relative h-20 border-b">
                  {clipSegments.map((seg) => {
                    const widthPct = ((seg.endMs - seg.startMs) / totalMs) * 100;
                    const leftPct = (seg.startMs / totalMs) * 100;
                    const isSelected = seg.id === selectedSegmentId;
                    const segmentLabel = seg.selectedAssetLabel ?? seg.label;
                    return (
                      <button
                        key={seg.id}
                        type="button"
                        onClick={() => handleSegmentClick(seg.id)}
                        data-testid={`timeline-segment-${seg.id}`}
                        className={cn(
                          "absolute top-3 h-14 overflow-hidden rounded-md border text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                          seg.kind === "missing"
                            ? "border-dashed border-yellow-600/60 bg-foreground"
                            : "border-border bg-card hover:border-primary",
                          isSelected && "border-primary ring-2 ring-ring"
                        )}
                        style={{ left: `${leftPct}%`, width: `${widthPct}%`, minWidth: 80 }}
                      >
                        {seg.kind === "clip" && seg.thumbnail ? (
                          <img
                            src={seg.thumbnail}
                            alt={segmentLabel}
                            className="h-full w-full object-cover"
                            draggable={false}
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center">
                            <Warning className="size-4 text-yellow-500" />
                          </div>
                        )}
                        <div className="absolute inset-x-0 bottom-0 bg-foreground/75 px-2 py-1">
                          <p className="truncate text-[10px] text-background">
                            {segmentLabel}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
                <div className="relative h-20 border-b">
                  {overlaySegments.map((seg) => {
                    const widthPct = ((seg.endMs - seg.startMs) / totalMs) * 100;
                    const leftPct = (seg.startMs / totalMs) * 100;
                    return (
                      <button
                        key={seg.id}
                        type="button"
                        onClick={() => handleSegmentClick(seg.id)}
                        data-testid={`timeline-segment-${seg.id}`}
                        className={cn(
                          "absolute top-4 flex h-12 items-center gap-2 rounded-md border bg-card px-3 text-left transition hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                          seg.id === selectedSegmentId && "border-primary ring-2 ring-ring"
                        )}
                        style={{ left: `${leftPct}%`, width: `${widthPct}%`, minWidth: 120 }}
                      >
                        <TextT className="size-4 shrink-0 text-muted-foreground" />
                        <span className="truncate text-xs text-foreground/80">
                          {seg.overlayText}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <div className="relative h-20">
                  {audioSegments.map((seg) => (
                    <button
                      key={seg.id}
                      type="button"
                      onClick={() => handleSegmentClick(seg.id)}
                      data-testid={`timeline-segment-${seg.id}`}
                      className={cn(
                        "absolute left-0 right-0 top-4 flex h-12 items-center gap-3 rounded-md border bg-card px-3 text-left transition hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        seg.id === selectedSegmentId && "border-primary ring-2 ring-ring"
                      )}
                    >
                      <SpeakerHigh className="size-4 shrink-0 text-primary" />
                      <div className="flex h-6 w-40 shrink-0 items-center gap-0.5 opacity-70">
                        {[20, 42, 74, 56, 30, 88, 64, 36, 52, 76, 44, 68].map((height, index) => (
                          <span
                            key={`${height}-${index}`}
                            className="w-1 rounded-full bg-muted-foreground"
                            style={{ height: `${height}%` }}
                          />
                        ))}
                      </div>
                      <span className="min-w-0 truncate text-xs text-foreground/80">
                        {seg.audioNote}
                      </span>
                      {clipTransitionMarkers.map((markerMs) => (
                        <div
                          key={markerMs}
                          data-testid={`audio-beat-marker-${markerMs}`}
                          className="absolute top-1/2 size-1.5 -translate-y-1/2 rotate-45 bg-primary"
                          style={{ left: `${(markerMs / totalMs) * 100}%` }}
                        />
                      ))}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
        {renderAlternates()}
      </div>
    );
  }

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
                    alt={seg.selectedAssetLabel ?? seg.label}
                    className="h-12 w-full object-cover"
                    draggable={false}
                  />
                ) : (
                  <div className="flex h-12 items-center justify-center">
                    <Warning className="size-4 text-yellow-500" />
                  </div>
                )}
                <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-1 py-0.5">
                  <p className="truncate text-[8px] text-white">
                    {seg.selectedAssetLabel ?? seg.label}
                  </p>
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
      {renderAlternates()}
    </div>
  );
}
