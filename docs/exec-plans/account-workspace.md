## 0. Repo Findings

BLUF: the repo already has most of the auth foundation, but `/account`, account APIs, account schema extensions, workspace invites, and member visibility contracts are not implemented yet.

- Existing Supabase utilities:
  - `lib/supabase/client.ts`: browser client via `@supabase/ssr`.
  - `lib/supabase/server.ts`: server client with Next cookies.
  - `lib/supabase/route.ts`: route-handler client that can apply Supabase auth cookies to `NextResponse`.
  - `lib/supabase/proxy.ts` + `proxy.ts`: refreshes session with `supabase.auth.getClaims()`.
  - `lib/supabase/auth.ts`: passwordless auth client using the publishable key.
  - `lib/supabase/admin.ts`: REST header helper for service-role/admin use.
  - Supabase's current API key model should prefer `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` for browser/SSR clients and `SUPABASE_SECRET_KEY` for trusted server operations. `NEXT_PUBLIC_SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` are legacy compatibility fallbacks only.

- Existing auth helpers:
  - OTP verification exists at `app/api/reframe/auth/verify/route.ts`, but it is currently intake-draft-specific and expects an intake draft cookie.
  - No `/api/reframe/auth/otp/start`.
  - No `/api/reframe/auth/sign-out`.
  - No generic authenticated actor/membership helper yet.
  - No `getSession()` usage found in current app/lib code.

- Existing email provider utilities:
  - Waitlist uses Resend through raw `fetch` in `lib/waitlist/submit.ts`.
  - Existing env pattern: `RESEND_API_KEY`, `WAITLIST_NOTIFICATION_FROM`, `WAITLIST_NOTIFICATION_TO`, optional reply-to.
  - Reuse Resend and the existing raw-fetch pattern for workspace invites. Do not add a new provider or SDK.

- Existing validation/security utilities:
  - `lib/security/csrf.ts` issues/verifies HMAC CSRF tokens and validates JSON content type, origin, and `Sec-Fetch-Site`.
  - Current CSRF verifier only allows `POST`; account PRD has `PATCH`, so this utility needs a small method-allowlist extension.
  - Intake validation/email/hash helpers exist under `lib/reframe/intake/*`.
  - No Zod or schema validation dependency; current pattern is typed manual parsing.

- Existing test setup:
  - Vitest + jsdom + Testing Library.
  - Scripts: `npm run typecheck`, `npm run test:run`, `npm run build`.
  - No lint script in `package.json`.
  - Route tests directly call exported route handlers and mock Supabase/fetch.

- Current routes:
  - No `app/account`.
  - `app/intake/verify/page.tsx` exists.
  - No `app/intake/page.tsx` in tracked app surface yet.
  - Existing surfaces: `app/page.tsx`, `app/demo/page.tsx`, `app/workspace/page.tsx`, `app/trending/page.tsx`.
  - Reframe API routes exist for intake draft/continue/verify/CSRF only.

- Migration structure:
- `supabase/migrations` directory present.
- SQL lives as: `supabase/migrations/0001_intake-auth-handoff-supabase.sql`, plus `docs/intake-auth-handoff-db-rls-checklist.md`.
  - Account implementation should add an account SQL/checklist doc or explicitly supersede the intake SQL doc to avoid schema drift.

Sources checked: Supabase SSR says protect server data with `getClaims()` and not `getSession()` alone; Supabase OTP docs support `signInWithOtp`, `shouldCreateUser`, and `verifyOtp({ type: "email" })`; Supabase docs confirm service/secret keys bypass RLS; Resend supports idempotency keys for email sends.  
Links: https://supabase.com/docs/guides/auth/server-side/nextjs, https://supabase.com/docs/guides/auth/auth-email-passwordless, https://supabase.com/docs/guides/getting-started/api-keys, https://supabase.com/docs/guides/database/postgres/row-level-security, https://resend.com/docs/dashboard/emails/idempotency-keys

## 0.1 Supabase API Key Modernization

