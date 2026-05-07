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
| User problem | Founders need to give Reframe context before signup without losing work or exposing private business notes/media. |
| Primary user | Founder or early team member starting Reframe from the landing CTA. |
| MVP scope | `/intake` + `/intake/verify` + intake/auth/claim API contracts that create one owned project from one draft. |
| Non-goals | No live trend search, social sync, Shopify OAuth, AI extraction UI, media labeling, publishing, or full workspace editor in this slice. |
| Success metric | At least 40% of saved intake drafts are claimed into a workspace in the MVP pilot; duplicate project creation from claim retries is 0. |
| Engineering risk | Secure draft-token storage, Supabase SSR session setup, RLS policy correctness, and claim idempotency. |
| Design risk | Auth must feel like saving the work, not a detached signup wall. |
| Launch risk | Misleading copy could imply connected accounts, live scraping, or uploaded media persistence before those paths are real. |

### Assumptions

| Assumption | Basis | Impact if wrong | Owner |
|---|---|---|---|
| `/intake` stores text context and source references before auth, but real binary uploads happen after verified claim. | `docs/reframe-mvp-cutdown.md` says to delay real media upload until after auth when possible. | If pre-auth uploads are required, storage cleanup, temporary buckets, stricter abuse controls, and a second PRD are needed. | Product + Engineering |
| Email/password with OTP-style confirmation is acceptable for P0. | Cutdown explicitly recommends Supabase `signUp`, email confirmation templates, and `/intake/verify`. | If magic-link-only is chosen, verification UX and API shape simplify but the route copy changes. | Product |
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

- Let a founder enter business URL, product/store URL, campaign goal, founder note, and optional media/source references before signup.
- Persist a recoverable, short-lived `intake_drafts` row without storing raw draft tokens.
- Verify identity only when saving/opening the workspace, then claim the draft into a workspace-scoped project.
- Avoid public account-enumeration behavior and avoid sensitive identifiers in query strings.
- Preserve `/demo` behavior and keep downstream extraction/media/storyboard work out of this slice.

### Non-goals

- No live website crawling, social scraping, social account sync, Shopify OAuth, Google Drive/iCloud connector, or platform publishing.
- No OpenAI extraction, media/frame labeling, recipe generation, storyboard editing, editorial memory, or export generation in this PRD.
- No real pre-auth binary upload in P0. Pending files may be selected locally, but server upload begins after verified project ownership.
- No billing, seats, enterprise SSO, mandatory MFA, audit log UI, or advanced RBAC.
- No public endpoint that answers whether an email address exists.

## 4. Target users and use cases

| User | Use case | Trigger | Desired outcome |
|---|---|---|---|
| New founder | Start from landing and save business context before creating an account. | Clicks "Build from my business context." | Enters context, creates/verifies account, lands in an owned project without retyping. |
| Existing founder, signed out | Add context from a new browser session. | Completes intake and enters email/password or OTP. | Signs in and claims the draft into the right default workspace. |
| Existing founder, already signed in | Start a new campaign quickly. | Opens `/intake` with an active Supabase session. | Submit claims immediately and redirects to the project. |
| Invited team member | Save a project under a workspace they belong to. | Opens `/intake` while authenticated. | Project is scoped to an accessible workspace; no cross-workspace access is possible. |

## 5. MVP scope

### In scope

- `/intake` page with a focused context form:
  - business/company URL
  - product/store URL
  - campaign goal
  - founder note/text rant
  - optional source references
  - pending media selection intent that does not imply pre-auth persistence
- `/intake/verify` page for email code verification and post-verification redirect.
- Next.js route-handler API contracts for draft save, continuation, signup/sign-in, verification, and idempotent claim.
- Supabase Auth SSR setup, profile/workspace/membership/project creation contracts, and RLS requirements.
- Draft cookie with `HttpOnly`, `Secure`, `SameSite=Lax`, path `/`, and 24-hour expiry.
- Rate limiting for draft creation, auth starts, verification attempts, and protected email-hash lookup.
- Product-safe copy that says "source reference" and "save this workspace," not "connected account" or "we found your account."

