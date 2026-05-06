# Reframe Demo Audit

## 1. Executive Summary

The `/demo` experience currently communicates a seeded, frontend-only workflow where Reframe turns an already-connected business context into short-form content ideas, trend-matched recipes, an editable timeline, and a mock preview/publish handoff.

The strongest product story is: “Reframe uses your company’s product positioning, visual proof, audience, source links, and existing media to create founder-led short-form content.” The demo mostly supports that thesis through the Petite Outdoors example: brand context is extracted, visual proof is labeled, trend signals are identified, a trend recipe is chosen, media is matched into an 18-second timeline, and the user can make small edits.

The weakest product story is backend reality. Search, ingestion, syncing, media analysis, AI generation, export, publishing, and engagement metrics are all represented as simulated frontend behavior. They should be described as demoed/mocked unless a real backend exists outside the visible UI.

Overall: the demo is directionally aligned with the founder-led/business-context thesis, but it currently risks overpromising live integrations, live trend search, direct publishing, analytics, and learning loops.

## 2. Assumed Product Model

### What happens before `/demo`

Before the demo begins, the user appears to have already provided business and media context. The chat history implies the user submitted:

- Product links.
- Social profiles.
- Product media.
- Camera roll footage.
- A campaign goal: “pre-order launch.”
- A brand/product: Petite Outdoors.

The UI does not show the actual ingestion form on `/demo`; it only shows the result of that previous step.

### What `/demo` represents

`/demo` represents the post-ingestion workspace after Reframe has:

- Read brand sources.
- Synced media.
- Detected reusable content moments.
- Built a reusable brand context.
- Searched for trend patterns.
- Generated three trend-aligned recipes.
- Allowed the user to select a recipe.
- Assembled a timeline and preview.

### What data/context seems pre-seeded

The demo is seeded around the example brand “Petite Outdoors,” including:

- Website/social source badges:
  - `petiteoutdoors.com`
  - Instagram
  - TikTok
  - YouTube
  - Shopify
- Source badges shown in chat:
  - Product media
  - Camera roll
- Brand context:
  - Tagline
  - Audience
  - Pain
  - Desired identity
  - Conversion goal
  - Success definition
- Visual proof library:
  - Fit proof
  - Movement proof
  - Product detail
  - Founder POV
  - CTA support
- Trend signals:
  - Before/after
  - Fit failure
  - Founder POV
  - Trail test
  - Problem-solution
  - Micro demo
- Script rules:
  - Show problem in first 2 seconds
  - Avoid body-shaming
  - Lead with product proof
  - Use specific fit language
  - CTA: preorder, not sale
- Timeline assets and alternates:
  - Hook fit problem
  - Product reveal
  - Missing movement-proof shot
  - Trail movement
  - Fit detail
  - Closing CTA
  - Beat-synced audio

### What is mocked vs. interactive

#### Clearly mocked/simulated

- AI source reading.
- Media syncing.
- Reusable moment detection.
- Brand context generation.
- Web/Instagram/TikTok trend search.
- Trend recipe generation.
- Timeline auto-fill.
- AI missing-shot generation.
- Export preparation.
- Preview download.
- Instagram publish.
- Engagement metrics after publishing.

These are presented through timed frontend state changes, tool-call style messages, toasts, and seeded metrics.

#### Actually interactive in the frontend

- Chat panel collapse/expand.
- Prompt submission into chat.
- Canvas node selection.
- Canvas node movement.
- Canvas node deletion.
- Trend video hover/focus playback.
- “More details” modal for at least one trend video.
- Generate timeline from a trend recipe.
- Open timeline drawer.
- Select timeline segments.
- Fill missing shot using simulated AI.
- Fill missing shot using upload-style button, though it behaves like a seeded swap.
- Swap alternate clips.
- Choose alternate caption text.
- Timeline hover scrubber / floating preview.
- Export dropdown on selected timeline.
- Download preview action on selected preview.
- Post to Instagram action on selected preview.
- Mock publish progress and mock metrics display.

## 3. User Flow Map

1. User enters `/demo`.
2. System shows a left chat panel with a seeded user message: “Match Petite Outdoors to a trend for a pre-order launch…”
3. System begins an automatic analysis sequence.
4. User sees tool-call style activity:
   - Reading website and social links.
   - Syncing media.
   - Detecting reusable moments.
   - Creating brand context.
