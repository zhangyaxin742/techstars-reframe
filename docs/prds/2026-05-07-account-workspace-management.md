# PRD: `/account` Account and Workspace Management

**Status:** Draft  
**Owner:** Product + Engineering  
**Date:** 2026-05-07  
**Feature slug:** `account-workspace-management`  
**Primary route:** `/account`  
**Related docs/code:** `docs/reframe-mvp-cutdown.md`, `docs/prds/2026-05-07-intake-auth-handoff.md`, `docs/technical-research/2026-05-07-intake-auth-handoff.md`, `docs/DESIGN.md`, `AGENTS.md`, `package.json`, `lib/supabase/*`, `proxy.ts`  
**Decision:** Build as a P0 MVP foundation before real private uploads, editorial memory, or multi-user projects are public. `docs/reframe-mvp-cutdown.md` is the product source of truth for account/workspace/member scope; existing OTP email auth direction wins for auth-method specifics. Do not implement email/password auth for this PRD. Service-role operations are allowed only after normal server-authenticated actor and workspace-role checks.

---

## 1. BLUF

Build `/account` as Reframe's account and workspace control plane because the MVP will store private founder notes, uploaded media, generated content, and editorial memory for multiple users. The smallest production-worthy version is a boring account page with Supabase OTP email auth for sign up/sign in/sign out/session recovery, profile basics, one default workspace, active workspace switching or display, new workspace creation where needed, member list with role labels, and owner/admin invite-by-email backed by a trusted server route. The biggest risk is access-control drift: workspace roles, RLS, service-role operations, and invite acceptance must not let users read or mutate another workspace.

| Item | Answer |
|---|---|
| User problem | Founders need to know who owns the workspace, who can access private business/media data, and how to add a collaborator without trusting a loose session token. |
| Primary user | Founder-owner managing their Reframe workspace after or during the intake/auth handoff. |
| MVP scope | `/account` page plus account/workspace/member API contracts for sign up, sign in, sign out, session refresh/recovery, profile basics, active workspace, workspace creation, member list, and invite-by-email. |
| Non-goals | No billing, seats, enterprise SSO, mandatory MFA, audit-log UI, public team directory, social connections, or full admin console. |
| Success metric | 100% of created projects, future uploads, recipes, storyboards, editorial events, and exports resolve to a workspace with at least one owner membership. |
| Engineering risk | Incorrect RLS/member checks could expose private founder data or allow unauthorized invites. |
| Design risk | `/account` can become an overbuilt settings area instead of a plain trust and ownership surface. |
| Launch risk | Invite and auth copy could leak whether an email has an account or imply billing/team controls that do not exist. |

### Assumptions

| Assumption | Basis | Impact if wrong | Owner |
|---|---|---|---|
| Auth method defaults to existing OTP email auth while preserving the cutdown's required auth outcomes. | User direction: "DEFAULT TO EXISTING CODE (OTP EMAIL AUTH) FOR THE PRD." The cutdown requires "Sign up, sign in, sign out, and session refresh with Supabase Auth"; those outcomes can be implemented through OTP email auth. | The cutdown's email/password lines remain documented as source drift, not P0 implementation requirements. | Product + Engineering |
| Service/secret key bypasses RLS and is not an authorization mechanism. | User direction: routes using it must first authenticate the requester with the normal server Supabase client, derive actor user ID, verify workspace membership/role, and only then perform the service-role operation. | Any implementation using service role for ordinary reads or user-scoped updates fails this PRD. | Engineering |
| `/account` owns visible account/workspace controls; `/intake` owns pre-auth draft claim and first project creation. | Existing intake-auth PRD already specifies draft, OTP, claim, and redirect behavior. | Duplicating claim logic in `/account` would increase security and idempotency risk. | Engineering |
| P0 supports one default workspace per new user and a `POST /api/reframe/workspaces` path to create the default workspace or a new workspace. | Cutdown says "One default workspace per new user," "Workspace switcher or current workspace display," and "`POST /api/reframe/workspaces`: create the default workspace or a new workspace." | If product wants one-workspace-only in pilot, hide the create-new control but keep the server contract idempotent. | Product |
| P0 member management means member list, role labels, pending invites, invite role, expiration, acceptance, and pending-invite revoke. | Cutdown says "Basic member list and invite-by-email flow," "Every invite is tied to `workspace_id`, invited email, inviter user, role, token hash, and expiration," and "This is not a full admin console." | If removal/role editing is required, last-owner protections and audit events must be specified before build. | Product + Engineering |
| Avatar is optional later; P0 may store `avatar_url` only if already available, but does not implement avatar upload. | Cutdown says "avatar optional." | Avatar upload would add storage, file validation, abuse controls, and cleanup scope. | Product |
| Current repo already has Supabase packages and SSR/proxy utilities. | `package.json`, `lib/supabase/client.ts`, `lib/supabase/server.ts`, `lib/supabase/proxy.ts`, and `proxy.ts` exist as of this PRD. | Implementation should not repeat dependency install work, but still needs schema, RLS, account APIs, and UI. | Engineering |

## 2. Problem

### Current state

- Reframe has a landing/waitlist flow, a seeded `/demo`, `/workspace`, and `/trending`.
- There is no `/account` route today.
- Supabase SSR client/proxy utilities exist, but there is no profile/workspace/membership schema, workspace invite schema, account API surface, or RLS policy set.
- The existing waitlist backend persists leads through server-side Supabase REST and Resend, but it is not a product account or workspace ownership layer.
- The cutdown says `/demo` must remain frozen and real MVP routes should be separate: `/intake`, `/account`, and `/app/[workspaceSlug]/projects/[projectSlug]`.
- The cutdown's "Current Repo Constraints" section says "No Supabase Auth client, auth middleware, profile/workspace schema, or RLS policy set exists yet"; the repo has since added Supabase SSR client/proxy utilities, but profile/workspace schema and RLS are still missing.

### Why now

- The MVP will store private founder notes, uploaded product media, generated content, and editorial memory.
- Multiple users require workspace-scoped ownership, not loose user/session IDs.
- `/intake` can create or claim a project only if there is a credible account/workspace layer to receive it.
- Visible account and member controls are a trust prerequisite before inviting pilot users into private workspaces.

## 3. Goal / Non-goals

### Goals

- Provide `/account` as the plain place for sign-in/sign-up entry, profile basics, sign out, active workspace, and member visibility.
- Support sign up, sign in, sign out, session refresh, and session recovery entry points through Supabase OTP email auth.
- Make OTP `shouldCreateUser` behavior explicit per entry mode.
- Ensure every verified user has a `profiles` row and one default owner workspace.
- Represent workspace access through `workspace_memberships` with `owner`, `admin`, and `member` roles.
- Let owners/admins invite collaborators by email through a trusted server route, with allowed role (`admin` or `member`), expiration, and acceptance.
- Make invite acceptance idempotent and scoped to the invited email/workspace.
- Make future project/media/storyboard/editorial/export data use `workspace_id`, not loose user IDs.
- Enforce RLS and server-side authorization for all account/workspace operations.
- Constrain service-role use to trusted server operations after normal server auth and workspace-role checks.

### Non-goals

- No billing, plan enforcement, or seats.
- No email/password signup, password fields, password reset, or password recovery UI/API in this PRD.
- No enterprise SSO/SAML, custom JWT claims, advanced RBAC, mandatory MFA, or passkeys in P0.
- No public team directory, organization profile page, or discoverable member search.
- No audit-log UI, super-admin dashboard, admin analytics, full org settings, role editor, owner transfer, or active-member removal in P0.
- No social account connections, social/profile syncing as P0, Shopify OAuth, Google Drive/iCloud connector, or platform sync.
- No avatar upload, media upload, storage browser, AI extraction, editorial memory UI, or `/app` content workspace in this PRD.
- No standalone endpoint that answers whether an email address exists.
- No service-role client for ordinary account payload reads, member list reads, active workspace switching, or user-scoped profile updates.

## 4. Target users and use cases

| User | Use case | Trigger | Desired outcome |
|---|---|---|---|
| New founder | Create a durable account/workspace after starting from intake or `/account`. | Verifies email for the first time. | Has profile basics and one default owner workspace. |
| Existing founder-owner | Confirm ownership and manage basic workspace settings. | Opens `/account`. | Sees email, display name, current workspace, members, pending invites, and sign out. |
| Workspace owner/admin | Invite a collaborator. | Enters email from `/account` member section. | Invite email is sent from a trusted server route and pending invite appears. |
| Invited collaborator | Accept access to a workspace. | Opens invite link and verifies email if needed. | Becomes a member of the invited workspace only if email matches the invite. |
| Regular member | Check workspace access and sign out. | Opens `/account`. | Sees profile, current workspace, member list, and no owner/admin invite controls. |

## 5. MVP scope

### In scope

- `/account` route with two top-level states:
  - unauthenticated OTP email sign in, sign up, and session recovery entry points
  - authenticated account/workspace management
- Profile basics:
  - display name edit
  - email display
  - optional avatar display if already present
  - sign out
- Workspace basics:
  - current/default workspace display
  - active workspace switcher for memberships the user already has
  - create the default workspace or a new workspace
  - default workspace auto-create/repair for verified users with no membership
- Member basics:
  - member list with name/email/role/joined date
  - pending invite list for owners/admins
  - invite-by-email with role, expiration, and acceptance
  - revoke pending invite
  - accept invite after verified email match