### Out of scope

- Any route or UI under `/demo`.
- Full `/account` management beyond the minimum helpers needed to create/read the current user, profile, workspace, and membership during claim.
- Signed upload URL UI implementation beyond specifying that post-auth upload owns real files.
- AI extraction and downstream project workspace screens.

### Release shape

- **MVP:** Context draft + auth handoff + idempotent claim into a workspace project.
- **V1 follow-up:** Authenticated media upload from pending file selections, then structured context extraction.
- **Future:** Pre-auth temporary upload bucket only if user research shows local pending upload is insufficient.

## 6. User experience and flow

### Entry points

- Landing CTA routes to `/intake`.
- Authenticated users can also open `/intake` directly from `/app` or account/workspace navigation when that navigation exists.
- `/intake/verify` is reached only after a signup or email OTP flow has been started from a valid draft.

### Core flow

1. User opens `/intake`.
2. System shows an empty context form and, if present, restores draft fields from the secure draft cookie through a server read.
3. User enters business URL, product/store URL, campaign goal, founder note, and optional source references.
4. User may choose pending media files. The UI validates type/size locally and says files will upload after the workspace opens.
5. User clicks `Save and open my workspace`.
6. System calls `POST /api/reframe/intake/drafts`, creates or updates the draft, and sets/refreshes the draft cookie.
7. If a valid Supabase session exists, system calls claim server-side and redirects to `/app/[workspaceSlug]/projects/[projectSlug]`.
8. If no session exists, system asks for email and presents generic save-account copy.
9. New user enters password, receives an emailed code, enters it on `/intake/verify`, and is redirected after claim.
10. Existing user signs in with password or OTP, then goes through the same claim step.
11. If claim succeeds, system clears or rotates the draft cookie and shows "Context saved. Opening your workspace..." before redirect.

### Secondary paths

- User saves a partial draft, closes the tab, and returns within 24 hours: system restores fields from the valid draft.
- Draft expires: system clears the stale cookie and asks the user to restart.
- Verification code expires or fails: user can request a new code subject to rate limits.
- Pending media File objects are lost during reload: system keeps filenames as unsaved reminders and asks the user to reattach after workspace opens.
- User cancels auth: draft remains recoverable until expiry, but no workspace/project access is granted.

### State requirements

| State | Required behavior | Copy/content | Notes |
|---|---|---|---|
| Empty | Show form with clear required fields and source-reference language. | "Start with what is already true about the business." | No blank AI chat box. |
| Draft restored | Load saved draft fields through server validation. | "Draft restored. Continue when ready." | Do not expose token in URL or client storage. |
| Loading save | Disable primary action, keep entered data visible, announce progress. | "Saving your context..." | Use `aria-live` for progress. |
| Auth required | Keep form context visible and ask for email/password or OTP path inline. | "Continue to save this workspace." | Do not say "we found your account." |
| Verification pending | Show code entry, resend affordance, masked email display. | "Enter the code we emailed to continue." | No draft token in query params. |
| Claiming | Show short transition state. | "Context saved. Opening your workspace..." | Retry-safe; refresh should not duplicate project. |
| Success | Redirect to owned project. | Project page may show "Extracting context from provided sources" later. | Success page is not required if redirect is fast. |
| Field validation error | Keep focus near invalid field and preserve all input. | Specific field-level error. | 400 response for invalid JSON/fields. |
| Auth error | Use generic credential or verification copy. | "Could not continue with those credentials." | Avoid enumeration via copy and response shape. |
| Permission denied | Block claim if draft is already claimed by another user or workspace is inaccessible. | "This intake cannot be opened from this account. Start a new intake." | Do not reveal owner identity. |
| Expired | Clear cookie and allow restart. | "This intake expired. Start a new one to keep your context secure." | 410 from API is acceptable. |
| Offline/degraded | Keep local form values in component state; allow retry. | "Connection lost. Retry when you are back online." | Do not promise server persistence while offline. |

### UX principles

