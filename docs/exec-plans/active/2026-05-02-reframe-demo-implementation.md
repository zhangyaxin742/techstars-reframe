# Reframe Demo Implementation Plan

Date: 2026-05-02

Intent: feature
Scale: large
Delivery Path: prd-story-split
Archetype: feature
Discovery Mode: direct-read
External Freshness Gate: not triggered (implementation uses seeded frontend data and existing local shell)

Discovery note: writing-plans normally prefers burst discovery for large plans, but this runtime only allows subagents when explicitly requested. Targeted repo reads were used instead.

## Context

The approved PRD lives at `docs/plans/2026-05-02-reframe-prd.md`. The implementation should preserve the current editorial landing hero at `/`, add a chat-style intake to that landing experience, and route users into `/app`, where the existing infinite canvas shell lives via `app/app/page.tsx -> src/App.tsx`.

Current relevant surfaces:

- `app/page.tsx` renders `components/landing/hero.tsx`.
- `components/landing/hero.tsx` owns the current editorial first viewport and waitlist CTA.
- `app/app/page.tsx` renders `src/App.tsx`.
- `src/App.tsx` already wires `AppShell`, `InfiniteCanvas`, demo nodes, and a bottom prompt composer.
- `src/components/infinite-canvas/infinite-canvas.tsx` already supports `bottomPromptBox`.
- `src/components/infinite-canvas/canvas-prompt-box.tsx` is the existing chat/prompt intake primitive.
- `src/data/canvas-demo.ts` currently contains generic placeholder nodes and should be replaced or supplemented with Reframe-specific seeded demo data.

The target flow is:

1. User lands on `/`.
2. User keeps the editorial hero context, then enters brand/context links in a chat-style intake.
3. User sees link/source badges and simulated media import options.
4. User submits intake and is routed to `/app`.
5. `/app` opens the infinite canvas with continued AI chat: left collapsible chat history, bottom-center chatbox, Brand Context, Trend Recipes, media side panel, and editable timeline assembly.

## User Stories

| ID | Story |
| --- | --- |
| US1 | As a founder, I can start from the editorial landing page and enter brand context through a chat-style intake without leaving the first product experience. |
| US2 | As a founder, I can add links and media-source choices that appear as badges, so the app feels like it understands where my brand and assets live. |
| US3 | As a founder, I can continue from landing intake into `/app`, where the AI chat history and source context carry into the canvas workspace. |
| US4 | As a founder, I can see Reframe's inferred brand context and video trend recipes on the infinite canvas. |
| US5 | As a founder, I can select or inspect a trend recipe and see an editable timeline prefilled with matched media, hook text, captions, timing, audio, and missing-shot placeholders. |
| US6 | As a founder, I can open and close a media side panel and swap timeline clips through intuitive alternatives. |
| US7 | As an evaluator, I can verify the full journey in a browser from `/` to `/app` with seeded data and no backend dependencies. |

## Acceptance Criteria

| ID | Stories | Criteria |
| --- | --- | --- |
| AC1 | US1 | `/` keeps the existing editorial hero mood and adds a visible chat-style intake as the primary product-start control. |
| AC2 | US1, US2 | Pasted or seeded sources render as badges for website, Instagram, TikTok, YouTube, Shopify/website, Google Drive, and upload/media. |
| AC3 | US2 | The intake exposes simulated media options including upload, Google Drive, Shopify/website, Instagram, TikTok, and YouTube. |
| AC4 | US3 | Submitting the landing intake routes to `/app` and preserves enough seeded context for the canvas to show the Petite Outdoors flow. |
| AC5 | US3 | `/app` includes a bottom-center chatbox and a collapsible left chat history panel showing onboarding/source/analysis messages. |
| AC6 | US4 | The canvas includes a Brand Context node and Trend Recipe cards based on Petite Outdoors and preorder-oriented ecommerce content. |
| AC7 | US5 | The canvas includes one recommended editable timeline assembly with media clips, black missing placeholders, hook/caption overlays, and audio beat/timing notes. |
| AC8 | US6 | The media library is a side panel/drawer that can be closed and reopened without losing selection context. |
| AC9 | US6 | Timeline segment interaction reveals alternate clip choices with thumbnail/label/match reason and allows a visible mocked swap. |
| AC10 | US7 | `npm run typecheck`, focused tests, and an agent-browser journey pass against local `/` and `/app`. |

