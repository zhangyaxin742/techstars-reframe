import type { CanvasConnection, CanvasNode } from "../components/infinite-canvas";
import { trendVideos } from "./trending-videos";

// ---------------------------------------------------------------------------
// Brand / Source types
// ---------------------------------------------------------------------------

export type SourcePlatform =
  | "website"
  | "instagram"
  | "tiktok"
  | "youtube"
  | "shopify"
  | "google-drive"
  | "icloud"
  | "image-library"
  | "video-library"
  | "phone-camera"
  | "upload";

export interface SourceBadge {
  id: string;
  platform: SourcePlatform;
  label: string;
  url?: string;
}

export interface MediaImportOption {
  id: string;
  platform: SourcePlatform;
  label: string;
  description: string;
  icon: SourcePlatform;
}

// ---------------------------------------------------------------------------
// Chat history
// ---------------------------------------------------------------------------

export type ChatRole = "user" | "assistant" | "system";

export type AiFlowStep =
  | "source-intake"
  | "media-connect"
  | "analysis"
  | "brand-context-ready"
  | "trend-search"
  | "recipes-ready"
  | "recipe-selected"
  | "timeline-ready"
  | "export-ready";

export interface SimulatedToolCall {
  id: string;
  name: string;
  label: string;
  state: "pending" | "running" | "completed" | "error";
  input?: Record<string, unknown>;
  output?: string;
  durationMs?: number;
}

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  timestamp: number;
  badges?: SourceBadge[];
  step?: AiFlowStep;
  toolCalls?: SimulatedToolCall[];
  thinkingText?: string;
}

// ---------------------------------------------------------------------------
// Media assets
// ---------------------------------------------------------------------------

export interface MediaAsset {
  id: string;
  label: string;
  thumbnail: string;
  tags: string[];
  shotType: string;
  trendFit: string;
  matchReason: string;
  duration?: number;
}

// ---------------------------------------------------------------------------
// Timeline
// ---------------------------------------------------------------------------

export type TimelineSegmentKind = "clip" | "missing" | "text-overlay" | "audio";

export interface TimelineSegment {
  id: string;
  kind: TimelineSegmentKind;
  label: string;
  selectedAssetLabel?: string;
  startMs: number;
  endMs: number;
  mediaAssetId?: string;
  thumbnail?: string;
  overlayText?: string;
  captionAlternates?: string[];
  audioNote?: string;
  alternates?: MediaAsset[];
}

// ---------------------------------------------------------------------------
// Trend recipe
// ---------------------------------------------------------------------------

export interface TrendRecipe {
  id: string;
  title: string;
  hook: string;
  format: string;
  estimatedLength: string;
  tags: string[];
  matchScore: number;
}

// ---------------------------------------------------------------------------
// Export targets
// ---------------------------------------------------------------------------

export interface ExportTarget {
  id: "capcut" | "premiere-pro" | "davinci-resolve";
  editor: string;
  description: string;
}

// ---------------------------------------------------------------------------
// Brand context
// ---------------------------------------------------------------------------

export interface VisualProofItem {
  id: string;
  label: string;
  tag: string;
  score: number;
  scoreLabel: string;
  color: string;
  imageUrl?: string;
}

export type SignalLevel = "High" | "Medium" | "Low";

export interface TrendMatchSignal {
  rank: number;
  label: string;
  level: SignalLevel;
}

export interface BrandContextCardData {
  thesis: string;
  tagline: string;
  audience: string;
  pain: string;
  desiredIdentity: string;
  conversionGoal: { name: string; description: string };
  successLooksLike: string;
  visualProof: VisualProofItem[];
  trendSignals: TrendMatchSignal[];
  scriptRules: string[];
  tone: { label: string; value: number }[];
  doList: string[];
  avoidList: string[];
}

export interface BrandContext {
  name: string;
  tagline: string;
  category: string;
  audience: string;
  tone: string[];
  colors: string[];
  sources: SourceBadge[];
  card: BrandContextCardData;
}