- Account/workspace route handlers with typed request/response contracts, validation, generic auth responses, CSRF/origin checks for mutations, and app-level rate limits.
- Supabase Postgres tables, constraints, and RLS policies for `profiles`, `workspaces`, `workspace_memberships`, and `workspace_invites`.

### Out of scope

- Editing `/demo`.
- Building the full `/app/[workspaceSlug]/projects/[projectSlug]` content workspace.
- Intake draft capture/claim beyond reusing the existing account/workspace contracts.
- File upload/storage UI.
- Billing, seats, plans, role editor, member removal, owner transfer, org audit logs, MFA settings, or social connections.

### Release shape

- **MVP:** One `/account` page with OTP email sign in/sign up/session recovery entry points, profile basics, current workspace or workspace switcher, new workspace creation, member list, sign out, and owner/admin invite flow.
- **V1 follow-up:** Active-member removal, role changes beyond invite role, owner transfer, workspace rename/archive, MFA settings, and basic account deletion flow.
- **Future:** Billing/seats, enterprise SSO, custom RBAC/claims, audit logs, team directory, and organization-level compliance controls.

## 6. User experience and flow

### Entry points

- `/account` from product navigation, account/profile button, or direct URL.
- Post-auth return from `/intake` can link to `/account` for account review, but project claim still redirects to `/app/[workspaceSlug]/projects/[projectSlug]`.
- Invite links route to `/account` with a safe invite handoff state. The raw invite token may appear in the email link but must not be logged or exposed in analytics.
- Sign-out redirects to `/account` or landing with a signed-out confirmation state.

### Information architecture

`/account` is a single route with three compact sections:

1. **Profile:** display name, email, optional avatar display, sign out.
2. **Workspace:** active workspace, role, switcher for existing memberships, create workspace action where enabled.
3. **Members:** member list, pending invites, invite form with role for owners/admins.

Do not create a broad settings sidebar in P0. Use the workspace surface design language from `docs/DESIGN.md`: light, calm, tokenized `bg-background`/`bg-card`, compact controls, subtle borders, and no landing-style glass.

### Core flow: unauthenticated `/account`

1. User opens `/account` without a valid Supabase session.
2. System shows a single OTP email auth entry that covers sign up, sign in, and session recovery without asking the user to choose account state first.
3. User enters email and requests a code.
4. System starts the Supabase email OTP flow and shows generic public copy.
5. User enters the emailed code.
6. System verifies the OTP, establishes the session, creates/repairs profile and default workspace if missing, then renders authenticated `/account`.

### Core flow: authenticated account review

1. User opens `/account` with a valid session.
2. System refreshes/validates the session server-side using Supabase server auth methods that revalidate claims/user identity, not client state or `getSession()` alone.
3. System loads safe account payload: profile, active workspace, memberships, members for active workspace, and pending invites if owner/admin.
4. User updates display name, switches active workspace, or creates a new workspace if enabled.
5. System persists changes and shows a success toast/state without leaving `/account`.

### Core flow: invite member

1. Owner/admin opens member section.
2. User enters collaborator email, chooses allowed role, and submits invite.
3. Server validates requester membership role, normalizes/hashes invited email, creates or reuses a `workspace_invites` row with hashed token, hashed normalized email, role, expiration, inviter, and workspace, then sends the invite email through the app's trusted email provider.
4. UI shows the pending invite with role, expiration, and revoke action.
5. Invite recipient opens link, verifies/signs in if needed, and accepts.
6. Server verifies token, expiration, invited email match, workspace status, and idempotently creates membership.

### State requirements

| State | Required behavior | Copy/content | Notes |
|---|---|---|---|
| Unauthenticated | Show email auth entry and no workspace data. | "Sign in to manage your Reframe workspace." | Do not reveal invite/workspace details until token/session checks pass. |
| Auth loading | Keep shell stable and announce load. | "Loading account..." | Use `aria-live="polite"`. |
| Empty profile | Show email and require display name only when saving profile edits. | "Add the name collaborators should see." | Do not block workspace access on display name. |
| No workspace | Auto-create or repair default workspace server-side. | "Setting up your workspace..." | If repair fails, show retry and support-safe error. |
| Session recovery | Let user request a fresh OTP code or return to email entry. | "Continue with the email you used for Reframe." | Do not reveal whether the email exists. |
| Workspace loaded | Show current workspace, role, members, and allowed actions. | Current workspace name and role label. | Owner/admin controls are hidden/disabled for members. |
| Multiple memberships | Show switcher for existing memberships. | "Active workspace" | Switching must validate membership server-side. |
| Workspace create | Owner/user creates a new workspace through the server route. | "Create workspace" | No billing, plan, or seat controls. |
| Member list empty | Show owner as first member after default workspace creation. | "Only you have access right now." | Empty list should be rare after repair. |
| Invite pending | Add invite row without exposing raw token. | "Invite sent." | Invite row shows email, role, status, and expiration; revoke pending invite is P0. |
| Invite accepted | Add member once and mark invite accepted. | "Workspace joined." | Reopening link returns already-accepted state. |
| Invite expired/revoked | Block acceptance and show restart path. | "This invite is no longer active." | Do not reveal workspace private details. |
| Permission denied | Block owner/admin-only actions. | "You do not have permission to change this workspace." | Return 403; do not leak role rules. |
| Validation error | Preserve entered values and focus invalid field. | Field-specific error. | Invalid email, duplicate pending invite, invalid workspace name. |
| External auth/email failure | Persist no partial membership and show retry. | "We could not send that invite. Try again." | Log coarse provider failure only. |
| Offline/degraded | Keep unsaved form input in component state. | "Connection lost. Retry when you are back online." | Do not imply saved changes. |

### UX principles

- Keep `/account` plain and trust-building. It is not a marketing page.
- Use "workspace" consistently; do not introduce organization/company/team vocabulary unless data model requires it.
- Show roles as labels, not as a complex permission matrix.
- Do not say "we found your account" or "this email is not registered" in public auth/invite states.
- Preserve the cutdown framing: "The goal is not to retrofit `/demo`."
- Make destructive or security-sensitive controls absent from P0 rather than present-but-disabled.

### Accessibility and responsive behavior

- All forms have visible labels and field-level errors tied with `aria-describedby`.
- Save/invite/sign-out buttons have deterministic loading and disabled states.
- Member and invite rows remain readable on mobile by stacking metadata under name/email.
- Keyboard order follows Profile, Workspace, Members, then sign-out.
- Role labels are text, not color-only.
- Toasts/status changes use `aria-live="polite"`.
- Touch targets for account actions are at least 40px high.

## 7. Functional requirements

