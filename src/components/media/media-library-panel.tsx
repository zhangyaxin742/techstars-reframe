import { MagnifyingGlass, X } from "@phosphor-icons/react";
import React, { useMemo, useState } from "react";
import type { MediaAsset } from "../../data/reframe-demo";
import { cn } from "../../lib/utils";

interface MediaLibraryPanelProps {
  assets: MediaAsset[];
  open: boolean;
  onClose: () => void;
  onSelectAsset?: (asset: MediaAsset) => void;
  className?: string;
}

export function MediaLibraryPanel({
  assets,
  open,
  onClose,
  onSelectAsset,
  className,
}: MediaLibraryPanelProps) {
  const [search, setSearch] = useState("");

  const groups = useMemo(() => {
    const map = new Map<string, MediaAsset[]>();
    for (const asset of assets) {
      const key = asset.shotType;
      const existing = map.get(key);
      if (existing) existing.push(asset);
      else map.set(key, [asset]);
    }
    return map;
  }, [assets]);

  const filteredGroups = useMemo(() => {
    if (!search.trim()) return groups;
    const lower = search.toLowerCase();
    const result = new Map<string, MediaAsset[]>();
    for (const [key, items] of groups) {
      const filtered = items.filter(
        (a) =>
          a.label.toLowerCase().includes(lower) ||
          a.tags.some((t) => t.toLowerCase().includes(lower)) ||
          a.trendFit.toLowerCase().includes(lower)
      );
      if (filtered.length > 0) result.set(key, filtered);
    }
    return result;
  }, [groups, search]);

  if (!open) return null;

  return (
    <aside
      data-testid="media-library-panel"
      className={cn(
        "flex h-full w-72 shrink-0 flex-col border-l bg-card lg:w-80",
        className
      )}
    >
      <div className="flex h-10 items-center justify-between border-b px-3">
        <span className="text-xs font-medium text-muted-foreground">Media Library</span>
        <button
          type="button"
          onClick={onClose}
          className="flex size-6 items-center justify-center rounded text-muted-foreground transition hover:bg-secondary hover:text-foreground"
          aria-label="Close media library"
        >
          <X className="size-3.5" />
        </button>
      </div>

      <div className="border-b px-3 py-2">
        <div className="flex items-center gap-2 rounded-md border bg-background px-2 py-1.5">
          <MagnifyingGlass className="size-3.5 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search media..."
            className="w-full bg-transparent text-xs outline-none placeholder:text-muted-foreground"
          />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-2">
        {Array.from(filteredGroups).map(([group, items]) => (
          <div key={group} className="mb-4">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              {group}
            </p>
            <div className="grid grid-cols-2 gap-1.5">
              {items.map((asset) => (
                <button
                  key={asset.id}
                  type="button"
                  onClick={() => onSelectAsset?.(asset)}
                  className="group overflow-hidden rounded-md border bg-background text-left transition hover:border-primary hover:shadow-sm"
                >
                  <img
                    src={asset.thumbnail}
                    alt={asset.label}
                    className="aspect-video w-full object-cover"
                    draggable={false}
                  />
                  <div className="p-1.5">
                    <p className="truncate text-[10px] font-medium">{asset.label}</p>
                    <div className="mt-0.5 flex flex-wrap gap-0.5">
                      {asset.tags.slice(0, 2).map((tag) => (
                        <span
                          key={tag}
                          className="rounded bg-secondary px-1 py-px text-[8px] text-muted-foreground"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                    <p className="mt-1 text-[9px] text-muted-foreground">{asset.trendFit}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}