// ---------------------------------------------------------------------------
// Seeded data: Petite Outdoors
// ---------------------------------------------------------------------------

export const brandContext: BrandContext = {
  name: "Petite Outdoors",
  tagline: "Technical outdoor apparel engineered for women 5'4\" and under.",
  category: "Petite women's outdoor apparel / DTC ecommerce",
  audience: "Women 5'4\" and under who want technical gear that actually fits",
  tone: ["Confident", "Functional", "Adventure-ready"],
  colors: ["#3B6B4A", "#F4A261", "#264653", "#E9C46A"],
  sources: [
    { id: "src-web", platform: "website", label: "petiteoutdoors.com", url: "https://petiteoutdoors.com" },
    { id: "src-ig", platform: "instagram", label: "@petiteoutdoors", url: "https://instagram.com/petiteoutdoors" },
    { id: "src-tt", platform: "tiktok", label: "@petiteoutdoors", url: "https://tiktok.com/@petiteoutdoors" },
    { id: "src-yt", platform: "youtube", label: "Petite Outdoors", url: "https://youtube.com/@petiteoutdoors" },
    { id: "src-shop", platform: "shopify", label: "Shopify Store", url: "https://petiteoutdoors.myshopify.com" },
  ],
  card: {
    thesis: "Gear that finally fits petite movement",
    tagline: "Technical outdoor apparel for women 5'4\" and under",
    audience: "Petite women who hike, travel, and move outdoors",
    pain: "Long hems, bulky proportions, tailoring friction",
    desiredIdentity: "capable, prepared, not treated as an afterthought",
    conversionGoal: {
      name: "Spring 2026 preorders",
      description: "Drive early demand with fit proof, founder credibility, and trail testing.",
    },
    successLooksLike: "Petite hikers feel seen, trust the fit, and preorder before launch.",
    visualProof: [
      { id: "vp-1", label: "bunched hem close-up", tag: "OPENING HOOK", score: 92, scoreLabel: "fit", color: "#3B6B4A", imageUrl: "/assets/brand-context-images/bunched%20hem%20close-up.jpg" },
      { id: "vp-2", label: "standard vs petite fit", tag: "FIT PROOF", score: 90, scoreLabel: "fit", color: "#264653", imageUrl: "/assets/brand-context-images/standard%20vs%20petite%20fit.jpg" },
      { id: "vp-3", label: "trail step-over", tag: "MOVEMENT PROOF", score: 88, scoreLabel: "motion", color: "#4A7C59", imageUrl: "/assets/brand-context-images/trail%20step-over.jpg" },
      { id: "vp-4", label: "fabric detail", tag: "TECHNICAL CREDIBILITY", score: 87, scoreLabel: "tech", color: "#2D5A40", imageUrl: "/assets/brand-context-images/fabric%20detail.jpg" },
      { id: "vp-5", label: "founder measuring inseam", tag: "FOUNDER POV", score: 91, scoreLabel: "trust", color: "#5C4033", imageUrl: "/assets/brand-context-images/founder%20measuring%20inseam.jpg" },
      { id: "vp-6", label: "waistband adjustment", tag: "FIT PROOF", score: 86, scoreLabel: "fit", color: "#3B6B4A", imageUrl: "/assets/brand-context-images/waistband%20adjustment.jpg" },
      { id: "vp-7", label: "pack-and-go flat lay", tag: "CTA SUPPORT", score: 83, scoreLabel: "cta", color: "#264653", imageUrl: "/assets/brand-context-images/pack-and-go%20flat%20lay.jpg" },
      { id: "vp-8", label: "summit movement", tag: "MOVEMENT PROOF", score: 89, scoreLabel: "motion", color: "#1B3A2D", imageUrl: "/assets/brand-context-images/summit%20movement.jpg" },
      { id: "vp-9", label: "back view fit check", tag: "SCALE PROOF", score: 85, scoreLabel: "fit", color: "#4A7C59", imageUrl: "/assets/brand-context-images/back%20view.jpg" },
    ],
    trendSignals: [
      { rank: 1, label: "before / after", level: "High" },
      { rank: 2, label: "fit failure", level: "High" },
      { rank: 3, label: "founder POV", level: "High" },
      { rank: 4, label: "trail test", level: "Medium" },
      { rank: 5, label: "problem-solution", level: "Medium" },
      { rank: 6, label: "micro demo", level: "Medium" },
    ],
    scriptRules: [
      "show problem in first 2 sec",
      "avoid body-shaming",
      "lead with product proof",
      "use specific fit language",
      "CTA: preorder, not sale",
    ],
    tone: [
      { label: "direct", value: 82 },
      { label: "technical", value: 70 },
      { label: "warm", value: 55 },
      { label: "humorous", value: 20 },
    ],
    doList: [
      "specific fit language",
      "real trail + movement",
      "founder perspective",
      "clear preorder CTA",
    ],
    avoidList: [
      "generic empowerment copy",
      "body-focused language",
      "overused viral slang",
      "vague benefits",
    ],
  },
};

