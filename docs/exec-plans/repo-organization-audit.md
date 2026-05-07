# Repo Organization Audit

**Audit Summary**
The repo is materially cleaner now, but it is not yet "senior-team clean." The remaining disorganization is mostly ownership boundaries, tracked local artifacts, large demo assets, route duplication, and stale doc/API drift.

**Highest Priority Fixes**

| Priority | Issue | Why It Matters | Minimum Viable Fix |
| --- | --- | --- | --- |
| P0 | Tracked `.playwright-mcp/*` logs/pages | Generated local debugging artifacts are tracked. This is the clearest repo hygiene miss. | `git rm -r .playwright-mcp` and keep `.playwright-mcp` ignored. |
| P0 | `/workspace` duplicates `/demo` | `app/workspace/page.tsx` imports the same legacy demo app as `/demo`. This creates route ambiguity. | Replace `/workspace` with a redirect to `/demo`, or delete the route if no external links depend on it. |
| P0 | Demo and MVP share stateful workspace primitives | `/demo` uses `src/App.tsx`, while MVP uses `src/reframe-mvp/AppWorkspace.tsx`, but both share `src/components/*`. | Use copy-on-write: clone stateful primitives into `src/reframe-mvp/components/*` before MVP-specific edits. |
| P1 | `components/` and `src/components/` split | Two component roots make ownership unclear. | Keep route/surface components in `components/*`; keep legacy shared workspace primitives in `src/components/*` until copied into MVP. Do not mass-move yet. |
| P1 | Large scraped Instagram asset library | `public/assets/instagram/petiteoutdoors` is 119 files, ~39 MB. Only 21 images appear directly referenced by demo data. | Either delete the entire scraped library except referenced files, or move it under `public/assets/demo/instagram/petiteoutdoors` and prune unreferenced files plus manifest. |
| P1 | Public asset taxonomy is loose | `public/videos/*`, `public/assets/trending demo timeline/*`, `brand-context-images`, and Instagram assets are all flat-ish demo media. | Move toward `public/assets/demo/*` and `public/videos/demo/*` after reference-safe route smoke tests. |
| P1 | Docs still contain stale implementation statements | Some PRD/truth text says auth/schema/RLS "does not exist yet," while parts now exist. | Add "status as of 2026-05-07" notes or archive superseded sections. Do not rewrite PRDs wholesale. |
| P2 | Both `package-lock.json` and `pnpm-lock.yaml` exist | This is explicitly acknowledged in AGENTS, but FAANG-style repos normally pick one. | Leave for now per AGENTS. Later choose package manager deliberately and delete the other lock in a separate approved change. |
| P2 | Empty/local generated root files exist | `next-env.d.ts`, `tsconfig.tsbuildinfo`, `.next`, `.vercel`, `.env.local` exist locally. Most are ignored and not tracked. | No commit action needed. Optionally delete local generated files if they bother local tree scans. |

**Clearly Disorganized Files/Folders**

- `.playwright-mcp` is tracked generated MCP/browser output. This should not be in source control.
- `app/workspace/page.tsx` is a redundant legacy route alias.
- `src/App.tsx` is legacy demo app code but lives at generic `src/App.tsx`.
- `src/reframe-mvp` is MVP code, but still imports shared demo primitives.
- `src/components` is a mixed bucket for UI, demo workspace, MVP workspace, media, prompt-kit, canvas, and unused parked components.
- `public/assets/instagram/petiteoutdoors` is oversized and not clearly scoped as demo-only.
- `public/assets/trending demo timeline` has spaces in the folder name and is clearly demo media.
- `components/landing/landing-intake-chat.tsx` appears test-only/parked.
- `src/components/agentation/agentation-toolbar.tsx` appears unused.
- `src/components/export/export-handoff-panel.tsx` appears unused.
- `src/components/media/media-library-panel.tsx` appears unused except tests.
- `src/components/prompt-kit/steps.tsx` appears unused.
- `src/components/ui/context-menu.tsx`, `kbd.tsx`, and `separator.tsx` appear unused.

**Recommended Senior-Team Target**

