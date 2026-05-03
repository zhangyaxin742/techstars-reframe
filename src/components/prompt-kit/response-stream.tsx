"use client";

import React, { useEffect, useMemo, useState } from "react";
import { cn } from "../../lib/utils";

interface ResponseStreamProps {
  textStream: string;
  className?: string;
  speed?: number;
  characterChunkSize?: number;
  as?: keyof React.JSX.IntrinsicElements;
}

export function ResponseStream({
  textStream,
  className,
  speed = 28,
  characterChunkSize = 2,
  as = "span",
}: ResponseStreamProps) {
  const [displayedText, setDisplayedText] = useState("");

  const frameDelay = useMemo(() => {
    const normalizedSpeed = Math.min(100, Math.max(1, speed));
    return Math.max(8, Math.round(120 / Math.sqrt(normalizedSpeed)));
  }, [speed]);

  useEffect(() => {
    setDisplayedText("");
    if (!textStream) return;

    let currentIndex = 0;
    const interval = window.setInterval(() => {
      currentIndex = Math.min(currentIndex + characterChunkSize, textStream.length);
      setDisplayedText(textStream.slice(0, currentIndex));

      if (currentIndex >= textStream.length) {
        window.clearInterval(interval);
      }
    }, frameDelay);

    return () => window.clearInterval(interval);
  }, [characterChunkSize, frameDelay, textStream]);

  const Component = as;

  return (
    <Component className={cn("whitespace-pre-wrap", className)}>
      {displayedText}
      {displayedText.length < textStream.length ? (
        <span className="ml-px inline-block animate-pulse" aria-hidden="true">
          |
        </span>
      ) : null}
    </Component>
  );
}
