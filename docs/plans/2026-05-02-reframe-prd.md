# Reframe PRD

Date: 2026-05-02

## Summary

Reframe helps solo founder-led ecommerce brands turn existing media into trend-native short-form video timelines. It extracts the creative recipe behind high-performing videos, organizes the founder's media library, matches the right clips to each recipe moment, and produces an editable timeline assembly that can be exported to a dedicated video editing app.

The first demo uses Petite Outdoors as the seeded customer. Petite Outdoors is a pre-launch outdoor apparel brand for women 5'4" and under. The demo goal is to show how Reframe can help the founder convert brand context, product media, trend recipes, hook text, audio timing, and existing clips into a preorder-oriented Reel/TikTok assembly.

This PRD defines a frontend-only investor/demo MVP. All AI outputs, media analysis, imports, clip matching, timeline assembly, preview, and export states are seeded mock data. The demo does not require a real backend, scraping, AI inference, upload processing, video rendering, account system, or third-party integrations.

## Product Thesis

Founder-led ecommerce brands often have enough raw media, product context, and brand story, but they do not know which clips to use, how to structure them into trend-native videos, or how to adapt trending hooks, camera patterns, pacing, and audio to their own products.

Reframe solves the hard pre-editing step: it finds a relevant video trend recipe, maps that recipe to the brand's media library, and assembles a timeline that is already close enough to preview, adjust, and export.

The core promise is:

> Paste your brand links, connect where your media lives, choose a trend recipe, and Reframe assembles a ready-to-edit short-form video timeline using your own clips.

## Target User

The first target user is a solo founder-led ecommerce brand selling visually demonstrable products through Shopify or a similar storefront, with Instagram, TikTok, YouTube Shorts, and Reels as primary growth channels.

The first demo customer is Petite Outdoors:

- Pre-launch ecommerce apparel brand.
- Product category: outdoor apparel for petite women.
- Audience: women 5'4" and under who struggle with standard outdoor gear proportions.
- Conversion goal: drive Spring 2026 preorders.
- Strong content ingredients: fit frustration, outdoor movement, product proof, founder story, engineering/design credibility, inclusive technical gear positioning.

## Goals

- Show that Reframe can understand a brand from links and media sources.
- Show that trending videos can be broken into practical creative recipes, not just topic summaries.
- Show that a founder's existing media can be organized by AI into usable clip intelligence.
- Create the main wow moment: a timeline auto-populated with clips that match the selected trend recipe.
- Make missing media obvious and actionable through black timed placeholders.
- Let users swap clips, hooks, captions, and media options with minimal friction.
- Produce a convincing mock preview and generic export handoff for dedicated video editors.

## Non-Goals

- No real backend.
- No real AI/model calls.
- No real scraping.
- No real third-party OAuth integrations.
- No production upload pipeline.
- No true iCloud sync.
- No real video rendering.
- No publishing to social platforms.
- No full video editor.
- No auth, billing, or multi-user workspace.
- No production-grade trend detection or audio licensing system.

## Core User Flow

### 1. Chat-First Landing Page

The first screen is a ChatGPT-style chat interface. The user is invited to paste a website, Instagram, TikTok, YouTube, Shopify/storefront, founder profile, product page, or plain-language brand description.

When users paste links, Reframe renders them as clean source badges rather than plain text walls. Example badges:

- Website
- Instagram
- TikTok
- YouTube
- Shopify
- LinkedIn
- Google Drive
- Upload folder

The demo should make context collection feel conversational and low-friction, not like a long onboarding form.

### 2. Context And Media Intake

After the user provides brand links, Reframe asks where the user's media lives. The demo should show multiple import options:

- Upload files or a folder.
- Pick from phone camera roll.
- Connect Google Drive.
- Connect Shopify or website product media.
- Connect Instagram.
- Connect TikTok.
- Connect YouTube.

For the demo, each option uses seeded mock results. Google Drive, Shopify/website, Instagram, TikTok, and YouTube should appear as intended future connectors. The PRD should not claim that iCloud Photos is a primary web connector, because broad iCloud Photos sync is not a practical first web SaaS integration.

### 3. Simulated AI Analysis

Reframe shows scripted progress states:

- Reading website and social links.
- Inferring brand context.
- Syncing media sources.
- Indexing clips and product media.
- Detecting reusable clip moments.
- Extracting trend recipes from relevant videos.
- Matching clips to recipe moments.
- Timing cuts to trending audio.

These states are frontend-only and backed by seeded data.

### 4. Canvas Handoff

