import type { CanvasConnection, CanvasNode } from "../components/infinite-canvas";

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
  startMs: number;
  endMs: number;
  mediaAssetId?: string;
  thumbnail?: string;
  overlayText?: string;
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
  id: string;
  editor: string;
  icon: string;
  description: string;
}

// ---------------------------------------------------------------------------
// Brand context
// ---------------------------------------------------------------------------

export interface BrandContext {
  name: string;
  tagline: string;
  category: string;
  audience: string;
  tone: string[];
  colors: string[];
  sources: SourceBadge[];
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

// Placeholder SVG thumbnails using brand colors
function makeThumbnail(color: string, label: string): string {
  return `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 320 180'%3E%3Crect width='320' height='180' fill='${encodeURIComponent(color)}'/%3E%3Ctext x='160' y='98' text-anchor='middle' font-family='system-ui' font-size='14' fill='white'%3E${encodeURIComponent(label)}%3C/text%3E%3C/svg%3E`;
}

export const mediaAssets: MediaAsset[] = [
  { id: "ma-1", label: "Uphill trail movement", thumbnail: makeThumbnail("#3B6B4A", "Trail Movement"), tags: ["outdoors", "hiking", "fit"], shotType: "Trail movement", trendFit: "Opening frame", matchReason: "Shows petite fit in motion immediately", duration: 3200 },
  { id: "ma-2", label: "Hem fit close-up", thumbnail: makeThumbnail("#264653", "Hem Detail"), tags: ["product", "fit", "detail"], shotType: "Close-up", trendFit: "Fit proof", matchReason: "Makes the sizing problem visible in under two seconds", duration: 2800 },
  { id: "ma-3", label: "Mirror fit check", thumbnail: makeThumbnail("#E9C46A", "Mirror Fit"), tags: ["comparison", "founder", "fit"], shotType: "Medium wide", trendFit: "Before vs after", matchReason: "Clear side-by-side proof for the recipe", duration: 4100 },
  { id: "ma-4", label: "Backpack stride test", thumbnail: makeThumbnail("#F4A261", "Stride Test"), tags: ["movement", "backpack", "trail"], shotType: "Medium close", trendFit: "Movement proof", matchReason: "Confirms the product works on the trail, not just in a mirror", duration: 3500 },
  { id: "ma-5", label: "Sunset mountain view", thumbnail: makeThumbnail("#264653", "Sunset"), tags: ["nature", "scenic", "sunset"], shotType: "Wide", trendFit: "Closing beauty", matchReason: "Aspirational closer", duration: 2200 },
  { id: "ma-6", label: "Zipper product detail", thumbnail: makeThumbnail("#3B6B4A", "Zipper Detail"), tags: ["product", "construction", "detail"], shotType: "Close-up", trendFit: "B-roll filler", matchReason: "Supports engineering credibility", duration: 2000 },
  { id: "ma-7", label: "Open trail pace", thumbnail: makeThumbnail("#E9C46A", "Open Trail"), tags: ["trail", "movement", "energy"], shotType: "Tracking", trendFit: "Energy burst", matchReason: "Good alternate movement beat", duration: 2600 },
  { id: "ma-8", label: "Pack adjustment detail", thumbnail: makeThumbnail("#F4A261", "Pack Fit"), tags: ["gear", "fit", "prep"], shotType: "Medium", trendFit: "Trust builder", matchReason: "Shows fit and usability before CTA", duration: 3000 },
];

export const trendRecipes: TrendRecipe[] = [
  {
    id: "tr-1",
    title: "Side-by-Side Fit Failure Demo",
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
  { id: "alt-1", label: "Alternate trail angle", thumbnail: makeThumbnail("#3B6B4A", "Alt Trail"), tags: ["outdoors"], shotType: "Wide", trendFit: "Hook visual", matchReason: "Uphill movement, same trail, similar energy" },
  { id: "alt-2", label: "Product macro detail", thumbnail: makeThumbnail("#F4A261", "Alt Macro"), tags: ["product", "detail"], shotType: "Close-up", trendFit: "Product proof", matchReason: "Sharper detail for fit and construction" },
  { id: "alt-3", label: "Wooded trail stride", thumbnail: makeThumbnail("#264653", "Alt Stride"), tags: ["trail", "movement"], shotType: "Tracking", trendFit: "Movement proof", matchReason: "Good match: similar pace, different trail" },
];

export const timelineSegments: TimelineSegment[] = [
  { id: "ts-1", kind: "clip", label: "Opening frame: hem problem", startMs: 0, endMs: 3200, mediaAssetId: "ma-2", thumbnail: mediaAssets[1].thumbnail, alternates: [alternateClips[1], mediaAssets[5]] },
  { id: "ts-2", kind: "text-overlay", label: "Hook text", startMs: 0, endMs: 3200, overlayText: "POV: You vs. most outdoor brands" },
  { id: "ts-3", kind: "clip", label: "Mirror fit check", startMs: 3200, endMs: 6000, mediaAssetId: "ma-3", thumbnail: mediaAssets[2].thumbnail, alternates: [alternateClips[2], mediaAssets[7]] },
  { id: "ts-4", kind: "missing", label: "Missing shot: uphill movement", startMs: 6000, endMs: 8000 },
  { id: "ts-5", kind: "clip", label: "Trail movement proof", startMs: 8000, endMs: 12100, mediaAssetId: "ma-1", thumbnail: mediaAssets[0].thumbnail, alternates: [alternateClips[0], mediaAssets[6]] },
  { id: "ts-6", kind: "clip", label: "Pack adjustment proof", startMs: 12100, endMs: 15600, mediaAssetId: "ma-4", thumbnail: mediaAssets[3].thumbnail, alternates: [mediaAssets[6], mediaAssets[7]] },
  { id: "ts-7", kind: "text-overlay", label: "CTA overlay", startMs: 15600, endMs: 18000, overlayText: "Petite gear. Big adventures." },
  { id: "ts-8", kind: "clip", label: "Closing beauty", startMs: 15600, endMs: 18000, mediaAssetId: "ma-5", thumbnail: mediaAssets[4].thumbnail, alternates: [alternateClips[0]] },
  { id: "ts-9", kind: "audio", label: "Beat sync", startMs: 0, endMs: 18000, audioNote: "Upbeat acoustic – drop at 3.2s, build at 8s, resolve at 15.6s" },
];

export const chatHistory: ChatMessage[] = [
  { id: "msg-1", role: "assistant", content: "What would you like to create? Paste your brand links and let AI do the rest.", timestamp: 1, step: "source-intake" },
  { id: "msg-2", role: "user", content: "Here are our brand sources.", timestamp: 2, badges: brandContext.sources.slice(0, 3), step: "source-intake" },
  { id: "msg-3", role: "assistant", content: "Where should I pull your clips from?", timestamp: 3, step: "media-connect" },
  { id: "msg-4", role: "system", content: "Connected website, Instagram, TikTok, Shopify, Google Drive, and camera-roll sources.", timestamp: 4, step: "media-connect" },
  { id: "msg-5", role: "assistant", content: "I've pulled your brand context and built trend recipes for you.", timestamp: 5, step: "recipes-ready" },
  { id: "msg-6", role: "user", content: "Looks great. Show me more recipes.", timestamp: 6, step: "recipes-ready" },
  { id: "msg-7", role: "assistant", content: "Here are more that match your brand. Pick one recipe and I'll auto-fill the timeline.", timestamp: 7, step: "recipes-ready" },
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
    id: "tool-build-recipes",
    name: "build_trend_recipes",
    label: "Building brand context and recipes",
    state: "pending",
    output: "Created three trend recipes matched to Petite Outdoors.",
    durationMs: 1200,
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
  { id: "exp-capcut", editor: "CapCut", icon: "✂️", description: "Export timeline for CapCut editing" },
  { id: "exp-premiere", editor: "Adobe Premiere", icon: "🎬", description: "Export as Premiere project" },
  { id: "exp-davinci", editor: "DaVinci Resolve", icon: "🎨", description: "Export for DaVinci Resolve" },
  { id: "exp-generic", editor: "Generic Timeline", icon: "📋", description: "Export as standard timeline XML" },
];

// ---------------------------------------------------------------------------
// Canvas nodes for /app
// ---------------------------------------------------------------------------

export const reframeDemoNodes: CanvasNode[] = [
  {
    id: "brand-ctx",
    kind: "brand-context",
    title: "Brand Context",
    body: `${brandContext.name} — ${brandContext.tagline}\n${brandContext.category}\nAudience: ${brandContext.audience}\nTone: ${brandContext.tone.join(", ")}`,
    position: { x: 0, y: 0 },
    size: { width: 320, height: 220 },
  },
  {
    id: "recipe-1",
    kind: "trend-recipe",
    title: trendRecipes[0].title,
    body: `${trendRecipes[0].hook}\n\nFormat: ${trendRecipes[0].format}\nLength: ${trendRecipes[0].estimatedLength}\nMatch: ${trendRecipes[0].matchScore}%`,
    position: { x: 400, y: -40 },
    size: { width: 300, height: 200 },
  },
  {
    id: "recipe-2",
    kind: "trend-recipe",
    title: trendRecipes[1].title,
    body: `${trendRecipes[1].hook}\n\nFormat: ${trendRecipes[1].format}\nLength: ${trendRecipes[1].estimatedLength}\nMatch: ${trendRecipes[1].matchScore}%`,
    position: { x: 400, y: 200 },
    size: { width: 300, height: 200 },
  },
  {
    id: "recipe-3",
    kind: "trend-recipe",
    title: trendRecipes[2].title,
    body: `${trendRecipes[2].hook}\n\nFormat: ${trendRecipes[2].format}\nLength: ${trendRecipes[2].estimatedLength}\nMatch: ${trendRecipes[2].matchScore}%`,
    position: { x: 400, y: 440 },
    size: { width: 300, height: 200 },
  },
  {
    id: "timeline-1",
    kind: "timeline",
    title: "Side-by-Side Fit Failure Demo — Timeline",
    body: "6 clips · 1 missing shot · 2 text overlays · 1 audio track\n18s total",
    position: { x: 800, y: -20 },
    size: { width: 480, height: 280 },
  },
  {
    id: "preview-1",
    kind: "preview",
    title: "Petite Gear. Big Adventures.",
    body: "Tap to preview the assembled short-form video with current clips, text, and audio.",
    imageUrl: mediaAssets[0].thumbnail,
    position: { x: 1360, y: 20 },
    size: { width: 260, height: 180 },
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
