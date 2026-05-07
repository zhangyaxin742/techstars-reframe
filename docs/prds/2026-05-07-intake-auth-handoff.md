# PRD: Intake Auth Handoff

**Status:** Draft  
**Owner:** Product + Engineering  
**Date:** 2026-05-07  
**Feature slug:** `intake-auth-handoff`  
**Primary routes:** `/intake`, `/intake/verify`  
**Related docs/code:** `docs/reframe-mvp-cutdown.md`, `AGENTS.md`, `app/api/waitlist/route.ts`, `lib/waitlist/submit.ts`, `lib/waitlist/rate-limit.ts`, `package.json`  
**Decision:** Build as the first real MVP route slice before `/app/[workspaceSlug]/projects/[projectSlug]`.

---

## 1. BLUF

Build `/intake` as the founder context intake and auth handoff because Reframe's first real product act should be "build from my business context," not "create an empty account." The smallest production-worthy version collects business context, saves a short-lived pre-auth draft, verifies or signs in the user only when needed, claims the draft into a workspace-scoped project, and redirects to `/app/[workspaceSlug]/projects/[projectSlug]`. The biggest risk is account or draft takeover through a leaky email lookup, weak draft-token handling, or non-idempotent claim.

| Item | Answer |
|---|---|
| User problem | Founders need to give Reframe context before account creation without losing work or exposing private business notes/media. |
| Primary user | Founder or early team member starting Reframe from the landing CTA. |
| MVP scope | `/intake` + `/intake/verify` + intake/auth/claim API contracts that create one owned project from one draft. |
| Non-goals | No live trend search, social sync, Shopify OAuth, AI extraction UI, media labeling, publishing, or full workspace editor in this slice. |
| Success metric | Implementation success is 0 duplicate projects from claim retries; draft-to-claim conversion is tracked as pilot analytics, not an implementation gate. |
| Engineering risk | Secure draft-token storage, Supabase SSR session setup, RLS policy correctness, and claim idempotency. |
| Design risk | Auth must feel like saving the work, not a detached account gate. |
| Launch risk | Misleading copy could imply connected accounts, live scraping, or uploaded media persistence before those paths are real. |

### Assumptions

| Assumption | Basis | Impact if wrong | Owner |
|---|---|---|---|
| `/intake` stores text context and source references before auth; all binary upload UX is deferred. | `docs/reframe-mvp-cutdown.md` says to delay real media upload until after auth when possible, and this PRD is only the first shippable route slice. | If file upload must appear in the first slice, storage cleanup, temporary buckets, abuse controls, and a second PRD are needed. | Product + Engineering |
| Passwordless email OTP is the only P0 auth method. | User direction on 2026-05-07; Supabase passwordless email OTP supports account creation and sign-in through `signInWithOtp` plus `verifyOtp`. | Password UI, password reset, and password validation are excluded from this PRD. | Product |
| A default workspace can be created during claim for new users. | Cutdown defines one default workspace per new user as P0 account scope. | If account/team setup must happen separately, claim must pause before project creation. | Engineering |
| No AI model call runs inside the initial `/intake` handoff. | The cutdown places structured extraction after the handoff. | If extraction must run before redirect, latency, cost, and AI validation move into this PRD. | Product |

## 2. Problem

### Current state

- The repo has a landing/waitlist flow, seeded `/demo`, `/workspace`, and `/trending` surfaces, but no real `/intake`, `/intake/verify`, Supabase Auth client, auth middleware, workspace schema, RLS policy set, or storage upload pipeline.
- Existing waitlist code persists a lead through server-side Supabase REST calls and Resend side effects. It is not an authenticated product session or project ownership model.
- The MVP cutdown says `/demo` must remain frozen and that real MVP behavior should live on new routes, starting with `/intake`.

### Why now

- Reframe's wedge depends on using founder/business context before producing content.
- Asking for account creation before any context entry weakens the product story and increases abandonment.
- Persisting private founder notes and eventual media without verified ownership is not acceptable for a public, multi-user MVP.

## 3. Goal / Non-goals

### Goals

- Let a founder enter business URL, product/store URL, campaign goal, founder note, and optional source references before account creation.
- Persist a recoverable, short-lived `intake_drafts` row without storing raw draft tokens.
- Verify identity only when saving/opening the workspace, then claim the draft into a workspace-scoped project.
- Avoid public account-enumeration behavior and avoid sensitive identifiers in query strings.
- Preserve `/demo` behavior and keep downstream extraction/media/storyboard work out of this slice.

### Non-goals

- No live website crawling, social scraping, social account sync, Shopify OAuth, Google Drive/iCloud connector, or platform publishing.
- No OpenAI extraction, media/frame labeling, recipe generation, storyboard editing, editorial memory, or export generation in this PRD.
- No file upload controls or pre-auth binary upload in P0; media upload starts in a later authenticated workspace slice.
- No billing, seats, enterprise SSO, mandatory MFA, audit log UI, or advanced RBAC.
- No public endpoint that answers whether an email address exists.

## 4. Target users and use cases

| User | Use case | Trigger | Desired outcome |
|---|---|---|---|
| New founder | Start from landing and save business context before creating an account. | Clicks "Build from my business context." | Enters context, creates/verifies account, lands in an owned project without retyping. |
| Existing founder, signed out | Add context from a new browser session. | Completes intake and enters email OTP. | Verifies and claims the draft into their default workspace. |
| Existing founder, already signed in | Start a new campaign quickly. | Opens `/intake` with an active Supabase session. | Submit claims immediately and redirects to the project. |

## 5. MVP scope

### In scope

- `/intake` page with a focused context form:
  - business/company URL
  - product/store URL
  - campaign goal
  - founder note/text rant
  - optional source references
- `/intake/verify` page for email code verification and post-verification redirect.
- Next.js route-handler API contracts for draft save, OTP start, OTP verification, and idempotent claim.
- Supabase Auth SSR setup, profile/workspace/membership/project creation contracts, and RLS requirements.
- Draft cookie with `HttpOnly`, `Secure`, `SameSite=Lax`, path `/`, and 24-hour expiry.
- Rate limiting for draft creation, OTP starts, verification attempts, and claim attempts.
- Product-safe copy that says "source reference" and "save this workspace," not "connected account" or "we found your account."

