"use client";

import {
  ArrowUp,
  Cloud,
  CloudArrowUp,
  CaretLeft,
  CaretRight,
  DeviceMobileCamera,
  Globe,
  GoogleDriveLogo,
  ImageSquare,
  InstagramLogo,
  Plus,
  ShoppingBag,
  TiktokLogo,
  VideoCamera,
  YoutubeLogo,
} from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/src/components/ui/dropdown-menu";
import type {
  MediaImportOption,
  SourceBadge,
  SourcePlatform,
} from "@/src/data/reframe-demo";
import { brandContext } from "@/src/data/reframe-demo";

const platformIcons: Record<SourcePlatform, React.ElementType> = {
  website: Globe,
  instagram: InstagramLogo,
  tiktok: TiktokLogo,
  youtube: YoutubeLogo,
  shopify: ShoppingBag,
  "google-drive": GoogleDriveLogo,
  icloud: Cloud,
  "image-library": ImageSquare,
  "video-library": VideoCamera,
  "phone-camera": DeviceMobileCamera,
  upload: CloudArrowUp,
};

const platformColors: Record<SourcePlatform, string> = {
  website: "border-blue-500/20 bg-blue-500/10 text-blue-200",
  instagram: "border-pink-500/20 bg-pink-500/10 text-pink-200",
  tiktok: "border-cyan-500/20 bg-cyan-500/10 text-cyan-200",
  youtube: "border-red-500/20 bg-red-500/10 text-red-200",
  shopify: "border-green-500/20 bg-green-500/10 text-green-200",
  "google-drive": "border-yellow-500/20 bg-yellow-500/10 text-yellow-100",
  icloud: "border-slate-300/20 bg-slate-300/10 text-slate-100",
  "image-library": "border-orange-500/20 bg-orange-500/10 text-orange-100",
  "video-library": "border-emerald-500/20 bg-emerald-500/10 text-emerald-100",
  "phone-camera": "border-amber-500/20 bg-amber-500/10 text-amber-100",
  upload: "border-white/20 bg-white/10 text-cream",
};

const landingMediaImportOptions: MediaImportOption[] = [
  { id: "imp-upload", platform: "upload", label: "Upload Files", description: "Photos, videos, logos", icon: "upload" },
  { id: "imp-gdrive", platform: "google-drive", label: "Google Drive", description: "Connect your Drive folder", icon: "google-drive" },
  { id: "imp-icloud", platform: "icloud", label: "iCloud Drive", description: "Pull media from iCloud folders", icon: "icloud" },
  { id: "imp-shopify", platform: "shopify", label: "Shopify / Website", description: "Pull product images", icon: "shopify" },
  { id: "imp-ig", platform: "instagram", label: "Instagram", description: "Import posts & reels", icon: "instagram" },
  { id: "imp-tt", platform: "tiktok", label: "TikTok", description: "Import existing videos", icon: "tiktok" },
  { id: "imp-yt", platform: "youtube", label: "YouTube", description: "Import shorts & clips", icon: "youtube" },
];

const landingLinkOptions = landingMediaImportOptions.filter((option) =>
  ["shopify", "instagram", "tiktok", "youtube"].includes(option.platform)
);

const landingUploadOptions = landingMediaImportOptions.filter((option) =>
  ["upload", "image-library", "video-library", "google-drive", "icloud"].includes(option.platform)
);

const rotatingPlaceholders = [
  "I built a budgeting app but nobody outside tech knows it exists...",
  "Help me find customers for my flower shop in Boston!",
  "Who actually buys handmade ceramics and where do they hang out?",
  "I launched a Notion template and got 3 sales. What am I doing wrong?",
  "My SaaS has 200 users but zero organic growth :(",
];

interface LandingIntakeChatProps {
  className?: string;
}

