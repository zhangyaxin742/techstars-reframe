import React from "react";
import { Skeleton } from "../ui/skeleton";

function SkeletonRect({
  className,
  style,
}: {
  className: string;
  style?: React.CSSProperties;
}) {
  return <Skeleton className={className} style={style} />;
}

export function BrandContextCardSkeleton() {
  const sourceLineWidths = [48, 40, 40, 52];
  const footerWidths = ["w-24", "w-20", "w-28", "w-32"];

  return (
    <div className="flex w-full text-[11px] leading-4">
      {/* Left column */}
      <div className="flex w-[210px] shrink-0 flex-col gap-3 border-r p-4">
        <SkeletonRect className="h-2 w-20" />
        <SkeletonRect className="h-11 w-full" />
        <SkeletonRect className="h-3 w-36" />

        <div className="mt-1 space-y-3">
          {sourceLineWidths.map((w, i) => (
            <div key={i} className="flex items-start gap-2">
              <SkeletonRect className="mt-0.5 size-3 shrink-0" />
              <div className="flex-1 space-y-1.5">
                <SkeletonRect className="h-2.5 w-14" />
                <SkeletonRect className="h-2" style={{ width: `${w}%` }} />
              </div>
            </div>
          ))}
        </div>

        <div className="mt-1">
          <SkeletonRect className="mb-1 h-2 w-28" />
          <div className="rounded-md border bg-muted/40 p-2.5">
            <div className="space-y-1.5">
              <SkeletonRect className="h-2 w-full" />
              <SkeletonRect className="h-2 w-3/4" />
            </div>
          </div>
        </div>
      </div>

      {/* Middle column */}
      <div className="flex min-w-0 flex-1 flex-col border-r">
        <div className="flex items-center justify-between border-b px-3 py-2">
          <SkeletonRect className="h-2 w-28" />
          <SkeletonRect className="h-2 w-14" />
        </div>

        <div className="grid grid-cols-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex flex-col overflow-hidden border-b border-r">
              <SkeletonRect className="h-[120px] w-full rounded-none" />
              <div className="flex flex-col gap-1 bg-card px-2 py-1.5">
                <SkeletonRect className="h-2.5 w-full" />
                <SkeletonRect className="h-2 w-12" />
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-4 border-t px-3 py-2">
          {footerWidths.map((widthClass, i) => (
            <SkeletonRect key={i} className={`h-2 ${widthClass}`} />
          ))}
        </div>
      </div>

      {/* Right column */}
      <div className="flex w-[260px] shrink-0 flex-col gap-3 p-3">
        <SkeletonRect className="h-2 w-24" />

        <div className="space-y-1.5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <SkeletonRect className="size-4 shrink-0 rounded-full" />
              <SkeletonRect className="h-2 flex-1" />
              <SkeletonRect className="h-2 w-10" />
            </div>
          ))}
        </div>

        <div className="border-t pt-2">
          <SkeletonRect className="mb-1.5 h-2 w-16" />
          <div className="space-y-1.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-start gap-1">
                <SkeletonRect className="mt-0.5 size-[9px] shrink-0 rounded-full" />
                <SkeletonRect className="h-2 flex-1" />
              </div>
            ))}
          </div>
        </div>

        <div className="border-t pt-2">
          <SkeletonRect className="mb-1.5 h-2 w-8" />
          <div className="space-y-1.5">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between gap-2">
                <SkeletonRect className="h-2 w-14" />
                <SkeletonRect className="h-2 w-24" />
              </div>
            ))}
          </div>
        </div>

        <div className="border-t pt-2">
          <SkeletonRect className="mb-1.5 h-2 w-20" />
          <div className="grid grid-cols-2 gap-x-2 gap-y-1">
            {Array.from({ length: 8 }).map((_, i) => (
              <SkeletonRect key={i} className="h-2 w-full" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