5. System reveals a Brand Context canvas card.
6. Brand Context shows:
   - Thesis/tagline.
   - Audience.
   - Pain.
   - Desired identity.
   - Conversion goal.
   - Success definition.
   - Visual proof library.
   - AI decision signals.
   - Trend matching signals.
   - Script rules.
   - Tone.
   - Do/avoid guidance.
7. System reveals a Library card.
8. Library shows AI-organized photo/media thumbnails, tag count, and trend-fit language.
9. System starts a trend-search sequence.
10. User sees simulated tool calls:
    - Searching the web.
    - Searching Instagram.
    - Searching TikTok.
    - Generating trend recipes.
11. System reveals three trend video/recipe nodes:
    - Founder Confessional.
    - POV Trail Transformation.
    - Before vs After On The Trail.
12. User can hover/focus trend videos.
13. System plays the muted looped video preview and hides video chrome while active.
14. User can click “More details” on at least the first trend.
15. System opens a modal with a detailed visual trend breakdown image.
16. User can close the modal via X or overlay.
17. User can click the plus button below any revealed trend node.
18. System treats the selected trend as the recipe choice.
19. System adds a chat message: “Use [trend title].”
20. System starts timeline-generation tool calls:
    - Matching clips to recipe moments.
    - Auto-filling timeline.
21. System reveals a timeline node and a preview node.
22. Timeline node shows:
    - Title: Founder Confessional.
    - Gap count.
    - Clip strip.
    - Text overlay row.
    - Audio beat preview.
    - Duration/clips/overlay metrics.
23. User can click/select the timeline node.
24. A selection toolbar appears above the node.
25. User can open the export dropdown.
26. System shows export targets:
    - CapCut.
    - Adobe Premiere Pro.
    - DaVinci Resolve.
27. User can select an export target.
28. System shows a toast: “Prepared [editor] export.”
29. User can click the timeline node when ready.
30. System opens a bottom timeline drawer.
31. Drawer shows:
    - Floating vertical preview.
    - Timeline track ruler.
    - Video Track.
    - Text Overlay.
    - Audio (Beat).
    - Timeline scrubber on hover.
32. User can select a video segment.
33. If segment has alternates, system shows alternate clip cards.
34. User can click an alternate.
35. System swaps the clip in the local timeline state.
36. User can select the missing-shot segment.
37. System shows missing-shot actions:
    - Generate with AI.
    - Drag and drop or click to upload video.
38. User can click “Generate with AI.”
39. System briefly shows generating state.
40. System fills the missing shot using a seeded generated asset and labels it AI generated.
41. User can click the upload-style missing-shot button.
42. System fills the missing shot using the seeded asset; no real upload picker is proven.
43. User can select the text overlay segment.
44. If caption alternates are available, user can open a dropdown.
45. System shows suggested captions.
46. User can choose a caption.
47. System updates the overlay text.
48. User can hover over the timeline track.
49. System shows a scrubber and updates the floating preview time.
50. User can close the timeline drawer.
51. If a missing shot was changed, system focuses camera back on the preview node.
52. User can select the preview node.
53. A selection toolbar appears above the preview.
54. User can click Download preview.
55. System shows toast: “Preview download ready.”
56. User can click Post to Instagram.
57. System shows toast: “Preview publish queued.”
58. System displays a publish card under the preview node.
59. Publish card shows progress: publishing to Instagram.
60. System marks the post as published/live.
61. System displays mock metrics:
    - Views.
    - Likes.
    - Saves.
    - Shares.
    - Reach.
    - Engagement rate.
62. After a delay, metrics increase.
63. System zooms back out to show the overall canvas.
64. User can submit a prompt in the left chat, e.g. “Make this more direct.”
65. System appends the user prompt and runs simulated tool calls:
    - Reading current canvas context.
    - Preparing next edit options.
66. System responds with a generic completion message.
67. Outcome is unclear: the prompt does not visibly change the canvas, timeline, preview, or copy.
68. User can delete selected nodes.
69. Deleted nodes disappear from the canvas.
70. Deletion has no confirmation/undo shown.
71. Some transitions are dead ends:
    - No path back to ingestion.
    - No real export file.
    - No real upload picker.
    - No account/settings/integration management.
    - No visible multi-platform publishing beyond Instagram.
    - No visible learning/preferences memory update after edits.

## 4. Feature Inventory

