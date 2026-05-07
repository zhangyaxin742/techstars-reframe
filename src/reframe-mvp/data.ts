import type {
  AiFlowStep,
  BrandContext,
  ChatMessage,
  ExportTarget,
  MediaAsset,
  SimulatedToolCall,
  TimelineSegment,
} from "@/src/data/reframe-demo";
import type { CanvasConnection, CanvasNode } from "@/src/components/infinite-canvas";

const assetBase = "/assets/trending%20demo%20timeline";

export const mvpBrandContext: BrandContext = {
  name: "Petite Outdoors",
  tagline: "Technical outdoor apparel engineered for women 5'4\" and under.",
  category: "Petite women's outdoor apparel / DTC ecommerce",
  audience: "Women 5'4\" and under who want technical gear that actually fits",
  tone: ["Direct", "Technical", "Founder-led"],
  colors: ["#3B6B4A", "#F4A261", "#264653", "#E9C46A"],
  sources: [
    { id: "src-web", platform: "website", label: "petiteoutdoors.com", url: "https://petiteoutdoors.com" },
    { id: "src-product", platform: "shopify", label: "Product page URL", url: "https://petiteoutdoors.com/preorder" },
    { id: "src-upload", platform: "upload", label: "Uploaded proof assets" },
  ],
  card: {
    thesis: "Petite hikers need fit proof before preorder",
    tagline: "Founder-led content for a technical petite hiking pant preorder",
    audience: "Petite women who hike, travel, and move outdoors",
    pain: "Long hems, bulky proportions, and the friction of tailoring technical gear",
    desiredIdentity: "capable, prepared, and not treated as an afterthought",
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
      { rank: 1, label: "founder confessional", level: "High" },
      { rank: 2, label: "before and after", level: "High" },
      { rank: 3, label: "customer pain to proof", level: "High" },
      { rank: 4, label: "product demo", level: "Medium" },
      { rank: 5, label: "why I built this", level: "Medium" },
      { rank: 6, label: "mistake I made building this", level: "Medium" },
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

export const mvpMediaAssets: MediaAsset[] = [
  { id: "final-1", label: "Hook - bunched hem proof", thumbnail: `${assetBase}/final_1.jpg`, tags: ["demo asset", "hook"], shotType: "Opening hook", trendFit: "Hook fit", matchReason: "Shows the fit problem immediately.", duration: 3200 },
  { id: "final-2", label: "Product reveal", thumbnail: `${assetBase}/final_2.jpg`, tags: ["demo asset", "product"], shotType: "Product detail", trendFit: "Middle proof", matchReason: "Shows the product answer after the hook.", duration: 2800 },
  { id: "final-3", label: "Placeholder movement shot", thumbnail: `${assetBase}/final_3.jpg`, tags: ["demo asset", "placeholder"], shotType: "Shot to film", trendFit: "Missing shot", matchReason: "Represents the movement proof shot the founder still needs to film.", duration: 2000 },
  { id: "final-4", label: "Trail movement", thumbnail: `${assetBase}/final_4.jpg`, tags: ["demo asset", "movement"], shotType: "Movement proof", trendFit: "Middle proof", matchReason: "Carries the trail proof beat.", duration: 4100 },
  { id: "final-5", label: "Fit detail", thumbnail: `${assetBase}/final_5.jpg`, tags: ["demo asset", "detail"], shotType: "Product detail", trendFit: "Middle proof", matchReason: "Adds a concrete fit detail before the CTA.", duration: 3500 },
  { id: "final-6", label: "Closing CTA", thumbnail: `${assetBase}/final_6.jpg`, tags: ["demo asset", "cta"], shotType: "CTA support", trendFit: "Ending fit", matchReason: "Closes with the preorder handoff.", duration: 2400 },
];

export const mvpLibraryAssets: MediaAsset[] = [
  ...mvpBrandContext.card.visualProof.map((item): MediaAsset => ({
    id: `proof-${item.id}`,
    label: item.label,
    thumbnail: item.imageUrl ?? "",
    tags: ["demo asset", item.scoreLabel],
    shotType: item.tag,
    trendFit: item.tag,
    matchReason: `Labeled as ${item.tag.toLowerCase()} for the current campaign context.`,
  })),
  ...mvpMediaAssets,
];

const alternateClips: MediaAsset[] = [
  { id: "final-4-alt-1", label: "Trail movement alternate 1", thumbnail: `${assetBase}/final_4_alternative_1.jpg`, tags: ["demo asset", "movement"], shotType: "Movement proof", trendFit: "Middle proof", matchReason: "A tighter movement variation for the fourth beat." },
  { id: "final-4-alt-2", label: "Trail movement alternate 2", thumbnail: `${assetBase}/final_4_alternative_2.jpg`, tags: ["demo asset", "movement"], shotType: "Movement proof", trendFit: "Middle proof", matchReason: "A more product-forward movement variation." },
];

export const mvpTimelineSegments: TimelineSegment[] = [
  { id: "ts-1", kind: "clip", label: "Hook - fit problem", startMs: 0, endMs: 3200, mediaAssetId: "final-1", thumbnail: mvpMediaAssets[0].thumbnail },
  {
    id: "ts-2",
    kind: "text-overlay",
    label: "Hook text",
    startMs: 0,
    endMs: 3200,
    overlayText: "Regular hiking pants never fit my frame, so I built the pair I needed.",
    captionAlternates: [
      "I got tired of cuffing every hiking pant.",
      "Petite hikers deserve technical gear that actually fits.",
      "Built for shorter inseams, not scaled-down compromises.",
    ],
  },
  { id: "ts-3", kind: "clip", label: "Product reveal", startMs: 3200, endMs: 6000, mediaAssetId: "final-2", thumbnail: mvpMediaAssets[1].thumbnail },
  { id: "ts-4", kind: "missing", label: "Shot to film - movement proof", startMs: 6000, endMs: 8000, alternates: [mvpMediaAssets[2]] },
  { id: "ts-5", kind: "clip", label: "Trail movement", startMs: 8000, endMs: 12100, mediaAssetId: "final-4", thumbnail: mvpMediaAssets[3].thumbnail, alternates: alternateClips },
  { id: "ts-6", kind: "clip", label: "Fit detail", startMs: 12100, endMs: 15600, mediaAssetId: "final-5", thumbnail: mvpMediaAssets[4].thumbnail },
  {
    id: "ts-7",
    kind: "text-overlay",
    label: "CTA text",
    startMs: 15600,
    endMs: 18000,
    overlayText: "Join the preorder list for the first petite hiking pant drop.",
    captionAlternates: [
      "Preorder the petite hiking pant built from real fit testing.",
      "Get on the list before the first production run closes.",
    ],
  },
  { id: "ts-8", kind: "clip", label: "Closing CTA", startMs: 15600, endMs: 18000, mediaAssetId: "final-6", thumbnail: mvpMediaAssets[5].thumbnail },
  { id: "ts-9", kind: "audio", label: "Beat sync", startMs: 0, endMs: 18000, audioNote: "Optional beat reference - cut on hook, proof, and CTA moments." },
];

export const mvpChatHistory: ChatMessage[] = [
  {
    id: "msg-2",
    role: "user",
    content: "Build founder-led content from Petite Outdoors, a preorder goal, founder notes, and proof assets.",
    timestamp: 2,
    badges: [
      ...mvpBrandContext.sources,
      { id: "src-media", platform: "upload", label: "Demo assets" },
    ],
    step: "source-intake",
  },
  { id: "msg-3", role: "assistant", content: "Extracted business context is ready to review.", timestamp: 3, step: "brand-context-ready" },
  {
    id: "msg-4",
    role: "assistant",
    content: "I am matching this context against curated founder-led content formats.",
    timestamp: 4,
    step: "trend-search",
  },
  { id: "msg-5", role: "assistant", content: "I found three founder-led recipes with clear context fit.", timestamp: 5, step: "recipes-ready" },
];

export const mvpInitialToolCalls: SimulatedToolCall[] = [
  {
    id: "tool-extract-context",
    name: "extract_provided_context",
    label: "Extracting context from provided sources",
    state: "running",
    input: { sources: mvpBrandContext.sources.map((source) => source.label) },
    output: "Found audience, pain, preorder goal, founder voice, and proof moments.",
    durationMs: 900,
  },
  {
    id: "tool-index-media",
    name: "index_uploaded_media",
    label: "Indexing uploaded media",
    state: "pending",
    output: "Indexed demo assets across hook, proof, detail, and CTA support.",
    durationMs: 900,
  },
  {
    id: "tool-label-proof",
    name: "label_proof_assets",
    label: "Labeling proof moments",
    state: "pending",
    output: "Labeled opening hook, movement proof, product detail, and CTA support.",
    durationMs: 900,
  },
  {
    id: "tool-build-context",
    name: "build_business_context",
    label: "Creating extracted business context",
    state: "pending",
    output: "Created editable context for Petite Outdoors.",
    durationMs: 900,
  },
];

export const mvpFormatToolCalls: SimulatedToolCall[] = [
  {
    id: "tool-match-formats",
    name: "match_content_formats",
    label: "Matching against curated content formats",
    state: "running",
    input: { goal: "preorder launch", brand: mvpBrandContext.name },
    output: "Matched founder confessional, POV transformation, and before/after structures.",
    durationMs: 700,
  },
  {
    id: "tool-score-fit",
    name: "score_context_fit",
    label: "Scoring context fit",
    state: "pending",
    output: "Scored each format against proof moments, founder voice, and CTA.",
    durationMs: 700,
  },
  {
    id: "tool-build-recipes",
    name: "build_founder_led_recipes",
    label: "Generating founder-led content recipes",
    state: "pending",
    output: "Created three recipes with hooks, beats, assets, missing shots, caption, and CTA.",
    durationMs: 800,
  },
];

export const mvpStoryboardToolCalls: SimulatedToolCall[] = [
  {
    id: "tool-match-assets",
    name: "match_assets_to_storyboard",
    label: "Matching uploaded assets to storyboard beats",
    state: "running",
    output: "Matched hook proof, product detail, movement proof, and CTA support.",
    durationMs: 800,
  },
  {
    id: "tool-draft-storyboard",
    name: "draft_storyboard",
    label: "Drafting storyboard and asset matches",
    state: "pending",
    output: "Built an editable storyboard with one shot to film.",
    durationMs: 800,
  },
];

export const mvpExportTargets: ExportTarget[] = [
  { id: "markdown-brief", editor: "Markdown brief", description: "Download the edited content brief" },
  { id: "json-package", editor: "JSON package", description: "Download structured recipe and storyboard data" },
  { id: "shot-list-csv", editor: "Shot list CSV", description: "Download a filmable shot list" },
  { id: "copy-script", editor: "Copy script", description: "Copy the current script to the clipboard" },
];

export const mvpNodes: CanvasNode[] = [
  {
    id: "brand-ctx",
    kind: "brand-context",
    title: "Extracted Business Context",
    position: { x: 0, y: 0 },
    size: { width: 1000, height: 700 },
  },
  {
    id: "library",
    kind: "media",
    title: "Labeled Media",
    body: "Demo assets labeled by proof moment, hook fit, middle proof, ending fit, and CTA support.",
    position: { x: 0, y: 732 },
    size: { width: 1000, height: 420 },
  },
  {
    id: "recipe-1",
    kind: "video",
    title: "Founder Confessional",
    body: "\"Regular hiking pants never fit my frame, so I built the pair I needed.\"\nContext fit: Founder voice + fit proof + preorder CTA\nMissing shot: Trail movement proof to film",
    video: {
      src: "/videos/trend1.mp4",
      label: "format",
      meta: "Curated demo example",
      detailsImage: {
        src: `${assetBase}/founder_confessional.png`,
        alt: "Detailed breakdown of the Founder Confessional content format",
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
    title: "POV Transformation",
    body: "\"POV: you stopped tailoring every pair of hiking pants.\"\nContext fit: First-person pain + movement proof\nMissing shot: Before/after try-on beat",
    video: {
      src: "/videos/trend2.mp4",
      label: "format",
      meta: "Curated demo example",
    },
    position: { x: 1356, y: 0 },
    size: { width: 220, height: 391 },
  },
  {
    id: "recipe-3",
    kind: "video",
    title: "Before vs After",
    body: "\"Most outdoor brands vs gear made for your actual frame.\"\nContext fit: Side-by-side fit proof + product promise\nMissing shot: Clear comparison frame",
    video: {
      src: "/videos/trend3.mp4",
      label: "format",
      meta: "Curated demo example",
    },
    position: { x: 1616, y: 0 },
    size: { width: 220, height: 391 },
  },
  {
    id: "timeline-1",
    kind: "timeline",
    title: "Founder Confessional Storyboard",
    body: "6 clips, 1 shot to film, 2 text overlays\n18s total",
    position: { x: 1096, y: 583 },
    size: { width: 480, height: 280 },
  },
  {
    id: "preview-1",
    kind: "preview",
    title: "Storyboard Preview",
    body: "Preview the assembled storyboard from current clips, text, and shot placeholders.",
    imageUrl: mvpMediaAssets[0].thumbnail,
    position: { x: 1640, y: 533 },
    size: { width: 210, height: 380 },
  },
];

export const mvpConnections: CanvasConnection[] = [
  { id: "ctx-r1", sourceNodeId: "brand-ctx", targetNodeId: "recipe-1" },
  { id: "ctx-r2", sourceNodeId: "brand-ctx", targetNodeId: "recipe-2" },
  { id: "ctx-r3", sourceNodeId: "brand-ctx", targetNodeId: "recipe-3" },
  { id: "library-tl", sourceNodeId: "library", targetNodeId: "timeline-1" },
  { id: "r1-tl", sourceNodeId: "recipe-1", targetNodeId: "timeline-1" },
  { id: "tl-prev", sourceNodeId: "timeline-1", targetNodeId: "preview-1" },
];

export const mvpStepLabels: Partial<Record<AiFlowStep, string>> = {
  analysis: "Extracting Context",
  "brand-context-ready": "Context Ready",
  "trend-search": "Matching Formats",
  "recipes-ready": "Founder-Led Recipes Ready",
  "recipe-selected": "Recipe Selected",
  "timeline-ready": "Storyboard Ready",
  "export-ready": "Export Ready",
};