- The auth step is framed as saving the founder's work, not as a generic signup wall.
- Every URL is a source reference, not a connected account or live sync.
- Pending media language must be explicit: "Upload after workspace opens" until signed uploads are implemented.
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
| FR-8 | New user signup must support email/password with email confirmation and `/intake/verify` code entry. | P0 | Valid code creates session, profile, workspace, membership, project, and redirect. |
| FR-9 | Existing user sign-in must use password or email OTP and the same claim path. | P0 | Sign-in does not create a second draft or project. |
| FR-10 | Public responses must not reveal whether an email exists. | P0 | Response body and status shape are generic for unknown vs existing email cases where feasible. |
| FR-11 | Claim must be idempotent. | P0 | Repeating claim for the same valid draft/user returns the same project slug. |
| FR-12 | Draft expiry must prevent stale claims. | P0 | Expired drafts return an explicit restart state and cannot create projects. |
| FR-13 | Pending media selections must not be represented as uploaded or persisted before auth. | P0 | UI says "Upload after workspace opens"; server stores only safe metadata if needed. |
| FR-14 | Route handlers must validate JSON content type, origin where relevant, field lengths, and URL shape. | P0 | Invalid requests return typed 400/403/415/413 responses. |
| FR-15 | Rate limits must apply to draft save, continue, signup/sign-in start, resend, and verify attempts. | P0 | Excess attempts return 429 with retry guidance. |
| FR-16 | `/demo` must remain untouched. | P0 | Git diff contains no `/demo` changes for this feature. |

## 8. Non-functional requirements

| Category | Requirement | Target |
|---|---|---|
| Performance | Initial `/intake` render should not depend on external AI or media services. | Form interactive within normal Next.js page latency; no model call on first render. |
| Reliability | Claim operations must be transactional or otherwise race-safe. | 0 duplicate projects for repeated verify/claim requests in tests. |
| Security | Draft token is raw only in `HttpOnly` cookie; DB stores token hash only. | Token cannot be read by client JS or recovered from DB alone. |
| Privacy | Founder notes, raw URLs, email addresses, and media filenames are not logged to analytics or server error logs. | Logs contain draft/project IDs and coarse event names only. |
| Accessibility | Forms and code entry meet WCAG 2.2 AA expectations for labels, focus, contrast, and error messaging. | Testing Library accessibility checks and manual keyboard QA pass. |
| Observability | Server logs and metrics track state transitions without sensitive payloads. | Every failed route has status code, route, coarse reason, and request ID. |
| Maintainability | API payloads and draft statuses are typed with shared schemas. | Typecheck covers route helpers and tests. |

## 9. Data, API, and integration contracts

### Data model

| Entity | Fields | Owner | Validation | Retention |
|---|---|---|---|---|
| `intake_drafts` | `id: uuid`, `token_hash: text`, `status: draft/auth_required/verification_pending/claimed/expired`, `business_url: text?`, `product_url: text?`, `campaign_goal: text`, `founder_note: text`, `source_references: jsonb`, `pending_media: jsonb`, `email_hash: text?`, `expires_at: timestamptz`, `claimed_user_id: uuid?`, `claimed_workspace_id: uuid?`, `claimed_project_id: uuid?`, timestamps | Reframe API | Token hash required; at least one URL or founder note required by final save; note length capped; status transitions enforced server-side. | Delete or anonymize unclaimed drafts after expiry plus cleanup window. |
| `profiles` | `id: uuid`, `email_display: text`, `email_hash: text`, `display_name: text?`, timestamps | Account/auth layer | `id` references `auth.users`; email hash computed server-side. | User lifetime; deleted with account policy. |
| `workspaces` | `id: uuid`, `slug: text`, `name: text`, `created_by: uuid`, timestamps | Account/auth layer | Slug unique; creator must have membership. | User/workspace lifetime. |
| `workspace_memberships` | `workspace_id: uuid`, `user_id: uuid`, `role: owner/admin/member`, timestamps | Account/auth layer | One owner minimum; unique user/workspace pair. | Workspace lifetime. |
| `projects` | `id: uuid`, `workspace_id: uuid`, `slug: text`, `name: text`, `intake_draft_id: uuid?`, `created_by: uuid`, `intake_snapshot: jsonb`, timestamps | Reframe project layer | `workspace_id` required; `intake_draft_id` unique when present; user must be member. | Project lifetime. |