| Feature | What the UI Shows | User Value | Status: Visible / Implied / Mocked / Missing / Unclear | Notes |
|---|---|---|---|---|
| Pre-demo source ingestion | Chat history references product page, store, social profile, product description, product links, footage moments, product media, and camera roll | Explains why Reframe already knows the business | Implied | Ingestion UI is not visible on `/demo`. |
| Website/social link reading | Simulated tool call: “Reading website and social links” | Converts existing business sources into context | Mocked | No live fetch or source viewer is proven. |
| Media syncing | Simulated tool call: “Syncing media” | Pulls existing clips/photos into workspace | Mocked | Uses seeded assets. |
| Media import sources | Data/model includes Upload Folder, Phone Camera Roll, Google Drive, Shopify, Instagram, TikTok, YouTube | Shows intended source types | Implied | Import UI is not visible as an actionable connector on `/demo`. |
| Brand context generation | Brand Context card with thesis, audience, pain, desired identity, conversion goal, success definition | Turns raw sources into reusable marketing memory | Visible | Generated by mocked timed state. |
| Visual proof library | Grid of proof images labeled by use case and fit score | Shows which existing media supports content moments | Visible | Uses seeded assets. |
| AI media labeling | Labels like fit proof, movement proof, founder POV, CTA support; “AI-labeled 100%” | Helps users reuse existing media intelligently | Visible / Mocked | Labels are visible, but AI process is simulated. |
| ICP/audience identification | Brand Context includes audience and pain | Keeps content targeted | Visible | Not named “ICP,” but audience targeting is clearly represented. |
| Conversion goal extraction | “Spring 2026 preorders” and preorder CTA guidance | Ties content to business outcome | Visible | Strong fit with founder assumptions. |
| Tone/style extraction | Tone bars and do/avoid rules | Keeps generated content on-brand | Visible | No editing of tone/rules is shown. |
| Trend matching signals | Ranked trend signals with High/Medium levels | Explains why certain trends fit the brand | Visible | Signals are seeded. |
| Live trend search | Chat says it searches web, Instagram, TikTok, YouTube Shorts, competitor posts | Suggests current trend discovery | Mocked | No real external data or timestamps visible. |
| Trend recipe generation | Three trend video nodes with hooks/formats/match scores in data and visible cards/videos | Gives users content directions matched to business context | Visible / Mocked | Recipe results are seeded. |
| Trend video preview | Hover/focus plays muted video nodes | Helps user evaluate trend formats | Visible | Good interactive moment. |
| Trend breakdown modal | “More details” opens visual breakdown for at least the first trend | Explains structure of a trend | Visible | Appears limited to trend nodes with `detailsImage`; not all trends necessarily have detail modals. |
| Trend cloning / timeline creation | Plus button below trend node generates timeline | Converts trend pattern into a brand-specific timeline | Visible | Better described as “generate a timeline from a trend recipe” than “clone trend.” |
| Canvas UI | Infinite canvas with nodes and connections | Spatially maps context → trend → timeline → preview | Visible | Core demo surface. |
| Node connections | Lines connect brand context to trends, library to timeline, timeline to preview | Shows provenance/flow | Visible | Helpful visual metaphor. |
| Node movement | Canvas nodes can be dragged | Lets user arrange workspace | Visible | No persistence shown. |
| Node deletion | Selection toolbar includes delete | Lets user clean canvas | Visible | No undo/confirmation. |
| Timeline auto-assembly | Tool call and timeline node show assembled short-form structure | Saves editing setup time | Mocked / Visible result | Timed frontend state creates it. |
| Editable timeline | Bottom drawer shows video/text/audio tracks, selectable segments, alternates, caption options | Lets user refine generated content | Visible | Editing is limited but real in frontend state. |
| Missing-shot detection | Timeline shows one gap and a missing-shot segment | Tells user what content is needed | Visible | Strong thesis fit: product uses business media but identifies gaps. |
| AI missing-shot generation | “Generate with AI” fills missing shot and labels it AI generated | Fills gaps without filming | Mocked | Uses seeded asset after 650ms; no prompt/control shown. |
| Upload missing-shot replacement | “Drag and drop or click to upload video” button | Suggests user can add a missing clip | Unclear / Mocked | Button swaps seeded asset; no picker/dropzone proven. |
| Clip alternates | Alternate clip cards appear for eligible segments | Enables fast creative variation | Visible | Only visible for segments with seeded alternates. |
| Caption alternates | Dropdown with suggested captions for text overlay | Lets user choose message variants | Visible | Caption editing is selection-based, not freeform. |
| Audio beat track | Audio waveform/beat markers shown | Indicates timing and rhythm | Visible | No audio selection/editing shown. |
| Preview generation | Preview node and floating drawer preview show assembled video | Lets user review final short-form content | Visible | Mock preview from seeded segments. |
| Preview download | Selection toolbar action shows “Preview download ready” toast | Suggests exportable media file | Mocked | No downloaded file is proven. |
| Export to CapCut | Timeline export dropdown includes CapCut | Supports handoff to external editor | Mocked | Toast only. |
| Export to Premiere Pro | Timeline export dropdown includes Adobe Premiere Pro | Supports professional editing handoff | Mocked | Toast only. |
| Export to DaVinci Resolve | Timeline export dropdown includes DaVinci Resolve | Supports professional editing handoff | Mocked | Toast only. |
| Direct Instagram publishing | Preview toolbar includes “Post to Instagram”; progress and live status shown | Suggests one-click social publishing | Mocked | No auth/account/channel picker visible. |
| Direct LinkedIn/TikTok publishing | Founder assumption lists social platforms broadly | Multi-channel distribution | Missing | Only Instagram posting is visible in `/demo`. |
| Engagement metrics | After mock publish: views, likes, saves, shares, reach, engagement rate | Shows post outcome | Mocked | Metrics are seeded frontend counters. |
| Learning from edits/performance | Prompt response references current canvas; metrics appear after publish | Could imply feedback loop | Missing / Unclear | No preference update, memory update, or performance-based recommendation is visible. |
| Live chat | Left chat input says “Ask Reframe anything…” | Lets user ask for changes/contextual help | Visible | Response is generic and does not visibly modify output. |
| Canvas prompt source image | Chat can include selected asset image when a selected node has image URL | Contextual prompting | Implied | UI supports selected asset thumbnail, but this is not central in the visible product story. |
| Smart media | Library says assets are AI-organized and matched to trend moments | Reuses existing media in trends | Visible / Mocked | Good feature, but should be phrased precisely. |
| AI image generation from context | Missing-shot “Generate with AI” fills a video/image-like segment | Fills visual gaps | Mocked / Unclear | UI says generate shot, not specifically AI image generation. |
| Collaboration/settings | No team, invite, brand settings, account settings, or workspace settings visible | Operational use | Missing | Do not claim. |

