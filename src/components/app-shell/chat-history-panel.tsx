import {
  CaretDoubleLeft,
  CaretDoubleRight,
  ChatCircleDots,
  CheckCircle,
  CircleDashed,
  DeviceMobileCamera,
  Globe,
  InstagramLogo,
  ShoppingBag,
  TiktokLogo,
  YoutubeLogo,
} from "@phosphor-icons/react";
import React, { useState } from "react";
import type { ChatMessage, SourcePlatform } from "../../data/reframe-demo";
import { cn } from "../../lib/utils";
import {
  ChatContainerContent,
  ChatContainerRoot,
  ChatContainerScrollAnchor,
} from "../prompt-kit/chat-container";
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
  className?: string;
}

export function ChatHistoryPanel({ messages, className }: ChatHistoryPanelProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      data-testid="chat-history-panel"
      className={cn(
        "flex h-full shrink-0 flex-col border-r bg-card transition-[width] duration-200 ease-out",
        collapsed ? "w-12" : "w-72 lg:w-80",
        className
      )}
    >
      <div className="flex h-10 items-center justify-between border-b px-3">
        {!collapsed && (
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <ChatCircleDots className="size-3.5" />
            Chat History
          </div>
        )}
        <button
          type="button"
          onClick={() => setCollapsed((value) => !value)}
          className={cn(
            "flex size-6 items-center justify-center rounded text-muted-foreground transition hover:bg-secondary hover:text-foreground",
            collapsed && "mx-auto"
          )}
          aria-label={collapsed ? "Expand chat history" : "Collapse chat history"}
        >
          {collapsed ? (
            <CaretDoubleRight className="size-3.5" />
          ) : (
            <CaretDoubleLeft className="size-3.5" />
          )}
        </button>
      </div>

      {!collapsed && (
        <ChatContainerRoot className="min-h-0 flex-1 px-3 py-3">
          <ChatContainerContent className="space-y-3">
            {messages.map((message) => (
              <div key={message.id} className="space-y-1.5">
                {message.step ? (
                  <div className="flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground">
                    {message.thinkingText ||
                    message.toolCalls?.some((toolCall) => toolCall.state === "running") ? (
                      <CircleDashed className="size-3 animate-spin text-accent" />
                    ) : (
                      <CheckCircle className="size-3 text-green-600" weight="fill" />
                    )}
                    <span>{stepLabel[message.step]}</span>
                  </div>
                ) : null}
                <div
                  className={cn(
                    "flex",
                    message.role === "user" ? "justify-end" : "justify-start"
                  )}
                >
                  {message.role === "assistant" ? (
                    message.content ? (
                      <ResponseStream
                        key={`${message.id}-${message.content}`}
                        textStream={message.content}
                        className="max-w-[92%] text-pretty text-xs leading-relaxed text-foreground/80"
                      />
                    ) : null
                  ) : (
                    <p
                      className={cn(
                        "max-w-[92%] rounded-lg px-3 py-2 text-pretty text-xs leading-relaxed",
                        message.role === "user"
                          ? "bg-foreground text-background shadow-sm"
                          : "bg-secondary text-muted-foreground"
                      )}
                    >
                      {message.content}
                    </p>
                  )}
                </div>
                {message.thinkingText ? (
                  <div className="rounded-md border bg-secondary/40 px-2.5 py-2">
                    <ThinkingBar text={message.thinkingText} />
                  </div>
                ) : null}
                {message.toolCalls && message.toolCalls.length > 0 ? (
                  <div className="space-y-1.5">
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
            ))}
            <ChatContainerScrollAnchor />
          </ChatContainerContent>
        </ChatContainerRoot>
      )}
    </aside>
  );
}