### Out of scope

- Any route or UI under `/demo`.
- Full `/account` management beyond the minimum helpers needed to create/read the current user, profile, workspace, and membership during claim.
- Signed upload URL UI implementation beyond specifying that post-auth upload owns real files.
- AI extraction and downstream project workspace screens.

### Release shape

- **MVP:** Context draft + auth handoff + idempotent claim into a workspace project.
- **Deferred:** Authenticated media upload, structured context extraction, multi-workspace selection, and pre-auth temporary upload buckets.

## 6. User experience and flow

### Entry points

- Landing CTA routes to `/intake`.
- Authenticated users can also open `/intake` directly from `/app` or account/workspace navigation when that navigation exists.
- `/intake/verify` is reached only after an email OTP flow has been started from a valid draft.

### Core flow

1. User opens `/intake`.
2. System shows an empty context form and, if present, restores draft fields from the secure draft cookie through a server read.
3. User enters business URL, product/store URL, campaign goal, founder note, and optional source references.
4. User clicks `Save and open my workspace`.
5. System calls `POST /api/reframe/intake/drafts`, creates or updates the draft, and sets/refreshes the draft cookie.
6. If a valid Supabase session exists, system calls claim server-side and redirects to `/app/[workspaceSlug]/projects/[projectSlug]`.
7. If no session exists, system asks for email and presents generic save-account copy.
8. System calls `POST /api/reframe/intake/continue`; the public response always tells the client to show `/intake/verify` and never reveals account existence.
9. User receives a six-digit email OTP, enters it on `/intake/verify`, and is redirected after claim.
10. If claim succeeds, system clears or rotates the draft cookie and shows "Context saved. Opening your workspace..." before redirect.

### Secondary paths

- User saves a partial draft, closes the tab, and returns within 24 hours: system restores fields from the valid draft.
- Draft expires: system clears the stale cookie and asks the user to restart.
- Verification code expires or fails: user can request a new code subject to rate limits.
- User cancels auth: draft remains recoverable until expiry, but no workspace/project access is granted.

### State requirements

| State | Required behavior | Copy/content | Notes |
|---|---|---|---|
| Empty | Show form with clear required fields and source-reference language. | "Start with what is already true about the business." | No blank AI chat box. |
| Draft restored | Load only minimum safe draft fields through server validation. | "Draft restored. Continue when ready." | Draft tokens are bearer credentials; never expose token, email hash, claim IDs, token hash, or internal ownership metadata to the client. |
| Loading save | Disable primary action, keep entered data visible, announce progress. | "Saving your context..." | Use `aria-live` for progress. |
| Auth required | Keep form context visible and ask for email only. | "Continue to save this workspace." | Do not say "we found your account." |
| Verification pending | Show code entry, resend affordance, masked email display. | "Enter the code we emailed to continue." | No draft token in query params. |
| Claiming | Show short transition state. | "Context saved. Opening your workspace..." | Retry-safe; refresh should not duplicate project. |
| Success | Redirect to owned project. | Project page may show "Extracting context from provided sources" later. | Success page is not required if redirect is fast. |
| Field validation error | Keep focus near invalid field and preserve all input. | Specific field-level error. | 400 response for invalid JSON/fields. |
| Auth error | Use generic credential or verification copy. | "Could not continue with those credentials." | Avoid enumeration via copy and response shape. |
| Permission denied | Block claim if draft is already claimed by another user or workspace is inaccessible. | "This intake cannot be opened from this account. Start a new intake." | Do not reveal owner identity. |
| Expired | Clear cookie and allow restart. | "This intake expired. Start a new one to keep your context secure." | 410 from API is acceptable. |
| Offline/degraded | Keep local form values in component state; allow retry. | "Connection lost. Retry when you are back online." | Do not promise server persistence while offline. |

### UX principles

- The auth step is framed as saving the founder's work, not as a generic account gate.
- Every URL is a source reference, not a connected account or live sync.
- File upload controls are not present in this first route slice; media upload starts in a later authenticated workspace slice.
- Primary action copy is stable: `Save and open my workspace`.

### Accessibility and responsive behavior

- Keyboard navigation follows field order, primary action, auth controls, then secondary links.
- Inputs have visible labels, not placeholder-only labels.
- Field errors are associated with inputs via `aria-describedby`.
- Verification code inputs support paste and single-field fallback for screen readers.
- Loading and verification states announce status with `aria-live="polite"`.
- Mobile layout uses one column; desktop may use a two-column form + context preview, but the auth handoff stays inline and visible without a modal dependency.

## 7. Functional requirements

| ID | Requirement | Priority | Acceptance signal |
|---|---|---|---|
| FR-1 | `/intake` must render without requiring an authenticated session. | P0 | Anonymous user can view and complete the form. |
| FR-2 | The form must collect business URL, product/store URL, campaign goal, and founder note. | P0 | Submit includes normalized, validated values. |
| FR-3 | URL fields must be labeled as source references, not connected accounts. | P0 | UI and tests contain no "sync", "connect Shopify", "read Instagram", or similar claims. |
| FR-4 | Draft save must create or update `intake_drafts` and set a secure draft cookie. | P0 | API response includes draft state and cookie is present with required flags. |
| FR-5 | Draft tokens must be random, stored hashed server-side, and never placed in localStorage or query strings. | P0 | Code review and route tests confirm no raw token persistence outside the cookie. |
| FR-6 | Authenticated submit must claim immediately into the active/default workspace. | P0 | User lands on `/app/[workspaceSlug]/projects/[projectSlug]`. |
| FR-7 | Anonymous submit must ask for auth without losing draft fields. | P0 | Reload or auth failure preserves recoverable context until expiry. |
| FR-8 | Auth must use passwordless email OTP only; no password field or password reset appears in this slice. | P0 | Starting OTP returns the same public response for new and existing emails. |
| FR-9 | OTP verification must create a Supabase session and use the same claim path for new and existing users. | P0 | Verification does not create a second draft or project. |
| FR-10 | Public responses must not reveal whether an email exists. | P0 | Response body and status shape are generic for unknown vs existing email cases where feasible. |
| FR-11 | Claim must be idempotent. | P0 | Repeating claim for the same valid draft/user returns the same project slug. |
| FR-12 | Draft expiry must prevent stale claims. | P0 | Expired drafts return an explicit restart state and cannot create projects. |
| FR-13 | File upload controls must be absent from `/intake` in this first slice. | P0 | UI and API tests show no file input, upload URL call, or pending media persistence. |
| FR-14 | Route handlers must validate JSON content type, origin where relevant, field lengths, and URL shape. | P0 | Invalid requests return typed 400/403/415/413 responses. |
| FR-15 | Rate limits must apply to draft save, continue/OTP start, resend, verify, and claim attempts. | P0 | Excess attempts return 429 with retry guidance. |
| FR-16 | `/demo` must remain untouched. | P0 | Git diff contains no `/demo` changes for this feature. |