## 5. Refined Feature List

### Context ingestion

- Accept business context from product pages, social profiles, product media, and camera roll footage.
- Convert connected sources into a campaign-specific working context.
- Support intended source types including uploads, phone camera roll, Google Drive, Shopify, Instagram, TikTok, and YouTube.

### Founder/business memory

- Build a reusable brand context from connected sources.
- Extract audience, pain, desired identity, conversion goal, success definition, tone, and content rules.
- Identify visual proof moments from existing media, such as founder POV, fit proof, product detail, movement proof, and CTA support.
- Label media by brand fit and content-use case.

### Content generation

- Generate trend-matched short-form content recipes from the business context.
- Turn a selected trend recipe into an editable video timeline.
- Match existing brand media to the moments required by the selected recipe.
- Detect missing proof shots in the timeline.

### Trend/context matching

- Rank trend signals based on how well they match the business, audience, and campaign goal.
- Show multiple trend directions with different hooks, formats, lengths, and fit scores.
- Provide a visual trend breakdown for supported trend examples.

### Editing workflow

- Edit generated timelines through a video/text/audio track drawer.
- Swap suggested alternate clips into timeline segments.
- Choose from alternate caption overlays.
- Fill missing-shot slots with simulated AI generation or upload-style replacement.
- Scrub the timeline and preview timing.

### Export/publishing

- Export prepared timelines to CapCut, Adobe Premiere Pro, or DaVinci Resolve.
- Download a preview.
- Simulate posting the preview to Instagram.
- Show publish progress and post-publish status.

### Analytics/performance

- Display simulated Instagram post metrics after publishing:
  - Views
  - Likes
  - Saves
  - Shares
  - Reach
  - Engagement rate

### Canvas workflow

- Use a spatial canvas to connect source-derived context, media library, trend recipes, timeline, and final preview.
- Select, move, and delete workspace nodes.
- Use the chat panel to ask Reframe for contextual changes, though visible output changes are currently limited.

