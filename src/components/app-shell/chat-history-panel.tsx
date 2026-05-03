import {
  CaretDoubleLeft,
  CaretDoubleRight,
  ChatCircleDots,
  Cloud,
  Globe,
  ImageSquare,
  InstagramLogo,
  Robot,
  ShoppingBag,
  TiktokLogo,
  User,
  VideoCamera,
  YoutubeLogo,
} from "@phosphor-icons/react";
import React, { useState } from "react";
import type { ChatMessage, SourcePlatform } from "../../data/reframe-demo";
import { cn } from "../../lib/utils";

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
  upload: Globe,
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
          onClick={() => setCollapsed((v) => !v)}
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
        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
          <div className="space-y-3">
            {messages.map((msg) => (
              <div key={msg.id} className="space-y-1.5">
                <div className="flex items-start gap-2">
                  <div
                    className={cn(
                      "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full text-[10px]",
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : msg.role === "system"
                          ? "bg-muted text-muted-foreground"
                          : "bg-accent text-accent-foreground"
                    )}
                  >
                    {msg.role === "user" ? (
                      <User className="size-3" weight="bold" />
                    ) : msg.role === "system" ? (
                      <Robot className="size-3" />
                    ) : (
                      <Robot className="size-3" />
                    )}
                  </div>
                  <p className="min-w-0 text-xs leading-relaxed text-foreground/80">
                    {msg.content}
                  </p>
                </div>
                {msg.badges && msg.badges.length > 0 && (
                  <div className="ml-7 flex flex-wrap gap-1">
                    {msg.badges.map((badge) => {
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
          </div>
        </div>
      )}
    </aside>
  );
}