BLUF: migrate runtime code and docs to Supabase's current publishable/secret key model before removing legacy env vars. Keep SQL role names such as `anon`, `authenticated`, and `service_role` unchanged because those are database roles, not environment key names.

Current desired env shape:

- `SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SECRET_KEY`

Legacy compatibility envs to phase out after verification:

- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

Known current code state:

- `lib/supabase/env.ts` already prefers `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` and falls back to `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- `lib/supabase/admin.ts` currently reads only `SUPABASE_SERVICE_ROLE_KEY`.
- `lib/waitlist/submit.ts` currently hand-builds Supabase REST headers from `SUPABASE_SERVICE_ROLE_KEY`.
- `lib/reframe/intake/draft-store.ts` inherits the admin REST header behavior through `lib/supabase/admin.ts`.
- `lib/security/csrf.ts`, `lib/reframe/intake/email.ts`, and `lib/reframe/intake/draft-cookie.ts` use `SUPABASE_SERVICE_ROLE_KEY` only as fallback entropy. Dedicated `REFRAME_*` secrets now exist and should be required instead of falling back to Supabase keys.
- `SUPABASE_SECRET_KEY` may already exist in local/deployment env, but current runtime code does not read it yet.

Implementation steps:

1. Update `lib/supabase/admin.ts` to read `SUPABASE_SECRET_KEY` first and temporarily fall back to `SUPABASE_SERVICE_ROLE_KEY`.
2. Rename internal admin helper fields from `serviceRoleKey` to `adminKey` or `secretKey` so call sites do not encode legacy terminology.
3. Update waitlist/intake draft admin REST helpers to use the shared admin config after the rename.
4. Prefer Supabase JS admin clients for new trusted-server operations instead of adding new hand-rolled REST paths.
5. Remove `SUPABASE_SERVICE_ROLE_KEY` fallback entropy from CSRF, intake draft token, and email hashing once `REFRAME_CSRF_SECRET`, `REFRAME_DRAFT_TOKEN_SECRET`, and `REFRAME_EMAIL_HASH_SECRET` are confirmed in every environment.
6. Update runtime docs to mark `NEXT_PUBLIC_SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` as legacy fallback only.
7. After staging passes, remove `NEXT_PUBLIC_SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` from deployment envs and local env templates.

Verification:

- `npm run test:run -- lib/supabase lib/waitlist lib/reframe/intake app/api/reframe/intake app/api/reframe/auth`
- `npm run typecheck`
- Manual smoke: waitlist submit persists, intake draft save/restore works, account OTP invite gate can call the service-only invite resolver, and no client bundle references `SUPABASE_SECRET_KEY`.
- Static review: `rg -n "SUPABASE_SERVICE_ROLE_KEY|NEXT_PUBLIC_SUPABASE_ANON_KEY|serviceRoleKey" app lib components docs`

Risk note: new Supabase `sb_secret_...` keys differ from legacy JWT service-role keys, especially for raw REST/header behavior. Migrate hand-built REST paths carefully and test against the real Supabase project before deleting legacy env vars.

## 1. Implementation Strategy

Schema and RLS: extend the existing intake auth schema with `profiles.avatar_url`, `profiles.active_workspace_id`, `workspaces.archived_at`, `workspace_memberships.joined_at`, and a new `workspace_invites` table. Use RLS on every exposed table. Avoid recursive membership policies by using schema-qualified `security` helper functions with explicit `search_path`.

Server auth: all protected routes and server-rendered account payloads must call Supabase server auth methods that revalidate identity, preferably `auth.getClaims()`, derive `actorUserId` from verified claims, and then check workspace membership/role. Do not authorize from client state, raw cookies, or `getSession()`.

Service-role boundaries: account payload reads, member reads, active workspace switching, and profile updates use the normal server Supabase client only. Prefer authenticated security-definer RPCs for account repair, workspace creation, and invite acceptance transactions instead of service-role clients. If service role is ever used, the route first authenticates the actor with the normal client and verifies workspace role.

Invite lifecycle: owner/admin creates or reuses an app-level `workspace_invites` row with hashed token, hashed normalized email, role, expiration, inviter, workspace, and delivery metadata. Only after that row exists does the app send email through Resend. Acceptance requires Supabase OTP verification, authenticated email hash match, valid token, non-expired/non-revoked status, and idempotent membership creation in one transaction. Supabase Auth Admin invite is not used.

Account repair/default workspace: after OTP verification and on authenticated account load, call an authenticated DB function such as `ensure_account_workspace(...)` to create/repair `profiles`, one default owner workspace, owner membership, and `active_workspace_id`. This keeps creation idempotent and avoids service role for ordinary account reads.

API route structure: add `/api/reframe/auth/otp/start`, extend/generalize `/api/reframe/auth/verify`, add `/api/reframe/auth/sign-out`, `/api/reframe/account`, `/api/reframe/account/profile`, `/api/reframe/account/active-workspace`, `/api/reframe/workspaces`, `/api/reframe/workspaces/[workspaceId]/members`, `/api/reframe/workspaces/[workspaceId]/invites`, `/api/reframe/workspaces/[workspaceId]/invites/[inviteId]/revoke`, and `/api/reframe/workspace-invites/accept`.

UI/component structure: add `app/account/page.tsx` plus `components/account/*`. Keep it a plain workspace-style surface: profile, workspace, members. No settings sidebar, no billing, no seats, no admin console. Regular members get limited member summaries and no pending invites.

CSRF/rate limit: reuse `lib/security/csrf.ts`, extending it to support `PATCH`. Add `lib/reframe/account/rate-limit.ts` following the current in-memory pilot pattern, keyed by IP, user ID, email hash, workspace ID, and invite token hash where relevant.

Email delivery: reuse Resend via raw `fetch`, not a new provider or dependency. Add a dedicated account invite email helper with `RESEND_API_KEY` plus invite-specific sender/base URL config documented, not written to `.env`.

`/demo` remains untouched: all work is isolated to `app/account`, `app/api/reframe/*`, `components/account`, `lib/reframe/account`, and docs/SQL/checklists.

## 2. Action-Item Plan

### 1. Account Research/Implementation Baseline

Objective: create the implementation baseline and keep the research-gated workflow explicit.

Files likely touched: `docs/technical-research/2026-05-07-account-workspace-management.md`.

Exact work: summarize the PRD decisions, current repo findings, official Supabase/Resend constraints, schema/API strategy, validation plan, and risks.

Security considerations: document OTP-only auth, no Supabase Auth Admin invite, no service-role ordinary reads, `getClaims()` requirement, CSRF/rate-limit requirements.

Self-check: confirm the report does not reintroduce email/password, password reset, Supabase Admin invites, or service-role reads.

Commit: `docs(account): add implementation research baseline`

### 2. Account Schema, RLS, And SQL Checklist

Objective: define the database contract before route code depends on it.

Files likely touched: `supabase/migrations/0002_account-workspace-management-supabase.sql`, `docs/account-workspace-management-db-rls-checklist.md`, possibly `supabase/migrations/0001_intake-auth-handoff-supabase.sql` if consolidating shared tables.

Exact work: add idempotent SQL for account columns, `workspace_invites`, indexes, constraints, helper functions, account repair RPC, workspace create RPC, invite accept RPC, and RLS policies. Include delivery metadata for invite email side effects.

Security considerations: anon has no account/workspace table access; service role is not required for ordinary routes; member summaries are API-shaped; no raw token/hash columns are selectable by clients.

Self-check: run a policy review against the PRD RLS matrix and confirm no recursive membership policy.

Commit: `feat(account): define workspace schema and rls contract`

### 3. Shared Account Server Utilities

Objective: centralize auth, payload shaping, validation, hashing, and invite email support.

Files likely touched: `lib/reframe/account/auth.ts`, `validation.ts`, `types.ts`, `rate-limit.ts`, `tokens.ts`, `email.ts`, `service.ts`; `lib/security/csrf.ts`; tests beside these files.

Exact work: add verified actor helper using `getClaims()`, workspace role helper, payload mappers for owner/admin/member visibility, email/token hash helpers, validation parsers, invite-token generator, Resend invite sender, and rate limit checks. Extend CSRF verifier for `POST`/`PATCH`.

Security considerations: no `getSession()`; no service-role client in these helpers; never return `email_hash`, `token_hash`, raw invite token, or pending invite emails to members.

Self-check: unit tests cover validation, CSRF PATCH, token hashing, email masking, and role-based payload shaping.

Commit: `feat(account): add account server helpers`

### 4. OTP Start And Generic Verify Flow

Objective: implement OTP-only account auth without password paths.

Files likely touched: `app/api/reframe/auth/otp/start/route.ts`, `app/api/reframe/auth/verify/route.ts`, related route tests, `lib/supabase/auth.ts`.

Exact work: add `/otp/start` with modes `public_account`, `invite_accept`, and `recovery`. Public account uses `shouldCreateUser: true`; recovery uses `false`; invite acceptance gates OTP on valid app invite token/email hash. Refactor verify so it can handle account verification and preserve existing intake claim behavior.

Security considerations: generic public responses; no account enumeration; invite mode does not create arbitrary users without a valid invite gate; verify establishes session before account repair or invite acceptance.

Self-check: tests prove no password fields/calls, exact `signInWithOtp` options per mode, and no workspace payload before verify.

Commit: `feat(auth): add otp account start flow`

### 5. Account Repair And Account Payload API

Objective: expose the safe authenticated account payload.

Files likely touched: `app/api/reframe/account/route.ts`, `lib/reframe/account/service.ts`, route tests.

Exact work: implement `GET /api/reframe/account`; authenticate with normal server client; call account repair RPC if needed; load profile, active workspace, memberships, members, and pending invites if owner/admin.

Security considerations: normal server Supabase client only; owner/admin see full member email/name/role/joined date and pending invites; regular members see limited current-workspace summaries only and no pending invite emails.

Self-check: tests cover unauthenticated 401, repaired user, owner/admin payload, member payload, and cross-workspace denial.

Commit: `feat(account): add account payload api`

### 6. Profile, Active Workspace, Sign-Out, And Workspace Create APIs

Objective: implement basic account/workspace mutations.

Files likely touched: `app/api/reframe/account/profile/route.ts`, `app/api/reframe/account/active-workspace/route.ts`, `app/api/reframe/auth/sign-out/route.ts`, `app/api/reframe/workspaces/route.ts`, route tests.

Exact work: add profile display-name update, active workspace switch, sign out, and workspace/default repair creation endpoint. Use typed parsers, CSRF, JSON content type, origin checks, and rate limits.

Security considerations: no service-role client; active workspace switch validates membership server-side; workspace creation creates creator membership transactionally; profile update only touches safe own fields.

Self-check: tests cover CSRF failure, invalid payloads, cross-workspace active switch, and sign-out cookie clearing.

Commit: `feat(account): add profile workspace and signout routes`

### 7. Member And Invite APIs

Objective: implement owner/admin invite management and acceptance.

Files likely touched: `app/api/reframe/workspaces/[workspaceId]/members/route.ts`, `app/api/reframe/workspaces/[workspaceId]/invites/route.ts`, `app/api/reframe/workspaces/[workspaceId]/invites/[inviteId]/revoke/route.ts`, `app/api/reframe/workspace-invites/accept/route.ts`, route tests.

Exact work: implement full member list for owner/admin, invite create/reuse, pending invite revoke, and invite accept. Create invite row before Resend. Use Resend idempotency key like `workspace-invite/<inviteId>`.

Security considerations: members cannot invite/revoke/admin-change; admins cannot create owner role; accept fails for mismatched email, expired/revoked token, and reused token by different user; no Supabase Auth Admin invite.

Self-check: tests cover every PRD invite failure case and verify email failure creates no membership.

Commit: `feat(account): add workspace invite lifecycle`

### 8. `/account` UI

Objective: build the plain account management page.

Files likely touched: `app/account/page.tsx`, `components/account/account-page.tsx`, `components/account/auth-panel.tsx`, `profile-section.tsx`, `workspace-section.tsx`, `members-section.tsx`, component tests.

Exact work: unauthenticated OTP entry, code verification state, authenticated profile/workspace/member surface, invite form for owner/admin, revoke controls, active workspace switcher, create workspace action if enabled.

Security considerations: UI hides controls for members but never relies on that for authorization; raw invite token only stays in invite handoff state and request body; no pending invite emails to members.

Self-check: tests/source checks confirm no password field/reset copy, no settings sidebar, no billing/seats/admin console copy, and no `/demo` imports/edits.

Commit: `feat(account): build account management page`

### 9. Account Runtime Docs And RLS Matrix

Objective: document runtime config and manual DB verification before final checks.

Files likely touched: `docs/account-workspace-management-runtime-env.md`, `docs/account-workspace-management-db-rls-checklist.md`.

Exact work: document Supabase URL/key requirements, HMAC secrets, Resend invite env, app base URL, OTP template with `{{ .Token }}`, and the required RLS test matrix.

Security considerations: do not edit `.env`; checklist includes anon denial, user A/B cross-workspace denial, member/admin/owner behavior, field filtering, and invite token failure cases.

Self-check: checklist mirrors PRD exactly and does not ask for service-role ordinary reads.

Commit: `docs(account): document runtime config and rls checks`

### 10. Final Fix Commit If Needed

Objective: only if final verification finds issues.

Files likely touched: whatever failed tests/typecheck identify.

Exact work: fix test, type, build, or security review failures after all planned commits.

Security considerations: re-review any touched auth/RLS/invite code against the hard constraints.

Self-check: rerun relevant failed checks, then the final command set if needed.

Commit: `fix(account): address verification findings`

## 3. Final Verification Plan

Run at the end only, after all action-item commits are complete:

- Typecheck: `npm run typecheck`
- Full test run: `npm run test:run`
- Build: `npm run build`
- Focused route/component tests, if a quicker pre-full pass is useful:  
  `npm run test:run -- app/api/reframe lib/reframe components/account`
- Lint: no `lint` script exists in `package.json`; do not invent one.
- RLS/manual SQL matrix: use the account DB/RLS checklist in Supabase or a future local Supabase harness. No current repo command exists.
- Static/security review:
  - `rg -n "getSession|signInWithPassword|resetPasswordForEmail|inviteUserByEmail|SUPABASE_SERVICE_ROLE_KEY|serviceRole" app lib components`
  - Review matches manually so service-key references are only allowed server-only config/security helpers and never ordinary account reads.
- `/demo` diff check: `git diff -- app/demo`

## 4. Risk Review

- RLS recursion risk: highest around `workspace_memberships`; use security helper functions with explicit `search_path` and test the matrix.
- Service-role misuse risk: existing intake draft storage uses service role; account routes must not copy that pattern for ordinary account data.
- Email enumeration risk: OTP start, recovery, invite start, and provider failures must return generic public shapes.
- Invite token leakage risk: raw token only in email link and accept/start body; store only hashes; no logs/analytics.
- CSRF gaps: current CSRF helper only allows `POST`; must be extended before `PATCH` routes ship.
- Rate limiting gaps: current rate limiter is in-memory and acceptable only for pilot; public launch needs persistent throttling or stronger bot defense.
- Email provider failure behavior: invite row exists before email send; no membership is created on send failure; delivery status must be inspectable by owner/admin.
- Member visibility/PII leakage: regular members must not receive pending invites or other members' full email addresses unless the API contract explicitly allows it.
- Accidental `/demo` edits: keep all account work isolated and verify `git diff -- app/demo` is empty.

## 5. Clarifying Questions

No blocking questions. Default assumptions for implementation:

- Public `/account` signup is allowed, so `public_account` OTP mode may use `shouldCreateUser: true`.
- Invite acceptance may create a Supabase Auth user only after a valid app-level invite token and matching email hash gate.
- Resend remains the invite email provider because the repo already uses it and no new provider is needed.