export const mediaImportOptions: MediaImportOption[] = [
  { id: "imp-upload", platform: "upload", label: "Upload Folder", description: "Photos, videos, logos", icon: "upload" },
  { id: "imp-phone", platform: "phone-camera", label: "Phone Camera Roll", description: "Founder-shot clips", icon: "phone-camera" },
  { id: "imp-gdrive", platform: "google-drive", label: "Google Drive", description: "Connect your Drive folder", icon: "google-drive" },
  { id: "imp-shopify", platform: "shopify", label: "Shopify", description: "Pull product images", icon: "shopify" },
  { id: "imp-ig", platform: "instagram", label: "Instagram", description: "Import posts & reels", icon: "instagram" },
  { id: "imp-tt", platform: "tiktok", label: "TikTok", description: "Import existing videos", icon: "tiktok" },
  { id: "imp-yt", platform: "youtube", label: "YouTube", description: "Import shorts & clips", icon: "youtube" },
];

const trendingTimelineAssetBase = "/assets/trending%20demo%20timeline";

export const mediaAssets: MediaAsset[] = [
  { id: "final-1", label: "Final 1 - Hook fit problem", thumbnail: `${trendingTimelineAssetBase}/final_1.jpg`, tags: ["fit proof", "hook"], shotType: "Opening hook", trendFit: "Hook visual", matchReason: "Opens with the fit problem immediately", duration: 3200 },
  { id: "final-2", label: "Final 2 - Product reveal", thumbnail: `${trendingTimelineAssetBase}/final_2.jpg`, tags: ["product", "reveal"], shotType: "Product reveal", trendFit: "Product proof", matchReason: "Shows the product answer after the hook", duration: 2800 },
  { id: "final-3", label: "Final 3 - Generated missing shot", thumbnail: `${trendingTimelineAssetBase}/final_3.jpg`, tags: ["generated", "movement"], shotType: "Missing-shot fill", trendFit: "Movement proof", matchReason: "Fills the missing proof moment for the demo", duration: 2000 },
  { id: "final-4", label: "Final 4 - Trail movement", thumbnail: `${trendingTimelineAssetBase}/final_4.jpg`, tags: ["trail", "movement"], shotType: "Movement proof", trendFit: "Trail proof", matchReason: "Carries the middle proof beat", duration: 4100 },
  { id: "final-5", label: "Final 5 - Fit detail", thumbnail: `${trendingTimelineAssetBase}/final_5.jpg`, tags: ["fit", "detail"], shotType: "Detail proof", trendFit: "Product detail", matchReason: "Adds a concrete fit detail before the CTA", duration: 3500 },
  { id: "final-6", label: "Final 6 - Closing CTA", thumbnail: `${trendingTimelineAssetBase}/final_6.jpg`, tags: ["cta", "closing"], shotType: "Closing frame", trendFit: "Conversion CTA", matchReason: "Closes with the preorder handoff", duration: 2400 },
];

