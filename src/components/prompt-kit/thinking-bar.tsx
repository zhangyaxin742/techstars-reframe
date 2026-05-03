"use client";

import { CaretRight } from "@phosphor-icons/react";
import React from "react";
import { cn } from "../../lib/utils";

interface ThinkingBarProps {
  className?: string;
  text?: string;
  onClick?: () => void;
  onStop?: () => void;
  stopLabel?: string;
}

export function ThinkingBar({
  className,
  text = "Thinking",
  onClick,
  onStop,
  stopLabel = "Answer now",
}: ThinkingBarProps) {
  const label = (
    <>
      <span className="animate-pulse font-medium">{text}</span>
      {onClick ? <CaretRight className="size-3.5 text-muted-foreground" weight="bold" /> : null}
    </>
  );

  return (
    <div className={cn("flex w-full items-center justify-between gap-3", className)}>
      {onClick ? (
        <button
          type="button"
          onClick={onClick}
          className="flex min-w-0 items-center gap-1 text-left text-xs text-foreground transition hover:text-primary"
        >
          {label}
        </button>
      ) : (
        <div className="flex min-w-0 items-center gap-1 text-xs text-foreground">{label}</div>
      )}
      {onStop ? (
        <button
          type="button"
          onClick={onStop}
          className="shrink-0 border-b border-dotted border-muted-foreground text-[10px] text-muted-foreground transition hover:border-foreground hover:text-foreground"
        >
          {stopLabel}
        </button>
      ) : null}
    </div>
  );
}
