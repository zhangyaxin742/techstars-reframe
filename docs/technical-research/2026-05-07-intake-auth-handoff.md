# Technical Research Report: Intake Auth Handoff

**Date:** 2026-05-07  
**Author:** Codex  
**Decision status:** Approved for implementation  
**Implementation decision:** Ship now

## BLUF

Build the PRD-defined `/intake` auth handoff with Next.js route handlers, Supabase SSR Auth, Supabase Postgres/RLS, passwordless email OTP, a transaction-safe claim RPC, shared CSRF protection, and app-level abuse throttles. The fastest safe path is to keep the first slice narrow: no file upload, no AI extraction, no account settings, no multi-workspace picker, and no public launch until CAPTCHA or equivalent bot defense is in place.

## Recommendation

- **Recommended path:** Implement the PRD in the ordered sequence: dependency approval, Supabase SSR utilities, shared CSRF utility, SQL schema/RLS/RPC, intake/auth routes, focused UI, and tests.
- **Why this path:** It preserves the product wedge while keeping private founder context behind verified workspace ownership.
- **What not to do:** Do not add password auth, account settings, upload controls, AI extraction, live crawling, social sync, or workspace selection in this slice.

## User goal

Create the first real Reframe MVP route where founders enter business context before account creation, receive an email OTP only when saving, and land in a workspace-scoped project without duplicate project creation.

## Existing repo constraints

- **Stack:** Next.js 15 App Router, React 19, strict TypeScript, Tailwind, Vitest, Testing Library.
- **Relevant files:** `docs/prds/2026-05-07-intake-auth-handoff.md`, `app/api/waitlist/route.ts`, `lib/waitlist/submit.ts`, `lib/waitlist/rate-limit.ts`, `package.json`.
- **Existing patterns:** Route handlers validate JSON/origin, return `NextResponse.json`, use in-memory rate limiting for current backend protection, and persist waitlist data server-side through Supabase REST with service role.
- **Existing dependencies to reuse:** Next.js, React, Vitest, Testing Library, Tailwind tokens, Node `crypto`.
- **Constraints:** Do not edit `.env`; do not start dev servers; do not change package-manager strategy without approval; `/demo` remains untouched.

## Current external research

| Area | Finding | Source | Impact |
|---|---|---|---|
| SDK/package | Supabase Next.js SSR docs install `@supabase/supabase-js` and `@supabase/ssr`. | Supabase SSR Next.js docs, accessed 2026-05-07 | Dependency approval is required before implementation. |
| Auth/session | Supabase SSR uses cookie-aware browser/server clients; Proxy refreshes tokens with `getClaims`; server code should not trust `getSession()` alone. | Supabase SSR Next.js docs, accessed 2026-05-07 | Add client/server/proxy utilities before protected route work. |
| OTP | Passwordless email OTP uses `signInWithOtp`; users are automatically created by default unless `shouldCreateUser: false`; `{{ .Token }}` sends a code. | Supabase passwordless email docs, accessed 2026-05-07 | Use OTP-only flow and identical public `continue` response for new/existing emails. |
| Verification | `verifyOtp` logs in a user given an email/mobile OTP or token hash. | Supabase JavaScript `verifyOtp` docs, accessed 2026-05-07 | Verify route persists session cookies, then calls claim RPC. |
| Rate limits | Supabase Auth enforces endpoint rate limits and returns 429; app-level throttles are still needed. | Supabase Auth rate limits docs, accessed 2026-05-07 | Add IP/email-hash/draft-token throttles around anonymous mutations. |
| RLS | Supabase recommends RLS for exposed tables and policy-based access. | Supabase RLS docs, accessed 2026-05-07 | Add RLS and avoid recursive membership policies. |
| SQL functions | Supabase database functions are executable by public by default unless revoked; `security definer` functions must set `search_path`. | Supabase database functions docs, accessed 2026-05-07 | Harden claim RPC privileges and schema-qualify references. |
| Next.js security | Mutating endpoints must be treated as public HTTP endpoints requiring authorization and input validation. | Next.js Data Security guide, accessed 2026-05-07 | Add shared CSRF/origin guard before route implementation. |
| Proxy | Next.js documents Proxy as the current request interception layer. | Next.js Proxy docs, accessed 2026-05-07 | Use root `proxy.ts` as PRD specifies. |

## Assumptions checked

| Assumption | Verified? | Evidence | Consequence if wrong |
|---|---:|---|---|
| npm is the package-manager command to request. | Partial | Repo scripts and AGENTS commands use `npm`; both npm and pnpm locks exist. | User approval is still required before install. |
| No app rows before verify+claim. | Yes | PRD explicitly requires it. | OTP-start spam would create real app state. |
| Claim RPC can create profile/workspace/membership/project. | Yes | PRD defines this as the only project-from-draft operation. | If Supabase permissions prevent private schema RPC, use public wrapper delegating to schema-qualified private function. |

## MVP scope

### In scope