## Packet Plan

### Packet 1: Seeded Demo Data And Types

Objective: create a Reframe-specific seeded data contract that all UI packets can consume without backend work.

Covered ACs: AC2, AC3, AC4, AC6, AC7, AC9

#### [NEW] [src/data/reframe-demo.ts](../../../src/data/reframe-demo.ts)

- Add Petite Outdoors brand context, source badges, media import options, chat history messages, trend recipes, media assets, timeline segments, audio metadata, and export targets.
- Keep data deterministic and frontend-only.

#### [MODIFY] [src/lib/infinite-canvas/types.ts](../../../src/lib/infinite-canvas/types.ts)

- Add only the minimal node/data shape needed to distinguish brand, trend, timeline, media, and preview nodes.
- Preserve existing generic canvas behavior and tests.

Done definition: seeded data can drive landing badges and `/app` canvas content without hardcoding product copy across components.

### Packet 2: Landing Chat Intake On Editorial Hero

Objective: keep the current editorial landing page while adding the chat-style brand intake that starts the product flow.

Covered ACs: AC1, AC2, AC3, AC4

#### [NEW] [components/landing/landing-intake-chat.tsx](../../../components/landing/landing-intake-chat.tsx)

- Build a focused landing intake using the existing `CanvasPromptBox` visual language where practical.
- Render source badges, media source options, and a submit action that navigates to `/app`.
- Simulate upload/source selection without real file processing.

#### [MODIFY] [components/landing/hero.tsx](../../../components/landing/hero.tsx)

- Keep the existing editorial hero, painting background, nav, phone mockup, and visual tone.
- Add the landing intake as the primary product-start control near the existing CTA area.
- Keep waitlist modal behavior available but secondary.

#### [MODIFY] [app/page.tsx](../../../app/page.tsx)

- Keep route rendering simple; only adjust if the hero needs props or seeded data injection.

Done definition: a user can see the editorial hero, add/see source badges, choose simulated media sources, and continue to `/app`.

### Packet 3: `/app` Chat Continuity And Canvas Shell

Objective: align `/app` with the PRD flow by continuing the AI chat inside the existing infinite canvas shell.

Covered ACs: AC4, AC5, AC6

#### [MODIFY] [src/App.tsx](../../../src/App.tsx)

- Replace generic placeholder app state with Reframe seeded state from `src/data/reframe-demo.ts`.
- Configure `InfiniteCanvas` bottom prompt as the persistent bottom-center canvas chatbox.
- Add left collapsible chat history panel for onboarding, source intake, simulated AI analysis, and canvas prompts.
- Keep the existing `AppShell` and route at `/app`.

#### [NEW] [src/components/app-shell/chat-history-panel.tsx](../../../src/components/app-shell/chat-history-panel.tsx)

- Render collapsible left-side chat history inside the app workspace.
- Include source badges and simulated analysis messages.

#### [MODIFY] [src/components/app-shell/index.ts](../../../src/components/app-shell/index.ts)

- Export the chat history panel if colocated with app shell components.

Done definition: `/app` shows canvas content with a persistent bottom prompt and collapsible chat history, using seeded intake context.

### Packet 4: Reframe Canvas Nodes And Timeline Assembly

Objective: turn the generic canvas nodes into the PRD's Brand Context, Trend Recipes, timeline, preview, and media-aware workspace.

Covered ACs: AC6, AC7

#### [MODIFY] [src/components/infinite-canvas/canvas-node-view.tsx](../../../src/components/infinite-canvas/canvas-node-view.tsx)

- Add render branches for Reframe node kinds or data variants: brand context, trend recipe, timeline, preview.
- Keep existing note/image/frame/prompt rendering intact unless fully superseded by typed variants.

#### [MODIFY] [src/data/canvas-demo.ts](../../../src/data/canvas-demo.ts)

- Either delegate to `src/data/reframe-demo.ts` or replace generic placeholder nodes with Reframe-specific canvas nodes and connections.

