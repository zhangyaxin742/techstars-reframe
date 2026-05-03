import { ArrowsClockwise, Eye, FilmSlate, SpeakerHigh, TextT } from "@phosphor-icons/react";
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
  const totalSecs = Math.floor(ms / 1000);
  const mins = Math.floor(totalSecs / 60);
  const secs = totalSecs % 60;
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

const WAVE_HEIGHTS = [20, 42, 74, 56, 30, 88, 64, 36, 52, 76, 44, 68, 25, 90, 58, 38];

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
              className="group overflow-hidden rounded-md border border-border bg-background text-left transition hover:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
              <div className="flex items-center justify-center border-t py-1.5 text-[10px] text-accent opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100">
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
    const rulerStep = 3000;
    const rulerMarks: number[] = [];
    for (let t = 0; t <= totalMs; t += rulerStep) rulerMarks.push(t);
    if (rulerMarks[rulerMarks.length - 1] < totalMs) rulerMarks.push(totalMs);
    const trackWidth = 1120;

    return (
      <div className={cn("space-y-4", className)} data-testid="timeline-assembly">
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <div className="flex">
            {/* Track label column */}
            <div className="w-28 shrink-0 border-r border-border bg-secondary/30">
              <div className="h-8 border-b border-border" />
              <div className="flex h-[72px] items-center gap-2 border-b border-border px-3">
                <Eye className="size-3.5 shrink-0 text-muted-foreground" />
                <span className="text-xs font-medium text-foreground">Video Track</span>
              </div>
              <div className="flex h-14 items-center gap-2 border-b border-border px-3">
                <TextT className="size-3.5 shrink-0 text-muted-foreground" />
                <span className="text-xs font-medium text-foreground">Text Overlay</span>
              </div>
              <div className="flex h-14 items-center gap-2 px-3">
                <SpeakerHigh className="size-3.5 shrink-0 text-muted-foreground" />
                <span className="text-xs font-medium text-foreground">Audio (Beat)</span>
              </div>
            </div>

            {/* Scrollable track area */}
            <div className="scrollbar-hover-visible min-w-0 flex-1 overflow-x-auto">
              <div
                className="relative"
                data-testid="timeline-track-surface"
                style={{ width: "100%", minWidth: trackWidth }}
              >

                {/* Timecode ruler */}
                <div className="relative h-8 border-b border-border bg-secondary/20">
                  {rulerMarks.map((mark) => (
                    <div
                      key={mark}
                      className="absolute inset-y-0 border-l border-border/50"
                      style={{ left: `${(mark / totalMs) * 100}%` }}
                    >
                      <span className="absolute left-1.5 top-1.5 text-[10px] tabular-nums text-muted-foreground">
                        {formatMs(mark)}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Video track */}
                <div className="relative h-[72px] border-b border-border bg-secondary/20">
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
                          "absolute inset-y-2 overflow-hidden rounded text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                          seg.kind === "missing"
                            ? "border border-dashed border-yellow-500/50 bg-[#1f1f29]"
                            : cn(
                                "border border-transparent shadow-[rgba(0,0,0,0.06)_0px_1px_2px_0px]",
                                !isSelected && "hover:border-accent/50"
                              ),
                          isSelected && "border border-accent ring-2 ring-ring"
                        )}
                        style={{ left: `${leftPct}%`, width: `${widthPct}%`, minWidth: 80 }}
                      >
                        {seg.kind === "clip" && seg.thumbnail ? (
                          <>
                            <img
                              src={seg.thumbnail}
                              alt={segmentLabel}
                              className="h-full w-full object-cover"
                              draggable={false}
                            />
                            <span className="sr-only">{segmentLabel}</span>
                          </>
                        ) : (
                          <div className="flex h-full flex-col items-center justify-center gap-0.5 px-2">
                            <FilmSlate className="size-5 shrink-0 text-white/40" weight="thin" />
                            <p className="text-center text-[9px] font-medium leading-tight text-white/60">
                              film missing shot
                            </p>
                            <p className="text-center text-[8px] leading-tight text-white/35">
                              Drop media here
                            </p>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Text overlay track */}
                <div className="relative h-14 border-b border-border bg-secondary/20">
                  {overlaySegments.map((seg) => {
                    const widthPct = ((seg.endMs - seg.startMs) / totalMs) * 100;
                    const leftPct = (seg.startMs / totalMs) * 100;
                    const isCta = seg.label.toLowerCase().includes("cta");
                    return (
                      <button
                        key={seg.id}
                        type="button"
                        onClick={() => handleSegmentClick(seg.id)}
                        data-testid={`timeline-segment-${seg.id}`}
                        className={cn(
                          "absolute top-3 flex h-8 items-center truncate rounded border px-3 text-left text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                          isCta
                            ? "border-accent/20 bg-accent text-accent-foreground hover:bg-accent/90"
                            : "border-border bg-card text-foreground/80 hover:border-accent/60",
                          seg.id === selectedSegmentId && "border-accent ring-2 ring-ring"
                        )}
                        style={{ left: `${leftPct}%`, width: `${widthPct}%`, minWidth: 120 }}
                      >
                        <span className="truncate">{seg.overlayText}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Audio track */}
                <div className="relative h-14 bg-secondary/20">
                  {audioSegments.map((seg) => (
                    <button
                      key={seg.id}
                      type="button"
                      onClick={() => handleSegmentClick(seg.id)}
                      data-testid={`timeline-segment-${seg.id}`}
                      className={cn(
                        "absolute inset-0 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
                        seg.id === selectedSegmentId && "ring-2 ring-inset ring-ring"
                      )}
                    >
                      <div className="relative flex h-full items-center px-2">
                        {/* Waveform bars */}
                        <div className="flex h-8 w-full items-center gap-[1.5px]">
                          {Array.from({ length: 120 }, (_, i) => (
                            <span
                              key={i}
                              className="flex-1 rounded-full bg-accent/45"
                              style={{ height: `${WAVE_HEIGHTS[i % WAVE_HEIGHTS.length]}%` }}
                            />
                          ))}
                        </div>
                        {/* Beat markers align to clip transition boundaries where possible. */}
                        {clipTransitionMarkers.map((markerMs) => (
                          <div
                            key={markerMs}
                            data-testid={`audio-beat-marker-${markerMs}`}
                            className="absolute top-1/2 size-1.5 -translate-y-1/2 rotate-45 bg-accent"
                            style={{ left: `${(markerMs / totalMs) * 100}%` }}
                          />
                        ))}
                      </div>
                      <span className="sr-only">{seg.audioNote}</span>
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
                  "relative flex-shrink-0 overflow-hidden rounded border-2 transition",
                  seg.kind === "missing"
                    ? "border-dashed border-border bg-[#1f1f29]"
                    : "border-transparent bg-secondary",
                  isSelected && "border-accent ring-1 ring-ring"
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
                    <FilmSlate className="size-4 text-white/40" weight="thin" />
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
              className="flex items-center gap-1.5 rounded border border-border bg-secondary px-2 py-1.5"
            >
              <SpeakerHigh className="size-3 shrink-0 text-accent" />
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