| ID | Requirement | Priority | Acceptance signal |
|---|---|---|---|
| FR-1 | `/account` must render an unauthenticated auth entry when no valid session exists. | P0 | Anonymous direct visit shows auth entry and no account/workspace data. |
| FR-2 | `/account` must render authenticated account data after server-side session validation. | P0 | Signed-in user sees profile, active workspace, role, members, and allowed actions. |
| FR-3 | Users can sign up, sign in, sign out, and refresh sessions through server-side cookie auth using Supabase email OTP. | P0 | Authenticated reload preserves session; signed-out reload shows no account data. |
| FR-4 | Starting auth from `/account` must use an email-only OTP request and generic public copy. | P0 | New and existing emails receive the same public response shape and no password field appears. |
| FR-5 | OTP verification must establish the Supabase session before any workspace data is shown. | P0 | Valid code renders authenticated account payload; invalid/expired code shows retry without workspace data. |
| FR-6 | `/account` must include OTP session recovery entry points. | P0 | User can request a fresh code without duplicate profile/workspace rows. |
| FR-7 | The system must create or repair a missing `profiles` row for a verified auth user. | P0 | Verified user without profile receives exactly one profile row. |
| FR-8 | The system must create or repair one default owner workspace for a verified user with no membership. | P0 | User without membership receives workspace plus owner membership. |
| FR-9 | Profile display name edits must persist through `PATCH /api/reframe/account/profile`. | P0 | Reload shows updated display name. |
| FR-10 | Email display must be read-only in P0. | P0 | UI has no change-email control. |
| FR-11 | Sign out must clear Supabase session cookies and return to a signed-out state. | P0 | Reload after sign out does not show account data. |
| FR-12 | Active workspace switch must only accept workspaces where the user has membership. | P0 | Cross-workspace ID returns 403 and does not change active workspace. |
| FR-13 | `POST /api/reframe/workspaces` must create the default workspace or a new workspace. | P0 | New workspace has creator membership and can become active only for the creator/member. |
| FR-14 | Member list must show active workspace members with display name/email/role according to requester permissions. | P0 | Owner, admin, and member roles display consistently where the user is authorized. |
| FR-15 | Member users must not see owner/admin invite or pending-invite controls. | P0 | Member route payload omits pending invites and UI hides controls. |
| FR-16 | Owner/admin can invite collaborators by email through a trusted server route with allowed role `admin` or `member`; no one can invite/create an `owner` role in P0. | P0 | Pending app-level invite is created with role and expiration, then the app's trusted email provider sends the invite email server-side. |
| FR-17 | Invite creation must be idempotent for an existing pending invite to the same workspace/email. | P0 | Repeat submit returns the existing pending invite state, not duplicate rows. |
| FR-18 | Invite acceptance must require a valid token, non-expired/non-revoked invite, verified session, and matching email hash. | P0 | Mismatched signed-in email cannot accept the invite. |
| FR-19 | `workspace_invites` is the workspace-invite source of truth; Supabase Auth Admin invite is not. | P0 | Invite exists as app row before email side effect; acceptance reads app invite row, not Supabase admin invite state. |
| FR-20 | Invite email delivery must use the app's trusted email provider as a side effect of app-level invite creation. | P0 | Email failure does not create membership; row status captures pending/send failure behavior. |
| FR-21 | Invite acceptance must create membership idempotently in a transaction. | P0 | Repeated accepts create one membership and mark one invite accepted. |
| FR-22 | Pending invites can be revoked by owner/admin before acceptance. | P0 | Revoked invite cannot be accepted. |
| FR-23 | Every project/content table added by MVP work must use `workspace_id` ownership. | P0 | Schema review rejects new project/media/storyboard/editorial/export tables without workspace scope. |
| FR-24 | Every storage object path must include the project ID and random file ID, and every storage object must resolve back to a workspace-owned media record. | P0 | Storage/upload PRD cannot ship with raw user/session-only paths. |
| FR-25 | Client never receives raw bucket paths that grant broader access than needed. | P0 | Upload/download responses use scoped signed URLs or safe media IDs only. |
| FR-26 | All account/workspace mutations must require CSRF/origin validation and typed payload validation. | P0 | Missing CSRF or cross-origin mutation returns 403. |
| FR-27 | Public auth and invite responses must not expose account existence. | P0 | Unknown/existing emails use generic public copy and response shape where feasible. |
| FR-28 | Service role or secret keys must never be exposed to client code. | P0 | Static/code review finds no secret access in client components. |
| FR-29 | Server components, route handlers, and proxy/middleware must validate authenticated users through Supabase server auth methods that revalidate claims/user identity. | P0 | Protected data is never authorized from client state, raw cookie values, or `getSession()` alone. |
| FR-30 | Any service-role operation must first authenticate the requester with the normal server Supabase client, derive actor user ID, and verify workspace membership/role. | P0 | Service-role route tests fail if actor auth or workspace-role verification is skipped. |
| FR-31 | Service-role client must not be used for ordinary account payload reads, member list reads, active workspace switching, or user-scoped profile updates. | P0 | These routes use the normal server Supabase client and RLS-scoped user context. |
| FR-32 | `/api/reframe/auth/otp/start` must set `shouldCreateUser` according to entry mode. | P0 | Public open signup may use `true`; invite-only pilot gates creation by invite/allowlist; existing-user-only recovery uses `false`. |
| FR-33 | `/demo` must remain unchanged. | P0 | Diff for this feature contains no `/demo` source changes. |

## 8. Non-functional requirements

| Category | Requirement | Target |
|---|---|---|
| Performance | `/account` initial authenticated load reads one compact account payload. | P95 server response under 750ms in staging without cold external email send. |
| Reliability | Account repair/default workspace creation is idempotent. | Refresh/retry creates no duplicate profile, workspace, membership, or invite rows. |
| Security | All authorization decisions are server-side, backed by RLS, and based on revalidated Supabase user identity/claims rather than client state or raw cookie session data. Service-role operations must be preceded by normal user auth and role checks because the service key bypasses RLS. | Cross-workspace read/write tests fail closed, protected handlers do not authorize from `getSession()` alone, and service-role tests prove actor/role checks happen before privileged writes. |
| Privacy | Email, invite token, and private workspace details are not logged to analytics or error logs. | Logs include route, status, coarse reason, request ID, and workspace ID only when authorized. |
| Accessibility | Account forms and member tables meet WCAG 2.2 AA form/contrast/focus expectations. | Manual keyboard pass and component tests cover states. |
| Observability | Mutations emit coarse events and structured logs without sensitive payloads. | Error rates, invite send failures, and RLS denials are visible. |
| Maintainability | Account payloads and roles are typed from shared schemas/enums. | `npm run typecheck` passes. |
| API discipline | "Every server route should have a typed request/response contract, schema validation, explicit error states, server-only secrets, deterministic persistence, and focused tests with external providers mocked." | Route tests cover success, validation, auth, permission, and provider failure states. |

## 9. Data, API, and integration contracts

### Data model

| Entity | Fields | Owner | Validation | Retention |
|---|---|---|---|---|
| `profiles` | `id: uuid`, `email_display: text`, `email_hash: text`, `display_name: text?`, `avatar_url: text?`, `active_workspace_id: uuid?`, `created_at`, `updated_at` | Account layer | `id` references `auth.users(id)` on delete cascade; `email_hash` server-computed; `active_workspace_id` must belong to user before use. | User lifetime; deleted/anonymized under future account deletion policy. |
| `workspaces` | `id: uuid`, `slug: text`, `name: text`, `created_by: uuid`, `created_at`, `updated_at`, `archived_at: timestamptz?` | Account/workspace layer | Name 2-80 chars; slug unique; creator references auth user; archived workspaces are not active. | Workspace lifetime. |
| `workspace_memberships` | `workspace_id: uuid`, `user_id: uuid`, `role: owner/admin/member`, `created_at`, `joined_at` | Account/workspace layer | Unique workspace/user pair; valid role enum; at least one owner must remain. | Workspace lifetime or until removal policy ships. |
| `workspace_invites` | `id: uuid`, `workspace_id: uuid`, `email_display: text`, `email_hash: text`, `role: admin/member`, `token_hash: text`, `status: pending/accepted/revoked/expired`, `invited_by: uuid`, `accepted_by: uuid?`, `expires_at`, `created_at`, `accepted_at?`, `revoked_at?` | Account/workspace layer | Token hash unique; pending invite unique per workspace/email; role required; expiration required; invited_by must be owner/admin. | Pending invites expire after 7 days; accepted/revoked rows retained for support/audit until audit policy changes. |
| Future workspace-owned rows | `workspace_id: uuid` plus feature-specific fields | Owning feature | Every project/media/recipe/storyboard/editorial/export row must reference workspace. | Feature-specific. |

### Required constraints and indexes

| Table | Constraint/index | Purpose |
|---|---|---|
| `profiles` | `primary key (id)`, `foreign key (id) references auth.users(id) on delete cascade`, `unique (email_hash)`, index `active_workspace_id` | One app profile per auth user and fast active workspace lookup. |
| `workspaces` | `primary key (id)`, `unique (slug)`, `foreign key (created_by) references auth.users(id)` | Stable workspace URLs and auditable creator. |
| `workspace_memberships` | `primary key (workspace_id, user_id)`, `check (role in ('owner','admin','member'))`, index `user_id`, index `workspace_id` | One membership per user/workspace and efficient membership checks. |
| `workspace_memberships` | Deferrable trigger or transaction check preventing last owner removal/demotion | Protect workspace recoverability when P1 removal/role edits ship. |
| `workspace_invites` | `unique (token_hash)`, partial unique `(workspace_id, email_hash) where status = 'pending'`, `check (role in ('admin','member'))` for P0 | Idempotent invite creation, role-bearing invites, and no duplicate pending invites. |
| `workspace_invites` | index `(workspace_id, status)`, index `(email_hash, status)` | Member admin UI and invite acceptance lookup. |

### Adjacent workspace ownership contracts

These entities are not built by the `/account` page, but the account schema must support them because the cutdown makes workspace ownership the MVP boundary.

| Entity | Cutdown contract | Account PRD implication |
|---|---|---|
| `intake_drafts` | "pre-auth context payload, draft token hash, optional email hash, status, expiration, claimed user/workspace/project IDs, and timestamps." | Claim must create or reuse profile/default workspace/membership before project creation. |
| `projects` | "founder/project/campaign container scoped to `workspace_id`." | Project APIs must reject loose user/session ownership. |
| `media_assets` | "storage path, type, filename, duration, thumbnails, upload metadata." | Media records must resolve to a workspace-owned project before signed URL creation. |
| Private storage objects | "Every storage object path includes the project ID and random file ID" and "Every storage object also resolves back to a workspace-owned media record." | Account/workspace ownership must exist before real private uploads ship. |

### RLS policy intent

| Table | Select | Insert | Update | Delete |
|---|---|---|---|---|
| `profiles` | User can read own profile. Workspace member summaries are returned through account route after membership check. | Server/repair path only. | User can update own display name/avatar/active workspace after validation. | No direct delete in P0. |
| `workspaces` | User can read workspaces where they have membership. | Server/repair/new-workspace path only in P0. | No direct workspace update in P0 unless needed for active workspace repair metadata. | No delete/archive in P0. |
| `workspace_memberships` | User can read memberships for workspaces where they are a member. | Server invite-accept path only after token/email validation. | No role changes in P0. | No active-member removal in P0. |
| `workspace_invites` | Owner/admin can read pending invites for their workspace; invited user can resolve invite token through server route only. | Owner/admin through server route. | Owner/admin can revoke pending invite; accept route can mark accepted. | No hard delete in P0. |
| Future workspace-owned tables | Members can read rows for their workspace based on feature role rules. | Feature-specific with workspace membership check. | Feature-specific with workspace membership check. | Feature-specific with workspace membership check. |

