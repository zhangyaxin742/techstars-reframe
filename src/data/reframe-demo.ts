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

// Placeholder SVG thumbnails using brand colors
function makeThumbnail(color: string, label: string): string {
  return `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 320 180'%3E%3Crect width='320' height='180' fill='${encodeURIComponent(color)}'/%3E%3Ctext x='160' y='98' text-anchor='middle' font-family='system-ui' font-size='14' fill='white'%3E${encodeURIComponent(label)}%3C/text%3E%3C/svg%3E`;
}

export const mediaAssets: MediaAsset[] = [
  { id: "ma-1", label: "Kids hiking trail", thumbnail: makeThumbnail("#3B6B4A", "Trail Hike"), tags: ["outdoors", "hiking", "kids"], shotType: "Wide establishing", trendFit: "Hook visual", matchReason: "High-energy opening shot", duration: 3200 },
  { id: "ma-2", label: "Backpack product close-up", thumbnail: makeThumbnail("#264653", "Backpack"), tags: ["product", "backpack", "detail"], shotType: "Close-up", trendFit: "Product reveal", matchReason: "Hero product detail at 0:03", duration: 2800 },
  { id: "ma-3", label: "Family campsite setup", thumbnail: makeThumbnail("#E9C46A", "Campsite"), tags: ["camping", "family", "lifestyle"], shotType: "Medium wide", trendFit: "Lifestyle context", matchReason: "Relatable family moment", duration: 4100 },
  { id: "ma-4", label: "Kid opening backpack", thumbnail: makeThumbnail("#F4A261", "Unboxing"), tags: ["unboxing", "product", "reaction"], shotType: "Medium close", trendFit: "Social proof", matchReason: "Authentic kid reaction", duration: 3500 },
  { id: "ma-5", label: "Sunset mountain view", thumbnail: makeThumbnail("#264653", "Sunset"), tags: ["nature", "scenic", "sunset"], shotType: "Wide", trendFit: "Closing beauty", matchReason: "Aspirational closer", duration: 2200 },
  { id: "ma-6", label: "Water bottle in stream", thumbnail: makeThumbnail("#3B6B4A", "Water Bottle"), tags: ["product", "nature", "detail"], shotType: "Close-up", trendFit: "B-roll filler", matchReason: "Product in context", duration: 2000 },
  { id: "ma-7", label: "Kids running through meadow", thumbnail: makeThumbnail("#E9C46A", "Meadow Run"), tags: ["kids", "play", "energy"], shotType: "Tracking", trendFit: "Energy burst", matchReason: "High-energy transition", duration: 2600 },
  { id: "ma-8", label: "Parent helping with gear", thumbnail: makeThumbnail("#F4A261", "Gear Prep"), tags: ["family", "gear", "prep"], shotType: "Medium", trendFit: "Trust builder", matchReason: "Parental endorsement", duration: 3000 },
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
  { id: "alt-1", label: "Alternate trail angle", thumbnail: makeThumbnail("#3B6B4A", "Alt Trail"), tags: ["outdoors"], shotType: "Wide", trendFit: "Hook visual", matchReason: "Different angle, same energy" },
  { id: "alt-2", label: "Kid smiling with pack", thumbnail: makeThumbnail("#F4A261", "Alt Smile"), tags: ["kid", "product"], shotType: "Close-up", trendFit: "Social proof", matchReason: "Warmer expression" },
  { id: "alt-3", label: "Overhead campsite", thumbnail: makeThumbnail("#264653", "Alt Overhead"), tags: ["camping"], shotType: "Drone overhead", trendFit: "Lifestyle context", matchReason: "Cinematic perspective" },
];