const petiteOutdoorsInstagramAssetBase = "/assets/instagram/petiteoutdoors";

const petiteOutdoorsInstagramAssets: MediaAsset[] = [
  { id: "ig-362170-c1", label: "Instagram trail carousel 1", thumbnail: `${petiteOutdoorsInstagramAssetBase}/3621700839024233212_62956806886_c1.jpg`, tags: ["instagram", "trail"], shotType: "Trail proof", trendFit: "Movement proof", matchReason: "Shows real outdoor product context." },
  { id: "ig-362170-c2", label: "Instagram trail carousel 2", thumbnail: `${petiteOutdoorsInstagramAssetBase}/3621700839024233212_62956806886_c2.jpg`, tags: ["instagram", "trail"], shotType: "Trail proof", trendFit: "Movement proof", matchReason: "Adds a second outdoor angle for trend cuts." },
  { id: "ig-362170-c3", label: "Instagram trail carousel 3", thumbnail: `${petiteOutdoorsInstagramAssetBase}/3621700839024233212_62956806886_c3.jpg`, tags: ["instagram", "movement"], shotType: "Movement proof", trendFit: "Trail proof", matchReason: "Works as a middle proof beat." },
  { id: "ig-362170-c4", label: "Instagram trail carousel 4", thumbnail: `${petiteOutdoorsInstagramAssetBase}/3621700839024233212_62956806886_c4.jpg`, tags: ["instagram", "fit"], shotType: "Fit proof", trendFit: "Fit check", matchReason: "Supports fit-problem storytelling." },
  { id: "ig-362170-c5", label: "Instagram trail carousel 5", thumbnail: `${petiteOutdoorsInstagramAssetBase}/3621700839024233212_62956806886_c5.jpg`, tags: ["instagram", "product"], shotType: "Product proof", trendFit: "Product detail", matchReason: "Provides product context for the reveal." },
  { id: "ig-362170-c6", label: "Instagram trail carousel 6", thumbnail: `${petiteOutdoorsInstagramAssetBase}/3621700839024233212_62956806886_c6.jpg`, tags: ["instagram", "video"], shotType: "Video frame", trendFit: "Beat cut", matchReason: "Can be used as a quick motion-feeling cutaway." },
  { id: "ig-362170-c7", label: "Instagram trail carousel 7", thumbnail: `${petiteOutdoorsInstagramAssetBase}/3621700839024233212_62956806886_c7.jpg`, tags: ["instagram", "outdoor"], shotType: "Outdoor proof", trendFit: "Lifestyle proof", matchReason: "Adds brand environment to the library." },
  { id: "ig-362119-c1", label: "Instagram fit carousel 1", thumbnail: `${petiteOutdoorsInstagramAssetBase}/3621199603320666959_62956806886_c1.jpg`, tags: ["instagram", "fit"], shotType: "Fit proof", trendFit: "Fit check", matchReason: "Shows apparel fit in a concrete frame." },
  { id: "ig-362119-c2", label: "Instagram fit carousel 2", thumbnail: `${petiteOutdoorsInstagramAssetBase}/3621199603320666959_62956806886_c2.jpg`, tags: ["instagram", "fit"], shotType: "Fit proof", trendFit: "Fit check", matchReason: "Supports side-by-side fit comparisons." },
  { id: "ig-362119-c3", label: "Instagram fit carousel 3", thumbnail: `${petiteOutdoorsInstagramAssetBase}/3621199603320666959_62956806886_c3.jpg`, tags: ["instagram", "product"], shotType: "Product proof", trendFit: "Product proof", matchReason: "Useful for product reveal beats." },
  { id: "ig-362119-c4", label: "Instagram fit carousel 4", thumbnail: `${petiteOutdoorsInstagramAssetBase}/3621199603320666959_62956806886_c4.jpg`, tags: ["instagram", "detail"], shotType: "Detail proof", trendFit: "Product detail", matchReason: "Adds detail coverage for a proof sequence." },
  { id: "ig-362119-c5", label: "Instagram fit carousel 5", thumbnail: `${petiteOutdoorsInstagramAssetBase}/3621199603320666959_62956806886_c5.jpg`, tags: ["instagram", "detail"], shotType: "Detail proof", trendFit: "Product detail", matchReason: "Works as a fast insert shot." },
  { id: "ig-362119-c6", label: "Instagram fit carousel 6", thumbnail: `${petiteOutdoorsInstagramAssetBase}/3621199603320666959_62956806886_c6.jpg`, tags: ["instagram", "movement"], shotType: "Movement proof", trendFit: "Movement proof", matchReason: "Shows usable product movement." },
  { id: "ig-362119-c7", label: "Instagram fit carousel 7", thumbnail: `${petiteOutdoorsInstagramAssetBase}/3621199603320666959_62956806886_c7.jpg`, tags: ["instagram", "outdoor"], shotType: "Outdoor proof", trendFit: "Lifestyle proof", matchReason: "Rounds out the product context." },
  { id: "ig-387689", label: "Instagram reel frame 1", thumbnail: `${petiteOutdoorsInstagramAssetBase}/3876890228661225271_62956806886_single.jpg`, tags: ["instagram", "video"], shotType: "Video frame", trendFit: "Hook candidate", matchReason: "Can open a short-form sequence." },
  { id: "ig-382738", label: "Instagram reel frame 2", thumbnail: `${petiteOutdoorsInstagramAssetBase}/3827388859479708485_62956806886_single.jpg`, tags: ["instagram", "video"], shotType: "Video frame", trendFit: "Beat cut", matchReason: "Adds social-native motion coverage." },
  { id: "ig-380992", label: "Instagram reel frame 3", thumbnail: `${petiteOutdoorsInstagramAssetBase}/3809920584114240530_62956806886_single.jpg`, tags: ["instagram", "video"], shotType: "Video frame", trendFit: "Beat cut", matchReason: "Works as a compact transition shot." },
  { id: "ig-379341", label: "Instagram product frame 1", thumbnail: `${petiteOutdoorsInstagramAssetBase}/3793415981490573009_62956806886_single.jpg`, tags: ["instagram", "product"], shotType: "Product proof", trendFit: "Product proof", matchReason: "Shows product in a clean proof frame." },
  { id: "ig-379119", label: "Instagram reel frame 4", thumbnail: `${petiteOutdoorsInstagramAssetBase}/3791190147396942284_62956806886_single.jpg`, tags: ["instagram", "video"], shotType: "Video frame", trendFit: "Beat cut", matchReason: "Adds another social-native frame." },
  { id: "ig-378762", label: "Instagram reel frame 5", thumbnail: `${petiteOutdoorsInstagramAssetBase}/3787626772691501305_62956806886_single.jpg`, tags: ["instagram", "video"], shotType: "Video frame", trendFit: "Hook candidate", matchReason: "Can support a creator-style opening." },
  { id: "ig-378107-c1", label: "Instagram product carousel 1", thumbnail: `${petiteOutdoorsInstagramAssetBase}/3781072889660049916_62956806886_c1.jpg`, tags: ["instagram", "product"], shotType: "Product proof", trendFit: "Product detail", matchReason: "Useful as a product insert." },
];