## 6. Removed or Unsupported Claims

- Claim: “Reframe has live document/social link ingestion.”
  - Verdict: Not supported on `/demo`.
  - Recommendation: Say “The demo starts after sources have been connected” or “Designed to ingest product pages, social profiles, and media sources.”

- Claim: “Reframe identifies ICPs.”
  - Verdict: Partially supported.
  - Recommendation: Rephrase as “Extracts audience, pain, desired identity, and conversion goal from business context.”

- Claim: “Reframe does live trend identification.”
  - Verdict: Mocked.
  - Recommendation: Say “Simulates trend search and trend matching from brand context” unless live search exists.

- Claim: “Reframe clones trends.”
  - Verdict: Vague and potentially misleading.
  - Recommendation: Rephrase as “Turns a trend format into a brand-specific timeline using your existing context and media.”

- Claim: “Smart media takes existing content and integrates into a trend.”
  - Verdict: Supported as a demo concept.
  - Recommendation: Use precise wording: “Labels existing media by proof moment and matches clips into trend recipe slots.”

- Claim: “Reframe has an editable timeline.”
  - Verdict: Supported.
  - Recommendation: Keep, but specify current visible edits: clip swaps, caption alternates, missing-shot fill, and timeline preview/scrub.

- Claim: “Reframe has AI image generation from context.”
  - Verdict: Not clearly supported.
  - Recommendation: Rephrase as “Simulated AI missing-shot generation” unless actual image generation exists.

- Claim: “Reframe exports to CapCut.”
  - Verdict: Mocked in demo.
  - Recommendation: Say “Shows an export handoff option for CapCut” until a file/package is generated.

- Claim: “Reframe directly exports to Instagram, LinkedIn, etc.”
  - Verdict: Only Instagram is visible, and it is mocked.
  - Recommendation: Say “Simulates posting to Instagram.” Do not claim LinkedIn/TikTok publishing from this demo.

- Claim: “Reframe tracks metrics and engagement.”
  - Verdict: Mocked.
  - Recommendation: Say “Shows simulated post-publish metrics” unless real platform analytics exist.

- Claim: “Reframe learns from performance data.”
  - Verdict: Not supported.
  - Recommendation: Rephrase as “Designed to learn from edits and performance signals” or omit from current demo claims.

- Claim: “Live chat can talk to the bot at any time for any change.”
  - Verdict: Partially supported.
  - Recommendation: Say “Contextual chat accepts prompts and simulates analysis, but visible edits are not yet applied automatically.”

- Claim: “Canvas UI + nodes for alternative versions.”
  - Verdict: Canvas UI is supported; alternative versions as separate nodes are not clearly shown.
  - Recommendation: Say “Canvas UI connects context, trend recipes, timeline, and preview.” Do not claim version branching unless visible.

## 7. Missing Features / Product Gaps

### P0: Demo needs a clearer pre-demo context summary

The user lands in a post-processed workspace, but the core differentiator depends on understanding that Reframe works from connected business context. The seeded chat implies this, but the transition is easy to miss.

Recommendation:

- Add a non-blocking intro/annotation that says `/demo` starts after source connection.
- Suggested copy: “Demo state: Petite Outdoors already connected product pages, social profiles, product media, and camera roll clips.”
- Suggested copy: “Reframe has processed those sources into brand context, proof moments, and reusable media.”

### P0: Mocked backend behavior needs visible labeling

The UI presents “Searching the web,” “Searching Instagram,” “Post to Instagram,” and metrics as if live. Because the app is frontend-only, this can create credibility risk in investor/customer demos.

Recommendation:

- Add subtle “Demo simulation” or “Seeded demo” labels around tool calls, export, publish, and metrics.
- Specifically label simulated post-publish metrics.

### P0: Chat prompts do not visibly change the canvas or generated content

The prompt box says “Ask Reframe anything…,” but submitted prompts produce a generic response and no visible content change. This makes live chat feel cosmetic.

Recommendation:

- Support a few deterministic demo-safe prompt intents.
- Example: “make it more direct” updates the overlay caption.
- Example: “fill the gap” fills the missing segment.
- Example: “show alternates” opens/focuses the timeline drawer and selects a segment with alternates.

### P0: Upload action is misleading

The missing-shot button says “Drag and drop or click to upload video,” but clicking it swaps in a seeded asset. Users may assume real upload works.

Recommendation:

- If keeping it mocked, rename it to “Use seeded uploaded clip” or “Simulate upload fill.”
- If implementing real local upload, add a file input and local preview. Do not imply backend upload unless implemented.

### P1: Learning loop is not visible

The product thesis says Reframe should improve over time from edits, editorial decisions, past posts, and performance. The demo shows edits and metrics but does not show those signals feeding back into memory or future suggestions.

Recommendation:

- Add a frontend-only learning-loop card or assistant message after a timeline edit or simulated publish.
- Suggested copy: “Reframe saved this editorial preference: direct fit-proof hooks outperform generic empowerment copy.”
- Suggested copy: “This post’s saves/shares will inform future trend matches.”

### P1: Direct publishing appears Instagram-only despite broader social-platform assumptions

The founder list mentions Instagram, LinkedIn, etc. The visible publish action only posts to Instagram.

Recommendation:

- Either narrow copy to “Instagram publishing” or add a clearly mocked platform chooser.
- If adding a chooser, label destinations as simulated or coming soon unless they work.

### P1: Trend details are uneven

At least one trend supports “More details,” but the other trend cards may not expose equivalent breakdowns. This makes the trend-explanation model feel inconsistent.

Recommendation:

- Provide consistent breakdown affordances for all trend nodes, or make unavailable detail states explicit.

### P1: “AI image generation” is not clearly represented

The UI says “Generate with AI” for a missing shot, but the output is a timeline clip using a seeded asset. It is unclear whether this is image generation, video generation, or generated stock/proof media.

Recommendation:

- Rename to “Generate missing shot,” “Simulate AI shot,” or “Create AI visual fill.”
- Add helper text explaining whether this is generating an image, video clip, or placeholder proof frame.

### P1: Export actions do not prove files are created

The export dropdown shows CapCut/Premiere/DaVinci and then a toast. There is no export package, file, or handoff panel.

Recommendation:

- Show a richer frontend-only export confirmation.
- Example: target editor, included tracks, assets, captions, and “Demo export prepared.”
- Example fake package filename: `petite-outdoors-founder-confessional-capcut.zip`.

### P1: Metrics do not connect to business outcomes

The demo has engagement metrics, but the business goal is preorders. There is no CTA click, waitlist/preorder proxy, or conversion signal.

Recommendation:

- Add a conversion-oriented simulated metric such as “Preorder clicks,” “Profile taps,” “CTA clicks,” or “Landing visits.”

### P2: Canvas deletion can create confusing dead ends

Users can delete important nodes from the demo without undo. In a live audit/demo context, that can accidentally break the walkthrough.

Recommendation:

- Add undo or confirmation for node deletion.
- Alternatively disable deletion for required demo nodes and label it “Delete disabled in demo.”

## 8. Copy / Positioning Observations

### Founder-led content

The demo communicates founder-led content through:

- “Founder Confessional.”
- Founder POV trend signal.
- Founder measuring inseam visual proof.
- Founder-shot camera roll implication.

However, the H1/entry state inside `/demo` does not explicitly say “founder-led content from your business context.” That positioning is inferred from the artifacts.

Suggested copy:

- “Founder-led content from the proof already inside your business.”
- “Turn founder context into trend-ready content.”

### Business context as source material

This is the best-supported positioning. The Brand Context card, source badges, visual proof library, script rules, and trend signals all reinforce context-derived content.

Recommended wording:

- “Business context” is stronger than “documents.”
- “Proof moments” is stronger than “assets.”
- “Turn existing footage and source material into trend-ready posts” is stronger than “AI content generation.”

### Conversion/customer acquisition

Conversion is visible through the preorder goal and CTA rule, but weak after publish. Engagement metrics dominate the ending even though the campaign goal is preorder demand.

Suggested copy near preview/publish:

- “Goal: Spring 2026 preorders.”
- “CTA: preorder, not sale.”
- “Primary outcome: preorder clicks.”

### Self-improvement over time

The demo does not convincingly communicate self-improvement. The chat can respond, edits can be made, and metrics appear, but nothing says those edits or metrics update future outputs.

Suggested copy after edits/publish:

- “Saved preference: use specific fit-proof language over generic empowerment copy.”
- “This post’s saves/shares will inform future trend matches.”

### Not a generic AI content generator

The demo mostly avoids generic AI-generator positioning because it anchors every output to:

- Petite Outdoors.
- Product fit problem.
- Preorder campaign.
- Existing media.
- Brand context.
- Trend signals.
- Timeline proof moments.

The risk is the chat placeholder: “Ask Reframe anything…” is broad and generic. Better copy would constrain it to content/workspace edits.

Suggested replacement:

- “Ask Reframe to revise this post from your context…”
- “Ask for a hook, clip swap, caption, or export change…”

## 9. Recommended Final Feature Description

### One-liner

Reframe turns a founder’s connected business context into trend-ready short-form content.

### 2-sentence product explanation

Connect your product pages, social profiles, media, and founder notes; Reframe builds a reusable brand context with audience, proof moments, tone, and campaign goals. From there, it matches your business to relevant trend formats, assembles editable timelines from existing media, and helps prepare posts for export or publishing.

### 5-8 bullet feature list

- Build a reusable brand context from product, social, and media sources.
- Extract audience, pain, conversion goal, tone, script rules, and do/avoid guidance.
- Identify and label existing visual proof moments for use in content.
- Match business context to trend formats and generate campaign-specific content recipes.
- Assemble an editable short-form video timeline using matched clips, captions, and audio timing.
- Detect missing shots and simulate AI-assisted visual fills.
- Swap clips and choose alternate captions before export.
- Prepare timeline exports and simulate Instagram publishing with demo engagement metrics.

### Suggested tagline/H1

“Post from what already happens in your business.”

Alternative:

“Turn founder context into trend-ready content.”

### Suggested CTA

“Connect your business context”

Alternative for demo page:

“See the seeded workspace”

## 10. Open Questions for the Founder

1. What is the actual first user action before `/demo`: paste a URL, upload files, connect accounts, answer chat questions, or all of the above?
2. Which ingestion sources are real today versus planned: Google Drive, Shopify, Instagram, TikTok, YouTube, camera roll, upload folders?
3. Does Reframe actually fetch social content through APIs, scraping, manual upload, or seeded demo data?
4. What is the minimum source set required for Reframe to produce useful output?
5. Is the core output a finished video, an editable timeline, a script, a content brief, or a handoff package?
6. Is “trend search” live and current, or a curated library of reusable trend formats?
7. What exactly does “clone a trend” mean in product language?
8. Does the product generate new media, repurpose existing media, or both?
9. If AI visual generation exists, is it image generation, video generation, storyboard generation, or placeholder creation?
10. Are CapCut/Premiere/DaVinci exports real file exports, or planned handoff formats?
11. Is Instagram publishing real or a simulated product direction?
12. Which platforms will be supported first: Instagram, TikTok, LinkedIn, YouTube Shorts, X, or others?
13. How does Reframe authenticate and manage social accounts?
14. What performance data will Reframe ingest: post metrics, conversion events, Shopify revenue, preorder clicks, link clicks, saves, comments?
15. How does Reframe use performance data to improve future recommendations?
16. Are user edits saved as brand preferences?
17. Can founders approve/reject content, and does that train future outputs?
18. Does Reframe support multiple brands/workspaces?
19. Does Reframe support team collaboration or approvals?
20. Who is the primary buyer: solo founder, creator-founder, marketing hire, agency, or ecommerce team?
21. What is the main differentiated workflow: ingestion, trend matching, timeline assembly, AI editing, or learning loop?
22. What should the demo prove in 60 seconds?
23. What should the demo not claim until backend functionality exists?
24. What is the strongest conversion metric for Petite Outdoors: preorders, waitlist joins, profile taps, or Shopify visits?
25. Should the product be positioned as “AI CMO,” “founder-led content engine,” “context-to-content workspace,” or “trend-to-timeline editor”?

## Audit Limitations

Playwright MCP was requested, but no Playwright MCP tool was available in the session. This audit was produced from static frontend inspection, repository code/data review, and a public page fetch. Treat interaction notes as inferred from implemented frontend handlers and visible seeded UI states rather than from a live browser clickthrough recording.

## Terminal Summary Printed

Biggest findings printed in terminal:

> `/demo` strongly shows seeded business-context-to-trend-to-timeline flow, but backend/search/publish/metrics are mocked; editing is limited to timeline clip swaps, caption alternates, and missing-shot fill; CapCut/Premiere/DaVinci export and Instagram posting are UI toasts/status only; no visible ingestion UI, live integrations, learning loop, direct LinkedIn/TikTok publishing, collaboration, or real analytics source is proven.