### Draft status machine

| Status | Meaning | Allowed next states |
|---|---|---|
| `draft` | Context exists, not yet tied to auth. | `auth_required`, `claimed`, `expired` |
| `auth_required` | Valid draft, no verified session. | `verification_pending`, `claimed`, `expired` |
| `verification_pending` | Signup or OTP started. | `claimed`, `auth_required`, `expired` |
| `claimed` | Verified user owns a workspace project from the draft. | None except cleanup metadata updates. |
| `expired` | Draft can no longer be claimed. | None; restart required. |

### Cookie contract

| Cookie | Value | Flags | Lifetime | Notes |
|---|---|---|---|---|
| `reframe_intake_draft` | Raw random draft token | `HttpOnly`, `Secure`, `SameSite=Lax`, `Path=/` | 24 hours | Set and refreshed only by route handlers; cleared or rotated after claim. |

### API surface

| Endpoint/action | Input | Output | Auth | Failure behavior |
|---|---|---|---|---|
| `GET /api/reframe/intake/draft` | Draft cookie only | `{ ok, state, draft? }` | Optional | `404` if no draft, `410` if expired and cookie should clear. |
| `POST /api/reframe/intake/drafts` | `{ businessUrl?, productUrl?, campaignGoal, founderNote?, sourceReferences?, pendingMedia? }` | `{ ok, state, expiresAt }` plus draft cookie | Optional | `400` invalid fields, `413` payload too large, `415` non-JSON, `429` rate-limited. |
| `POST /api/reframe/intake/continue` | `{ email }` plus draft cookie | `{ ok, state: "auth_required" \| "verification_pending" \| "claimed", nextAction }` | Optional | Generic response shape; no public email existence signal. |
| `POST /api/reframe/auth/signup` | `{ email, password }` plus draft cookie | `{ ok, state: "verification_pending" }` | Anonymous with valid draft | Generic auth errors; `429` for rate limit. |
| `POST /api/reframe/auth/sign-in` | `{ email, password? }` plus draft cookie | `{ ok, state: "claimed" \| "verification_pending", redirectTo? }` | Anonymous with valid draft | Generic credential copy; same claim path after session. |
| `POST /api/reframe/auth/verify` | `{ email, token }` plus draft cookie | `{ ok, state: "claimed", redirectTo }` | Anonymous with pending draft | `400` invalid/expired token, `410` expired draft, `429` rate limit. |
| `POST /api/reframe/intake/claim` | Draft cookie; optional `workspaceId` if user has multiple | `{ ok, project: { workspaceSlug, projectSlug } }` | Required verified session | Idempotently returns existing project for same user/draft; `403` for inaccessible workspace; `409` generic already-claimed conflict. |

### External integrations

| Integration | Purpose | Auth | Webhooks/events | Rate limits/costs | Failure handling |
|---|---|---|---|---|---|
| Supabase Auth | Signup, sign-in, OTP verification, session cookies. | Browser/server Supabase clients using cookie SSR; service/secret key only on trusted server helpers. | No webhooks required for this slice. | Supabase Auth has endpoint rate limits and MAU-based billing beyond plan quota. Add app-level throttle around intake/auth starts. | Generic errors; preserve draft; allow retry/resend within limits. |
| Supabase Postgres | Store drafts, profiles, workspaces, memberships, and projects. | Server route handlers; RLS for exposed tables. | None. | Included in Supabase project usage; DB/storage overages depend on plan. | Transaction rollback; typed error response; no partial project without claim status. |
| Supabase Storage | Post-auth media upload dependency only. | Signed upload URLs created after verified project ownership in a follow-up slice. | None for this PRD. | Storage is billed by size beyond plan quota. | Pre-auth UI must not say files are uploaded; prompt reattach after redirect if needed. |
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
| Claim completion rate | `% of saved drafts that become projects` | 40%+ in pilot. | `intake_claimed` / `intake_draft_saved`. |
| Duplicate claim count | Projects created more than once for one `intake_draft_id`. | 0. | DB unique constraint + server metric. |
| Auth handoff failure rate | Auth/verify/claim failures per saved draft. | Under 10% after pilot fixes. | Route-level counters by coarse reason. |
| Enumeration regression | Automated tests that detect distinct public responses for email existence. | 0 failing tests. | Security test suite. |