RLS implementation must avoid recursive policies on `workspace_memberships`. If helper functions are used, they must be schema-qualified, have explicit `search_path`, and not live in an exposed schema unless intentionally wrapped.

### API surface

Protected API routes and server-rendered account payloads must resolve the authenticated user with Supabase server auth methods that revalidate claims/user identity before reading profile, workspace, membership, invite, project, or storage data. Cookie presence and client-provided IDs are never sufficient authorization.

The service/secret key bypasses RLS. A route may use a service-role client only after it has authenticated the requester with the normal server Supabase client, derived the actor user ID, and verified the actor's workspace membership/role. The service-role client must not be used for ordinary account payload reads, member list reads, active workspace switching, or user-scoped profile updates.

| Endpoint/action | Input | Output | Auth | Failure behavior |
|---|---|---|---|---|
| `POST /api/reframe/auth/otp/start` | `{ email: string, mode: 'public_account' | 'invite_accept' | 'recovery', inviteToken?: string, returnTo?: '/account' | '/intake/verify' }` | Generic OTP-pending state | Public with mode-specific gates | Starts Supabase email OTP for sign up, sign in, or session recovery; no account-enumeration response. `shouldCreateUser: true` is acceptable only for public `/account` open signup. Invite-only pilot must gate creation by invite/allowlist before calling OTP. Existing-user-only recovery must use `shouldCreateUser: false`. |
| `POST /api/reframe/auth/verify` | `{ email, token, type: 'email', returnTo? }` | Session plus account/project redirect target | Public with valid verification token | Verifies emailed OTP/code, establishes Supabase session, creates missing profile/workspace rows, and can claim draft when invoked from intake. |
| `GET /api/reframe/account` | none | `{ profile, activeWorkspace, memberships, members, pendingInvites? }` | Required; normal server Supabase client only | `401` unauthenticated; `500/503` if account repair fails. Never use service role for this ordinary account payload read. |
| `PATCH /api/reframe/account/profile` | `{ displayName: string }` | `{ profile }` | Required; own profile; normal server Supabase client only | `400` invalid; `403` mismatched user; `429` excessive changes. Never use service role for this user-scoped update. |
| `POST /api/reframe/auth/sign-out` | none | `{ ok: true }` | Required when possible | Clears cookies even if upstream signout is degraded; returns generic success. |
| `PATCH /api/reframe/account/active-workspace` | `{ workspaceId: uuid }` | `{ activeWorkspace }` | Required; member of workspace; normal server Supabase client only | `403` if not member; `404` generic inaccessible workspace. Never use service role for active workspace switching. |
| `POST /api/reframe/workspaces` | `{ name?: string }` | `{ workspace, membership }` | Required | Creates the default workspace or a new workspace; idempotent default repair; no billing/seat controls. |
| `GET /api/reframe/workspaces/:workspaceId/members` | none | `{ members }` | Owner/admin for full list; normal server Supabase client only. Current member can receive limited account payload from `GET /api/reframe/account` | `403` not member/authorized; returns limited profile fields only. Never use service role for member list reads. |
| `POST /api/reframe/workspaces/:workspaceId/invites` | `{ email: string, role: 'admin' | 'member' }` | `{ invite: { id, emailDisplay, role, status, expiresAt } }` | Owner/admin verified through normal server Supabase client | `400` invalid email/role; `403` not owner/admin; `409` already active member; `429` throttled; no account-existence leak. Creates application-level `workspace_invites` row first, then sends email through the app's trusted email provider. Service role only if strictly necessary after actor and role checks. |
| `POST /api/reframe/workspaces/:workspaceId/invites/:inviteId/revoke` | none | `{ invite }` | Owner/admin verified through normal server Supabase client | `403` not owner/admin; `404` inaccessible; accepted invites cannot be revoked. Service role only if strictly necessary after actor and role checks. |
| `POST /api/reframe/workspace-invites/accept` | `{ token: string }` | `{ workspace, membership }` | Required after Supabase OTP verification; normal server Supabase user identity required before any privileged write | `400/410` invalid or expired; `403` authenticated email mismatch; idempotent if already accepted by same user. Reads app invite row by hashed token, compares verified auth email hash to invite email hash, then creates membership idempotently in a transaction. |
| `POST /api/reframe/projects` | Project creation payload after authenticated claim | `{ project }` | Required; workspace member | Adjacent contract: creates a workspace-scoped project after authenticated claim; no loose user/session project ownership. |

All state-changing routes require `POST`/`PATCH`, JSON content type, schema validation, same-origin checks, CSRF token validation, and app-level throttling where abuse is plausible.

### External integrations

| Integration | Purpose | Auth | Webhooks/events | Rate limits/costs | Failure handling |
|---|---|---|---|---|---|
| Supabase Auth SSR | Sign in/sign out/session refresh. | Cookie-based SSR clients using `@supabase/ssr`; server components, route handlers, and proxy/middleware validate users with server auth methods that revalidate claims/user identity. Do not authorize protected data from `getSession()` alone. | Auth provider events are not required for P0. | MAU and auth email usage can affect cost; Supabase Auth rate limits apply. | Fail closed for protected data; show generic auth retry. |
| Supabase Postgres/RLS | Store profiles, workspaces, memberships, invites. | User JWT for scoped operations; service role only in trusted server paths when strictly required after normal auth and workspace-role verification. | No webhook required. | Low pilot storage cost. | Route returns typed errors and logs coarse reason. |
| App trusted email provider | Send workspace invite email after app-level invite row creation. | Server-only provider credentials; requester is authenticated and role-checked before send. | No webhook required in P0. | Email sends subject to provider/rate-limit configuration. | `workspace_invites` remains source of truth; email delivery is a side effect and never creates membership. |
| Supabase Storage | Future private media ownership. | Private buckets with RLS/signed URLs in future upload PRD. | Not used by `/account`. | Not applicable for P0 account UI. | Future storage rows must include workspace/project ownership. |

No account-management webhook is required in P0. If future auth/provider webhooks are added, they must verify signatures, be idempotent, and avoid creating application profile/workspace rows before identity is verified.

### Migration/backfill

- Additive SQL migration for profile/workspace/member/invite tables and RLS.
- No waitlist backfill.
- Existing verified auth users, if any, get profile/default workspace via idempotent repair on first `/account` load or claim.
- Do not edit `.env`; document required values in runtime docs.

## 10. AI/automation behavior

No AI behavior ships in `/account`. Account repair/default workspace creation is deterministic server logic, not model output.

## 11. Analytics and success metrics

### Product metrics

| Metric | Definition | Target | Instrumentation |
|---|---|---|---|
| Account setup completion | Verified users with profile plus at least one owner workspace. | 100% for users who reach authenticated `/account`. | `account_setup_completed` server event. |
| Invite send success | Pending app-level invite created and trusted email-provider send succeeds. | Track during pilot; no hard target until provider volume is known. | `workspace_invite_created`, `workspace_invite_send_failed`. |
| Invite acceptance | Pending invite becomes membership. | Track pilot baseline. | `workspace_invite_accepted`. |
| Cross-workspace denial | Unauthorized workspace/account requests denied. | 0 successful unauthorized reads/writes in tests; production denials monitored. | Structured security logs. |

### Required events

| Event | Trigger | Properties | Privacy notes |
|---|---|---|---|
| `account_viewed` | Authenticated `/account` load succeeds. | `workspace_id`, `role`, `membership_count` | No email/name. |
| `profile_updated` | Display name save succeeds. | `user_id_hash` or internal user id, changed fields list | No raw display name in analytics. |
| `workspace_switched` | Active workspace changes. | `from_workspace_id`, `to_workspace_id`, `role` | Only after authorization. |
| `workspace_created` | Default or new workspace creation succeeds. | `workspace_id`, `created_by_role` | No raw workspace name in analytics. |
| `workspace_invite_created` | Pending invite created/reused. | `workspace_id`, `role`, `invite_id` | No raw invited email. |
| `workspace_invite_accepted` | Membership created from invite. | `workspace_id`, `invite_id`, `role` | No raw email/name. |
| `account_signed_out` | Sign out succeeds. | `user_id_hash` or internal user id | No PII. |

## 12. Edge cases and failure states

| Case | Expected behavior | User-facing copy/action |
|---|---|---|
| Session cookie exists but claims validation fails | Treat as signed out and clear stale state where possible. | "Sign in to manage your Reframe workspace." |
| Verified user has no profile | Create profile idempotently from auth user metadata/email. | "Setting up your account..." |
| Verified user has profile but no membership | Create one default workspace plus owner membership. | "Setting up your workspace..." |
| Active workspace points to inaccessible workspace | Fall back to first valid membership and update active workspace. | "Switched to an available workspace." |
| New workspace slug/name collides | Generate a unique slug or ask for a different name without creating duplicate memberships. | "Use a different workspace name." |
| Owner/admin invites existing active member | Do not create invite; return member-safe message. | "That person already has access." |
| Duplicate pending invite | Return existing pending invite state and optionally refresh expiry only if specified by implementation. | "Invite already pending." |
| Invite email send fails after DB row | Keep pending row with `send_failed` metadata or return failure without membership. | "We could not send that invite. Try again." |
| Invite token expired/revoked | Do not create membership. | "This invite is no longer active." |
| Signed-in user email does not match invite email hash | Do not reveal invited email beyond safe masked display if already verified. | "This invite cannot be accepted from this account." |
| Owner/admin loses role in another tab | Server denies mutation even if UI still shows controls. | "You do not have permission to change this workspace." |
| Trusted email provider env missing for invite | Do not create membership; return typed config error or mark app-level invite send failed according to implementation. | "Invites are temporarily unavailable." |
| RLS blocks unexpected query | Fail closed and log coarse route/error ID. | "We could not load this workspace. Try again." |

