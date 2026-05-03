"use client";

import React from "react";
import { cn } from "../../lib/utils";

interface TextShimmerProps {
  children: React.ReactNode;
  as?: keyof React.JSX.IntrinsicElements;
  duration?: number;
  spread?: number;
  className?: string;
}

export function TextShimmer({
  children,
  as = "span",
  duration = 4,
  spread = 20,
  className,
}: TextShimmerProps) {
  const Component = as;

  return (
    <Component
      className={cn("prompt-kit-text-shimmer", className)}
      style={
        {
          "--text-shimmer-duration": `${duration}s`,
          "--text-shimmer-spread": `${Math.min(45, Math.max(5, spread))}rem`,
        } as React.CSSProperties
      }
    >
      {children}
    </Component>
  );
}