### Required events

| Event | Trigger | Properties | Privacy notes |
|---|---|---|---|
| `intake_started` | `/intake` page loads. | `entrypoint`, `has_existing_session` | No raw email, URLs, or notes. |
| `intake_draft_saved` | Draft create/update succeeds. | `draft_id`, `has_business_url`, `has_product_url`, `has_pending_media`, `field_count` | `draft_id` internal only; no payload. |
| `intake_continue_clicked` | User clicks save/open action. | `draft_state`, `has_session` | No email. |
| `intake_auth_started` | Signup/sign-in/OTP starts. | `method`, `draft_state` | Store email hash only if needed server-side. |
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
| Existing account signs up again | Keep public response generic and offer sign-in path without exposing account existence. | "Continue with email to save this workspace." |
| Wrong password | Generic auth error. | "Could not continue with those credentials." |
| Wrong or expired OTP | Show code error and resend option subject to rate limit. | "That code did not work. Check it or request a new one." |
| User refreshes `/intake/verify` after successful claim | Return existing project redirect. | "Opening your workspace..." |
| Claim attempted by different user after draft token leak | Block or return generic already-claimed conflict. | "This intake cannot be opened from this account. Start a new intake." |
| Multiple workspaces | Default to active workspace; if ambiguous, require explicit workspace choice after sign-in. | "Choose where to save this project." |
| Pending media lost after reload | Show filenames as unsaved reminders; require reattach after workspace opens. | "Reattach these files after your workspace opens." |
| Supabase Auth outage | Preserve draft and show retry. | "We could not verify right now. Try again in a few minutes." |

## 13. Security, privacy, and abuse considerations

- **Sensitive data:** founder notes, product URLs, campaign goals, source references, email addresses, draft tokens, and future media metadata.
- **Access control:** anonymous users can only create/update a draft with the valid draft cookie. Workspace/project reads and writes require verified Supabase session and workspace membership.
- **Secret handling:** service role or secret keys stay server-only. The client may receive only publishable/anon keys required by Supabase SSR/client setup.
- **Draft token safety:** raw draft token is generated server-side, stored only in a secure `HttpOnly` cookie, hashed before persistence, and cleared or rotated after claim.
- **Account enumeration:** no standalone email-existence endpoint. Any protected email-hash lookup requires a valid draft token, app-level rate limits, and generic public responses.
- **CSRF/origin:** state-changing route handlers validate JSON content type and same-origin headers where browser form submission is expected. SameSite=Lax reduces cross-site cookie send risk but does not replace server validation.
- **Abuse cases:** bot draft spam, auth code brute force, credential stuffing, token theft, draft hijack, oversized notes/source payloads, unsafe URLs, and later prompt injection from founder-provided text.
- **Mitigations:** rate limiting by IP/email hash/draft token, payload size caps, URL normalization, no sensitive logs, RLS policies, transactional claim, generic errors, and automated cross-workspace denial tests.

## 14. Dependencies and constraints

| Dependency/constraint | Impact | Owner | Status |
|---|---|---|---|
| Supabase Auth project config | Email confirmation and OTP-style template must be configured before `/intake/verify` works. | Engineering/Ops | Needed. |
| `@supabase/supabase-js` and `@supabase/ssr` | Not currently in `package.json`; implementation needs dependency approval due repo rules. | Engineering | Not installed. |
| Supabase SQL migrations | `profiles`, `workspaces`, `workspace_memberships`, `intake_drafts`, and `projects` must exist with RLS. | Engineering | Needed. |
| Existing waitlist raw REST helper | Shows server-side Supabase pattern but is not enough for user sessions. | Engineering | Existing reference only. |
| Mixed lockfiles | Dependency changes must not change package-manager strategy. | Engineering | Constraint. |
| `/demo` freeze | New code must not mutate seeded demo behavior or data. | Engineering | Constraint. |
| No `.env` edits | Required runtime env changes must be documented, not committed. | Engineering/Ops | Constraint. |