- Anonymous `/intake` context form.
- `/intake/verify` email OTP entry.
- Draft cookie/token hashing and minimum safe draft restore.
- Passwordless OTP start/verify.
- Supabase SSR session utilities.
- Workspace/project claim through hardened RPC.
- CSRF, origin checks, app-level throttles, generic auth responses.

### Out of scope / non-goals

- File upload controls, storage upload, AI extraction, media labeling, social sync, live scraping, account settings, billing, MFA, multi-workspace picker, direct publishing.

## Architecture plan

### Proposed flow

1. `/intake` issues CSRF token and renders context form.
2. `POST /api/reframe/intake/drafts` validates input, stores/updates draft with hashed token, and sets secure draft cookie.
3. If a verified session exists, route calls claim RPC and redirects.
4. Otherwise `POST /api/reframe/intake/continue` calls `signInWithOtp` and returns identical verify-email response.
5. `/intake/verify` submits OTP to `POST /api/reframe/auth/verify`.
6. Verify route calls `verifyOtp`, persists Supabase cookies, calls claim RPC, clears/rotates draft cookie, and redirects.

### Data model / schema changes

- SQL setup for `profiles`, `workspaces`, `workspace_memberships`, `intake_drafts`, `projects`.
- Constraints from PRD for token uniqueness, half-claim prevention, and `projects.intake_draft_id` idempotency.
- RLS matrix from PRD, including direct profile insert/update denial and non-recursive membership helper.

### API routes / functions / services

- `GET /api/reframe/intake/draft`
- `POST /api/reframe/intake/drafts`
- `POST /api/reframe/intake/continue`
- `POST /api/reframe/auth/verify`
- `POST /api/reframe/intake/claim`
- Claim RPC: prefer `security.claim_intake_draft`; fallback public wrapper if needed.

### Environment variables / secrets

```text
NEXT_PUBLIC_SUPABASE_URL=<Supabase project URL>
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<browser-safe publishable or anon key>
SUPABASE_SERVICE_ROLE_KEY=<server-only service role key, only where strictly needed>
REFRAME_SECURITY_SECRET=<server-only HMAC salt for draft/email/CSRF hashing>
```

## Implementation plan

1. Request approval for `npm.cmd install @supabase/supabase-js @supabase/ssr`.
2. Add Supabase SSR utilities and root `proxy.ts`.
3. Add shared CSRF and intake rate-limit utilities with tests.
4. Add SQL setup doc for schema/RLS/RPC.
5. Add intake service helpers and route handlers.
6. Add `/intake`, `/intake/verify`, and minimal project placeholder.
7. Add route/component/security tests.

## Validation plan

- **Unit tests:** CSRF helper, rate limiter, validation, safe draft restore shaping.
- **Route tests:** draft save/restore, identical continue responses, verify+claim, expiry, CSRF/origin rejection.
- **SQL/manual review:** RLS predicates, function grants, idempotent claim constraints.
- **Type/build:** `npm run typecheck`, focused `npm run test:run`, `npm run build`.
- **Failure cases:** Supabase not configured, invalid OTP, expired draft, duplicate claim, cross-workspace denial.

## Risk register

| Risk | Severity | Mitigation | Owner |
|---|---|---|---|
| OTP-start auth-user spam | High | No app rows before verify+claim; app-level throttles; CAPTCHA before public launch. | Engineering |
| RLS recursion or overexposure | High | P0 `workspace_memberships` select uses `user_id = auth.uid()`; helper only for workspace/project checks. | Engineering |
| Claim RPC privilege leak | High | Private schema preferred, revoke public/anon, grant authenticated only, set search path, schema-qualify. | Engineering |
| Dependency install changes package strategy | Medium | Use exact npm command only after approval. | Engineering |
| Missing Supabase env/config | Medium | Document env vars and fail closed with typed 503/500 style responses. | Engineering/Ops |

## Open questions

- None blocking for implementation. CAPTCHA provider choice remains a public-launch follow-up gate; implementation will document the gate but not wire CAPTCHA in this controlled pilot slice.

## Sources

- Intake Auth Handoff PRD, `docs/prds/2026-05-07-intake-auth-handoff.md`, accessed 2026-05-07.
- Supabase SSR Next.js docs, https://supabase.com/docs/guides/auth/server-side/nextjs, accessed 2026-05-07.
- Supabase passwordless email docs, https://supabase.com/docs/guides/auth/auth-email-passwordless, accessed 2026-05-07.
- Supabase JavaScript `verifyOtp`, https://supabase.com/docs/reference/javascript/auth-verifyotp, accessed 2026-05-07.
- Supabase Auth rate limits, https://supabase.com/docs/guides/auth/rate-limits, accessed 2026-05-07.
- Supabase RLS docs, https://supabase.com/docs/guides/database/postgres/row-level-security, accessed 2026-05-07.
- Supabase database functions docs, https://supabase.com/docs/guides/database/functions, accessed 2026-05-07.
- Next.js Data Security guide, https://nextjs.org/docs/15/app/guides/data-security, accessed 2026-05-07.
- Next.js Proxy docs, https://nextjs.org/docs/app/getting-started/proxy, accessed 2026-05-07.