export const libraryMediaAssets: MediaAsset[] = [
  ...brandContext.card.visualProof.map((item): MediaAsset => ({
    id: `proof-${item.id}`,
    label: item.label,
    thumbnail: item.imageUrl ?? "",
    tags: ["brand proof", item.scoreLabel],
    shotType: item.tag,
    trendFit: item.tag,
    matchReason: `Already identified in Brand Context with ${item.score}% ${item.scoreLabel} fit.`,
  })),
  ...petiteOutdoorsInstagramAssets,
];

export const trendRecipes: TrendRecipe[] = [
  {
    id: "tr-1",
    title: "Founder Confessional",
    hook: "\"This is why regular hiking pants never worked for me.\"",
    format: "Visible fit issue → Mirror check → Trail movement → Product proof → CTA",
    estimatedLength: "15-30s",
    tags: ["fit proof", "preorder", "DTC"],
    matchScore: 94,
  },
  {
    id: "tr-2",
    title: "POV Trail Transformation",
    hook: "\"POV: you stopped tailoring every pair of hiking pants.\"",
    format: "First-person frustration → Trail transition → Movement proof → CTA",
    estimatedLength: "30-60s",
    tags: ["POV", "movement", "adventure"],
    matchScore: 87,
  },
  {
    id: "tr-3",
    title: "Before vs After On The Trail",
    hook: "\"Most outdoor brands vs. gear made for your actual frame.\"",
    format: "Before fit issue → Product swap → Trail proof → Preorder CTA",
    estimatedLength: "15-20s",
    tags: ["comparison", "hook formula", "product"],
    matchScore: 81,
  },
];