export function LandingIntakeChat({ className }: LandingIntakeChatProps) {
  const router = useRouter();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [inputValue, setInputValue] = useState("");
  const [sources, setSources] = useState<SourceBadge[]>([]);
  const [queuedImports, setQueuedImports] = useState<SourceBadge[]>([]);
  const [selectedMediaSources, setSelectedMediaSources] = useState<Set<string>>(new Set());
  const [phase, setPhase] = useState<"input" | "sources">("input");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [isImportMenuOpen, setIsImportMenuOpen] = useState(false);
  const [importMenuView, setImportMenuView] = useState<"root" | "link" | "upload">("root");

  useEffect(() => {
    if (inputValue.trim()) return;

    const intervalId = window.setInterval(() => {
      setPlaceholderIndex((current) => (current + 1) % rotatingPlaceholders.length);
    }, 3200);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [inputValue]);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.style.height = "0px";
    textarea.style.height = `${textarea.scrollHeight}px`;
  }, [inputValue]);

  const queueImport = useCallback((option: MediaImportOption) => {
    setQueuedImports((prev) => {
      if (prev.some((item) => item.id === option.id)) {
        return prev;
      }

      return [
        ...prev,
        {
          id: option.id,
          platform: option.platform,
          label: option.label,
        },
      ];
    });

    setSelectedMediaSources((prev) => {
      if (prev.has(option.id)) {
        return prev;
      }

      const next = new Set(prev);
      next.add(option.id);
      return next;
    });
  }, []);

  const handlePaste = useCallback(() => {
    setSources((prev) => (prev.length > 0 ? prev : brandContext.sources));
  }, []);

  const handleInputSubmit = useCallback(() => {
    const hasInput = inputValue.trim().length > 0;
    const hasQueuedImports = queuedImports.length > 0;
    const hasSources = sources.length > 0;

    if (!hasInput && !hasQueuedImports && !hasSources) {
      return;
    }

    if (!hasSources) {
      setSources(brandContext.sources);
    }

    setPhase("sources");
  }, [inputValue, queuedImports.length, sources.length]);

  const handleFinalSubmit = useCallback(() => {
    setIsSubmitting(true);
    setTimeout(() => {
      router.push("/app");
    }, 600);
  }, [router]);

  const handleImportMenuOpenChange = useCallback((open: boolean) => {
    setIsImportMenuOpen(open);
    if (!open) {
      setImportMenuView("root");
    }
  }, []);

  const handleQueueImport = useCallback((option: MediaImportOption) => {
    queueImport(option);
    setIsImportMenuOpen(false);
    setImportMenuView("root");
  }, [queueImport]);

  const canSubmit = inputValue.trim().length > 0 || queuedImports.length > 0 || sources.length > 0;

  return (
    <div className={className} data-testid="landing-intake-chat">
      <div className="mx-auto w-full max-w-lg">
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

        {phase === "input" && (
          <div className="relative overflow-hidden rounded-[1.75rem] border border-white/15 bg-[rgba(26,22,14,0.8)] shadow-[0_20px_60px_rgba(0,0,0,0.35)] backdrop-blur-xl">
            <div className="flex min-h-[128px] flex-col px-4 py-4 sm:min-h-[136px] sm:px-5 sm:py-5">
              {queuedImports.length > 0 && (
                <div className="mb-3 flex flex-wrap gap-2" data-testid="queued-imports">
                  {queuedImports.map((source) => {
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

              <textarea
                data-testid="intake-input"
                ref={textareaRef}
                rows={1}
                value={inputValue}
                onChange={(event) => setInputValue(event.target.value)}
                onPaste={handlePaste}
                placeholder={rotatingPlaceholders[placeholderIndex]}
                className="min-h-[3.75rem] w-full resize-none overflow-hidden bg-transparent text-sm leading-relaxed text-cream outline-none placeholder:text-cream/35 sm:text-[0.95rem]"
                onKeyDown={(event) => {
                  if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
                    event.preventDefault();
                    handleInputSubmit();
                  }
                }}
              />

              <div className="mt-4 flex items-center gap-3">
                <DropdownMenu open={isImportMenuOpen} onOpenChange={handleImportMenuOpenChange}>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      aria-label="Add import source"
                      aria-pressed={isImportMenuOpen}
                      className={`flex size-8 shrink-0 items-center justify-center rounded-full text-cream/72 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/50 ${
                        isImportMenuOpen
                          ? "bg-gold/12 text-gold ring-1 ring-gold/35"
                          : "hover:bg-white/8 hover:text-gold"
                      }`}
                    >
                      <Plus className="size-5" weight="bold" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="start"
                    className="w-[16rem] rounded-2xl border border-white/10 bg-[rgba(18,14,9,0.96)] p-2 text-cream shadow-[0_24px_70px_rgba(0,0,0,0.42)] backdrop-blur-2xl"
                  >
                    <div className="space-y-1">
                      {importMenuView === "root" ? (
                        <>
                          <DropdownMenuItem
                            onSelect={(event) => {
                              event.preventDefault();
                              setImportMenuView("link");
                            }}
                            className="cursor-pointer rounded-xl px-3 py-2.5 text-cream/80 focus:bg-white/10 focus:text-cream"
                          >
                            <Globe className="size-4 shrink-0" weight="fill" />
                            <div className="min-w-0 flex-1">
                              <div className="truncate text-sm font-medium">Link</div>
                              <div className="truncate text-[11px] text-cream/45">Website and social profiles</div>
                            </div>
                            <CaretRight className="size-3.5 shrink-0 text-cream/45" weight="bold" />
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onSelect={(event) => {
                              event.preventDefault();
                              setImportMenuView("upload");
                            }}
                            className="cursor-pointer rounded-xl px-3 py-2.5 text-cream/80 focus:bg-white/10 focus:text-cream"
                          >
                            <CloudArrowUp className="size-4 shrink-0" weight="fill" />
                            <div className="min-w-0 flex-1">
                              <div className="truncate text-sm font-medium">Upload</div>
                              <div className="truncate text-[11px] text-cream/45">Files, libraries, and cloud drives</div>
                            </div>
                            <CaretRight className="size-3.5 shrink-0 text-cream/45" weight="bold" />
                          </DropdownMenuItem>
                        </>
                      ) : (
                        <>
                          <DropdownMenuItem
                            onSelect={(event) => {
                              event.preventDefault();
                              setImportMenuView("root");
                            }}
                            className="mb-1 cursor-pointer rounded-xl px-3 py-2 text-cream/70 focus:bg-white/10 focus:text-cream"
                          >
                            <CaretLeft className="size-3.5 shrink-0" weight="bold" />
                            <span className="text-sm font-medium">Back</span>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator className="my-2 h-px bg-white/10" />
                          {(importMenuView === "link" ? landingLinkOptions : landingUploadOptions).map((option) => {
                            const Icon = platformIcons[option.platform];
                            return (
                              <DropdownMenuItem
                                key={option.id}
                                onSelect={() => handleQueueImport(option)}
                                className="cursor-pointer rounded-xl px-3 py-2.5 text-cream/80 focus:bg-white/10 focus:text-cream"
                              >
                                <Icon className="size-4 shrink-0" weight="fill" />
                                <div className="min-w-0">
                                  <div className="truncate text-sm font-medium">{option.label}</div>
                                  <div className="truncate text-[11px] text-cream/45">{option.description}</div>
                                </div>
                              </DropdownMenuItem>
                            );
                          })}
                        </>
                      )}
                    </div>
                  </DropdownMenuContent>
                </DropdownMenu>

                <p className="min-w-0 flex-1 text-left text-[11px] text-cream/40">
                  Paste links or describe your brand
                </p>

                <button
                  type="button"
                  onClick={handleInputSubmit}
                  disabled={!canSubmit}
                  className="flex size-10 shrink-0 items-center justify-center rounded-full bg-cream text-ink transition hover:bg-gold disabled:opacity-30"
                  aria-label="Submit"
                >
                  <ArrowUp className="size-4" weight="bold" />
                </button>
              </div>
            </div>
          </div>
        )}

        {phase === "sources" && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-white/15 bg-[rgba(26,22,14,0.8)] p-4 shadow-[0_20px_60px_rgba(0,0,0,0.35)] backdrop-blur-xl">
              <p className="text-sm text-cream/80">
                Found <strong className="text-cream">{brandContext.name}</strong> - {brandContext.category}.
                I see product listings, lifestyle photos, and social content.
                {selectedMediaSources.size > 0 ? ` I will also pull from ${selectedMediaSources.size} selected import sources.` : ""}
              </p>
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
