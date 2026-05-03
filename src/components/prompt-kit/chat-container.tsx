"use client";

import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { cn } from "../../lib/utils";

type ChatContainerContextValue = {
  isAtBottom: boolean;
  scrollToBottom: () => void;
};

const ChatContainerContext = createContext<ChatContainerContextValue | null>(null);

export type ChatContainerRootProps = {
  children: React.ReactNode;
  className?: string;
} & React.HTMLAttributes<HTMLDivElement>;

export type ChatContainerContentProps = {
  children: React.ReactNode;
  className?: string;
} & React.HTMLAttributes<HTMLDivElement>;

export type ChatContainerScrollAnchorProps = {
  className?: string;
} & React.HTMLAttributes<HTMLDivElement>;

export function useChatContainer() {
  const context = useContext(ChatContainerContext);
  if (!context) {
    throw new Error("useChatContainer must be used within ChatContainerRoot");
  }
  return context;
}

export function ChatContainerRoot({
  children,
  className,
  ...props
}: ChatContainerRootProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);

  const scrollToBottom = () => {
    const element = rootRef.current;
    if (!element) return;
    if (typeof element.scrollTo !== "function") {
      element.scrollTop = element.scrollHeight;
      return;
    }
    element.scrollTo({ top: element.scrollHeight, behavior: "smooth" });
  };

  useEffect(() => {
    const element = rootRef.current;
    if (!element) return;

    const updateBottomState = () => {
      const distance = element.scrollHeight - element.scrollTop - element.clientHeight;
      setIsAtBottom(distance < 24);
    };

    updateBottomState();
    element.addEventListener("scroll", updateBottomState);
    return () => element.removeEventListener("scroll", updateBottomState);
  }, []);

  useEffect(() => {
    if (!isAtBottom) return;
    scrollToBottom();
  });

  return (
    <ChatContainerContext.Provider value={{ isAtBottom, scrollToBottom }}>
      <div
        ref={rootRef}
        role="log"
        className={cn("flex min-h-0 overflow-y-auto", className)}
        {...props}
      >
        {children}
      </div>
    </ChatContainerContext.Provider>
  );
}

export function ChatContainerContent({
  children,
  className,
  ...props
}: ChatContainerContentProps) {
  return (
    <div className={cn("flex w-full flex-col", className)} {...props}>
      {children}
    </div>
  );
}

export function ChatContainerScrollAnchor({
  className,
  ...props
}: ChatContainerScrollAnchorProps) {
  return (
    <div
      className={cn("h-px w-full shrink-0 scroll-mt-4", className)}
      aria-hidden="true"
      {...props}
    />
  );
}