```text
app/
  account/
  api/
  demo/
  app/[workspaceSlug]/projects/[projectSlug]/
  intake/
  trending/

components/
  account/
  intake/
  landing/
  trending/
  ui/

features/
  demo-workspace/
  mvp-workspace/

lib/
  reframe/
  security/
  supabase/
  waitlist/

src/data/
  demo/

public/
  assets/demo/
  videos/demo/

supabase/
  migrations/

docs/
  README.md
  archive/
  checks/
  exec-plans/
  prds/
  research/
  truth/
```

**Minimum Viable Cleanup Sequence**

1. Remove tracked `.playwright-mcp`.
2. Redirect or delete `/workspace`.
3. Move public demo media into `public/assets/demo/*` and `public/videos/demo/*`.
4. Prune or archive the Instagram scrape library.
5. Delete clearly unused parked components after one focused typecheck/test pass.
6. Copy-on-write MVP workspace primitives only when MVP behavior changes.
7. Later, choose `npm` or `pnpm` as the single package manager with explicit approval.

**Do Not Do Yet**
- Do not mass-move `src/components` into `components`.
- Do not delete one lockfile without choosing package-manager strategy.
- Do not rewrite PRDs wholesale.
- Do not bulk-delete Instagram assets without deciding whether the full scrape library is intentionally retained.


## DEMO VS WORKSPACE BS 

• The key distinction in code is simple: /workspace and /
  demo are currently identical legacy seeded surfaces. The
  route you actually want for “dummy account + full MVP
  workspace experience” is /app/[workspaceSlug]/projects/
  [projectSlug], but that route is not yet enforcing
  session/workspace authorization or loading real project
  data.

───────────────────────────────────────────────────────────

• Current behavior:

  | Route | What It Does Now | Auth? | Purpose |
  | --- | --- | --- | --- |
  | /demo | Renders src/App.tsx | No | Frozen seeded
  investor/demo experience |
  | /workspace | Also renders src/App.tsx | No | Redundant
  alias of /demo |
  | /app/[workspaceSlug]/projects/[projectSlug] | Renders
  src/reframe-mvp/AppWorkspace.tsx | Not enforced yet |
  Real MVP workspace route shape |
  | /account | OTP sign-in/account/workspace/member UI |
  Yes, via APIs | Account/workspace control plane |

  So right now /workspace has no meaningful distinction
  from /demo. It should not be the dev-authenticated
  workspace route.

  What you want is:

  1. /demo
      - Public.
      - No auth.
      - Frozen seeded sales/demo artifact.
  2. /app/[workspaceSlug]/projects/[projectSlug]
      - Authenticated.
      - Full workspace experience.
      - For dummy account testing, you sign in through /
        account, then open a real workspace/project slug.

  Minimum viable fix:

  - Redirect /workspace to /demo.
  - Keep /demo public.
  - Add auth/session gating to /app/[workspaceSlug]/
    projects/[projectSlug].
  - For now, allow the MVP workspace to render seeded
    content after verifying the signed-in user belongs to
    workspaceSlug.
  - Later, replace seeded content with DB-backed project
    data.

  For dummy testing, the desired flow should be:

  /account
    -> sign in with email OTP
    -> account is repaired/created via
  ensure_account_workspace
    -> obtain workspace slug
    -> visit /app/<workspaceSlug>/projects/<projectSlug>
    -> see full MVP workspace

  Current gap:

  - /app/[workspaceSlug]/projects/[projectSlug] accepts
    slugs as props but does not verify them against
    Supabase membership.
  - projectSlug is currently display/export context, not a
    DB-loaded project.
  - There is no dev shortcut like /app/dev or “open active
    workspace” button wired from /account yet.

  My recommendation:

  - Treat /workspace as obsolete and redirect it to /demo.
  - Make /app/... the only real workspace route.
  - Add a small dev/pilot convenience path later: after /
    account loads active workspace, show “Open workspace”
    linking to /app/{activeWorkspace.slug}/projects/
    {knownProjectSlug}. For now that project slug can be a
    deterministic seeded one like campaign-demo until
    project persistence is wired.