## 8. Non-functional requirements

| Category | Requirement | Target |
|---|---|---|
| Performance | Initial `/intake` render should not depend on external AI or media services. | Form interactive within normal Next.js page latency; no model call on first render. |
| Reliability | Claim operations must be transactional or otherwise race-safe. | 0 duplicate projects for repeated verify/claim requests in tests. |
| Security | Draft token is raw only in `HttpOnly` cookie; DB stores token hash only. | Token cannot be read by client JS or recovered from DB alone. |
| Privacy | Founder notes, raw URLs, and email addresses are not logged to analytics or server error logs. | Logs contain draft/project IDs and coarse event names only. |
| Accessibility | Forms and code entry meet WCAG 2.2 AA expectations for labels, focus, contrast, and error messaging. | Testing Library accessibility checks and manual keyboard QA pass. |
| Observability | Server logs and metrics track state transitions without sensitive payloads. | Every failed route has status code, route, coarse reason, and request ID. |
| Maintainability | API payloads and draft statuses are typed with shared schemas. | Typecheck covers route helpers and tests. |

## 9. Data, API, and integration contracts

### Data model

| Entity | Fields | Owner | Validation | Retention |
|---|---|---|---|---|
| `intake_drafts` | `id: uuid`, `token_hash: text`, `status: draft/auth_required/verification_pending/claimed/expired`, `business_url: text?`, `product_url: text?`, `campaign_goal: text`, `founder_note: text`, `source_references: jsonb`, `email_hash: text?`, `expires_at: timestamptz`, `claimed_user_id: uuid?`, `claimed_workspace_id: uuid?`, `claimed_project_id: uuid?`, timestamps | Reframe API | Token hash required; at least one URL or founder note required by final save; note length capped; status transitions enforced server-side. | Delete or anonymize unclaimed drafts after expiry plus cleanup window. |
| `profiles` | `id: uuid`, `email_display: text`, `email_hash: text`, `display_name: text?`, timestamps | Account/auth layer | `id` references `auth.users`; email hash computed server-side. | User lifetime; deleted with account policy. |
| `workspaces` | `id: uuid`, `slug: text`, `name: text`, `created_by: uuid`, timestamps | Account/auth layer | Slug unique; creator must have membership. | User/workspace lifetime. |
| `workspace_memberships` | `workspace_id: uuid`, `user_id: uuid`, `role: owner/admin/member`, timestamps | Account/auth layer | One owner minimum; unique user/workspace pair. | Workspace lifetime. |
| `projects` | `id: uuid`, `workspace_id: uuid`, `slug: text`, `name: text`, `intake_draft_id: uuid?`, `created_by: uuid`, `intake_snapshot: jsonb`, timestamps | Reframe project layer | `workspace_id` required; `intake_draft_id` unique when present; user must be member. | Project lifetime. |

### Required DB constraints for idempotent claim

| Table | Constraint/index | Purpose |
|---|---|---|
| `profiles` | `primary key (id)`, `foreign key (id) references auth.users(id) on delete cascade`, `unique (email_hash)` | One application profile per auth user and no duplicate email hash rows. |
| `workspaces` | `primary key (id)`, `unique (slug)`, `foreign key (created_by) references auth.users(id)` | Stable workspace URLs and auditable creator. |
| `workspace_memberships` | `primary key (workspace_id, user_id)`, `check (role in ('owner','admin','member'))` | One membership per user/workspace and valid role values. |
| `intake_drafts` | `unique (token_hash)`, `unique (claimed_project_id) where claimed_project_id is not null`, `check (status in ('draft','auth_required','verification_pending','claimed','expired'))` | One draft per token and one claimed project per draft. |
| `intake_drafts` | `check ((status = 'claimed') = (claimed_user_id is not null and claimed_workspace_id is not null and claimed_project_id is not null))` | Prevent half-claimed drafts. |
| `projects` | `unique (workspace_id, slug)`, `unique (intake_draft_id) where intake_draft_id is not null`, `foreign key (workspace_id) references workspaces(id)` | Retry-safe project creation and stable project URLs. |

### Draft status machine

| Status | Meaning | Allowed next states |
|---|---|---|
| `draft` | Context exists, not yet tied to auth. | `auth_required`, `claimed`, `expired` |
| `auth_required` | Valid draft, no verified session. | `verification_pending`, `claimed`, `expired` |
| `verification_pending` | Email OTP started. | `claimed`, `auth_required`, `expired` |
| `claimed` | Verified user owns a workspace project from the draft. | None except cleanup metadata updates. |
| `expired` | Draft can no longer be claimed. | None; restart required. |

### Cookie contract

| Cookie | Value | Flags | Lifetime | Notes |
|---|---|---|---|---|
| `reframe_intake_draft` | Raw random draft token | `HttpOnly`, `Secure`, `SameSite=Lax`, `Path=/` | 24 hours | Set and refreshed only by route handlers; cleared or rotated after claim. |

