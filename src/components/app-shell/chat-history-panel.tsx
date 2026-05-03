"use client";

import {
  ArrowRight,
  CaretDown,
  CaretUpDown,
  ChatCircleDots,
  CircleDashed,
  Cloud,
  DeviceMobileCamera,
  Globe,
  ImageSquare,
  InstagramLogo,
  Microphone,
  Plus,
  ShoppingBag,
  TiktokLogo,
  VideoCamera,
  YoutubeLogo,
} from "@phosphor-icons/react";
import { motion } from "framer-motion";
import React, { useEffect, useRef, useState } from "react";
import type { ChatMessage, SourcePlatform } from "../../data/reframe-demo";
import { cn } from "../../lib/utils";
import {
  ChatContainerContent,
  ChatContainerRoot,
  ChatContainerScrollAnchor,
} from "../prompt-kit/chat-container";
import { Message, MessageContent } from "../prompt-kit/message";
import { ResponseStream } from "../prompt-kit/response-stream";
import { SimulatedToolCall } from "../prompt-kit/simulated-tool-call";
import { ThinkingBar } from "../prompt-kit/thinking-bar";

const platformIcon: Record<SourcePlatform, React.ElementType> = {
  website: Globe,
  instagram: InstagramLogo,
  tiktok: TiktokLogo,
  youtube: YoutubeLogo,
  shopify: ShoppingBag,
  "google-drive": Globe,
  icloud: Cloud,
  "image-library": ImageSquare,
  "video-library": VideoCamera,
  "phone-camera": DeviceMobileCamera,
  upload: Globe,
};

const stepLabel: Record<NonNullable<ChatMessage["step"]>, string> = {
  "source-intake": "Intake",
  "media-connect": "Media",
  analysis: "Building Brand Context",
  "brand-context-ready": "Brand Context Created",
  "trend-search": "Searching Trends",
  "recipes-ready": "Trend Recipes Ready",
  "recipe-selected": "Recipe Selected",
  "timeline-ready": "Timeline Ready",
  "export-ready": "Export Ready",
};

const EASE = [0.22, 1, 0.36, 1] as const;
const transition = { duration: 0.2, ease: EASE };

interface ChatHistoryPanelProps {
  messages: ChatMessage[];
  promptValue?: string;
  promptBusy?: boolean;
  promptPlaceholder?: string;
  promptSourceImageUrl?: string;
  chromeHidden?: boolean;
  onPromptChange?: (value: string) => void;
  onPromptSubmit?: (value: string) => void;
  className?: string;
}

