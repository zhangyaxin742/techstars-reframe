"use client";

import React from "react";
import { cn } from "../../lib/utils";
import { TextShimmer } from "./text-shimmer";

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

export function Tool({ toolPart, className, ...props }: ToolProps) {
  const isRunning = toolPart.state === "running";

  return (
    <div
      className={cn(
        "min-w-0 text-xs leading-relaxed",
        toolPart.state === "completed" && "text-muted-foreground",
        toolPart.state === "error" && "text-destructive",
        className
      )}
      {...props}
    >
      {isRunning ? (
        <TextShimmer className="block truncate font-medium" duration={2.1} spread={10}>
          {toolPart.type}
        </TextShimmer>
      ) : (
        <span className="block truncate">{toolPart.errorText ?? toolPart.type}</span>
      )}
    </div>
  );
}