The chat transitions into an infinite creative canvas. The first canvas view shows:

- Brand Context node.
- Trend Recipe cards.
- Bottom-center chatbox for asking Reframe to refine, explain, or generate from the current canvas context.
- Collapsible left-side chat history panel for prior onboarding messages, analysis steps, and user prompts.
- Access to a collapsible media library side panel.

The canvas should feel like the main workspace. Reframe is not a dashboard-first SaaS app. After onboarding, chat remains available as a persistent canvas control rather than a separate page.

### 5. Trend Recipe Selection

The user selects one trend recipe. A trend recipe is a breakdown of observed creative patterns across trending short-form videos. It must describe the repeatable production formula, not merely the content topic.

Each recipe should include:

- Trend name.
- Observed pattern.
- Opening frame.
- Camera angles.
- Movement and blocking.
- Edit pattern.
- Hook formula.
- On-screen text formula.
- Audio and pacing notes.
- Content substance.
- Why it converts for the brand.
- Best-fit products and assets.

### 6. Timeline Assembly

Selecting a recipe creates one recommended editable timeline assembly. The timeline is not a full video editor. It is an AI-generated assembly plan that resembles an Adobe-style timeline on the infinite canvas.

The timeline includes:

- Matched media clips from the AI-organized media library.
- Clip durations and timing.
- Black timed placeholders for missing clips.
- Hook text and caption overlays.
- Alternate hook/caption variants.
- Trending audio metadata and beat markers.
- Match reasoning for each selected clip.
- Swap controls for clips and text.

### 7. Swap And Complete

Users can adjust the assembly without starting from scratch.

Expected interactions:

- Hover or click a timeline segment to reveal alternate matching clips.
- Alternatives appear in a compact popover or right-side inspector.
- Each alternate includes a thumbnail, short label, duration, and match reason.
- Clicking an alternate replaces the current clip and updates the timeline visually.
- Text overlay segments expose three hook or caption variants, with the AI's best suggestion selected by default.
- Missing black segments show direct actions: Upload/film this shot and Generate with AI.
- Upload and AI generation are simulated with seeded frontend states.

Clip swapping must be one of the most intuitive interactions in the product. The user should understand that Reframe did the first assembly, but they retain easy creative control.

### 8. Preview And Export

The user can open a mock short-form video preview of the assembled timeline. The preview should look convincing enough for an investor demo, even though no real rendering occurs.

Export should be framed as a handoff to dedicated editing tools, not as final rendering inside Reframe.

Supported export targets in the product vision:

- CapCut.
- Adobe/Premiere.
- DaVinci Resolve.
- Other dedicated video editing apps.
- Generic timeline handoff.

For the demo, export is mocked. The generic handoff package should communicate:

- Ordered clips.
- Clip timing.
- Text overlays and caption timing.
- Audio reference and beat timing.
- Missing asset prompts.
- Hook and CTA variants.
- Timeline structure.

## Key Surfaces

### Chat Landing

The chat landing page is the first product experience.

Requirements:

- Large central conversational input.
- Link badges when sources are pasted.
- Suggested source types.
- Scripted follow-up questions.
- Simulated AI progress.
- Smooth transition into the canvas.

### Canvas Chat

After the user enters the canvas, chat remains part of the workspace.

Requirements:

- Persistent chatbox anchored at the bottom center of the infinite canvas.
- Collapsible left-side chat history panel.
- Chat history panel shows the onboarding conversation, source intake, simulated AI analysis steps, and later canvas prompts.
- The collapsed state should preserve canvas space while making chat history easy to reopen.
- The bottom chatbox should feel contextual to the current canvas selection, so users can ask Reframe to adjust trend recipes, explain media matches, regenerate timeline sections, or suggest missing shots.

### Brand Context Node

The Brand Context node summarizes what Reframe inferred from the user's links and media sources.

For the demo, it does not need to be editable. It should look like a polished AI-generated rich-text section.

It should include:

- Brand summary.
- Products.
- Target customer.
- Customer pain.
- Founder story.
- Brand voice.
- Visual style.
- Conversion goal.
- Preorder CTA.

For Petite Outdoors, the seeded Brand Context should communicate:

- Outdoor apparel for women 5'4" and under.
- Technical gear engineered for petite proportions.
- Standard outdoor gear is too long, poorly proportioned, and hard to tailor.
- Founder credibility and design/engineering point of view.
- Spring 2026 preorder objective.

### Trend Recipe Cards

Trend Recipe cards are central to the product's differentiation.

A card should not say only "petite women struggle with outdoor pants." It should say something closer to:

- Trend: Side-by-side fit failure demo.
- Observed pattern: creator opens with visible fit issue, then cuts to movement proof.
- Opening frame: close-up of bunched fabric or dragging hem.
- Camera angles: mirror fit check, low trail angle, product macro, side-by-side comparison.
- Movement: pulling waistband/hem, walking uphill, turning to show fit, stepping over trail obstacle.
- Edit pattern: snap cut from frustration to solution, timed to beat.
- Hook formula: "This is why regular hiking pants never worked for me."
- On-screen text: "Petite hikers know this problem."
- Why it converts: makes the product problem visible in under two seconds and creates preorder urgency.

### Media Library Side Panel

The media library should be a side panel or drawer that can be opened, closed, and reopened. It should not dominate the core canvas.

It should show seeded assets grouped and labeled by AI:

- Product shown.
- Shot type.
- Location or context.
- Visual quality.
- Motion and camera angle.
- Use case.
- Trend-fit score.
- Best-used-for labels.

Example labels:

- Fit proof.
- Founder credibility.
- Trail movement.
- Product detail.
- CTA support.
- Opening hook candidate.
- Beat cut candidate.

### Editable Timeline

The timeline is the primary wow moment.

It should show:

- Video track with clips.
- Text/caption overlay layer.
- Audio track with beat markers.
- Clip durations.
- Missing black placeholder sections.
- Selected segment state.
- Alternate clip suggestions.
- Match reasoning.
- Preview/export controls.

It should feel more like an AI assembly timeline than a heavy editing app.

## Seeded Data Requirements

The frontend demo should include seeded data for:

- `sources`: Petite Outdoors website, Instagram, optional TikTok/YouTube/Shopify/Google Drive badges.
- `brandContext`: brand summary, products, audience, founder story, voice, CTA.
- `mediaAssets`: clips/photos with thumbnail, duration, product, shot type, tags, quality score, transcript or visual description, and trend-fit labels.
- `trendRecipes`: video recipes with creative breakdown, conversion rationale, audio pattern, and required timeline moments.
- `timelineSegments`: ordered clip slots with duration, selected media, alternate media, overlay text, hook variants, match reason, and missing-state actions.
- `audioTrack`: trending audio metadata, beat markers, cut timing, and pacing notes.
- `preview`: mocked assembled Reel/TikTok preview state.
- `exports`: mocked export targets and generic handoff package.

## Success Criteria

The demo succeeds if a viewer understands within 60 to 90 seconds that Reframe can:

- Understand an ecommerce brand from links and source badges.
- Break trending videos into practical creative recipes.
- Organize a founder's media library intelligently.
- Auto-match clips to a trend recipe.
- Assemble a usable timeline with clips, hooks, captions, and audio timing.
- Show missing media clearly.
- Let users swap clips and text without editing from scratch.
- Produce a mock preview and export path for real editing tools.

The primary reaction Reframe should produce is:

> This saves me from figuring out which clips to use and how to structure them for trends.

## Future Connector Direction

The first real connector priorities are:

- Instagram.
- TikTok.
- YouTube.
- Shopify or website product media.
- Google Drive.

Additional possible import paths:

- Local file upload.
- Folder upload.
- Mobile camera roll.
- Dropbox.
- Google Photos picker-style selection.

iCloud Photos should not be positioned as a primary web connector until a practical product path is validated.

## Open Questions

- Which real connector should be built first after the demo?
- Should Reframe eventually support mobile-native media sync?
- Which export handoff should be prioritized first: generic timeline, CapCut, Adobe/Premiere, or DaVinci Resolve?
- How much editing should happen inside Reframe before it becomes too close to a full video editor?
- Should trend recipes come from user-provided reference videos, platform trends, competitor accounts, or a curated Reframe recipe library?
- Should Reframe optimize for organic content, paid ads, or both?
- Which conversion signal should later versions optimize for: preorder clicks, watch time, saves, comments, CTR, purchases, or creator feedback?
- How should copyright and licensing around trending audio be handled in the real product?

## Research Notes

Current research suggests:

- Ecommerce/creator commerce has a strong fit for video-first content workflows and conversion-oriented social media.
- The core product should focus on trend recipes and media matching rather than generic AI copywriting.
- Google Drive, Shopify, and platform/social connectors are more credible product directions than iCloud Photos for a web-first app.
- Google Photos is better treated as picker-style selection rather than full-library sync because broad library access changed in 2025.
- Dedicated video editors should remain the final editing/rendering destination. Reframe should own the creative assembly layer.
