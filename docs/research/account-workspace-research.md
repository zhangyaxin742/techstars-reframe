# Technical Research Report: Account Workspace Management

**Date:** 2026-05-07  
**Author:** Codex  
**Decision status:** Approved for implementation  
**Implementation decision:** Ship now

## BLUF

Implement `/account` as the account and workspace control plane using the existing Supabase SSR/OTP foundation, application-level workspace invites, RLS-backed workspace membership, shared CSRF protection, app-level throttles, and Resend for invite email side effects. The highest-risk implementation mistake is treating service-role access, raw cookies, or client-visible role state as authorization.

## Recommendation

- **Recommended path:** Build the PRD in the active execution-plan order: SQL/RLS contract, shared account helpers, OTP start/verify, account payload routes, mutation routes, invite lifecycle, `/account` UI, runtime docs, and final verification.
- **Auth method:** Supabase email OTP only. Do not add email/password signup, password reset, or password fields.
- **Invite model:** `workspace_invites` is the source of truth. Supabase Auth Admin invite is not used.
- **Service-role posture:** Avoid service role for ordinary account data. Prefer user-context Supabase clients and security-definer RPCs with explicit privileges.

## Existing Repo Constraints

- Next.js 15 App Router, React 19, strict TypeScript, Tailwind, Vitest, Testing Library.
- Supabase dependencies already exist in `package.json`: `@supabase/ssr` and `@supabase/supabase-js`.
- Supabase utilities already exist:
  - `lib/supabase/client.ts`
  - `lib/supabase/server.ts`
  - `lib/supabase/route.ts`
  - `lib/supabase/proxy.ts`
  - `lib/supabase/auth.ts`
  - `lib/supabase/admin.ts`
- Root `proxy.ts` already refreshes sessions through `supabase.auth.getClaims()`.
- Shared CSRF exists at `lib/security/csrf.ts`, but currently assumes `POST` only and needs support for `PATCH`.
- Existing Reframe route handlers use typed manual parsers, `NextResponse.json`, explicit JSON/content/origin checks, and focused route tests.
- Existing email side effects use Resend through raw `fetch` in `lib/waitlist/submit.ts`; do not add a new provider or SDK.
- SQL migration convention is now `supabase/migrations`.
- `/demo` must remain untouched.
- Do not edit `.env`; document required runtime configuration.
- The working tree contains unrelated dirty/staged files, so commits must target explicit paths only.

## Current External Findings

| Area | Finding | Source | Impact |
|---|---|---|---|
| Supabase SSR | Server-side protected data should use `auth.getClaims()`; `getSession()` must not be trusted in server code because raw cookie/session data can be spoofed. | Supabase SSR Next.js docs, accessed 2026-05-07 | Build verified actor helpers around `getClaims()` and never authorize from `getSession()` alone. |
| Supabase OTP | Passwordless email flows use `signInWithOtp`; `shouldCreateUser` controls automatic user creation; `verifyOtp({ email, token, type: "email" })` establishes the session. | Supabase passwordless email docs, accessed 2026-05-07 | Implement OTP-only `/account` auth modes and no password UI/API. |
| Supabase RLS | RLS must be enabled on exposed schema tables. Service/secret keys bypass RLS and must never be exposed to browsers. | Supabase RLS and API key docs, accessed 2026-05-07 | Account APIs use normal server Supabase clients for ordinary reads/mutations; privileged operations require prior actor and role checks. |
| Supabase Admin Auth | Auth Admin APIs require a service-role key and trusted server execution. | Supabase Auth Admin docs, accessed 2026-05-07 | Do not use Supabase Auth Admin invite as workspace invite source of truth. |
| Resend idempotency | Resend supports `Idempotency-Key` on email send endpoints for retry-safe sends. | Resend docs, accessed 2026-05-07 | Invite email sender should use `workspace-invite/<inviteId>` idempotency keys. |

## MVP Scope

### In Scope

- `/account` route with unauthenticated OTP entry and authenticated account/workspace management.
- Account profile basics: display name, email display, optional avatar display if present, sign out.
- Workspace basics: current/active workspace, workspace switch, default workspace repair, workspace creation.
- Member basics: member list, role labels, pending invites for owner/admin, invite create/revoke, invite acceptance.
- Account/workspace APIs with typed validation, CSRF/origin checks, app-level throttles, generic public auth responses, and focused tests.
- SQL/RLS docs for `profiles`, `workspaces`, `workspace_memberships`, and `workspace_invites`.

### Non-Goals

- No `/demo` edits.
- No email/password auth, password fields, password reset, billing, seats, enterprise SSO, MFA settings, audit-log UI, admin console, role editor, owner transfer, member removal, avatar upload, media upload, AI behavior, or full `/app` workspace.

## Architecture Plan

### Data Model

- Extend `profiles` with `avatar_url` and `active_workspace_id`.
- Extend `workspaces` with `archived_at`.
- Extend `workspace_memberships` with `joined_at`.
- Add `workspace_invites` with hashed token, hashed normalized email, display email, role, status, inviter, accepted user, expiration, delivery metadata, and audit timestamps.
- Keep future project/media/storyboard/editorial/export rows workspace-scoped through `workspace_id`.

### RLS And RPCs

