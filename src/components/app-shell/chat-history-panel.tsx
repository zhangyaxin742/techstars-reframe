"use client";

import {
  ArrowUp,
  CaretDown,
  CaretUpDown,
  ChatCircleDots,
  CircleDashed,
  DeviceMobileCamera,
  Globe,
  InstagramLogo,
  Microphone,
  Paperclip,
  ShoppingBag,
  TiktokLogo,
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
  "phone-camera": DeviceMobileCamera,
  upload: Globe,
};

const stepLabel: Record<NonNullable<ChatMessage["step"]>, string> = {
  "source-intake": "1. Paste Brand Sources",
  "media-connect": "2. Connect Media",
  analysis: "3. Analyze Brand",
  "recipes-ready": "3. Brand Context + Recipes",
  "recipe-selected": "4. Pick a Trend Recipe",
  "timeline-ready": "5. Timeline Auto-Fills",
  "export-ready": "6. Swap, Preview, Export",
};

interface ChatHistoryPanelProps {
  messages: ChatMessage[];
  promptValue?: string;
  promptBusy?: boolean;
  promptPlaceholder?: string;
  promptSourceImageUrl?: string;
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
    <div
      data-testid="chat-history-panel"
      className={cn("fixed right-4 top-4 z-50 flex w-72 flex-col items-stretch gap-2 lg:w-80", className)}
    >
      {/* Pill toggle */}
      <motion.button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Collapse chat history" : "Expand chat history"}
        aria-expanded={open}
        className={cn(
          "flex items-center gap-2 self-end rounded-full border bg-card px-4 py-2 shadow-lg transition-shadow hover:shadow-xl",
          isActive && "border-accent/40"
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
          "flex flex-col overflow-hidden rounded-2xl border bg-card shadow-xl",
          open ? "pointer-events-auto" : "pointer-events-none select-none"
        )}
        style={{ maxHeight: "calc(100dvh - 5rem)" }}
      >
            {/* Header */}
            <div className="flex h-10 shrink-0 items-center justify-between border-b px-3">
              <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                {isActive ? (
                  <CircleDashed className="size-3 animate-spin text-accent" />
                ) : (
                  <ChatCircleDots className="size-3.5" />
                )}
                Chat History
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex size-6 items-center justify-center rounded text-muted-foreground transition hover:bg-secondary hover:text-foreground"
                aria-label="Collapse chat history"
              >
                <CaretDown className="size-3.5" />
              </button>
            </div>

            {/* Messages */}
            <ChatContainerRoot className="scrollbar-hover-visible min-h-0 flex-1 px-3 py-3">
              <ChatContainerContent className="space-y-3">
                {messages.map((message, index) => {
                  const previousStep = messages[index - 1]?.step;
                  const showStepLabel = message.step && message.step !== previousStep;

                  return (
                    <div key={message.id} className="space-y-1.5">
                      {showStepLabel && message.step ? (
                        <div className="flex items-center gap-2 py-1 text-[10px] font-medium text-muted-foreground">
                          <span className="h-px flex-1 bg-border" aria-hidden="true" />
                          <span>{stepLabel[message.step]}</span>
                          <span className="h-px flex-1 bg-border" aria-hidden="true" />
                        </div>
                      ) : null}
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
                                className="inline-flex items-center gap-1 rounded-full border border-border bg-secondary px-2 py-0.5 text-[10px] font-medium text-muted-foreground"
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
                <div className="flex flex-col rounded-xl border bg-secondary/40">
                  {promptSourceImageUrl && (
                    <div className="px-3 pt-2.5">
                      <img
                        src={promptSourceImageUrl}
                        alt="Selected asset"
                        className="size-10 rounded-lg border object-cover"
                      />
                    </div>
                  )}

                  {/* Textarea */}
                  <div className="px-3 pt-2.5">
                    <textarea
                      ref={textareaRef}
                      value={promptValue}
                      rows={2}
                      disabled={promptBusy}
                      placeholder={promptPlaceholder}
                      className="max-h-[3rem] w-full resize-none bg-transparent text-xs leading-relaxed text-foreground outline-none placeholder:text-muted-foreground disabled:opacity-40"
                      onChange={(e) => onPromptChange?.(e.target.value)}
                      onKeyDown={(e) => {
                        if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                          e.preventDefault();
                          handleSubmit();
                        }
                      }}
                    />
                  </div>

                  {/* Toolbar */}
                  <div className="flex items-center justify-between px-2 pb-2 pt-1">
                    {/* Left: attachment + model selector */}
                    <div className="flex items-center gap-0.5">
                      <button
                        type="button"
                        aria-label="Attach media"
                        className="flex size-7 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-secondary hover:text-foreground"
                      >
                        <Paperclip className="size-3.5" />
                      </button>
                      <button
                        type="button"
                        aria-label="Select model"
                        className="flex h-7 items-center gap-1 rounded-lg px-2 text-muted-foreground transition hover:bg-secondary hover:text-foreground"
                      >
                        <span className="text-[10px] font-medium">Auto</span>
                        <CaretUpDown className="size-2.5" />
                      </button>
                    </div>

                    {/* Right: microphone + send */}
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        aria-label="Voice input"
                        className="flex size-7 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-secondary hover:text-foreground"
                      >
                        <Microphone className="size-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={!canSubmit}
                        aria-label="Send"
                        className={cn(
                          "flex size-7 items-center justify-center rounded-lg transition",
                          canSubmit
                            ? "bg-neutral-800 text-white hover:bg-neutral-700 dark:bg-neutral-200 dark:text-neutral-900 dark:hover:bg-neutral-300"
                            : "text-muted-foreground opacity-40"
                        )}
                      >
                        {promptBusy ? (
                          <span className="size-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                        ) : (
                          <ArrowUp className="size-3.5" weight="bold" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
      </motion.div>
    </div>
  );
}
