"use client";

import React from "react";
import { cn } from "../../lib/utils";

type MessageRole = "assistant" | "user" | "system";

interface MessageProps extends React.HTMLAttributes<HTMLDivElement> {
  role?: MessageRole;
}

interface MessageContentProps extends React.HTMLAttributes<HTMLDivElement> {
  role?: MessageRole;
}

export function Message({ role = "assistant", className, ...props }: MessageProps) {
  return (
    <div
      className={cn(
        "flex w-full",
        role === "user" ? "justify-end" : "justify-start",
        className
      )}
      data-message-role={role}
      {...props}
    />
  );
}

export function MessageContent({
  role = "assistant",
  className,
  ...props
}: MessageContentProps) {
  return (
    <div
      className={cn(
        "max-w-[92%] text-pretty text-xs leading-relaxed",
        role === "user"
          ? "rounded-lg bg-foreground px-3 py-2 text-background shadow-sm"
          : "text-foreground/80",
        role === "system" && "rounded-md bg-secondary px-2.5 py-2 text-muted-foreground",
        className
      )}
      {...props}
    />
  );
}