export function ChatHistoryPanel({
  messages,
  promptValue = "",
  promptBusy = false,
  promptPlaceholder = "Ask Reframe anything...",
  promptSourceImageUrl,
  chromeHidden = false,
  onPromptChange,
  onPromptSubmit,
  className,
}: ChatHistoryPanelProps) {
  const [open, setOpen] = useState(true);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const steppedMessages = messages.filter(
    (m): m is ChatMessage & { step: NonNullable<ChatMessage["step"]> } => !!m.step
  );
  const latestStep =
    steppedMessages.length > 0 ? steppedMessages[steppedMessages.length - 1].step : undefined;
  const label = latestStep ? stepLabel[latestStep] : "Chat History";
  const isActive = messages.some(
    (m) => m.thinkingText || m.toolCalls?.some((tc) => tc.state === "running")
  );

  const trimmedValue = promptValue.trim();
  const canSubmit = !promptBusy && trimmedValue.length > 0 && Boolean(onPromptSubmit);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 48)}px`;
  }, [promptValue]);

  const handleSubmit = () => {
    if (!canSubmit) return;
    onPromptSubmit?.(trimmedValue);
  };

  return (
    <motion.div
      data-testid="chat-history-panel"
      data-chrome-hidden={chromeHidden ? "true" : "false"}
      aria-hidden={chromeHidden}
      inert={chromeHidden ? true : undefined}
      initial={false}
      animate={{
        opacity: chromeHidden ? 0 : 1,
        x: chromeHidden ? 10 : 0,
      }}
      transition={transition}
      className={cn(
        "fixed right-4 top-4 z-50 flex w-72 flex-col items-stretch gap-2 lg:w-80",
        chromeHidden ? "pointer-events-none select-none" : "pointer-events-auto",
        className
      )}
    >
      {/* Pill toggle */}
      <motion.button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Collapse chat history" : "Expand chat history"}
        aria-expanded={open}
        className={cn(
          "flex items-center gap-2 self-end rounded-full border border-border bg-card px-4 py-2 shadow-[rgba(0,0,0,0.15)_0px_2px_6px_0px] transition-shadow hover:shadow-[rgba(0,0,0,0.2)_0px_4px_12px_0px]",
          isActive && "border-accent/60"
        )}
        whileTap={{ scale: 0.96 }}
      >
        {isActive ? (
          <CircleDashed className="size-4 animate-spin text-accent" />
        ) : (
          <ChatCircleDots
            className="size-4 text-muted-foreground"
            weight={open ? "fill" : "regular"}
          />
        )}
        <span className="max-w-[140px] truncate text-xs font-medium text-foreground/80">
          {label}
        </span>
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.15 }}
          className="text-muted-foreground"
        >
          <CaretDown className="size-3" />
        </motion.span>
      </motion.button>

      <motion.div
        key="chat-card"
        initial={false}
        animate={{
          opacity: open ? 1 : 0,
          y: open ? 0 : -8,
          scale: open ? 1 : 0.97,
        }}
        transition={{ duration: 0.18, ease: [0.25, 0.1, 0.25, 1] }}
        aria-hidden={!open}
        inert={open ? undefined : true}
        className={cn(
          "paper flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-[rgba(0,0,0,0.08)_0px_1px_1px_0px,rgba(0,0,0,0.08)_0px_4px_5px_0px]",
          open ? "pointer-events-auto" : "pointer-events-none select-none"
        )}
        style={{ maxHeight: "calc(100dvh - 5rem)" }}
      >
            {/* Messages */}
            <ChatContainerRoot className="scrollbar-hover-visible min-h-0 flex-1 px-3 py-3">
              <ChatContainerContent className="space-y-3">
                {messages.map((message) => {
                  return (
                    <div key={message.id} className="space-y-1.5">
                      <Message role={message.role}>
                      {message.role === "assistant" ? (
                        message.content ? (
                          <MessageContent role="assistant">
                            <ResponseStream
                              key={`${message.id}-${message.content}`}
                              textStream={message.content}
                            />
                          </MessageContent>
                        ) : null
                      ) : (
                        <MessageContent role={message.role}>
                          {message.content}
                        </MessageContent>
                      )}
                      </Message>
                      {message.thinkingText ? (
                        <div className="px-1 py-0.5">
                          <ThinkingBar text={message.thinkingText} />
                        </div>
                      ) : null}
                      {message.toolCalls && message.toolCalls.length > 0 ? (
                        <div className="space-y-1 px-1 py-0.5">
                          {message.toolCalls.map((toolCall) => (
                            <SimulatedToolCall key={toolCall.id} toolCall={toolCall} />
                          ))}
                        </div>
                      ) : null}
                      {message.badges && message.badges.length > 0 && (
                        <div className="flex flex-wrap justify-end gap-1">
                          {message.badges.map((badge) => {
                            const Icon = platformIcon[badge.platform];
                            return (
                              <span
                                key={badge.id}
                                className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-2 py-0.5 text-[10px] font-medium text-foreground"
                              >
                                <Icon className="size-2.5" weight="fill" />
                                {badge.label}
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
                <ChatContainerScrollAnchor />
              </ChatContainerContent>
            </ChatContainerRoot>

            {/* Input area */}
            {onPromptSubmit || onPromptChange ? (
              <div className="shrink-0 border-t p-2">
                <div className="flex items-center gap-2 rounded-xl border border-border bg-background px-2 py-1.5 shadow-[rgba(0,0,0,0.05)_0px_1px_8px_0px]">
                  <button
                    type="button"
                    aria-label="Add"
                    className="flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-secondary hover:text-foreground"
                  >
                    <Plus className="size-4" weight="bold" />
                  </button>

                  <div className="min-w-0 flex-1">
                  {promptSourceImageUrl && (
                    <div className="pb-1 pl-1">
                      <img
                        src={promptSourceImageUrl}
                        alt="Selected asset"
                        className="size-10 rounded-lg border object-cover"
                      />
                    </div>
                  )}

                    <textarea
                      ref={textareaRef}
                      value={promptValue}
                      rows={1}
                      disabled={promptBusy}
                      placeholder={promptPlaceholder}
                      className="max-h-10 min-h-[2rem] w-full resize-none bg-transparent py-1 text-xs leading-5 text-foreground outline-none placeholder:text-muted-foreground disabled:opacity-40"
                      onChange={(e) => onPromptChange?.(e.target.value)}
                      onKeyDown={(e) => {
                        if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                          e.preventDefault();
                          handleSubmit();
                        }
                      }}
                    />
                  </div>

                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      aria-label="Select model"
                      className="flex h-8 items-center gap-1 rounded-lg px-2 text-muted-foreground transition hover:bg-secondary hover:text-foreground"
                    >
                      <span className="text-[10px] font-medium">Auto</span>
                      <CaretUpDown className="size-2.5" />
                    </button>
                    <button
                      type="button"
                      aria-label="Voice input"
                      className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-secondary hover:text-foreground"
                    >
                      <Microphone className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={handleSubmit}
                      disabled={!canSubmit}
                      aria-label="Send"
                      className={cn(
                        "flex size-8 items-center justify-center rounded-lg transition",
                        canSubmit
                          ? "bg-primary text-primary-foreground hover:bg-primary/90"
                          : "text-muted-foreground opacity-40"
                      )}
                    >
                      {promptBusy ? (
                        <span className="size-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      ) : (
                        <ArrowRight className="size-3.5" weight="bold" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ) : null}
      </motion.div>
    </motion.div>
  );
}
