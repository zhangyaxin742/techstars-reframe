# Repo Reorganization And Demo/MVP Isolation Plan

## BLUF

Keep `/demo` stable as the legacy seeded demo and make `/app/[workspaceSlug]/projects/[projectSlug]` the real MVP surface. Use copy-on-write cloning for stateful demo workspace primitives so MVP edits cannot accidentally change `/demo`; keep only boring, low-risk UI primitives shared.

## Verbatim Cleanup Items

These are the five full-repo cleanup action items previously provided in chat:

1. Delete stale Vite files.
2. Remove clearly unreferenced public assets.
3. Add `docs/README.md` map.
4. Move stale docs to `docs/archive`.
5. Later: consolidate `src/components` into `components`.

## Target Repo Layout

```text
app/                     Next routes and API routes
components/              All React components
lib/                     Server/domain/auth/db utilities
src/data/                Demo/seed/frontend-only content
supabase/migrations/     Ordered SQL migrations
docs/                    Current docs
docs/archive/            Historical/stale docs
public/assets/demo/      Demo-only images
public/videos/demo/      Demo-only videos
scripts/                 Maintenance scripts
```

## Progress Notes

### 2026-05-07

- Item 1 is implemented.
- Deleted tracked Vite artifacts: `index.html`, `src/main.tsx`, `public/vite-app.css`, and `public/vite-routes.css`.
- Verified with `npm.cmd run typecheck`.
- Verified with `git diff --check`.
- Verified no remaining references to `src/main`, `vite-app`, `vite-routes`, or `index.html`.
- Further audit found `/demo` and `/workspace` import `src/App.tsx`.
- Further audit found real MVP `/app/[workspaceSlug]/projects/[projectSlug]` imports `src/reframe-mvp/AppWorkspace.tsx`.
- Further audit found both demo and MVP still share stateful lower-level workspace components under `src/components/*`.
- Added `docs/README.md` as the docs map and canonical navigation point.
- Moved historical `docs/truth/demo-audit.md` to `docs/archive/demo-audit.md`.
- Updated the `docs/truth/mvp-build.md` local audit reference to the archive path.
- Removed zero-reference media assets: `public/assets/landing-video.mp4`, `public/assets/landing.png`, `public/videos/final.mp4`, and `public/assets/trending demo timeline/image 12.png`.
- Deferred Instagram media cleanup because `public/assets/instagram/petiteoutdoors/media-manifest.json` still names the local image files, even though the app does not currently import that manifest.
- Validation passed: `npm.cmd run typecheck`.
- Validation passed after sandbox escalation for Vitest spawn permissions: `npm.cmd run test:run -- components/landing/hero.test.tsx src/App.test.tsx src/reframe-mvp/AppWorkspace.test.tsx components/trending/trending-workspace.test.tsx`.
- Validation passed: `git diff --check`.

## Current Route Ownership

| Route | Current implementation | Intended role |
| --- | --- | --- |
| `/demo` | `app/demo/page.tsx` -> `src/App.tsx` | Seeded legacy demo |
| `/workspace` | `app/workspace/page.tsx` -> `src/App.tsx` | Redundant legacy alias; likely redirect/remove later |
| `/app/[workspaceSlug]/projects/[projectSlug]` | `app/app/[workspaceSlug]/projects/[projectSlug]/page.tsx` -> `src/reframe-mvp/AppWorkspace.tsx` | Real MVP workspace |
| `/` | `app/page.tsx` -> `components/landing/hero.tsx` | Landing/waitlist |
| `/intake` | `components/intake/*` | Real intake/auth handoff |
| `/account` | `components/account/*` | Real account/workspace management |

## Brief Research

### Recommendation

Clone stateful demo workspace primitives into the MVP workspace on a copy-on-write basis. Do not eagerly duplicate every shared component.

This is the responsible path because the current sharing boundary is too coarse: `src/App.tsx` and `src/reframe-mvp/AppWorkspace.tsx` both use `src/components/app-shell`, `src/components/infinite-canvas`, `src/components/timeline`, `src/components/preview`, and several `src/components/ui` files. Any behavioral edit to those shared workspace primitives can affect both `/demo` and `/app`.

### Why Copy-On-Write

- It preserves `/demo` as a known-good sales/demo artifact.
- It lets `/app` evolve toward production behavior without carrying demo constraints.
- It avoids a noisy mass-copy before we know which primitives actually need MVP-specific behavior.
- It keeps obvious shared primitives shared where risk is low.

