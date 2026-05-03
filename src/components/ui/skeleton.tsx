import React from "react";
import { cn } from "../../lib/utils";

interface SkeletonProps extends React.ComponentProps<"div"> {
  duration?: number;
  spread?: number;
  variant?: "default" | "darker";
}

export function Skeleton({
  className,
  duration = 3.25,
  spread = 15,
  variant = "default",
  style,
  ...props
}: SkeletonProps) {
  const dynamicSpread = Math.min(Math.max(spread, 5), 30);
  const backgroundColor =
    variant === "darker"
      ? "var(--skeleton-darker-bg, color-mix(in srgb, var(--color-muted) 82%, var(--color-foreground) 18%))"
      : "var(--skeleton-bg, var(--color-muted))";
  const highlightColor =
    variant === "darker"
      ? "var(--skeleton-darker-highlight, color-mix(in srgb, var(--color-muted) 58%, var(--color-card) 42%))"
      : "var(--skeleton-highlight, color-mix(in srgb, var(--color-card) 72%, transparent))";

  return (
    <div
      data-slot="skeleton"
      className={cn("animate-skeleton-shimmer rounded-md", className)}
      style={{
        backgroundColor,
        backgroundImage: `linear-gradient(to right, transparent ${50 - dynamicSpread}%, ${highlightColor} 50%, transparent ${50 + dynamicSpread}%)`,
        backgroundSize: "200% auto",
        animationDuration: `${duration}s`,
        animationTimingFunction: "ease-in-out",
        ...style,
      }}
      {...props}
    />
  );
}