const alternateClips: MediaAsset[] = [
  { id: "final-4-alt-1", label: "Final 4 alternative 1", thumbnail: `${trendingTimelineAssetBase}/final_4_alternative_1.jpg`, tags: ["trail", "movement"], shotType: "Movement proof", trendFit: "Trail proof", matchReason: "A tighter movement variation for the fourth beat" },
  { id: "final-4-alt-2", label: "Final 4 alternative 2", thumbnail: `${trendingTimelineAssetBase}/final_4_alternative_2.jpg`, tags: ["trail", "movement"], shotType: "Movement proof", trendFit: "Trail proof", matchReason: "A more product-forward variation for the fourth beat" },
];

export const timelineSegments: TimelineSegment[] = [
  { id: "ts-1", kind: "clip", label: "Hook - Fit problem", startMs: 0, endMs: 3200, mediaAssetId: "final-1", thumbnail: mediaAssets[0].thumbnail },
  {
    id: "ts-2",
    kind: "text-overlay",
    label: "Hook text",
    startMs: 0,
    endMs: 3200,
    overlayText: "I couldn't find hiking pants that fit so I made my own.",
    captionAlternates: [
      "Petite hikers deserve pants that actually fit.",
      "I got tired of cuffing every hiking pant.",
      "Built for shorter inseams, not scaled-down compromises.",
    ],
  },
  { id: "ts-3", kind: "clip", label: "Product reveal", startMs: 3200, endMs: 6000, mediaAssetId: "final-2", thumbnail: mediaAssets[1].thumbnail },
  { id: "ts-4", kind: "missing", label: "Missing shot - Movement proof", startMs: 6000, endMs: 8000, alternates: [mediaAssets[2]] },
  { id: "ts-5", kind: "clip", label: "Final 4 - Trail movement", startMs: 8000, endMs: 12100, mediaAssetId: "final-4", thumbnail: mediaAssets[3].thumbnail, alternates: alternateClips },
  { id: "ts-6", kind: "clip", label: "Fit detail", startMs: 12100, endMs: 15600, mediaAssetId: "final-5", thumbnail: mediaAssets[4].thumbnail },
  { id: "ts-8", kind: "clip", label: "Closing CTA", startMs: 15600, endMs: 18000, mediaAssetId: "final-6", thumbnail: mediaAssets[5].thumbnail },
  { id: "ts-9", kind: "audio", label: "Beat sync", startMs: 0, endMs: 18000, audioNote: "Upbeat acoustic – drop at 3.2s, build at 8s, resolve at 15.6s" },
];

