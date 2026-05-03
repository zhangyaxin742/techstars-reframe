"use client";

import {
  ArrowUp,
  CloudArrowUp,
  Globe,
  GoogleDriveLogo,
  InstagramLogo,
  ShoppingBag,
  TiktokLogo,
  YoutubeLogo,
} from "@phosphor-icons/react";
import React, { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import type { SourceBadge, SourcePlatform } from "@/src/data/reframe-demo";
import { brandContext, mediaImportOptions } from "@/src/data/reframe-demo";

const platformIcons: Record<SourcePlatform, React.ElementType> = {
  website: Globe,
  instagram: InstagramLogo,
  tiktok: TiktokLogo,
  youtube: YoutubeLogo,
  shopify: ShoppingBag,
  "google-drive": GoogleDriveLogo,
  upload: CloudArrowUp,
};

const platformColors: Record<SourcePlatform, string> = {
  website: "bg-blue-500/10 text-blue-300 border-blue-500/20",
  instagram: "bg-pink-500/10 text-pink-300 border-pink-500/20",
  tiktok: "bg-cyan-500/10 text-cyan-300 border-cyan-500/20",
  youtube: "bg-red-500/10 text-red-300 border-red-500/20",
  shopify: "bg-green-500/10 text-green-300 border-green-500/20",
  "google-drive": "bg-yellow-500/10 text-yellow-300 border-yellow-500/20",
  upload: "bg-white/10 text-cream border-white/20",
};

interface LandingIntakeChatProps {
  className?: string;
}

export function LandingIntakeChat({ className }: LandingIntakeChatProps) {
  const router = useRouter();
  const [inputValue, setInputValue] = useState("");
  const [sources, setSources] = useState<SourceBadge[]>([]);
  const [selectedMediaSources, setSelectedMediaSources] = useState<Set<string>>(new Set());
  const [phase, setPhase] = useState<"input" | "sources" | "media">("input");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handlePaste = useCallback(() => {
    setSources(brandContext.sources);
    setPhase("sources");
  }, []);

  const handleInputSubmit = useCallback(() => {
    if (inputValue.trim() || sources.length > 0) {
      if (sources.length === 0) {
        setSources(brandContext.sources);
      }
      setPhase("sources");
    }
  }, [inputValue, sources]);

  const handleSourcesContinue = useCallback(() => {
    setPhase("media");
  }, []);

  const toggleMediaSource = useCallback((id: string) => {
    setSelectedMediaSources((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleFinalSubmit = useCallback(() => {
    setIsSubmitting(true);
    setTimeout(() => {
      router.push("/app");
    }, 600);
  }, [router]);

  return (
    <div className={className} data-testid="landing-intake-chat">
      <div className="mx-auto w-full max-w-lg">
        {/* Source badges */}
        {sources.length > 0 && (
          <div className="mb-4 flex flex-wrap justify-center gap-2" data-testid="source-badges">
            {sources.map((source) => {
              const Icon = platformIcons[source.platform];
              return (
                <span
                  key={source.id}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium ${platformColors[source.platform]}`}
                >
                  <Icon className="size-3.5" weight="fill" />
                  {source.label}
                </span>
              );
            })}
          </div>
        )}

        {/* Chat input */}
        {phase === "input" && (
          <div className="relative overflow-hidden rounded-2xl border border-white/15 bg-[rgba(26,22,14,0.8)] shadow-[0_20px_60px_rgba(0,0,0,0.35)] backdrop-blur-xl">
            <div className="px-4 py-3">
              <textarea
                data-testid="intake-input"
                rows={2}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onPaste={handlePaste}
                placeholder="Paste your website or social links..."
                className="w-full resize-none bg-transparent text-sm leading-relaxed text-cream outline-none placeholder:text-cream/35"
                onKeyDown={(e) => {
                  if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                    e.preventDefault();
                    handleInputSubmit();
                  }
                }}
              />
            </div>
            <div className="flex items-center justify-between border-t border-white/8 px-3 py-2">
              <p className="text-[11px] text-cream/40">
                Paste links or describe your brand
              </p>
              <button
                type="button"
                onClick={handleInputSubmit}
                disabled={!inputValue.trim() && sources.length === 0}
                className="flex size-8 items-center justify-center rounded-full bg-cream text-ink transition hover:bg-gold disabled:opacity-30"
                aria-label="Submit"
              >
                <ArrowUp className="size-4" weight="bold" />
              </button>
            </div>
          </div>
        )}

        {/* Sources confirmed view */}
        {phase === "sources" && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-white/15 bg-[rgba(26,22,14,0.8)] p-4 shadow-[0_20px_60px_rgba(0,0,0,0.35)] backdrop-blur-xl">
              <p className="text-sm text-cream/80">
                Found <strong className="text-cream">{brandContext.name}</strong> - {brandContext.category}.
                I see product listings, lifestyle photos, and social content.
              </p>
            </div>
            <button
              type="button"
              onClick={handleSourcesContinue}
              className="inline-flex w-full items-center justify-center rounded-xl bg-cream px-4 py-3 text-sm font-medium text-ink transition hover:bg-gold hover:text-cream"
            >
              Connect media sources -&gt;
            </button>
          </div>
        )}

        {/* Media source selection */}
        {phase === "media" && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-white/15 bg-[rgba(26,22,14,0.8)] p-4 shadow-[0_20px_60px_rgba(0,0,0,0.35)] backdrop-blur-xl">
              <p className="mb-3 text-xs uppercase tracking-wide text-gold">
                Connect your media
              </p>
              <div className="grid grid-cols-2 gap-2" data-testid="media-options">
                {mediaImportOptions.map((option) => {
                  const Icon = platformIcons[option.platform];
                  const isSelected = selectedMediaSources.has(option.id);
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => toggleMediaSource(option.id)}
                      className={`flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left text-xs transition ${
                        isSelected
                          ? "border-gold/50 bg-gold/10 text-cream"
                          : "border-white/10 bg-white/5 text-cream/70 hover:border-white/20 hover:text-cream"
                      }`}
                    >
                      <Icon className="size-4 shrink-0" weight={isSelected ? "fill" : "regular"} />
                      <div className="min-w-0">
                        <div className="truncate font-medium">{option.label}</div>
                        <div className="truncate text-[10px] text-cream/40">{option.description}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
            <button
              type="button"
              onClick={handleFinalSubmit}
              disabled={isSubmitting}
              className="inline-flex w-full items-center justify-center rounded-xl bg-cream px-4 py-3 text-sm font-medium text-ink transition hover:bg-gold hover:text-cream disabled:opacity-70"
            >
              {isSubmitting ? (
                <>
                  <span className="mr-2 size-4 animate-spin rounded-full border-2 border-ink border-t-transparent" />
                  Analyzing your brand...
                </>
              ) : (
                "Start building ->"
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