Draft tokens are bearer credentials. Possession of the raw draft cookie is enough to restore or continue an unclaimed draft until expiry, so restore responses must return only `businessUrl`, `productUrl`, `campaignGoal`, `founderNote`, `sourceReferences`, `expiresAt`, and coarse `status`. They must not return raw tokens, token hashes, email hashes, claimed IDs, user IDs, workspace IDs, project IDs, or owner/account state.

### API surface

| Endpoint/action | Input | Output | Auth | Failure behavior |
|---|---|---|---|---|
| `GET /api/reframe/intake/draft` | Draft cookie only | `{ ok, state, draft? }` | Optional | `404` if no draft, `410` if expired and cookie should clear. |
| `POST /api/reframe/intake/drafts` | `{ businessUrl?, productUrl?, campaignGoal, founderNote?, sourceReferences? }` | `{ ok, state, expiresAt }` plus draft cookie | Optional | `400` invalid fields, `413` payload too large, `415` non-JSON, `429` rate-limited. |
| `POST /api/reframe/intake/continue` | `{ email }` plus draft cookie | Always `{ ok: true, nextStep: "verify_email", maskedEmail, resendAfterSeconds }` for syntactically valid input | Optional; no active session expected | Same public status/body for new and existing emails; `400` only for invalid email/draft, `410` for expired draft, `429` for throttling. |
| `POST /api/reframe/auth/verify` | `{ email, token }` plus draft cookie | `{ ok: true, redirectTo }` after successful OTP verification and claim | Anonymous with pending draft | Generic `400` for invalid/expired OTP, `410` expired draft, `429` rate limit; no account-existence distinction. |
| `POST /api/reframe/intake/claim` | Draft cookie | `{ ok: true, project: { workspaceSlug, projectSlug } }` | Required verified session | Calls claim RPC; retry returns existing project for same user/draft; generic conflict for another claimed owner. |

### Supabase OTP and session flow

| Step | Required behavior |
|---|---|
| OTP start | `POST /api/reframe/intake/continue` validates draft, email, CSRF, and app-level IP/email-hash/draft-token rate limits, then calls `supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: true } })`. It ignores account-state differences and always returns the public verify-email shape on provider success. It must not create `profiles`, `workspaces`, `workspace_memberships`, or `projects`; those are created only after successful OTP verification and claim. |
| OTP email template | Supabase Magic Link email template must include `{{ .Token }}` and product copy for a six-digit email code. Password fields and password reset links are not part of P0. |
| OTP verify | `POST /api/reframe/auth/verify` creates a cookie-aware server Supabase client and calls `supabase.auth.verifyOtp({ email, token, type: "email" })`. |
| Session cookies | On successful `verifyOtp`, the route handler must persist Supabase auth cookies onto the `NextResponse` through the `@supabase/ssr` server-client cookie adapter before returning. |
| Session validation | Server routes and protected pages must use `supabase.auth.getClaims()` or an equivalent verified-user call after cookie refresh; do not trust `getSession()` alone in server code. |
| Claim | After OTP verification, the route calls the claim RPC as the authenticated user and redirects to the returned project URL. |

### Claim transaction/RPC

The claim RPC is the only operation that creates a project from a draft. Prefer `security.claim_intake_draft(p_token_hash text)` or another non-public/private schema if repo and Supabase RPC conventions allow it. If the implementation must expose an RPC through `public`, use a minimal `public.claim_intake_draft` wrapper that delegates to a schema-qualified private function and exposes no table access.

- Implement as a Postgres function executed in one transaction.
- Explicitly `revoke execute` from `public` and `anon`; grant execute only to `authenticated` on the callable function.
- If `security definer` is required to read/update `intake_drafts`, set `search_path` explicitly and enforce `auth.uid() is not null` inside the function.
- Schema-qualify every table, helper function, and enum reference inside the function body.
- Lock the draft row with `select ... for update` by `token_hash`.
- If the draft is expired, mark it `expired` and return an expired error.
- If the draft is already claimed by the same `auth.uid()`, return the existing workspace/project slugs.
- If the draft is already claimed by another user, return a generic conflict without owner details.
- Upsert `profiles`, default `workspaces`, and owner `workspace_memberships` with `on conflict do nothing`.
- Insert `projects` with `intake_draft_id`; on unique conflict, return the existing project.
- Update `intake_drafts` to `claimed` with claimed user/workspace/project IDs in the same function.

### RLS policy matrix

| Table/function | Operation | Predicate / rule |
|---|---|---|
| `profiles` | `select` | `auth.uid() = id` |
| `profiles` | `insert` | Direct insert denied in this slice; profile creation happens only through the claim RPC after successful OTP verification. |
| `profiles` | `update` | Direct update denied in this slice unless a later `/account` settings PRD limits updates to explicitly safe fields. |
| `workspaces` | `select` | User can read workspaces only if a non-recursive security-definer helper such as `security.is_workspace_member(workspaces.id, auth.uid())` returns true. |
| `workspaces` | `insert`, `update`, `delete` | Direct table mutation denied in this slice; default workspace is created by `claim_intake_draft`. |
| `workspace_memberships` | `select` | `user_id = auth.uid()` for P0 to avoid self-recursive membership policies. |
| `workspace_memberships` | `insert`, `update`, `delete` | Direct table mutation denied in this slice; owner membership is created by `claim_intake_draft`. |
| `intake_drafts` | all direct operations | Direct table access denied to `anon` and `authenticated`; anonymous draft writes go through server route handlers, claim goes through RPC. |
| `projects` | `select` | User can read projects only if the same non-recursive workspace-membership helper returns true for `projects.workspace_id` and `auth.uid()`. |
| `projects` | `insert`, `update`, `delete` | Direct table mutation denied in this slice; project creation is only through `claim_intake_draft`. |
| `claim_intake_draft` | execute | Revoke from `public` and `anon`; grant only to `authenticated`; function checks `auth.uid()`, draft status, expiry, and claim ownership. |

### External integrations