- Enable RLS on all account/workspace tables.
- Revoke direct anon table access.
- Allow authenticated users only tightly scoped selects/mutations needed by the API contract.
- Avoid recursive `workspace_memberships` policies by using `security` helper functions with explicit `search_path`.
- Add security-definer RPCs for account repair, workspace creation, invite creation/revoke if needed, and invite acceptance.
- Grant RPC execute only to intended roles; schema-qualify all SQL references.

### Server Auth

- `getVerifiedActor()` uses the normal route/server Supabase client and `auth.getClaims()`.
- Protected routes derive `actorUserId` from verified claims, then verify workspace membership/role before any protected read/write.
- No route authorizes protected data from `getSession()`, client state, raw cookies, request workspace IDs, or UI role labels.

### Service-Role Boundaries

- Do not use service role for:
  - `GET /api/reframe/account`
  - member list reads
  - active workspace switching
  - user-scoped profile updates
  - ordinary account payload reads
- If a privileged path is unavoidable, authenticate the actor with the normal client first, verify role, and only then perform the privileged operation.

### Invite Lifecycle

1. Owner/admin submits email and role.
2. Server authenticates actor and verifies owner/admin role.
3. Server normalizes email and creates/reuses `workspace_invites` with hashed token/email.
4. Server sends email through Resend as a side effect using an idempotency key.
5. Recipient opens invite and completes Supabase OTP.
6. Accept route compares verified auth email hash to invite email hash.
7. Accept RPC creates membership idempotently and marks invite accepted in a transaction.

### API Shape

- `POST /api/reframe/auth/otp/start`
- `POST /api/reframe/auth/verify`
- `POST /api/reframe/auth/sign-out`
- `GET /api/reframe/account`
- `PATCH /api/reframe/account/profile`
- `PATCH /api/reframe/account/active-workspace`
- `POST /api/reframe/workspaces`
- `GET /api/reframe/workspaces/:workspaceId/members`
- `POST /api/reframe/workspaces/:workspaceId/invites`
- `POST /api/reframe/workspaces/:workspaceId/invites/:inviteId/revoke`
- `POST /api/reframe/workspace-invites/accept`

### UI Shape

- `app/account/page.tsx` renders a plain workspace-style surface.
- `components/account/*` owns:
  - OTP auth panel
  - profile section
  - workspace section
  - members section
  - pending invites for owner/admin only
- No settings sidebar or marketing/landing treatment.

## Validation Plan

- Unit tests: CSRF method handling, validation parsers, hashing/token helpers, member visibility shapers, invite email sender behavior.
- Route tests: auth start, verify, account payload, profile update, active workspace switch, workspace create, member list, invite create/revoke/accept, sign out.
- Component tests: no password fields, unauth/auth states, owner/admin invite controls, member-only limited visibility.
- Manual SQL/RLS checklist: anon denial, user A/B cross-workspace denial, role behavior, API field filtering, invite failure cases.
- Final commands: `npm run typecheck`, `npm run test:run`, `npm run build`.

## Risk Register

| Risk | Severity | Mitigation |
|---|---|---|
| RLS recursion or overexposure | High | Use non-recursive helpers; run RLS matrix. |
| Service-role misuse | High | Keep ordinary account reads/mutations on normal user-context Supabase clients; static scan service-role usage. |
| Email enumeration | High | Generic OTP/invite responses and app-level throttles. |
| Invite token leakage | High | Store only hashes; never log raw token; keep token in email link/body only. |
| CSRF gaps | High | Extend shared CSRF utility to `PATCH` before mutation routes. |
| Rate limiting gaps | Medium | Add in-memory pilot throttles and document persistent throttle need before public launch. |
| Email provider failure | Medium | App invite row is source of truth; email send is side effect; no membership on send failure. |
| Member PII leakage | High | Owner/admin full list only; members receive limited current-workspace summary and no pending invite emails. |
| Accidental `/demo` edits | High | Keep file scope isolated and check `git diff -- app/demo`. |

## Open Questions

No blocking questions.

Default assumptions:

- Public `/account` signup is allowed; `public_account` OTP mode may use `shouldCreateUser: true`.
- Invite acceptance may create a Supabase Auth user only after a valid app-level invite token/email hash gate.
- Resend remains the trusted invite email provider because it already exists in the repo.

## Sources

- Account Workspace Management PRD, `docs/prds/2026-05-07-account-workspace-management.md`, accessed 2026-05-07.
- Reframe MVP Cutdown, `docs/reframe-mvp-cutdown.md`, accessed 2026-05-07.
- Intake Auth Handoff PRD, `docs/prds/2026-05-07-intake-auth-handoff.md`, accessed 2026-05-07.
- Supabase SSR Next.js docs, https://supabase.com/docs/guides/auth/server-side/nextjs, accessed 2026-05-07.
- Supabase passwordless email docs, https://supabase.com/docs/guides/auth/auth-email-passwordless, accessed 2026-05-07.
- Supabase API keys docs, https://supabase.com/docs/guides/getting-started/api-keys, accessed 2026-05-07.
- Supabase Row Level Security docs, https://supabase.com/docs/guides/database/postgres/row-level-security, accessed 2026-05-07.
- Supabase Auth Admin docs, https://supabase.com/docs/reference/javascript/admin-api, accessed 2026-05-07.
- Resend idempotency docs, https://resend.com/docs/dashboard/emails/idempotency-keys, accessed 2026-05-07.
