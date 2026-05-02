import type { CanvasRect } from "@/src/lib/infinite-canvas/types";

export function MarqueeOverlay({ rect }: { rect: CanvasRect | null }) {
  if (!rect) return null;

  return (
    <div
      data-testid="marquee-overlay"
      className="pointer-events-none absolute rounded-md border border-accent bg-accent/10"
      style={{
        left: rect.x,
        top: rect.y,
        width: rect.width,
        height: rect.height,
      }}
    />
  );
}
