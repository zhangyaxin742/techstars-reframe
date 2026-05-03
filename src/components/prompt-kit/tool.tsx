"use client";

import React from "react";
import { cn } from "../../lib/utils";

export interface ToolPart {
  type: string;
  state: string;
  input?: Record<string, unknown>;
  output?: Record<string, unknown> | string;
  toolCallId: string;
  errorText?: string;
}

interface ToolProps extends React.HTMLAttributes<HTMLDivElement> {
  toolPart: ToolPart;
  defaultOpen?: boolean;
}

const stateLabels: Record<string, string> = {
  pending: "Queued",
  running: "Running",
  completed: "Completed",
  error: "Error",
};

export function Tool({ toolPart, className, ...props }: ToolProps) {
  const label = stateLabels[toolPart.state] ?? toolPart.state;
  const output =
    typeof toolPart.output === "string" ? toolPart.output : JSON.stringify(toolPart.output);

  return (
    <div
      className={cn(
        "rounded-md border bg-background/80 px-2.5 py-2 text-xs shadow-sm",
        toolPart.state === "running" && "border-accent/40 bg-accent/5",
        toolPart.state === "error" && "border-destructive/40 bg-destructive/5",
        className
      )}
      {...props}
    >
      <div className="flex items-start gap-2">
        <span
          className={cn(
            "mt-1.5 size-1.5 shrink-0 rounded-full bg-muted-foreground/45",
            toolPart.state === "running" && "animate-pulse bg-accent",
            toolPart.state === "error" && "bg-destructive"
          )}
          aria-hidden="true"
        />
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-2">
            <span className="truncate font-medium text-foreground">{toolPart.type}</span>
            <span className="ml-auto rounded bg-secondary px-1.5 py-0.5 text-[9px] font-medium text-muted-foreground">
              {label}
            </span>
          </div>
          <p className="mt-0.5 truncate font-mono text-[10px] text-muted-foreground">
            {toolPart.toolCallId}
          </p>
          {toolPart.errorText ? (
            <p className="mt-2 text-[10px] leading-4 text-destructive">{toolPart.errorText}</p>
          ) : output ? (
            <p className="mt-2 text-[10px] leading-4 text-muted-foreground">{output}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