### Clone Into MVP When Editing

Clone these before making behavior changes for `/app`:

- `src/components/infinite-canvas/*`
- `src/components/timeline/*`
- `src/components/app-shell/chat-history-panel.tsx`
- `src/components/preview/mock-video-preview.tsx`
- Any prompt-kit component whose behavior becomes project/workspace aware
- Any `src/lib/infinite-canvas/*` helper if MVP behavior diverges from demo math/viewport behavior

### Keep Shared For Now

Keep these shared unless they become MVP-specific:

- `src/components/ui/button.tsx`
- `src/components/ui/input.tsx`
- `src/components/ui/dialog.tsx`
- `src/components/ui/dropdown-menu.tsx`
- `src/components/ui/tooltip.tsx`
- `src/components/ui/skeleton.tsx`
- `src/components/ui/sonner.tsx`
- `src/lib/utils.ts`

### Proposed Future Shape

```text
app/
  demo/page.tsx
  app/[workspaceSlug]/projects/[projectSlug]/page.tsx

components/
  account/
  intake/
  landing/
  trending/
  ui/

src/
  data/
    reframe-demo.ts
    trending-videos.ts
  demo/
    App.tsx
    components/
  reframe-mvp/
    AppWorkspace.tsx
    components/
    data.ts
    export.ts
```

Alternative later shape, if we decide to remove most `src/*` usage:

```text
components/
  demo-workspace/
  mvp-workspace/
  ui/

src/data/
```

## Implementation Plan

### 1. Finish Stale Vite Removal

Status: complete.

### 2. Remove Clearly Unreferenced Public Assets

Status: partially complete.

Deleted zero-reference assets:

- `public/assets/landing-video.mp4`
- `public/assets/landing.png`
- `public/videos/final.mp4`
- `public/assets/trending demo timeline/image 12.png`

Deferred:

- `public/assets/instagram/petiteoutdoors/*`

Reason: the app does not currently import `media-manifest.json`, but the manifest still names the local image files. Delete this as a full scraped-library cleanup, not as individual "unreferenced" image deletion.

### 3. Add Docs Map

Status: complete.

Created `docs/README.md` with source-of-truth docs, active plans, research docs, checklists, Supabase migration order, archive policy, and repo organization rules.

### 4. Archive Stale Docs

Status: partially complete.

Moved historical `docs/truth/demo-audit.md` to `docs/archive/demo-audit.md`.

### 5. Consolidate Components Carefully

Do not do a broad `src/components` -> `components` move yet. First isolate `/demo` and `/app` by ownership:

- Keep `/demo` on legacy code.
- Clone stateful workspace primitives into `src/reframe-mvp/components/*` when MVP changes require edits.
- After the MVP workspace stabilizes, decide whether `src/reframe-mvp` moves to `components/mvp-workspace`.

## Risk Register

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Shared workspace primitive edit changes `/demo` | High | Clone stateful primitive into MVP before behavior edits |
| Mass copy creates duplicate drift immediately | Medium | Copy-on-write only |
| Keeping `/workspace` as a second demo alias causes confusion | Medium | Later redirect `/workspace` to `/demo` or remove |
| Public asset deletion breaks visual demos | Medium | Delete only after reference and visual route audit |
| Component consolidation creates import churn | Medium | Defer broad moves until MVP workspace stabilizes |

## Validation Plan

- For doc-only plan updates: diff review is enough.
- For file deletions: `npm.cmd run typecheck`, `git diff --check`, and `rg` for deleted path references.
- For asset deletions: route smoke test of `/`, `/demo`, `/trending`, and `/app/[workspaceSlug]/projects/[projectSlug]`.
- For cloned MVP primitives: focused tests around `src/reframe-mvp/AppWorkspace.test.tsx`, affected primitive tests, then `npm.cmd run typecheck`.

## Sources

- Local repo audit, accessed 2026-05-07.
- `docs/truth/mvp-build.md`, accessed 2026-05-07.
- `docs/prds/account-prd.md`, accessed 2026-05-07.
- `docs/prds/intake-prd.md`, accessed 2026-05-07.
- Next.js Project Structure docs, accessed 2026-05-07: https://nextjs.org/docs/app/building-your-application/routing/colocation
- Next.js `src` Folder docs, accessed 2026-05-07: https://nextjs.org/docs/app/building-your-application/configuring/src-directory
- React Preserving and Resetting State docs, accessed 2026-05-07: https://react.dev/learn/preserving-and-resetting-state