### Runtime configuration to document before implementation

- Supabase URL.
- Supabase publishable/anon key for browser-safe auth client.
- Supabase secret/service role key for trusted server-only admin operations where strictly required.
- Auth redirect allow-list entries for `/intake/verify` and the app origin.
- Email template that includes an OTP token for confirmation if code-entry UX is chosen.

## 15. Rollout, migration, and rollback

- **Rollout:** Ship route hidden from primary landing CTA until Supabase Auth/RLS tests pass; then switch landing CTA from waitlist/demo path to `/intake` for pilot traffic.
- **Migration:** Create new tables and RLS policies. No backfill from waitlist.
- **Rollback:** Revert landing CTA to existing waitlist/demo path and disable `/intake` entry points. Existing unclaimed drafts can expire naturally; claimed projects remain readable if workspace app exists.
- **Support/ops:** Monitor 4xx/5xx route rates, auth provider failures, draft expiry rate, duplicate claim attempts, and RLS denial tests.

## 16. Acceptance criteria

The feature is ready to ship when:

- [ ] Anonymous founder can open `/intake`, enter context, and save a draft without creating an account first.
- [ ] Draft save creates or updates `intake_drafts`, stores only `token_hash`, and sets `reframe_intake_draft` with `HttpOnly`, `Secure`, `SameSite=Lax`, `Path=/`, and 24-hour expiry.
- [ ] Authenticated founder submitting `/intake` is redirected to `/app/[workspaceSlug]/projects/[projectSlug]` with a project scoped to a workspace they belong to.
- [ ] New founder can sign up from the intake completion step, enter an emailed code on `/intake/verify`, and land in the claimed project without re-entering context.
- [ ] Existing founder can sign in from intake and claim the draft through the same idempotent claim path.
- [ ] Repeating verify/claim requests for one draft/user returns the same project slug and does not create duplicate projects.
- [ ] Public responses and UI copy do not reveal whether an email address exists.
- [ ] URLs are presented as source references; UI contains no social sync, Shopify connector, live scraping, or fake upload persistence claims.
- [ ] Pending pre-auth media selection is either local-only or clearly prompts reattach/upload after workspace opens.
- [ ] Expired drafts cannot be claimed and show a restart path.
- [ ] RLS policies prevent a user from reading or writing projects/drafts/workspaces owned by another workspace.
- [ ] Focused route and component tests pass, including draft restore, expiry, auth-required, verification, idempotent claim, and generic auth error states.

## 17. QA / validation plan

| Test | Type | Owner | Pass criteria |
|---|---|---|---|
| Intake form required fields | Component | Engineering | Submit disabled or field errors shown until minimum context exists. |
| Draft save route validation | Route unit | Engineering | Invalid JSON, invalid URLs, oversized payloads, and non-JSON content types return expected errors. |
| Draft cookie flags | Route unit | Engineering | Set-Cookie includes required security flags and max age. |
| Restore draft | Integration | Engineering | Valid cookie returns draft; expired cookie returns restart state. |
| Authenticated claim | Integration with mocked Supabase | Engineering | Existing session creates/returns workspace project. |
| Signup verification | Integration with mocked Supabase | Engineering | `signUp` pending state, `verifyOtp` success, profile/workspace/membership/project created. |
| Claim idempotency | Unit/integration | Engineering | Concurrent or repeated claim returns one project. |
| Enumeration resistance | Security unit | Engineering | Existing vs unknown email public response shape/copy remains generic. |
| RLS policy review | SQL/manual | Engineering | Cross-workspace reads/writes are denied. |
| Keyboard and screen reader pass | Manual/component | Design + Engineering | Form, auth, and verification states are keyboard accessible and labeled. |

### Manual QA script

