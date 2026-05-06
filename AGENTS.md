# AGENTS.md

## Project Context
- Reframe is an AI CMO demo for founders who have a product but no audience.
- The app has three main surfaces: the landing/waitlist flow in `app/page.tsx`, the interactive Reframe workspace in `app/workspace/page.tsx`, and the trend studio in `app/trending/page.tsx`.
- Most demo data is static and lives under `src/data/`. Keep product copy and demo behavior coherent with the founder-marketing concept.

## Tech Stack
- Next.js 15 App Router with React 19 and strict TypeScript.
- Tailwind CSS with shared tokens in `app/globals.css` and `tailwind.config.ts`.
- Vitest with jsdom and Testing Library for unit/component tests.
- Radix UI primitives, Phosphor icons, Framer Motion, Sonner, Agentation, `perfect-freehand`, and `rbush`.
- Waitlist submission is handled by `app/api/waitlist/route.ts` and `lib/waitlist/submit.ts`; Supabase and Resend env vars are required at runtime.

## Commands
- Typecheck: `npm run typecheck`
- Run tests once: `npm run test:run`
- Run a focused test: `npm run test:run -- path/to/file.test.tsx`
- Build: `npm run build`
- Dev server: `npm run dev`

## Working Rules
- Do not start or restart dev servers unless the user explicitly asks; assume local app servers are user-managed.
- Do not edit `.env` files or add/remove environment variables. Document needed env changes instead.
- Both `package-lock.json` and `pnpm-lock.yaml` exist. Do not change package-manager strategy or install dependencies without approval.
- Keep changes scoped and atomic. Commit every discrete change using `type(scope): subject`, and list touched paths explicitly when committing.
- Check `git status --short --branch` before committing. Do not revert unrelated dirty worktree changes.

## Code Style
- Prefer small, focused React components and keep client components marked with `"use client"` only when hooks/browser APIs require it.
- Use the `@/` alias for app-root imports when crossing directories.
- Follow the existing Tailwind/token style. Prefer `bg-card`/`bg-background` style tokens over hard-coded white surfaces.
- Avoid gradients, glow effects, arbitrary `z-*` values, and oversized rounded cards unless the existing surface already uses that visual language.
- Use `size-*` for square elements and `tabular-nums tracking-tight` for aligned numbers.

## Verification
- For doc-only changes, a diff review is enough.
- For UI or interaction changes, run focused Vitest coverage first; run `npm run typecheck` when TypeScript surfaces are touched.
- For route/API changes, run the relevant focused tests plus `npm run build` when behavior depends on Next.js routing or server boundaries.

---

## Imported Skill Pack AGENTS.md

The section below was copied from `codex_technical_research_skill_pack.zip` without reconciliation.

# AGENTS.md

## Prime directive

Act like a senior/staff engineer. Be precise, efficient, industry-standard, and production-minded. Do not overcomplicate. Do not overwrite unrelated work. Preserve existing behavior unless the task explicitly requires a change.

## Default workflow

- Start with BLUF: the decision, risk, and next action.
- For any feature involving external APIs, webhooks, data models, auth, billing, infra, AI/LLM calls, files/imports, mobile platform behavior, security, or unclear architecture, invoke the `technical-research-before-code` skill before writing production code.
- Prefer narrow, shippable MVPs over speculative architecture.
- Use current official documentation as the source of truth when researching packages, SDKs, pricing, APIs, webhook behavior, security requirements, and platform limits.
- When assumptions matter, fact-check them. Mark any unverified assumption explicitly.
- Ask at most one clarifying question only if implementation would otherwise fork materially. Otherwise make a reasonable, documented assumption and continue.

## Code standards

- Keep changes minimal and localized.
- No broad rewrites unless explicitly requested.
- No new production dependency without explaining why existing dependencies are insufficient.
- Favor boring, maintained, well-documented tools.
- Prefer typed, testable, composable code.
- Handle errors explicitly; do not swallow failures.
- Never expose secrets in client code, logs, committed files, or generated docs.
- Avoid mock behavior in production paths unless clearly isolated and documented.

## Before implementation

For research-gated work, produce a Markdown report first. The report must include:

- BLUF recommendation.
- Existing repo constraints.
- Current industry/stack research.
- API, pricing, rate limit, webhook, and security notes where relevant.
- Shippable MVP scope.
- Non-goals.
- Implementation plan.
- Risk register.
- Validation plan.
- Sources with dates accessed.

## Done means

- The requested behavior works.
- Relevant tests/type checks/lint checks were run, or the reason they could not run is stated.
- The diff is reviewed for regressions, security risks, and accidental overwrites.
- The final response includes what changed, where, validation results, and remaining risks.
