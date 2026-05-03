"use client";

import React from "react";
import { cn } from "../../lib/utils";

interface StepsRootProps extends React.HTMLAttributes<HTMLDivElement> {
  defaultOpen?: boolean;
}

interface StepsContentProps extends React.HTMLAttributes<HTMLDivElement> {
  bar?: React.ReactNode;
}

export function StepsRoot({ className, ...props }: StepsRootProps) {
  return <div className={cn("space-y-1.5", className)} {...props} />;
}

export function StepsContent({ className, bar = <StepsBar />, children, ...props }: StepsContentProps) {
  return (
    <div className={cn("grid grid-cols-[0.5rem_1fr] gap-2", className)} {...props}>
      {bar}
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

export function StepsBar({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className="flex justify-center">
      <div className={cn("h-full w-px rounded-full bg-border", className)} {...props} />
    </div>
  );
}

export function StepsItem({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("min-w-0", className)} {...props} />;
}