export const chatHistory: ChatMessage[] = [
  { id: "msg-1", role: "assistant", content: "What product should we match to a trend? Paste a product page, store, social profile, or short product description.", timestamp: 1, step: "source-intake" },
  {
    id: "msg-2",
    role: "user",
    content: "Match Petite Outdoors to a trend for a pre-order launch. Here are the product links and footage moments.",
    timestamp: 2,
    badges: [
      ...brandContext.sources.slice(0, 3),
      { id: "src-upload", platform: "upload", label: "Product media" },
      { id: "src-camera-roll", platform: "phone-camera", label: "Camera roll" },
    ],
    step: "source-intake",
  },
  { id: "msg-3", role: "assistant", content: "Okay, brand context created.", timestamp: 3, step: "brand-context-ready" },
  {
    id: "msg-4",
    role: "assistant",
    content: "I am analyzing the brand context and searching the web, Instagram, TikTok, YouTube Shorts, and competitor posts for trend patterns.",
    timestamp: 4,
    step: "trend-search",
  },
  { id: "msg-5", role: "assistant", content: "I found three top trends that align with your goal and your brand.", timestamp: 5, step: "recipes-ready" },
];

export const initialAiToolCalls: SimulatedToolCall[] = [
  {
    id: "tool-read-sources",
    name: "read_brand_sources",
    label: "Reading website and social links",
    state: "running",
    input: { sources: brandContext.sources.slice(0, 3).map((source) => source.label) },
    output: "Found Petite Outdoors, product positioning, social proof, and preorder goal.",
    durationMs: 1200,
  },
  {
    id: "tool-sync-media",
    name: "sync_media_sources",
    label: "Syncing media",
    state: "pending",
    input: { connectors: mediaImportOptions.map((option) => option.label) },
    output: "Indexed 24 seeded clips across product, fit proof, trail movement, and detail shots.",
    durationMs: 1400,
  },
  {
    id: "tool-detect-moments",
    name: "detect_reusable_moments",
    label: "Detecting reusable moments",
    state: "pending",
    output: "Tagged fit proof, uphill movement, product detail, and closing beauty shots.",
    durationMs: 1300,
  },
  {
    id: "tool-build-brand-context",
    name: "build_brand_context",
    label: "Creating brand context",
    state: "pending",
    output: "Created a reusable brand context for Petite Outdoors.",
    durationMs: 1200,
  },
];

export const trendSearchAiToolCalls: SimulatedToolCall[] = [
  {
    id: "tool-search-web",
    name: "search_web_trends",
    label: "Searching the web",
    state: "running",
    input: { goal: "preorder launch video", brand: brandContext.name },
    output: "Found fit-proof and before-after trend formats across ecommerce launch content.",
    durationMs: 700,
  },
  {
    id: "tool-search-instagram",
    name: "search_instagram_reels",
    label: "Searching Instagram",
    state: "pending",
    output: "Matched founder POV, fit-failure demos, and trail testing reels.",
    durationMs: 800,
  },
  {
    id: "tool-search-tiktok",
    name: "search_tiktok_trends",
    label: "Searching TikTok",
    state: "pending",
    output: "Found POV transformation and comparison hooks that fit the brand guardrails.",
    durationMs: 800,
  },
  {
    id: "tool-build-recipes",
    name: "build_trend_recipes",
    label: "Generating trend recipes",
    state: "pending",
    output: "Created three trend recipes matched to Petite Outdoors.",
    durationMs: 900,
  },
];

export const recipeAiToolCalls: SimulatedToolCall[] = [
  {
    id: "tool-match-clips",
    name: "match_clips_to_recipe",
    label: "Matching clips to recipe moments",
    state: "running",
    input: { recipe: trendRecipes[0].title },
    output: "Matched opening frame, mirror check, trail proof, and CTA beats.",
    durationMs: 900,
  },
  {
    id: "tool-assemble-timeline",
    name: "assemble_timeline",
    label: "Auto-filling timeline",
    state: "pending",
    input: { duration: "18s", tracks: ["video", "text", "audio"] },
    output: "Built an editable timeline with one missing-shot prompt.",
    durationMs: 900,
  },
];