export const timelineSegments: TimelineSegment[] = [
  { id: "ts-1", kind: "clip", label: "Hook – Trail energy", startMs: 0, endMs: 3200, mediaAssetId: "ma-1", thumbnail: mediaAssets[0].thumbnail, alternates: [alternateClips[0], mediaAssets[6]] },
  { id: "ts-2", kind: "text-overlay", label: "Hook text", startMs: 0, endMs: 3200, overlayText: "\"We made the one thing that didn't exist for kids who actually go outside.\"" },
  { id: "ts-3", kind: "clip", label: "Product reveal", startMs: 3200, endMs: 6000, mediaAssetId: "ma-2", thumbnail: mediaAssets[1].thumbnail, alternates: [alternateClips[1], mediaAssets[5]] },
  { id: "ts-4", kind: "missing", label: "⚠ Close-up needed: zipper detail", startMs: 6000, endMs: 8000 },
  { id: "ts-5", kind: "clip", label: "Family context", startMs: 8000, endMs: 12100, mediaAssetId: "ma-3", thumbnail: mediaAssets[2].thumbnail, alternates: [alternateClips[2], mediaAssets[7]] },
  { id: "ts-6", kind: "clip", label: "Kid reaction", startMs: 12100, endMs: 15600, mediaAssetId: "ma-4", thumbnail: mediaAssets[3].thumbnail, alternates: [mediaAssets[6], mediaAssets[7]] },
  { id: "ts-7", kind: "text-overlay", label: "CTA overlay", startMs: 15600, endMs: 18000, overlayText: "Preorder now → petiteoutdoors.com" },
  { id: "ts-8", kind: "clip", label: "Closing beauty", startMs: 15600, endMs: 18000, mediaAssetId: "ma-5", thumbnail: mediaAssets[4].thumbnail, alternates: [alternateClips[0]] },
  { id: "ts-9", kind: "audio", label: "Beat sync", startMs: 0, endMs: 18000, audioNote: "Upbeat acoustic – drop at 3.2s, build at 8s, resolve at 15.6s" },
];

export const chatHistory: ChatMessage[] = [
  { id: "msg-1", role: "assistant", content: "What would you like to create? Paste your brand links, upload media, and let AI do the rest.", timestamp: 1, step: "source-intake" },
  {
    id: "msg-2",
    role: "user",
    content: "Create a pre-order launch video for Petite Outdoors. Here are the brand links and product media.",
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
    id: "recipe-1",
    kind: "trend-recipe",
    title: trendRecipes[0].title,
    body: `${trendRecipes[0].hook}\n\nFormat: ${trendRecipes[0].format}\nLength: ${trendRecipes[0].estimatedLength}\nMatch: ${trendRecipes[0].matchScore}%`,
    position: { x: 1096, y: 0 },
    size: { width: 300, height: 200 },
  },
  {
    id: "recipe-2",
    kind: "trend-recipe",
    title: trendRecipes[1].title,
    body: `${trendRecipes[1].hook}\n\nFormat: ${trendRecipes[1].format}\nLength: ${trendRecipes[1].estimatedLength}\nMatch: ${trendRecipes[1].matchScore}%`,
    position: { x: 1096, y: 280 },
    size: { width: 300, height: 200 },
  },
  {
    id: "recipe-3",
    kind: "trend-recipe",
    title: trendRecipes[2].title,
    body: `${trendRecipes[2].hook}\n\nFormat: ${trendRecipes[2].format}\nLength: ${trendRecipes[2].estimatedLength}\nMatch: ${trendRecipes[2].matchScore}%`,
    position: { x: 1096, y: 560 },
    size: { width: 300, height: 200 },
  },
  {
    id: "timeline-1",
    kind: "timeline",
    title: "Side-by-Side Fit Failure Demo — Timeline",
    body: "6 clips · 1 missing shot · 2 text overlays · 1 audio track\n18s total",
    position: { x: 1492, y: 0 },
    size: { width: 480, height: 280 },
  },
  {
    id: "preview-1",
    kind: "preview",
    title: "Petite Gear. Big Adventures.",
    body: "Tap to preview the assembled short-form video with current clips, text, and audio.",
    imageUrl: mediaAssets[0].thumbnail,
    position: { x: 2036, y: -50 },
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
