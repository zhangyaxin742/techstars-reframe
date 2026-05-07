# Reframe Docs Map

This folder is the working map for product truth, implementation plans, research, database checks, and historical records.

## Source Of Truth

- `docs/truth/mvp-build.md`: current MVP/cutdown direction and scope boundaries.
- `docs/prds/account-prd.md`: current account, workspace, invite, member visibility, and auth requirements.
- `docs/prds/intake-prd.md`: current intake, OTP, draft claim, and project handoff requirements.
- `DESIGN.md`: current visual/design-system guidance.

## Active Execution Plans

- `docs/exec-plans/repo-cleanup-demo-mvp-isolation.md`: repo cleanup, directory organization, and `/demo` versus `/app` isolation plan.
- `docs/exec-plans/account-workspace.md`: account/workspace implementation plan.
- `docs/exec-plans/intake-implementation.md`: intake/auth handoff implementation plan.

## Research

- `docs/research/account-workspace-research.md`: account/workspace technical research.
- `docs/research/intake-research.md`: intake/auth handoff technical research.

## RLS And Runtime Checks

- `docs/checks/account-checklist.md`: account/workspace RLS and RPC checklist.
- `docs/checks/intake-checklist.md`: intake RLS and claim checklist.

## Supabase SQL

- `supabase/migrations/0001_intake-auth-handoff-supabase.sql`
- `supabase/migrations/0002_account-workspace-management-supabase.sql`
- `supabase/migrations/0003_waitlist-resend-supabase.sql`

Run migration files in numeric order. They are intended to be additive/idempotent.

## Archive

- `docs/archive/demo-audit.md`: historical demo audit kept for reference, not current MVP truth.

## Repo Organization Rules

- `app/*`: Next.js App Router pages, layouts, and API routes.
- `components/*`: route-level and shared React components for current Next surfaces.
- `lib/*`: server/domain/auth/db utilities.
- `src/data/*`: frontend seed/demo content only.
- `supabase/migrations/*`: ordered SQL migrations.
- `docs/*`: current docs, plans, checks, and archived historical references.

## Cleanup Policy

- Prefer archiving docs before deleting them unless the file is clearly generated or obsolete.
- Delete public assets only after reference checks and route smoke tests.
- Keep `/demo` stable as the seeded legacy demo.
- Treat `/app/[workspaceSlug]/projects/[projectSlug]` as the real MVP workspace.
- Clone stateful demo workspace primitives into the MVP workspace before making MVP-specific behavior edits.
