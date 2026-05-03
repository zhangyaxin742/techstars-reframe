"use client";

import {
  CheckCircle,
  CircleDashed,
  GearSix,
  WarningCircle,
} from "@phosphor-icons/react";
import React from "react";
import type { SimulatedToolCall } from "../../data/reframe-demo";
import { cn } from "../../lib/utils";

interface SimulatedToolCallProps {
  toolCall: SimulatedToolCall;
  className?: string;
}

const statusLabels: Record<SimulatedToolCall["state"], string> = {
  pending: "Queued",
  running: "Running",
  completed: "Done",
  error: "Error",
};

export function SimulatedToolCall({ toolCall, className }: SimulatedToolCallProps) {
  const Icon =
    toolCall.state === "completed"
      ? CheckCircle
      : toolCall.state === "error"
        ? WarningCircle
        : toolCall.state === "running"
          ? GearSix
          : CircleDashed;

  return (
    <div
      className={cn(
        "rounded-md border bg-background/80 px-2.5 py-2 text-xs shadow-sm",
        toolCall.state === "running" && "border-accent/40",
        toolCall.state === "completed" && "border-green-600/30",
        toolCall.state === "error" && "border-destructive/40",
        className
      )}
      data-testid={`simulated-tool-${toolCall.id}`}
      data-tool-state={toolCall.state}
    >
      <div className="flex items-center gap-2">
        <Icon
          className={cn(
            "size-3.5 shrink-0",
            toolCall.state === "running" && "animate-spin text-accent",
            toolCall.state === "completed" && "text-green-600",
            toolCall.state === "error" && "text-destructive",
            toolCall.state === "pending" && "text-muted-foreground"
          )}
          weight={toolCall.state === "completed" ? "fill" : "regular"}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate font-medium text-foreground">{toolCall.label}</span>
            <span className="ml-auto rounded bg-secondary px-1.5 py-0.5 text-[9px] font-medium text-muted-foreground">
              {statusLabels[toolCall.state]}
            </span>
          </div>
          <p className="mt-0.5 truncate font-mono text-[10px] text-muted-foreground">
            {toolCall.name}
          </p>
        </div>
      </div>
      {toolCall.output ? (
        <p className="mt-2 text-[10px] leading-4 text-muted-foreground">{toolCall.output}</p>
      ) : null}
    </div>
  );
}