| Integration | Purpose | Auth | Webhooks/events | Rate limits/costs | Failure handling |
|---|---|---|---|---|---|
| Supabase Auth | Passwordless email OTP verification and session cookies. | Browser/server Supabase clients using cookie SSR; service/secret key only on trusted server helpers. | No webhooks required for this slice. | Supabase Auth has endpoint rate limits and MAU-based billing beyond plan quota. Add app-level throttle around intake/auth starts. | Generic errors; preserve draft; allow retry/resend within limits. |
| Supabase Postgres | Store drafts, profiles, workspaces, memberships, and projects. | Server route handlers; RLS for exposed tables. | None. | Included in Supabase project usage; DB/storage overages depend on plan. | Transaction rollback; typed error response; no partial project without claim status. |
| Next.js App Router route handlers | Backend-for-frontend API routes and cookie mutation. | Server runtime. | None. | No direct vendor cost. | Return explicit `Response`/`NextResponse`; set/delete cookies in route handlers only. |
| Resend | Existing waitlist notification provider. | Existing server-side env vars. | Not used by `/intake`. | No new cost in this slice. | No dependency for intake claim. |

### Migration/backfill

- Add new Supabase SQL migrations/docs for `profiles`, `workspaces`, `workspace_memberships`, `intake_drafts`, and `projects`.
- Existing waitlist rows are not backfilled into intake drafts.
- Existing `/demo`, `/workspace`, and `/trending` routes remain backward-compatible and untouched.

## 10. AI/automation behavior, if applicable

No AI model call is in scope for this `/intake` handoff PRD.

The draft payload must still be treated as untrusted future AI input:

- Store source type and user-provided context separately enough for downstream extraction prompts to identify provenance.
- Do not convert URLs or founder notes into factual marketing claims in `/intake`.
- Do not summarize, enrich, crawl, classify, or label media in this slice.
- Downstream PRDs for context extraction and media labeling must define OpenAI input/output schemas, guardrails, cost controls, and evaluation.

## 11. Analytics and success metrics

### Product metrics

| Metric | Definition | Target | Instrumentation |
|---|---|---|---|
| Draft save rate | `% of /intake visitors who create a valid draft` | Establish MVP baseline; monitor weekly. | `intake_draft_saved` / `intake_started`. |
| Claim completion rate | `% of saved drafts that become projects` | Pilot analytics target of 40%+; not an implementation acceptance gate. | `intake_claimed` / `intake_draft_saved`. |
| Duplicate claim count | Projects created more than once for one `intake_draft_id`. | 0. | DB unique constraint + server metric. |
| Auth handoff failure rate | Auth/verify/claim failures per saved draft. | Under 10% after pilot fixes. | Route-level counters by coarse reason. |
| Enumeration regression | Automated tests that detect distinct public responses for email existence. | 0 failing tests. | Security test suite. |

### Required events

| Event | Trigger | Properties | Privacy notes |
|---|---|---|---|
| `intake_started` | `/intake` page loads. | `entrypoint`, `has_existing_session` | No raw email, URLs, or notes. |
| `intake_draft_saved` | Draft create/update succeeds. | `draft_id`, `has_business_url`, `has_product_url`, `field_count` | `draft_id` internal only; no payload. |
| `intake_continue_clicked` | User clicks save/open action. | `draft_state`, `has_session` | No email. |
| `intake_auth_started` | Email OTP send starts. | `method: "email_otp"`, `draft_state` | Store email hash only server-side if needed. |
| `intake_verify_submitted` | User submits code. | `result`, `failure_reason_coarse` | No token. |
| `intake_claimed` | Draft is claimed into a project. | `workspace_id`, `project_id`, `claim_reused_existing_project` | Internal IDs only. |
| `intake_expired` | Draft restore/claim sees expiry. | `draft_age_hours_bucket` | No payload. |

## 12. Edge cases and failure states

| Case | Expected behavior | User-facing copy/action |
|---|---|---|
| Invalid URL | Normalize if safe; otherwise field-level error. | "Enter a valid URL or remove this source." |
| Empty required context | Block submit until campaign goal plus at least one source/note exists. | "Add a goal and at least one source or note." |
| Founder note too long | Reject with saved local value intact. | "Keep the founder note under the limit for this version." |
| Draft cookie missing | Ask user to restart or save current visible form as a new draft. | "This saved intake could not be found. Start a new intake." |
| Draft expired | Clear cookie; prevent claim. | "This intake expired. Start a new one to keep your context secure." |
| Existing account enters email | Keep public response identical to new-account email. | "Check your email for a code." |
| Wrong or expired OTP | Show code error and resend option subject to rate limit. | "That code did not work. Check it or request a new one." |
| User refreshes `/intake/verify` after successful claim | Return existing project redirect. | "Opening your workspace..." |
| Claim attempted by different user after draft token leak | Block or return generic already-claimed conflict. | "This intake cannot be opened from this account. Start a new intake." |
| Multiple workspaces | Defer selection; save to the user's default workspace in this slice. | "Opening your workspace..." |
| Supabase Auth outage | Preserve draft and show retry. | "We could not verify right now. Try again in a few minutes." |

## 13. Security, privacy, and abuse considerations

