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
  | "icloud"
  | "image-library"
  | "video-library"
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

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  timestamp: number;
  badges?: SourceBadge[];
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
  tagline: "Adventure gear sized for kids who move.",
  category: "Kids outdoor gear / DTC ecommerce",
  audience: "Parents of kids 3-10 who camp, hike, and explore",
  tone: ["Warm", "Playful", "Trustworthy"],
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
  { id: "imp-upload", platform: "upload", label: "Upload Files", description: "Photos, videos, logos", icon: "upload" },
  { id: "imp-images", platform: "image-library", label: "Image Library", description: "Bring in stills and product shots", icon: "image-library" },
  { id: "imp-video", platform: "video-library", label: "Video Library", description: "Import clips, reels, and b-roll", icon: "video-library" },
  { id: "imp-gdrive", platform: "google-drive", label: "Google Drive", description: "Connect your Drive folder", icon: "google-drive" },
  { id: "imp-icloud", platform: "icloud", label: "iCloud Drive", description: "Pull media from iCloud folders", icon: "icloud" },
  { id: "imp-shopify", platform: "shopify", label: "Shopify / Website", description: "Pull product images", icon: "shopify" },
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
    title: "Preorder Hype Drop",
    hook: "\"We made the one thing that didn't exist for kids who actually go outside.\"",
    format: "Hook → Problem → Product reveal → Social proof → CTA",
    estimatedLength: "15-30s",
    tags: ["preorder", "launch", "DTC"],
    matchScore: 94,
  },
  {
    id: "tr-2",
    title: "Day-in-the-Life Adventure",
    hook: "\"5am wake-up for our first family summit attempt...\"",
    format: "Morning routine → Adventure → Product in action → Sunset close",
    estimatedLength: "30-60s",
    tags: ["lifestyle", "family", "adventure"],
    matchScore: 87,
  },
  {
    id: "tr-3",
    title: "Before/After Gear Comparison",
    hook: "\"What we packed vs. what our kid actually used.\"",
    format: "Before setup → Struggle moment → Product swap → Happy kid → CTA",
    estimatedLength: "15-20s",
    tags: ["comparison", "product", "humor"],
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
  { id: "msg-1", role: "assistant", content: "Welcome to Reframe! Let's get to know your brand. Paste your website or social links to get started.", timestamp: 1 },
  { id: "msg-2", role: "user", content: "Here's our site and socials:", timestamp: 2, badges: brandContext.sources.slice(0, 3) },
  { id: "msg-3", role: "assistant", content: "Got it — I found Petite Outdoors. Kids outdoor gear, DTC ecommerce. I can see product listings, lifestyle photos, and some existing short-form content. Let me pull in your media.", timestamp: 3 },
  { id: "msg-4", role: "system", content: "Imported 24 media assets from website, Instagram, and TikTok.", timestamp: 4 },
  { id: "msg-5", role: "assistant", content: "I've organized your media by shot type, product, and trend fit. I also found 3 video recipe formats that match your brand and preorder goals. Let's build your first video.", timestamp: 5 },
  { id: "msg-6", role: "assistant", content: "Here's your brand context and trend recipes. Select a recipe to see an editable timeline with your matched media.", timestamp: 6 },
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
    title: "Preorder Hype Drop — Timeline",
    body: "6 clips · 1 missing shot · 2 text overlays · 1 audio track\n18s total",
    position: { x: 800, y: -20 },
    size: { width: 480, height: 280 },
  },
  {
    id: "preview-1",
    kind: "preview",
    title: "Preview",
    body: "Tap to preview the assembled short-form video with current clips, text, and audio.",
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