export const promptAiToolCalls: SimulatedToolCall[] = [
  {
    id: "tool-refine-current-canvas",
    name: "refine_canvas_prompt",
    label: "Reading current canvas context",
    state: "running",
    output: "Used the selected recipe, media matches, and timeline gaps.",
    durationMs: 800,
  },
  {
    id: "tool-suggest-next-step",
    name: "suggest_next_action",
    label: "Preparing next edit options",
    state: "pending",
    output: "Suggested alternates, missing-shot direction, and export handoff.",
    durationMs: 800,
  },
];

export const exportTargets: ExportTarget[] = [
  { id: "capcut", editor: "CapCut", description: "Export timeline for CapCut editing" },
  { id: "premiere-pro", editor: "Adobe Premiere Pro", description: "Export as a Premiere project" },
  { id: "davinci-resolve", editor: "DaVinci Resolve", description: "Export for DaVinci Resolve" },
];

// ---------------------------------------------------------------------------
// Canvas nodes for /app
// ---------------------------------------------------------------------------

export const reframeDemoNodes: CanvasNode[] = [
  {
    id: "brand-ctx",
    kind: "brand-context",
    title: "Brand Context",
    position: { x: 0, y: 0 },
    size: { width: 1000, height: 700 },
  },
  {
    id: "library",
    kind: "media",
    title: "Library",
    body: "AI-organized product photos and clip thumbnails matched to reusable trend moments.",
    position: { x: 0, y: 732 },
    size: { width: 1000, height: 420 },
  },
  {
    id: "recipe-1",
    kind: "video",
    title: trendVideos[0].title,
    body: trendRecipes[0].hook,
    video: {
      src: trendVideos[0].src,
      label: trendVideos[0].label,
      meta: trendVideos[0].meta,
      detailsImage: {
        src: `${trendingTimelineAssetBase}/founder_confessional.png`,
        alt: "Detailed breakdown of the Founder Confessional video trend",
        width: 1405,
        height: 951,
      },
    },
    position: { x: 1096, y: 0 },
    size: { width: 220, height: 391 },
  },
  {
    id: "recipe-2",
    kind: "video",
    title: trendVideos[1].title,
    body: "A fast process edit that compresses sourcing, fitting, and trail testing into one saveable loop.",
    video: {
      src: trendVideos[1].src,
      label: trendVideos[1].label,
      meta: trendVideos[1].meta,
    },
    position: { x: 1356, y: 0 },
    size: { width: 220, height: 391 },
  },
  {
    id: "recipe-3",
    kind: "video",
    title: trendVideos[2].title,
    body: "A comment-led remix that turns customer proof into the hook before showing the product answer.",
    video: {
      src: trendVideos[2].src,
      label: trendVideos[2].label,
      meta: trendVideos[2].meta,
    },
    position: { x: 1616, y: 0 },
    size: { width: 220, height: 391 },
  },
  {
    id: "timeline-1",
    kind: "timeline",
    title: "Founder Confessional",
    body: "6 clips · 1 missing shot · 1 text overlay · 1 audio track\n18s total",
    position: { x: 1096, y: 583 },
    size: { width: 480, height: 280 },
  },
  {
    id: "preview-1",
    kind: "preview",
    title: "Petite Gear. Big Adventures.",
    body: "Tap to preview the assembled short-form video with current clips, text, and audio.",
    imageUrl: mediaAssets[0].thumbnail,
    position: { x: 1640, y: 533 },
    size: { width: 210, height: 380 },
  },
];

export const reframeDemoConnections: CanvasConnection[] = [
  { id: "ctx-r1", sourceNodeId: "brand-ctx", targetNodeId: "recipe-1" },
  { id: "ctx-r2", sourceNodeId: "brand-ctx", targetNodeId: "recipe-2" },
  { id: "ctx-r3", sourceNodeId: "brand-ctx", targetNodeId: "recipe-3" },
  { id: "r1-tl", sourceNodeId: "recipe-1", targetNodeId: "timeline-1" },
  { id: "tl-prev", sourceNodeId: "timeline-1", targetNodeId: "preview-1" },
];

export const reframePromptSourceImage = mediaAssets[0].thumbnail;