- **Sensitive data:** founder notes, product URLs, campaign goals, source references, email addresses, and draft tokens.
- **Access control:** anonymous users can only create/update a draft with the valid draft cookie. Workspace/project reads and writes require verified Supabase session and workspace membership.
- **Secret handling:** service role or secret keys stay server-only. The client may receive only publishable/anon keys required by Supabase SSR/client setup.
- **Draft token safety:** raw draft token is generated server-side, stored only in a secure `HttpOnly` cookie, hashed before persistence, and cleared or rotated after claim.
- **Draft restore minimization:** treat the draft cookie as a bearer credential and return only minimum editable form fields plus expiry/status; never return internal IDs, token hashes, email hashes, or claim metadata.
- **OTP-start abuse:** `continue` may create Supabase Auth users when `shouldCreateUser: true`, but no application profile, workspace, membership, or project may be created until `verifyOtp` succeeds and claim runs. Add app-level limits by IP, email hash, and draft token around draft save, OTP start/resend, verify, and claim attempts.
- **Account enumeration:** no standalone or embedded email-existence response. `continue` must not branch publicly by account state; email hashes may be stored only for rate limiting, audit, or internal dedupe.
- **CSRF strategy:** every state-changing route requires `POST`, `Content-Type: application/json`, a valid `Origin` that matches `Host` or `X-Forwarded-Host`, and an `X-Reframe-CSRF` header. `/intake` issues a random CSRF token, stores only its HMAC in a `Secure`, `SameSite=Lax`, `HttpOnly` cookie, and passes the raw token to the page as a server-rendered form value. Route handlers compare the header token HMAC to the cookie value and reject missing/mismatched tokens with `403`. If `Sec-Fetch-Site` is present, only `same-origin` or `same-site` is accepted.
- **Bot defense:** before public launch, add CAPTCHA or an equivalent stronger bot defense to OTP start and other high-abuse anonymous mutations. This is not required for a controlled pilot but is a launch gate for public traffic.
- **Abuse cases:** bot draft spam, auth code brute force, credential stuffing, token theft, draft hijack, oversized notes/source payloads, unsafe URLs, and later prompt injection from founder-provided text.
- **Mitigations:** rate limiting by IP/email hash/draft token, payload size caps, URL normalization, no sensitive logs, RLS policies, transactional claim, generic errors, and automated cross-workspace denial tests.

## 14. Dependencies and constraints

| Dependency/constraint | Impact | Owner | Status |
|---|---|---|---|
| Supabase Auth project config | Passwordless email OTP template must be configured before `/intake/verify` works. | Engineering/Ops | Needed. |
| `@supabase/supabase-js` and `@supabase/ssr` | Not currently in `package.json`; implementation needs dependency approval due repo rules. | Engineering | Not installed. |
| Supabase SQL migrations | `profiles`, `workspaces`, `workspace_memberships`, `intake_drafts`, and `projects` must exist with RLS. | Engineering | Needed. |
| Supabase SSR utilities | Add `lib/supabase/client.ts`, `lib/supabase/server.ts`, `lib/supabase/proxy.ts`, and root `proxy.ts` or framework-equivalent middleware matcher before auth routes ship. | Engineering | Needed. |
| Shared CSRF utility | Add one shared CSRF issue/verify utility before implementing state-changing routes so route handlers do not duplicate token logic. | Engineering | Needed. |
| Existing waitlist raw REST helper | Shows server-side Supabase pattern but is not enough for user sessions. | Engineering | Existing reference only. |
| Mixed lockfiles | Dependency changes must not change package-manager strategy. | Engineering | Constraint. |
| `/demo` freeze | New code must not mutate seeded demo behavior or data. | Engineering | Constraint. |
| No `.env` edits | Required runtime env changes must be documented, not committed. | Engineering/Ops | Constraint. |

### Runtime configuration to document before implementation

- Supabase URL.
- Supabase publishable/anon key for browser-safe auth client.
- Supabase secret/service role key for trusted server-only admin operations where strictly required.
- Auth redirect allow-list entries for `/intake/verify` and the app origin.
- Email template that includes `{{ .Token }}` for the six-digit email OTP.

### Required Supabase SSR setup

- `lib/supabase/client.ts`: exports a browser client using `createBrowserClient`.
- `lib/supabase/server.ts`: exports a server client using `createServerClient` with Next cookies wired through `getAll`/`setAll` or the current official cookie adapter.
- `lib/supabase/proxy.ts`: exports `updateSession(request)` that refreshes auth with `supabase.auth.getClaims()` and copies refreshed cookies to both request and response.
- `proxy.ts` at the repo root, or `middleware.ts` only if the Next.js/Supabase version in use requires it, calls `updateSession` and excludes static/image/favicon assets with a matcher.
- Server protection must use verified claims/user data after cookie refresh; do not authorize workspace/project access from unsigned client state.

### Ordered implementation sequence

1. Inspect `package-lock.json`, `pnpm-lock.yaml`, and current package scripts; output the exact package-manager install command for user approval before installing anything.
2. Add Supabase dependencies after approval without changing package-manager strategy.
3. Add Supabase SSR client/proxy utilities and document required env vars without editing `.env`.
4. Add a shared CSRF issue/verify utility with unit tests before implementing any state-changing intake/auth routes.
5. Add SQL migration for enums/tables, DB constraints, non-recursive RLS policies, helper functions, and the claim RPC.
6. Add focused DB/RLS tests or a SQL review checklist for cross-workspace denial and claim idempotency.
7. Add `POST /api/reframe/intake/drafts` with validation, draft cookie creation, and minimum-field draft restore coverage.
8. Add `POST /api/reframe/intake/continue` with email OTP send, app-level IP/email/draft throttles, and identical public response shape.
9. Add `/intake/verify` UI and `POST /api/reframe/auth/verify` with `verifyOtp`, cookie persistence, and claim RPC call.
10. Add minimal `/app/[workspaceSlug]/projects/[projectSlug]` placeholder target only if needed for redirect verification.
11. Switch landing CTA to `/intake` only after route, auth, CSRF, RLS, idempotency tests pass, and CAPTCHA/stronger bot defense is ready for public launch.

## 15. Rollout, migration, and rollback

- **Rollout:** Ship route hidden from primary landing CTA until Supabase Auth/RLS tests pass; then switch landing CTA from waitlist/demo path to `/intake` for pilot traffic.
- **Migration:** Create new tables and RLS policies. No backfill from waitlist.
- **Rollback:** Revert landing CTA to existing waitlist/demo path and disable `/intake` entry points. Existing unclaimed drafts can expire naturally; claimed projects remain readable if workspace app exists.
- **Support/ops:** Monitor 4xx/5xx route rates, auth provider failures, draft expiry rate, duplicate claim attempts, and RLS denial tests.

## 16. Acceptance criteria

The feature is ready to ship when:

- [ ] Anonymous founder can open `/intake`, enter context, and save a draft without creating an account first.
- [ ] Draft save creates or updates `intake_drafts`, stores only `token_hash`, and sets `reframe_intake_draft` with `HttpOnly`, `Secure`, `SameSite=Lax`, `Path=/`, and 24-hour expiry.
- [ ] Draft restore treats the draft cookie as a bearer credential and returns only minimum safe editable fields plus expiry/status.
- [ ] Authenticated founder submitting `/intake` is redirected to `/app/[workspaceSlug]/projects/[projectSlug]` with a project scoped to a workspace they belong to.
- [ ] New and existing founders use the same passwordless email OTP flow from intake and receive the same public `continue` response shape.
- [ ] OTP start creates no `profiles`, `workspaces`, `workspace_memberships`, or `projects`; those application rows are created only after successful verify plus claim.
- [ ] Valid `verifyOtp({ email, token, type: "email" })` creates/persists a Supabase session cookie and claims the draft through the same idempotent claim path.
- [ ] Repeating verify/claim requests for one draft/user returns the same project slug and does not create duplicate projects.
- [ ] Public responses and UI copy do not reveal whether an email address exists.
- [ ] URLs are presented as source references; UI contains no social sync, Shopify connector, live scraping, or fake upload persistence claims.
- [ ] `/intake` contains no file upload controls or pending media persistence in this first slice.
- [ ] Expired drafts cannot be claimed and show a restart path.
- [ ] RLS policies prevent a user from reading or writing projects/drafts/workspaces owned by another workspace.
- [ ] Every state-changing intake/auth route rejects missing, cross-origin, or invalid CSRF tokens.
- [ ] The shared CSRF utility has focused unit tests before route implementation depends on it.
- [ ] Public launch is blocked until OTP start has CAPTCHA or an equivalent stronger bot defense.
- [ ] Focused route and component tests pass, including draft restore, expiry, auth-required, verification, idempotent claim, and generic auth error states.

## 17. QA / validation plan

| Test | Type | Owner | Pass criteria |
|---|---|---|---|
| Intake form required fields | Component | Engineering | Submit disabled or field errors shown until minimum context exists. |
| Draft save route validation | Route unit | Engineering | Invalid JSON, invalid URLs, oversized payloads, and non-JSON content types return expected errors. |
| Draft cookie flags | Route unit | Engineering | Set-Cookie includes required security flags and max age. |
| Restore draft | Integration | Engineering | Valid cookie returns only safe editable fields plus expiry/status; expired cookie returns restart state. |
| Authenticated claim | Integration with mocked Supabase | Engineering | Existing session creates/returns workspace project. |
| OTP start and verification | Integration with mocked Supabase | Engineering | `signInWithOtp` returns identical public response shape and creates no application rows; `verifyOtp` success persists cookies and claim creates profile/workspace/membership/project. |
| Claim idempotency | Unit/integration | Engineering | Concurrent or repeated claim returns one project. |
| Enumeration resistance | Security unit | Engineering | Existing vs unknown email public response shape/copy remains generic. |
| CSRF utility | Unit | Engineering | Shared CSRF issue/verify helper rejects missing, malformed, mismatched, and replayed/expired tokens where applicable. |
| CSRF rejection | Route unit | Engineering | Mutating routes reject missing token, HMAC mismatch, cross-origin `Origin`, and disallowed `Sec-Fetch-Site`. |
| RLS policy review | SQL/manual | Engineering | Cross-workspace reads/writes are denied. |
| OTP spam guard | Route/security | Engineering | IP/email-hash/draft-token throttles block excessive OTP starts; public launch checklist includes CAPTCHA/stronger bot defense. |
| Keyboard and screen reader pass | Manual/component | Design + Engineering | Form, auth, and verification states are keyboard accessible and labeled. |

### Manual QA script

1. Open `/intake` anonymously.
2. Enter a product URL, campaign goal, and founder note.
3. Click `Save and open my workspace`.
4. Confirm the form transitions to inline auth without losing context.
5. Enter email, receive an OTP, and enter the emailed code on `/intake/verify`.
6. Confirm redirect to `/app/[workspaceSlug]/projects/[projectSlug]`.
7. Refresh the verify/claim URL or repeat the last request.
8. Confirm the same project opens and no duplicate project exists.
9. Sign out, repeat intake with an existing account, and verify the `continue` response matches the new-email response.
10. Try an expired draft token and confirm restart behavior.

## 18. Risks and open questions

### Risks

| Risk | Severity | Mitigation | Decision needed? |
|---|---|---|---|
| Account enumeration through email lookup or auth error differences | High | Generic response shape/copy, protected lookup only after valid draft token, app-level rate limits, security tests. | No, mitigation required. |
| OTP-start auth-user spam | High | Create no application rows until verify+claim; throttle by IP/email hash/draft token; add CAPTCHA or stronger bot defense before public launch. | No for public launch; controlled pilot can proceed with throttles. |
| Draft hijacking through leaked token | High | HttpOnly cookie, hashed token storage, short expiry, claim conflict rules, no query/localStorage token. | No, mitigation required. |
| RLS misconfiguration exposes private projects | High | Enable RLS on exposed tables, membership-based policies, cross-workspace denial tests. | No, mitigation required. |
| Pre-auth media expectations exceed safe storage scope | Medium | No file controls in `/intake`; create follow-up PRD if temporary upload becomes necessary. | Yes, only if product insists on pre-auth binary persistence. |
| Supabase dependency addition changes package strategy | Medium | Request install approval and update the existing lockfile strategy deliberately. | Yes during implementation. |
| Auth email deliverability slows activation | Medium | Configure template, monitor failure/resend rates, allow resend within limits. | No. |
| Users with multiple workspaces save to wrong place | Low | First slice uses default workspace only; workspace choice is deferred. | No for first slice. |

### Open questions

| Question | Why it matters | Default assumption | Owner |
|---|---|---|---|
| What exact field length limits should apply to founder note and source references? | Affects validation, abuse controls, and later AI cost. | Founder note 10,000 chars; source references 10 items; each note/reference 2,000 chars. | Engineering |
| Should a server fetch URL text during intake or later extraction? | Fetching adds SSRF/scraping and latency concerns. | Intake only stores source references; extraction PRD owns fetching/pasted fallback. | Engineering |