#### [MODIFY] [src/components/infinite-canvas/infinite-canvas.tsx](../../../src/components/infinite-canvas/infinite-canvas.tsx)

- Preserve existing pan, zoom, marquee, drag, and bottom prompt behavior.
- Add only necessary callbacks/props for timeline segment selection or media panel state if they cannot live in `src/App.tsx`.

Done definition: `/app` opens with Reframe-specific Brand Context, Trend Recipe cards, and a visible timeline assembly node on the infinite canvas.

### Packet 5: Media Side Panel And Clip Swapping

Objective: make media matching and clip swapping the demo's core interaction.

Covered ACs: AC8, AC9

#### [NEW] [src/components/media/media-library-panel.tsx](../../../src/components/media/media-library-panel.tsx)

- Render a closeable/reopenable right-side panel with grouped AI-organized media assets.
- Show tags, product/shot type labels, trend-fit labels, and match reasons.

#### [NEW] [src/components/timeline/timeline-assembly.tsx](../../../src/components/timeline/timeline-assembly.tsx)

- Render timeline tracks for video clips, missing placeholders, text overlays, and audio beat markers.
- Support selecting a segment and swapping to seeded alternate clips.

#### [MODIFY] [src/App.tsx](../../../src/App.tsx)

- Own selected timeline segment, selected media alternatives, side panel open/closed state, and mocked swap updates.

Done definition: the user can close/reopen media library, select a timeline segment, view alternate clips, and perform a visible seeded clip swap.

### Packet 6: Preview, Export, And Demo Polish

Objective: finish the demo loop with convincing preview/export surfaces and responsive polish.

Covered ACs: AC7, AC10

#### [NEW] [src/components/preview/mock-video-preview.tsx](../../../src/components/preview/mock-video-preview.tsx)

- Show a convincing short-form preview state using seeded clips/images/text.
- Reflect selected hook/caption/clip changes where feasible.

#### [NEW] [src/components/export/export-handoff-panel.tsx](../../../src/components/export/export-handoff-panel.tsx)

- Show generic timeline handoff plus CapCut, Adobe/Premiere, DaVinci Resolve, and other editor export targets as mocked options.

#### [MODIFY] [src/App.tsx](../../../src/App.tsx)

- Add preview/export panel entry points and status feedback.
- Ensure layout works at desktop and mobile/tablet widths without overlapping the bottom chatbox, left history panel, or media panel.

Done definition: the demo communicates a complete path from intake to editable timeline to mocked preview/export handoff.

### Packet 7: Tests And Browser Verification

Objective: add focused automated coverage and prove the critical flow in a real browser.

Covered ACs: AC10

#### [NEW] [components/landing/landing-intake-chat.test.tsx](../../../components/landing/landing-intake-chat.test.tsx)

- Verify source badge rendering, media option selection, and `/app` navigation trigger.

#### [MODIFY] [src/components/infinite-canvas/infinite-canvas.test.tsx](../../../src/components/infinite-canvas/infinite-canvas.test.tsx)

- Preserve existing canvas behavior tests.
- Add coverage for bottom prompt rendering if changed by new props.

#### [NEW] [src/components/media/media-library-panel.test.tsx](../../../src/components/media/media-library-panel.test.tsx)

- Verify panel open/close behavior and rendered media match metadata.

#### [NEW] [src/components/timeline/timeline-assembly.test.tsx](../../../src/components/timeline/timeline-assembly.test.tsx)

- Verify segment selection, alternate visibility, and mocked clip swap callback.

Done definition: automated checks pass and agent-browser proves the journey from `/` intake to `/app` timeline interaction.

## Verification Plan

Automated checks:

- `npm run typecheck`
  - Expected: no TypeScript errors.
  - Maps to: AC10.
- `npm run test:run`
  - Expected: all Vitest tests pass, including landing intake, media panel, timeline assembly, existing canvas, and app shell tests.
  - Maps to: AC1-AC10.
- `npm run build`
  - Expected: Next production build succeeds.
  - Maps to: AC10.

Agent-browser checks:

- Use the current user-managed dev server. If no server is running, ask the user before starting one because repo instructions say dev servers are user-managed.
- Run `agent-browser batch "open http://localhost:3000" "snapshot -i" "screenshot"` and verify the editorial hero plus chat intake are visible.
- Fill the landing chat intake with Petite Outdoors website/social context, select seeded media options, submit, and verify navigation to `http://localhost:3000/app`.
- On `/app`, verify bottom-center chatbox, collapsible left chat history, Brand Context node, Trend Recipe cards, media side panel, and timeline assembly are visible.
- Select a timeline segment, choose an alternate clip, and verify the timeline visibly updates.
- Open preview/export controls and verify mocked editor handoff targets appear.
- Repeat screenshots at desktop 1440x900 and mobile emulation. Use skip condition only if local browser tooling is unavailable.

## Execution Quality Policy

| gate | stage | required | trigger | executor | command/method | evidence |
| --- | --- | --- | --- | --- | --- | --- |
| typecheck | every packet after TS changes | yes | TS/TSX edits | implementing agent | `npm run typecheck` | clean output |
| unit-tests | after component/data packets | yes | components or data contracts changed | implementing agent | `npm run test:run` | passing tests |
| build | before final handoff | yes | route/layout changes | implementing agent | `npm run build` | successful build |
| browser-e2e | before final handoff | yes | user-facing flow changes | implementing agent with agent-browser | journey listed above | screenshots/snapshot notes |
| visual-responsive | before final handoff | yes | landing or `/app` layout changes | implementing agent with agent-browser | desktop/mobile screenshots | no overlap, readable controls |
| tech-debt-registration | before final handoff | conditional | intentional temporary mechanisms beyond seeded demo | implementing agent | update tracker if needed | tracker ID or not-required status |

## Risks / Out of Scope

- Real OAuth, real uploads, real video rendering, and real AI generation are out of scope.
- iCloud Photos should not be presented as a real web sync connector.
- Existing canvas pan/zoom/drag behavior should not be destabilized by timeline UI additions.
- The landing page should not become a generic dashboard; preserve the editorial hero and visual mood.
- The `/app` workspace should remain an AI assembly workspace, not a full video editor.
- Export targets are mocked and should be described as handoff concepts.

## Deferred Cleanup / Tech Debt

Tech Debt Tracker: not required

This plan intentionally uses seeded demo data, but that is the stated product-demo scope rather than temporary production scaffolding. If implementation adds feature flags, fake adapters, or compatibility shims intended for removal after demo, the implementer must register them before final handoff.

## Execution Checklist

- [ ] Packet 1: Seed Reframe data and minimal types.
- [ ] Packet 2: Add landing chat intake while preserving editorial hero.
- [ ] Packet 3: Continue chat into `/app` with bottom prompt and collapsible left history.
- [ ] Packet 4: Render Brand Context, Trend Recipes, and timeline assembly nodes on canvas.
- [ ] Packet 5: Add media side panel and clip swapping.
- [ ] Packet 6: Add mock preview/export and responsive polish.
- [ ] Packet 7: Add tests and run agent-browser journey.

## E2E Journeys

Primary journey:

1. Open `/`.
2. Confirm editorial hero remains present.
3. Enter Petite Outdoors website/social context in the chat intake.
4. Confirm sources appear as badges.
5. Select or confirm seeded media sources.
6. Submit intake and land on `/app`.
7. Confirm chat history continues in the left panel.
8. Confirm bottom-center canvas chatbox is present.
9. Select a Trend Recipe.
10. Confirm timeline assembly appears with clips, missing placeholders, overlays, and audio markers.
11. Swap a clip.
12. Open preview/export and confirm mocked editor targets.

Skip conditions:

- Skip browser journey only if `agent-browser` cannot launch locally; record the failure and provide screenshots or DOM evidence from an alternate browser tool if available.

## Discovery Summary

- The repo uses Next App Router with `app/page.tsx` and `app/app/page.tsx`.
- The current landing hero is in `components/landing/hero.tsx` and should be preserved.
- The current `/app` shell is in `src/App.tsx`.
- The current infinite canvas already has pan/zoom/drag/marquee behavior and a sticky bottom prompt composer.
- Existing tests cover app shell, infinite canvas basics, and prompt box behavior.