1. Open `/intake` anonymously.
2. Enter a product URL, campaign goal, and founder note.
3. Click `Save and open my workspace`.
4. Confirm the form transitions to inline auth without losing context.
5. Complete signup and enter the emailed code on `/intake/verify`.
6. Confirm redirect to `/app/[workspaceSlug]/projects/[projectSlug]`.
7. Refresh the verify/claim URL or repeat the last request.
8. Confirm the same project opens and no duplicate project exists.
9. Sign out, repeat intake with an existing account, and verify generic auth errors do not reveal account existence.
10. Try an expired draft token and confirm restart behavior.

## 18. Risks and open questions

### Risks

| Risk | Severity | Mitigation | Decision needed? |
|---|---|---|---|
| Account enumeration through email lookup or auth error differences | High | Generic response shape/copy, protected lookup only after valid draft token, app-level rate limits, security tests. | No, mitigation required. |
| Draft hijacking through leaked token | High | HttpOnly cookie, hashed token storage, short expiry, claim conflict rules, no query/localStorage token. | No, mitigation required. |
| RLS misconfiguration exposes private projects | High | Enable RLS on exposed tables, membership-based policies, cross-workspace denial tests. | No, mitigation required. |
| Pre-auth media expectations exceed safe storage scope | Medium | Copy says upload after workspace opens; create follow-up PRD if temporary upload becomes necessary. | Yes, only if product insists on pre-auth binary persistence. |
| Supabase dependency addition changes package strategy | Medium | Request install approval and update the existing lockfile strategy deliberately. | Yes during implementation. |
| Auth email deliverability slows activation | Medium | Configure template, monitor failure/resend rates, allow resend within limits. | No. |
| Users with multiple workspaces save to wrong place | Medium | Use active workspace if known; otherwise show workspace chooser after sign-in before claim. | Product decision before implementation. |

### Open questions

| Question | Why it matters | Default assumption | Owner |
|---|---|---|---|
| Should P0 support passwordless OTP sign-in for existing users, password sign-in, or both? | Affects auth UI and route contracts. | Support password sign-in and email OTP fallback. | Product |
| What exact field length limits should apply to founder note and source references? | Affects validation, abuse controls, and later AI cost. | Founder note 10,000 chars; source references 10 items; each note/reference 2,000 chars. | Engineering |
| If the user has multiple workspaces, where should an intake save by default? | Prevents surprise project ownership. | Use active workspace if present; otherwise ask before claim. | Product |
| Should a server fetch URL text during intake or later extraction? | Fetching adds SSRF/scraping and latency concerns. | Intake only stores source references; extraction PRD owns fetching/pasted fallback. | Engineering |

## 19. Sources and fact-check notes

