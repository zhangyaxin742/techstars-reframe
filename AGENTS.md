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
- Waitlist submission is handled by `app/api/waitlist/route.ts` and `lib/waitlist/submit.ts`; Loops env vars are required at runtime.

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
