import {
  CaretDoubleLeft,
  CaretDoubleRight,
  ChatCircleDots,
  CheckCircle,
  CircleDashed,
  DeviceMobileCamera,
  Globe,
  InstagramLogo,
  Robot,
  ShoppingBag,
  TiktokLogo,
  User,
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
                  <div className="ml-7 flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground">
                    {message.toolCalls?.some((toolCall) => toolCall.state === "running") ? (
                      <CircleDashed className="size-3 animate-spin text-accent" />
                    ) : (
                      <CheckCircle className="size-3 text-green-600" weight="fill" />
                    )}
                    <span>{stepLabel[message.step]}</span>
                  </div>
                ) : null}
                <div className="flex items-start gap-2">
                  <div
                    className={cn(
                      "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full text-[10px]",
                      message.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : message.role === "system"
                          ? "bg-muted text-muted-foreground"
                          : "bg-accent text-accent-foreground"
                    )}
                  >
                    {message.role === "user" ? (
                      <User className="size-3" weight="bold" />
                    ) : (
                      <Robot className="size-3" />
                    )}
                  </div>
                  <p className="min-w-0 text-xs leading-relaxed text-foreground/80">
                    {message.content}
                  </p>
                </div>
                {message.thinkingText ? (
                  <div className="ml-7 rounded-md border bg-secondary/40 px-2.5 py-2">
                    <ThinkingBar text={message.thinkingText} />
                  </div>
                ) : null}
                {message.toolCalls && message.toolCalls.length > 0 ? (
                  <div className="ml-7 space-y-1.5">
                    {message.toolCalls.map((toolCall) => (
                      <SimulatedToolCall key={toolCall.id} toolCall={toolCall} />
                    ))}
                  </div>
                ) : null}
                {message.badges && message.badges.length > 0 && (
                  <div className="ml-7 flex flex-wrap gap-1">
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