| Claim/assumption | Source | Date accessed | Confidence |
|---|---|---|---|
| `/intake` should collect business/product URL, campaign goal, founder note, save a short-lived pre-auth draft, verify identity, claim into workspace, and redirect to app project. | `docs/reframe-mvp-cutdown.md` | 2026-05-07 | High |
| Current repo lacks Supabase Auth client, workspace schema, RLS policy set, and storage upload pipeline; waitlist is the only real backend path. | `package.json`, `app/api/waitlist/route.ts`, `lib/waitlist/submit.ts`, `docs/reframe-mvp-cutdown.md` | 2026-05-07 | High |
| Supabase SSR in Next.js uses cookie-configured clients through `@supabase/ssr`; server route handlers need server client utilities. | https://supabase.com/docs/guides/auth/server-side/creating-a-client?queryGroups=framework&framework=nextjs | 2026-05-07 | High |
| Supabase `signUp` may return generic/obfuscated behavior for existing accounts and supports PKCE; email-confirmation behavior can require verification before a session. | https://supabase.com/docs/reference/javascript/auth-signup | 2026-05-07 | Medium |
| Supabase email templates support `{{ .Token }}` as a 6-digit OTP alternative to confirmation URL. | https://supabase.com/docs/guides/auth/auth-email-templates | 2026-05-07 | High |
| Supabase `verifyOtp` logs in a user with an OTP or token hash received by email/mobile. | https://supabase.com/docs/reference/javascript/auth-verifyotp | 2026-05-07 | High |
| Supabase password and OTP sign-in docs warn that errors may not distinguish account existence from invalid credentials or provider mismatch. | https://supabase.com/docs/reference/javascript/auth-signinwithpassword, https://supabase.com/docs/reference/javascript/auth-signinwithotp | 2026-05-07 | High |
| Supabase Auth enforces endpoint rate limits and returns 429 when exceeded; app-level throttles are still required around product-specific flows. | https://supabase.com/docs/guides/auth/rate-limits | 2026-05-07 | High |
| RLS should be enabled on exposed-schema tables; policies can protect data access. | https://supabase.com/docs/guides/database/postgres/row-level-security | 2026-05-07 | High |
| Application-facing user data should live in protected public tables that reference `auth.users`, not direct client access to the Auth schema. | https://supabase.com/docs/guides/auth/managing-user-data | 2026-05-07 | High |
| Supabase private storage buckets use RLS-controlled access, and signed URLs can grant limited-time private asset access. | https://supabase.com/docs/guides/storage/buckets/fundamentals | 2026-05-07 | High |
| Supabase signed upload URLs can upload without further authentication and are valid for 2 hours. | https://supabase.com/docs/reference/javascript/storage-from-createsigneduploadurl | 2026-05-07 | High |
| Next.js route handlers support custom request handlers in `app`, and cookies can be read/written in route handlers/server functions. | https://nextjs.org/docs/app/getting-started/route-handlers, https://nextjs.org/docs/app/api-reference/functions/cookies | 2026-05-07 | High |
| OWASP recommends generic authentication/account-recovery responses to reduce user enumeration risk. | https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html | 2026-05-07 | High |
| Supabase pricing includes MAU and storage usage beyond plan quota; cost should be monitored but this slice has low expected pilot usage. | https://supabase.com/docs/guides/platform/manage-your-usage/monthly-active-users, https://supabase.com/docs/guides/storage/management/pricing | 2026-05-07 | Medium |

## Appendix: Cost Model

This PRD does not include OpenAI calls or binary media processing, so the main cost drivers are Supabase Auth MAUs, Postgres rows, and later storage size after authenticated upload.

| Driver | Assumption | Rough MVP impact | Guardrail |
|---|---|---|---|
| Supabase Auth MAU | Pilot under included MAU quota. | Expected $0 incremental MAU overage during pilot if under plan quota. | Monitor MAU usage before public launch. |
| Supabase Postgres | One draft row per intake, one project row per claim. | Negligible storage at pilot scale. | Delete/anonymize expired unclaimed drafts. |
| Supabase Storage | No pre-auth binary upload in this PRD. | $0 storage impact from intake itself. | Post-auth upload PRD must include file size limits and storage budget. |
| Email delivery | Supabase built-in auth email or configured SMTP. | Depends on Supabase/email configuration. | Track auth email failures and resend rate. |

## Appendix: Self-review

| Rubric area | Score | Notes |
|---|---:|---|
| BLUF clarity | 10/10 | Decision, scope, problem, metrics, and risks are stated upfront. |
| Atomic scope | 10/10 | Limited to `/intake` auth handoff and project claim. |
| User/problem clarity | 9/10 | Target users and use cases are concrete. |
| Functional requirements | 10/10 | P0 requirements are numbered and testable. |
| UI/UX flow | 10/10 | Entry, core, secondary, states, copy, accessibility, and responsive behavior covered. |
| Technical contracts | 14/15 | Data/API/status/cookie contracts defined; exact SQL left for implementation. |
| AI/integration rigor | 9/10 | AI explicitly out of scope; Supabase/Next contracts and costs sourced. |
| Metrics and analytics | 7/7 | Events and privacy constraints specified. |
| Risk and security | 8/8 | Enumeration, token, RLS, and abuse risks covered. |
| Acceptance and QA | 10/10 | Acceptance criteria and QA plan map to tests. |
| **Total** | **97/100** | No critical gate failures. |

## Appendix: Changelog

| Date | Change | Author |
|---|---|---|
| 2026-05-07 | Initial draft from `docs/reframe-mvp-cutdown.md` `/intake` flow and current official integration docs. | Codex |