## 19. Sources and fact-check notes

| Claim/assumption | Source | Date accessed | Confidence |
|---|---|---|---|
| `/intake` should collect business/product URL, campaign goal, founder note, save a short-lived pre-auth draft, verify identity, claim into workspace, and redirect to app project. | `docs/reframe-mvp-cutdown.md` | 2026-05-07 | High |
| Current repo lacks Supabase Auth client, workspace schema, RLS policy set, and storage upload pipeline; waitlist is the only real backend path. | `package.json`, `app/api/waitlist/route.ts`, `lib/waitlist/submit.ts`, `docs/reframe-mvp-cutdown.md` | 2026-05-07 | High |
| Supabase SSR in Next.js uses cookie-configured clients through `@supabase/ssr`; server route handlers need server client utilities. | https://supabase.com/docs/guides/auth/server-side/creating-a-client?queryGroups=framework&framework=nextjs | 2026-05-07 | High |
| Supabase passwordless email OTP uses `signInWithOtp`; users can be automatically created by default and `verifyOtp({ email, token, type: "email" })` returns a session on success. | https://supabase.com/docs/guides/auth/auth-email-passwordless | 2026-05-07 | High |
| Supabase email OTP requires the email template to include `{{ .Token }}` for code-entry UX. | https://supabase.com/docs/guides/auth/auth-email-passwordless | 2026-05-07 | High |
| Supabase Auth enforces endpoint rate limits and returns 429 when exceeded; app-level throttles are still required around product-specific flows. | https://supabase.com/docs/guides/auth/rate-limits | 2026-05-07 | High |
| RLS should be enabled on exposed-schema tables; policies can protect data access. | https://supabase.com/docs/guides/database/postgres/row-level-security | 2026-05-07 | High |
| Application-facing user data should live in protected public tables that reference `auth.users`, not direct client access to the Auth schema. | https://supabase.com/docs/guides/auth/managing-user-data | 2026-05-07 | High |
| Next.js route handlers support custom request handlers in `app`, and cookies can be read/written in route handlers/server functions. | https://nextjs.org/docs/app/getting-started/route-handlers, https://nextjs.org/docs/app/api-reference/functions/cookies | 2026-05-07 | High |
| Next.js documents same-origin checks for Server Actions and warns that mutating endpoints must be treated as public HTTP endpoints requiring authorization and input validation. | https://nextjs.org/docs/15/app/guides/data-security | 2026-05-07 | High |
| Supabase supports Postgres database functions that can be called through the API/RPC; function privileges should be explicitly restricted, and security definer functions need explicit search paths. | https://supabase.com/docs/guides/database/functions | 2026-05-07 | High |
| OWASP recommends generic authentication/account-recovery responses to reduce user enumeration risk. | https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html | 2026-05-07 | High |
| Supabase pricing includes MAU-based usage considerations; cost should be monitored but this slice has low expected pilot usage. | https://supabase.com/docs/guides/platform/manage-your-usage/monthly-active-users | 2026-05-07 | Medium |

## Appendix: Cost Model

This PRD does not include OpenAI calls, binary media processing, or storage upload. The main cost drivers are Supabase Auth MAUs, Postgres rows, and email delivery.

| Driver | Assumption | Rough MVP impact | Guardrail |
|---|---|---|---|
| Supabase Auth MAU | Pilot under included MAU quota. | Expected $0 incremental MAU overage during pilot if under plan quota. | Monitor MAU usage before public launch. |
| Supabase Postgres | One draft row per intake, one project row per claim. | Negligible storage at pilot scale. | Delete/anonymize expired unclaimed drafts. |
| Email delivery | Supabase built-in auth email or configured SMTP. | Depends on Supabase/email configuration. | Track auth email failures and resend rate. |

## Appendix: Implementation Readiness Gaps

| Gap | Why it matters | Required resolution before code |
|---|---|---|
| Supabase dependency approval | `@supabase/supabase-js` and `@supabase/ssr` are not installed, and repo rules require approval before dependency changes. | Choose package manager command and get approval before implementation. |
| Package-manager command selection | Both `package-lock.json` and `pnpm-lock.yaml` exist, so dependency installation could accidentally change strategy. | Before requesting approval, inspect lockfiles/package scripts and present the exact install command Codex intends to run. |
| SQL migration ownership | The PRD defines constraints/RLS/RPC behavior but not the final migration file. | Draft SQL migration and run policy review before route work depends on it. |
| CSRF token transport | The strategy is specified, but the exact server component/client component handoff must match the final `/intake` component shape. | Decide whether `/intake` is server-rendered with a client form child or fully client-rendered with a bootstrap API. |
| Public bot defense | OTP start can create Supabase Auth users before application claim. | Add CAPTCHA or equivalent stronger bot defense before public launch; keep pilot traffic gated if this is not ready. |
| Auth email deliverability | OTP UX depends on Supabase email template and provider behavior. | Configure template with `{{ .Token }}` and verify local/staging email delivery. |
| Redirect target availability | The first slice needs a project URL after claim, but the full app workspace is out of scope. | Add a minimal authenticated project placeholder or defer CTA switch until that route exists. |
| RLS test harness | Cross-workspace denial must be tested, but no Supabase test harness exists in repo. | Add SQL/manual verification checklist or local Supabase test setup before shipping. |

## Appendix: Changelog

| Date | Change | Author |
|---|---|---|
| 2026-05-07 | Patched OTP spam guard, non-recursive RLS rules, profile permissions, hardened claim RPC placement/privileges, bearer-token restore limits, CSRF utility requirement, pilot analytics wording, and dependency install approval step. | Codex |
| 2026-05-07 | Line-edited auth handoff for OTP-only auth, non-enumerating `continue`, SSR setup, CSRF, RLS matrix, idempotent claim constraints/RPC, readiness gaps, and implementation sequence. | Codex |
| 2026-05-07 | Initial draft from `docs/reframe-mvp-cutdown.md` `/intake` flow and current official integration docs. | Codex |