## 13. Security, privacy, and abuse considerations

- **Sensitive data:** emails, display names, workspace names, invite tokens, membership roles, future private media/project ownership.
- **Access control:** every account/workspace route validates Supabase user identity server-side with methods that revalidate claims/user identity and then checks membership/role server-side; client role state, raw cookie values, and `getSession()` alone are display-only or insufficient for authorization.
- **RLS:** enable RLS on every exposed table. Policies must be reviewed with cross-workspace denial tests.
- **Secret handling:** service/secret keys are server-only, bypass RLS, and are used only when strictly necessary after normal server auth plus role checks. Do not use Supabase Auth Admin invite as the workspace-invite source of truth.
- **Workspace invite source of truth:** `workspace_invites` rows are application-level invites: hashed token, hashed normalized email, role, expiration, inviter, and workspace. Email delivery through the app's trusted provider is a side effect. Acceptance requires Supabase OTP verification, matching verified email hash, and idempotent membership creation in a transaction.
- **Invite tokens:** store only token hashes; raw token appears only in the emailed link and request body during acceptance. Do not log raw tokens or include them in analytics.
- **Email enumeration:** public auth and invite flows must not say whether an email is registered. Owner/admin inviting an already-active workspace member can receive "already has access" only after the requester is authorized for that workspace.
- **CSRF:** all state-changing account/workspace routes require same-origin and CSRF validation consistent with the intake-auth PRD.
- **Rate limiting:** throttle OTP start/verify, invite creation, invite acceptance, profile updates, and workspace updates by IP/user/workspace/email hash as appropriate.
- **Project/media ownership:** "Every API route checks project ownership before reading or writing." "Client never receives raw bucket paths that grant broader access than needed."
- **Pilot exception:** "For an invite-only pilot, a signed session/project token can temporarily scope projects, but it is not a production auth substitute." `/account` is the production ownership path.
- **Abuse cases:** invite spam, token brute force, account enumeration, role escalation, cross-workspace ID probing, stale-session mutations, and sensitive data in logs.
- **Mitigations:** generic responses, short-lived invite tokens, hashed email/token fields, role checks, app-level throttles, RLS tests, and no raw PII in analytics.

## 14. Dependencies and constraints

| Dependency/constraint | Impact | Owner | Status |
|---|---|---|---|
| Supabase SSR packages/utilities | Required for cookie session auth. | Engineering | Present in `package.json` and `lib/supabase/*`. |
| Supabase Auth config | Email auth and invite links depend on configured project and templates. | Engineering/Ops | Needed. |
| Supabase SQL migration | Required for account/workspace data and RLS. | Engineering | Needed. |
| Service/secret key | Bypasses RLS; use only when strictly necessary after normal server auth and workspace-role checks. Not used for ordinary reads or as invite source of truth. | Engineering/Ops | Document only; do not edit `.env`. |
| Trusted email provider | Sends workspace invite email after `workspace_invites` row creation. | Engineering/Ops | Needed if invite emails are sent in P0. |
| Existing intake-auth PRD | Defines shared OTP/session/claim expectations. | Product + Engineering | Existing draft. |
| Existing design system | `/account` should follow workspace surface style, not landing/trending style. | Design + Engineering | Existing docs/tokens. |
| Mixed lockfiles | Do not change package-manager strategy. | Engineering | Constraint. |
| `/demo` freeze | Account work must not mutate investor demo behavior. | Engineering | Constraint. |

### Tech stack constraints from cutdown

> Use the existing Next.js app and add the smallest backend needed for real context extraction, uploads, labeling, recipe generation, edit events, and export. The backend should be a Next.js route-handler API plus Supabase Postgres/Storage plus server-side OpenAI calls. Use Supabase because the repo already has Supabase waitlist infrastructure and because Postgres + object storage is enough for this MVP. Do not introduce a separate API service, queue, worker platform, vector database, or social integration layer until a specific P1 feature requires it.

For `/account`, this means Next.js route handlers, Supabase Auth, Supabase Postgres/RLS, and future Supabase Storage ownership contracts. No separate account microservice, webhook system, or custom auth provider belongs in P0.

### Runtime configuration to document before implementation

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` or existing browser-safe anon/publishable key
- `SUPABASE_SERVICE_ROLE_KEY` or current Supabase secret key for trusted server-only admin operations
- `REFRAME_SECURITY_SECRET` or equivalent HMAC salt for email/invite/CSRF hashing if not already defined
- Supabase Auth redirect allow-list entries for `/account` and invite acceptance return paths
- Auth email template/invite template that does not leak workspace private data

## 15. Rollout, migration, and rollback

- **Rollout:** Ship `/account` behind existing navigation/direct URL first. Do not expose member invites to public traffic until RLS and invite tests pass.
- **Migration:** Add profile/workspace/member/invite tables, constraints, helper functions, and RLS. Existing auth users are repaired on first authenticated account load.
- **Rollback:** Hide `/account` navigation and disable invite endpoints. Keep schema/RLS in place because projects and intake claim may depend on workspace ownership. Pending invites can expire naturally.
- **Support/ops:** Monitor account load failures, invite send failures, 401/403/429 rates, and RLS denials. Keep a manual SQL/admin recovery runbook for orphaned profiles/workspaces during pilot.

## 16. Acceptance criteria

The feature is ready to ship when:

- [ ] Anonymous users opening `/account` see an auth entry and no account/workspace/member data.
- [ ] Authenticated users opening `/account` see profile basics, email display, sign out, active workspace, role, member list, and allowed actions.
- [ ] First authenticated load creates or repairs exactly one `profiles` row and one default owner workspace if missing.
- [ ] Profile display name update persists and rejects invalid or oversized names.
- [ ] Sign out clears the session and a refresh no longer shows protected account data.
- [ ] OTP email auth start returns the same public response for new and existing emails, and no password field appears.
- [ ] OTP verification establishes a Supabase session before any workspace data is shown.
- [ ] Active workspace switch succeeds only for workspaces where the user is a member.
- [ ] Default or new workspace creation creates a workspace plus creator membership and does not add billing/seat controls.
- [ ] Owner/admin can create an application-level `workspace_invites` row for an email as `admin` or `member`; member cannot.
- [ ] Invite email is sent through the app's trusted email provider only after `workspace_invites` row creation.
- [ ] Invite creation is idempotent for duplicate pending invite to the same workspace/email.
- [ ] Pending invite revoke prevents later acceptance.
- [ ] Invite acceptance requires Supabase OTP verification, matching verified auth email hash, valid non-revoked/non-expired token, and creates exactly one membership in a transaction.
- [ ] Public auth/invite responses do not reveal whether an email has an account outside an authorized workspace context.
- [ ] RLS policies prevent cross-workspace reads/writes for profiles, workspaces, memberships, invites, and future workspace-owned rows.
- [ ] Server components, route handlers, and proxy/middleware do not authorize protected data from client state, raw cookie session data, or `getSession()` alone.
- [ ] Every account/workspace mutation rejects missing, invalid, or cross-origin CSRF attempts.
- [ ] Service/secret keys are used only server-side and never appear in client bundles.
- [ ] Account analytics/events contain no raw email, display name, invite token, or private workspace name.
- [ ] `/demo` is untouched.
- [ ] Focused component, route, auth, invite, and RLS/manual tests pass; `npm run typecheck` passes.

## 17. QA / validation plan

| Test | Type | Owner | Pass criteria |
|---|---|---|---|
| Unauthenticated account route | Component/route | Engineering | `/account` shows auth entry and no protected payload. |
| Account repair idempotency | Route/unit | Engineering | Repeated repair creates one profile, one default workspace, one owner membership. |
| Profile update | Route + component | Engineering | Valid display name persists; invalid values return field errors. |
| Sign out | Route/manual | Engineering | Session cookies cleared and protected payload unavailable after refresh. |
| Active workspace switch | Route/security | Engineering | Valid membership succeeds; cross-workspace ID returns 403. |
| OTP auth start/verify | Route + component | Engineering | New/existing email response shapes match; valid code establishes session; invalid code reveals no workspace data. |
| Workspace create | Route + component | Engineering | Default/new workspace creation is idempotent where appropriate and creates creator membership. |
| Member list permissions | Route/security | Engineering | Member can see current workspace member summary; non-member denied. |
| Invite create | Route/security | Engineering | Owner/admin creates `workspace_invites` row; trusted email send is side effect; member denied; duplicate pending invite idempotent. |
| Invite accept | Route/security | Engineering | Valid token plus OTP-verified matching email creates one membership transactionally; expired/revoked/mismatched/reused token denied. |
| Invite revoke | Route/security | Engineering | Revoked pending invite cannot be accepted. |
| Enumeration resistance | Security unit | Engineering | Public email flows use generic copy/status where required. |
| RLS matrix | SQL/manual or automated DB test | Engineering | Required matrix below passes for anon, cross-workspace users, roles, field filtering, and invite-token failures. |
| CSRF/origin checks | Route unit | Engineering | Mutations reject missing token, mismatched token, and cross-origin requests. |
| Accessibility pass | Manual/component | Design + Engineering | Keyboard, labels, error messages, status announcements, and mobile layout pass. |
| Typecheck | Static | Engineering | `npm run typecheck` passes. |

### Required RLS test matrix

Set up:

1. Create test users A and B.
2. Create workspace A owned by user A.
3. Create workspace B owned by user B.

Verify:

- anon cannot read/insert/update/delete any account/workspace table.
- user A cannot read or mutate workspace B.
- user B cannot read or mutate workspace A.
- member cannot invite, revoke, or create admin-level changes.
- admin can invite/revoke pending invites but cannot create owner role.
- owner/admin/member receive only the fields allowed by the API contract.
- invite acceptance fails for mismatched email, expired token, revoked token, and reused token by different user.

### Manual QA script

1. Open `/account` signed out and confirm only auth entry is visible.
2. Complete email-code auth and confirm `/account` shows profile and a default workspace.
3. Refresh `/account` and confirm no duplicate profile/workspace/member rows are created.
4. Update display name and refresh.
5. Create a new workspace or trigger default workspace repair, then confirm creator membership exists.
6. Invite a new email, confirm pending invite appears with role and expiration, and confirm duplicate submit does not create a second pending row.
7. Open the invite as the invited email, verify/sign in with OTP, and accept.
8. Confirm the new user sees the workspace as a member and does not see invite controls.
9. Try accepting the invite from a different signed-in email and confirm denial.
10. Sign out and refresh `/account`; protected data is gone.

## 18. Risks and open questions

### Risks

| Risk | Severity | Mitigation | Decision needed? |
|---|---|---|---|
| RLS misconfiguration exposes private workspace data | High | RLS on every exposed table, non-recursive membership checks, cross-workspace denial tests. | No, mitigation required. |
| Invite token leakage grants unauthorized workspace access | High | Hash tokens, short expiration, email-hash match on acceptance, no token logs/analytics. | No, mitigation required. |
| Role escalation through client-controlled payloads | High | Server derives requester role from membership; invite roles are constrained to allowed P0 roles; no owner transfer or client role edits. | No. |
| Account enumeration through auth/invite copy | High | Generic public responses; only authorized workspace context can say "already has access." | No. |
| Service key exposure or RLS bypass misuse | High | No service-role client for ordinary reads/updates; app-level invite source of truth; normal server auth and workspace-role checks before any strictly necessary privileged operation; bundle/static review. | No. |
| Scope creep into admin console | Medium | P0 excludes billing, role editor, member removal, owner transfer, audit logs, and account deletion. | No. |
| Auth method inconsistency with cutdown | Medium | Use existing intake-auth OTP direction; document password auth as out-of-scope unless product reverses. | Yes only if password auth is required. |
| Invite email deliverability | Medium | Monitor provider failures; keep pending rows safe; add resend in V1 if needed. | No. |

### Open questions

| Question | Why it matters | Default assumption | Owner |
|---|---|---|---|
| Should P0 allow inviting `owner`, or only `admin`/`member`? | Owner invites create account-recovery and last-owner risk. | P0 allows `admin`/`member` invite roles only; owner transfer is V1+. | Product |
| How visible should new workspace creation be in `/account`? | Cutdown includes `POST /api/reframe/workspaces`, but the UI can stay understated for pilot. | Support the API in P0; expose a compact create action only if pilot users need multiple workspaces. | Product |
| Should accepted-member removal be P0? | Basic team management often expects removal, but last-owner and audit requirements add risk. | No; only revoke pending invites in P0. | Product + Engineering |
| Should account deletion be exposed in `/account`? | Deletion requires data retention/export and cascading policy decisions. | No; support-assisted deletion until a dedicated privacy PRD. | Product + Legal/Ops |

## 19. Sources and fact-check notes

| Claim/assumption | Source | Date accessed | Confidence |
|---|---|---|---|
| `/account` is a P0 route for basic account, workspace, and member management for multiple users. | `docs/reframe-mvp-cutdown.md` | 2026-05-07 | High |
| Account scope includes sign up, sign in, sign out, session refresh, profile basics, one default workspace, roles, invites, workspace-scoped project ownership, RLS, and private media paths. | `docs/reframe-mvp-cutdown.md` | 2026-05-07 | High |
| Auth method defaults to OTP email auth while preserving the cutdown's sign up/sign in/sign out/session refresh outcomes. | User correction in current PRD review: "DEFAULT TO EXISTING CODE (OTP EMAIL AUTH) FOR THE PRD"; `docs/prds/2026-05-07-intake-auth-handoff.md` | 2026-05-07 | High |
| Current repo has Supabase packages and SSR/proxy utilities but lacks `/account`, account APIs, schema, and RLS. | `package.json`, `lib/supabase/*`, `proxy.ts`, `app/` route listing | 2026-05-07 | High |
| Existing intake-auth PRD owns draft claim, OTP-only auth assumption, profile/workspace creation contracts, and RLS/security expectations. | `docs/prds/2026-05-07-intake-auth-handoff.md`, `docs/technical-research/2026-05-07-intake-auth-handoff.md` | 2026-05-07 | High |
| Supabase SSR for Next.js uses cookie-configured clients through `@supabase/ssr`; server code should validate claims rather than trusting client state. | https://supabase.com/docs/guides/auth/server-side/creating-a-client?queryGroups=framework&framework=nextjs | 2026-05-07 | High |
| Application-facing user data should live in protected public tables referencing `auth.users`; the Auth schema is not exposed through generated APIs. | https://supabase.com/docs/guides/auth/managing-user-data | 2026-05-07 | High |
| Supabase RLS policies can use `auth.uid()` and should specify roles/indexes for performance. | https://supabase.com/docs/guides/database/postgres/row-level-security | 2026-05-07 | High |
| Supabase private buckets use RLS and limited-time signed URLs; public buckets bypass retrieval access controls. | https://supabase.com/docs/guides/storage/buckets/fundamentals | 2026-05-07 | High |
| Supabase Admin APIs require a secret key and bypass user RLS; this PRD does not use Supabase Auth Admin invite as the workspace-invite source of truth. | https://supabase.com/docs/reference/javascript/admin-api, https://supabase.com/docs/reference/javascript/auth-admin-inviteuserbyemail | 2026-05-07 | High |
| Supabase Auth has rate limits and returns 429 for exceeded limits; app-level throttles are still needed for product-specific abuse controls. | https://supabase.com/docs/guides/auth/rate-limits | 2026-05-07 | High |
| Supabase MAU costs are usage-based above plan quota; pilot account cost is expected to be low but should be monitored. | https://supabase.com/docs/guides/platform/manage-your-usage/monthly-active-users | 2026-05-07 | Medium |
| OWASP recommends generic authentication responses to reduce account enumeration. | https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html | 2026-05-07 | High |
| `/account` should follow the calm workspace design language, not landing/trending styling. | `docs/DESIGN.md` | 2026-05-07 | High |

## Appendix A: Verbatim Source Extracts From `docs/reframe-mvp-cutdown.md`

The excerpts below are copied verbatim from `docs/reframe-mvp-cutdown.md` where relevant to `/account`, accounts, workspace ownership, members, invites, and RLS.

### Top-level route and backend decision

> Do not edit `/demo`. Treat it as a frozen seeded investor demo and visual reference. The MVP should be built on separate routes:
>
> - `/intake`: the real intake loop for business context, campaign goal, founder note, optional URL references, and manual media upload.
> - `/app/[workspaceSlug]/projects/[projectSlug]`: the real MVP workspace for extracted context, labeled assets, curated content recipes, editable storyboards, editorial memory, and export.
> - `/account`: basic account, workspace, and member management for multiple users.

> The backend is not a vague "AI backend." It is a small Next.js backend-for-frontend with seven boring responsibilities:
>
> - Authenticate users and scope every project to a workspace through Supabase Auth, profiles, memberships, and RLS.
> - Persist short-lived pre-auth intake drafts, then claim them into a verified user's workspace without forcing duplicate context entry.
> - Persist project data in Supabase Postgres: intake sources, extracted context, media metadata, generated recipes, storyboard beats, editorial events, preferences, and exports.
> - Store uploaded images/videos in private Supabase Storage buckets through server-created signed upload URLs.
> - Call OpenAI server-side for structured extraction, media/frame labeling, recipe generation, beat regeneration, and preference inference.
> - Serialize real export artifacts: Markdown brief, JSON package, CSV shot list, and copyable script.
> - Enforce security boundaries: validate inputs, keep service keys server-only, limit file type/size, avoid logging private media/text, and scope every project to an owner/session.

> For a public MVP with private media and multiple users, authentication and ownership are P0. Use Supabase Auth with server-side cookie sessions, public `profiles`, `workspaces`, and `workspace_memberships` tables, private storage buckets, and RLS. A session-scoped project token is only acceptable for a controlled demo or pilot, not for the multi-user product.

> Industry-standard MVP rule: every server route should have a typed request/response contract, schema validation, explicit error states, server-only secrets, deterministic persistence, and focused tests with external providers mocked. Add background jobs only when a single synchronous request cannot safely finish the work, such as longer video frame extraction or future MP4 rendering.

### Accounts Management Research Addendum

> Decision: add `/account` as a P0 path before real uploads, editorial memory, or multi-user projects go public. This is not a full admin console. It is the minimum account-management layer needed to keep private founder data, uploaded media, and workspace membership credible.

> Use Supabase Auth because the backend already depends on Supabase and official Supabase Next.js guidance supports cookie-based SSR with `@supabase/ssr` [S21][S22]. Supabase Auth users live in the Auth schema; application-facing user data should live in a protected `public.profiles` table with RLS and a foreign key to `auth.users` [S25]. Supabase states that RLS should be enabled for exposed-schema tables and that policies can use `auth.uid()` for user-scoped access [S23]. Supabase Storage private buckets are RLS-protected and can use signed URLs for limited-time access [S24][S7]. Supabase supports admin email invites, but admin methods require the service role key and must run only on a trusted server [S28][S29].

> P0 account scope:
>
> - Sign up, sign in, sign out, and session refresh with Supabase Auth.
> - `/account` page for profile basics: name, email display, avatar optional, sign out.
> - One default workspace per new user.
> - Workspace membership table with `owner`, `admin`, and `member` roles.
> - Minimal owner/admin invite flow using a trusted server route.
> - Project ownership through `workspace_id`, not loose user/session IDs.
> - RLS policies on all MVP tables based on workspace membership.
> - Private media bucket paths scoped by workspace and project.
> - Basic member list and invite-by-email flow.

> Do not build P0:
>
> - Billing, plan enforcement, or seats.
> - Enterprise SSO/SAML.
> - Complex RBAC/custom JWT claims.
> - Public team directory.
> - Audit log UI.
> - Super-admin dashboard.
> - MFA as mandatory onboarding.

> MFA is a P1 security setting, not a P0 blocker. Supabase supports MFA/TOTP and authenticator assurance levels, but requiring it in the first onboarding flow adds friction [S26]. Custom claims/RBAC hooks are credible later if role checks become performance-sensitive or cross-service, but P0 can use membership-table RLS directly [S27].

### Intake-to-auth handoff impact

> Decision: the landing page should send founders to `/intake` before signup, but the product must not grant access to any workspace until identity is verified. The safe flow is: collect context, save a short-lived draft, authenticate or verify the user, claim the draft into a workspace, then redirect to `/app/[workspaceSlug]/projects/[projectSlug]`.

> - Landing CTA routes to `/intake`, not `/account`.
> - `/intake` collects business URL, product/store URL, campaign goal, founder note, and optional media references.
> - On first save, the server creates `intake_drafts` with a random draft token, stores only a hash of that token, sets a `HttpOnly`, `Secure`, `SameSite=Lax` cookie, and expires the draft quickly, for example 24 hours.
> - If a valid Supabase session already exists, the server claims the draft immediately into the user's active workspace, creates or updates a project, and redirects to `/app/[workspaceSlug]/projects/[projectSlug]`.
> - If no session exists, ask for email on the intake completion step. The server may use a protected `email_hash` lookup against application profiles to decide whether the next UI should be sign in or sign up, but that lookup must require a valid draft token and rate limits. Do not expose a standalone "does this email exist?" endpoint.
> - For a new user, call Supabase `signUp` with email/password and email confirmation enabled. Configure the confirmation template to show a code using `{{ .Token }}`. The user enters the code on `/intake/verify`.
> - After `verifyOtp` succeeds and a session exists, create `profiles`, default `workspaces`, and `workspace_memberships` if missing, claim the draft idempotently, then redirect to the unique app project slug.
> - For an existing user without a session, prompt sign in with password or email OTP, then use the same claim-and-redirect step.
> - Do not put founder notes, media URLs, draft tokens, OTPs, or project IDs that imply ownership in query strings.
> - Delay real media upload until after auth when possible. If pre-auth upload is required later, use draft-scoped temporary storage paths, strict MIME/size limits, expiration, and cleanup.

> Product wording should be precise: "Continue to save this workspace" is safe. "We found your account" or "This email is not in our database" is not safe unless the user is already verified. The internal backend may decide whether to show signup or login UI after a protected draft flow, but the public API response should not be a reusable account-enumeration oracle. Supabase rate limits auth endpoints, but the app should still add per-IP and per-email throttling around intake completion and verification attempts [S34].

### MVP BLUF and P0 scope

> The MVP is not a trend crawler, publisher, analytics tool, or video editor, and it is not an edit of the existing `/demo`. The MVP is a new landing-to-`/intake` workflow that captures real business context first, then authenticates through `/account` only when needed, claims the draft, and opens the founder's `/app/[workspaceSlug]/projects/[projectSlug]` workspace. Reframe extracts brand/founder/content context, generates founder-led content recipes, and learns visibly from edits, approvals, and rejections. The smallest credible build is a structured content planner with lightweight storyboard/timeline editing, deterministic edit actions, editorial memory, basic multi-user ownership, and boring exports. Cut everything that implies live platform integrations unless it is real or explicitly labeled simulated.

> - Intake-to-auth handoff: save context before signup, verify the user only when needed, claim the draft into the workspace, and redirect to the unique app project slug without duplicate entry.
> - Basic accounts/workspaces: sign up, sign in, sign out, one default workspace, profile basics, invite members, workspace membership, and owner/member-scoped project access.

### Feature scoring rows

> | Sign up / sign in / sign out | 4 | 2 | 4 | 5 | 1 | 5 | KEEP P0 | Required before storing private media, projects, and memory for multiple users. Not differentiated, but table stakes. |
> | `/account` profile basics | 3 | 2 | 4 | 5 | 1 | 4 | KEEP P0 | Needed for user trust, sign out, and account ownership; keep it plain. |
> | Workspace memberships | 4 | 2 | 3 | 5 | 2 | 5 | KEEP P0 | Multiple users require projects/media/preferences to be scoped to a workspace, not loose sessions. |
> | Owner/admin email invites | 3 | 2 | 3 | 5 | 1 | 4 | KEEP P0 | Multiple users need a safe way to add members; keep it to email invite, role, expiration, and acceptance. |
> | Advanced team management | 2 | 2 | 3 | 4 | 1 | 2 | KEEP P1 | Billing seats, granular permissions, audit logs, and enterprise controls can wait. |

### User flow and UI plan

> The landing CTA routes to `/intake`. The founder enters context before signup so the first product act is "tell Reframe what is happening in your business," not "create an empty account."

> If the founder already has a valid Supabase session and workspace membership, claim the draft immediately and redirect to `/app/[workspaceSlug]/projects/[projectSlug]`. If no session exists, prompt for email from the intake completion step, then show sign in or sign up based on a protected, rate-limited `email_hash` lookup. Do not expose a public "email exists" lookup.

> For a new account, call Supabase email/password signup with confirmation enabled, send an OTP-style confirmation email, verify the code on `/intake/verify`, create profile/default workspace/membership, claim the draft, and redirect to the workspace project slug. Existing users sign in, then go through the same claim step.

> ## 6. UI Plan For `/account`, `/intake`, And `/app`
>
> The goal is not to retrofit `/demo`. The goal is to build the real MVP by cloning useful visual/interaction pieces into `/intake` and `/app`, adding basic account/workspace controls in `/account`, then applying the cuts below only in those new routes.

> ### `/account` Scope
>
> - Sign in, sign up, sign out, and session recovery entry points.
> - Profile basics: display name, email, optional avatar later.
> - Workspace switcher or current workspace display.
> - Member list with role labels.
> - Owner/admin "invite member" flow backed by a trusted server route.
> - No billing, admin analytics, full org settings, or social account connections.

### Frontend and backend route requirements

> - Add `/account` for auth/account/workspace controls.
> - Add `/intake` for the real intake loop.
> - Add `/intake/verify` for email-code verification when signup is required.
> - Add `/app/[workspaceSlug]/projects/[projectSlug]` for the real MVP workspace.
> - Use existing Tailwind tokens and component style.

> - `GET /api/reframe/account`: read profile, active workspace, and memberships for the signed-in user.
> - `PATCH /api/reframe/account/profile`: update profile basics.
> - `POST /api/reframe/workspaces`: create the default workspace or a new workspace.
> - `GET /api/reframe/workspaces/:id/members`: list workspace members for owners/admins.
> - `POST /api/reframe/workspaces/:id/invites`: owner/admin invite endpoint, implemented server-side with service-role-only Supabase Admin calls.

### Auth and ownership

> For a public MVP, add Supabase Auth before storing real private uploads or persistent editorial memory. For an invite-only pilot, a signed session/project token can temporarily scope projects, but it is not a production auth substitute.

> Minimum ownership rules:
>
> - Every project row has a `workspace_id`.
> - Every workspace has at least one `owner` membership.
> - Every invite is tied to `workspace_id`, invited email, inviter user, role, token hash, and expiration.
> - Every storage object path includes the project ID and random file ID.
> - Every storage object also resolves back to a workspace-owned media record.
> - Every API route checks project ownership before reading or writing.
> - Service role keys remain server-only.
> - Client never receives raw bucket paths that grant broader access than needed.
> - RLS should be enabled once real auth is present.

### Database

> Suggested Supabase tables:
>
> - `profiles`: public application profile keyed by `auth.users.id`, with normalized email display and protected `email_hash` for intake continuation checks.
> - `workspaces`: account/team container for one or more users.
> - `workspace_memberships`: user-to-workspace rows with `owner`, `admin`, and `member` roles.
> - `workspace_invites`: pending invite records with role, token hash, expiration, accepted timestamp, and inviter.
> - `intake_drafts`: pre-auth context payload, draft token hash, optional email hash, status, expiration, claimed user/workspace/project IDs, and timestamps.
> - `projects`: founder/project/campaign container scoped to `workspace_id`.

### Implementation tickets

> ### Ticket 1 - Create `/account`, `/intake`, and `/app` MVP shells
>
> P0
>
> Objective: Add separate MVP routes while leaving `/demo` unchanged.
>
> Files/areas likely touched: `app/account/page.tsx`, `app/intake/page.tsx`, `app/intake/verify/page.tsx`, `app/app/[workspaceSlug]/projects/[projectSlug]/page.tsx`, new MVP-specific components under `src/components/reframe-mvp/` or similar, route tests.
>
> Acceptance criteria:
>
> - `/demo` source and behavior are not modified.
> - `/account` renders a basic account/workspace shell.
> - `/intake` renders a real context intake shell.
> - `/intake/verify` renders an email-code verification shell.
> - `/app/[workspaceSlug]/projects/[projectSlug]` renders a real MVP workspace shell.
> - Shared code copied from `/demo` is isolated so MVP changes do not mutate the demo.

> ### Ticket 2 - Basic auth and workspace ownership
>
> P0
>
> Objective: Add Supabase Auth, profiles, default workspaces, memberships, and workspace-scoped project ownership.
>
> Files/areas likely touched: Supabase SQL migration docs, `lib/supabase/*`, auth middleware/proxy, `app/account/page.tsx`, account components, `app/intake/verify/page.tsx`, `app/api/reframe/auth/*`, `app/api/reframe/account/*`, `app/api/reframe/workspaces/*`, route tests.
>
> Acceptance criteria:
>
> - Users can sign up, sign in, sign out, and refresh sessions through server-side cookie auth.
> - Email/password signup uses email confirmation, with an OTP-style verification screen if the product chooses code entry over link-only confirmation.
> - New users get a profile and default workspace.
> - Projects, uploads, recipes, storyboards, editorial events, and exports are scoped by `workspace_id`.
> - RLS policies prevent users from reading/writing workspaces where they are not members.
> - `/account` shows profile basics, current workspace, member list, and sign out.
> - Owners/admins can invite a member by email through a server route; service role key is never exposed to the browser.
> - Service role keys remain server-only.
>
> Testing requirements: mocked Supabase Auth route tests, RLS policy review, account component tests, `npm run typecheck`.

### Risk register and research findings

> | Account/auth complexity | High | KEEP P0 WITH LIMITS | Use Supabase Auth, cookie SSR, profiles, workspaces, memberships, and RLS. Avoid custom auth and advanced RBAC. |
> | RLS misconfiguration | High | KEEP P0 WITH LIMITS | Enable RLS on every exposed table, write explicit ownership policies, test cross-workspace denial, and keep service-role writes server-only [S23]. |
> | Account enumeration from intake | High | KEEP P0 WITH LIMITS | Do not expose raw email-existence checks. Use generic auth copy/responses, throttling, and the same claim flow for new and existing users [S35][S36]. |
> | Draft hijacking or stale pre-auth data | High | KEEP P0 WITH LIMITS | Store only hashed draft tokens server-side, keep raw tokens in HttpOnly cookies, expire drafts quickly, clear tokens after claim, and make claim idempotent. |
> | Security/privacy risk from uploads | High | KEEP P0 WITH LIMITS | Use signed uploads, MIME/size limits, private buckets, no public service keys, explicit deletion policy, and no sensitive logs. |
> | Public repo/secrets risk | High | KEEP P0 WITH LIMITS | Never commit env vars, credentials, source files containing private customer data, or generated media that should be private. |

> Basic accounts are P0 because Reframe will store private founder notes, uploaded product media, generated content, and editorial memory for multiple users. Supabase Auth is the lowest-friction industry-standard path for this repo because Supabase already exists in the waitlist backend and official Next.js docs support SSR cookie sessions through `@supabase/ssr` [S21][S22]. Application-facing user data should be stored in a `public.profiles` table rather than querying the private Auth schema directly [S25].

> Use workspaces, not loose per-user project ownership. The minimum credible multi-user model is `profiles`, `workspaces`, and `workspace_memberships`, with every project/media/storyboard row scoped to `workspace_id`. RLS should be enabled on all exposed tables, and policies should check `auth.uid()` against workspace membership [S23]. Private media should live in private Storage buckets with RLS and signed URLs, not public buckets [S24].

> Keep accounts boring. P0 is email auth, profile basics, one default workspace, member list, role labels, and owner/admin email invites from a trusted server route. MFA, custom JWT claims, billing seats, audit logs, and enterprise SSO are P1+ [S26][S27][S28][S29].

## Appendix B: Cost Model

This slice has no OpenAI calls, video processing, or media storage. The cost drivers are Supabase Auth MAUs, auth/invite emails, and small Postgres rows.

| Driver | Assumption | Rough MVP impact | Guardrail |
|---|---|---|---|
| Supabase Auth MAU | Pilot users stay under current plan quota. | Likely low or no incremental overage in pilot; verify current plan before public launch. | Monitor MAU usage and auth failures. |
| Auth/invite email sends | Email OTP and invite sends are low volume in pilot. | Provider/rate-limit dependent. | Throttle invite creation and watch send failures. |
| Supabase Postgres rows | One profile, workspace, membership, and occasional invite rows per user/workspace. | Negligible storage at pilot scale. | Keep indexes focused and expire/revoke stale invites. |

## Appendix C: PRD Quality Self-review

Critical gates pass: the PRD is one feature slice, BLUF-first, has explicit non-goals, testable acceptance criteria, UI states, data/API contracts, sourced external claims, and a validation plan.

Rubric score: 94/100.

| Area | Score | Notes |
|---|---:|---|
| BLUF clarity | 10 | Feature, user problem, MVP scope, and biggest risk are explicit. |
| Atomic scope | 9 | Account/workspace/member management is broad but one P0 trust/control surface. |
| User/problem clarity | 10 | Target users and use cases are concrete. |
| Functional requirements | 10 | Requirements are numbered, prioritized, and observable. |
| UI/UX flow | 9 | States, IA, accessibility, and responsive behavior are covered. |
| Technical contracts | 14 | Data/API/RLS/invite contracts are specified; exact SQL left to implementation. |
| AI/integration rigor | 9 | No AI; Supabase integration constraints are sourced. |
| Metrics and analytics | 7 | Events are concrete and privacy-aware. |
| Risk and security | 8 | RLS, token, service key, CSRF, and enumeration risks are covered. |
| Acceptance and QA | 8 | Tests are actionable; DB test harness choice remains implementation detail. |

## Appendix D: Remaining Cutdown vs PRD Diffs

These are intentional diffs after cross-reference, not accidental omissions:

| Diff | Why it remains | Default decision |
|---|---|---|
| Cutdown mentions email/password signup/sign-in in some intake sections; this PRD specifies OTP email auth. | User correction says to default to existing code/OTP email auth. | OTP email auth is P0; password auth is out of scope unless product reverses. |
| Cutdown says `GET /api/reframe/workspaces/:id/members` lists members "for owners/admins"; this PRD lets regular members see limited current-workspace member summaries through `GET /api/reframe/account`. | `/account` needs a basic member list for trust, while owner/admin-only endpoint can remain the full admin list. | Members get limited read-only summary; owners/admins get pending invites and admin controls. |
| Cutdown names `POST /api/reframe/workspaces` for default or new workspace creation; this PRD keeps UI exposure as an open question. | Multi-workspace UI can create scope creep, but the API contract is in scope. | Build the server contract; expose compact UI only if pilot users need multiple workspaces. |
| Cutdown says every invite has a role; it does not specify whether owners/admins may invite `admin`. | Role-bearing invites are required, but owner invites create recovery risk. | Allow `admin`/`member`; no owner invite or owner transfer in P0. |
| Cutdown references Supabase Admin invite/server-role invite wording; this PRD uses app-level `workspace_invites` as source of truth. | User correction says do not use Supabase Auth Admin invite as the workspace-invite source of truth. | Create app invite row first, send through trusted email provider, require Supabase OTP verification, compare email hashes, and create membership transactionally. |
| Cutdown includes private media bucket path rules in account scope, but `/account` does not build media upload. | Storage is owned by the upload/media PRD, but account/workspace ownership must constrain it. | Keep storage ownership as acceptance/schema guardrails, not `/account` UI. |

## Appendix E: Changelog

| Date | Change | Author |
|---|---|---|
| 2026-05-07 | Reconciled PRD to keep OTP email auth as the implementation default while preserving cutdown-derived workspace creation, invite role/expiration, storage ownership, route, schema, RLS, and security requirements. | Codex |
| 2026-05-07 | Hardened service-role restrictions, made `workspace_invites` the application invite source of truth, added trusted-email-provider invite delivery, OTP `shouldCreateUser` modes, and required RLS test matrix. | Codex |
| 2026-05-07 | Initial draft from `docs/reframe-mvp-cutdown.md`, existing intake-auth PRD, repo scan, and current official Supabase/OWASP docs. | Codex |
