# PRD: Resend Transactional Email Readiness

**Status:** Draft  
**Owner:** Product + Engineering + Ops  
**Date:** 2026-05-07  
**Feature slug:** `resend-transactional-email-readiness`  
**Related docs/code:** `AGENTS.md`, `docs/prds/account-prd.md`, `docs/prds/intake-prd.md`, `docs/checks/account-checklist.md`, `docs/research/resend-primary-email-provider.md`, `docs/research/account-rls-email-production-plan.md`, `lib/reframe/account/email.ts`, `app/api/reframe/auth/otp/start/route.ts`, `app/api/reframe/auth/verify/route.ts`, `app/api/reframe/account/workspaces/[workspaceId]/invites/route.ts`, `lib/waitlist/submit.ts`, `supabase/migrations/0002_account-workspace-management-supabase.sql`  
**Decision:** Build as a P0 production-readiness slice before RLS A/B testing with real emails or inviting pilot users.

---

## 1. BLUF

Make Resend the production transactional email provider for Reframe account auth and workspace invite flows because Supabase's default Auth mailer is not production-safe and current invite links can point to localhost when runtime origin config is wrong. The smallest production-worthy version is a split-provider setup: Supabase Auth OTPs through Resend SMTP, app-owned workspace invites and waitlist notifications through the existing Resend REST API, and a runtime guard/checklist proving production emails use the canonical app URL. The biggest risk is treating this as "wire Resend in code" when the OTP path is configured in Supabase Auth outside the app.

| Item | Answer |
|---|---|
| User problem | Founders and invitees cannot reliably sign in or accept invites if OTPs are blocked by Supabase's default mailer or invite links point to localhost. |
| Primary user | Founder-owner inviting collaborators; invited collaborator accepting access; internal team testing RLS with real accounts. |
| MVP scope | Configure and validate production transactional email for `/account` OTP, workspace invites, and waitlist notifications using Resend. |
| Non-goals | No Clerk migration, no Supabase Auth Admin invite flow, no marketing email platform, no new queue, no React Email redesign, no broad auth rewrite. |
| Success metric | 100% of staging/production OTP and invite smoke tests send from verified Resend-backed domains and invite links resolve to the configured production app origin. |
| Engineering risk | OTP email delivery is controlled by Supabase Auth config, not app route code; app-only changes cannot make Auth OTPs use Resend. |
| Design risk | Auth emails can become promotional, hurting deliverability; keep auth email copy short and code-first. |
| Launch risk | Wrong `REFRAME_APP_URL` or Supabase Site URL/redirect settings can continue generating broken localhost links. |

### Assumptions

| Assumption | Basis | Impact if wrong | Owner |
|---|---|---|---|
| The canonical production app origin will be available as `REFRAME_APP_URL`. | Existing invite email code reads `REFRAME_APP_URL` before public URL fallbacks. | Invite links may still point to localhost or a preview origin. | Engineering/Ops |
| Reframe will use Supabase Auth OTP for P0 rather than Clerk or password auth. | Current account/intake implementation uses `signInWithOtp` and `verifyOtp`; account PRD excludes password UI. | A provider migration would require a separate auth migration PRD and RLS changes. | Product + Engineering |
| Resend is acceptable as the production transactional email provider. | Waitlist and workspace invite code already use Resend REST; Supabase docs list Resend as custom SMTP-compatible. | Provider choice would change dashboard setup and env naming, not core account RLS design. | Product/Ops |
| Staging and production can use real email sends for QA. | RLS A/B testing requires real reachable emails. | If previews must not send real email, add environment gating before implementation. | Engineering/Ops |
| MVP traffic is low enough for synchronous invite email sends. | Current invite route sends after DB invite creation and records delivery state. | Higher volume needs queue/backoff PRD before public launch. | Engineering |

## 2. Problem

### Current State

- `/account` already has OTP sign-in UI and routes.
- `POST /api/reframe/auth/otp/start` calls Supabase `signInWithOtp`; Supabase sends the actual OTP email.
- `POST /api/reframe/auth/verify` calls Supabase `verifyOtp`, then repairs or creates profile/workspace state.
- Workspace invites already create an app-level `workspace_invites` row, generate a raw token, hash the stored token, send email through Resend REST, and record delivery state.
- Waitlist notifications already persist the waitlist row before Resend email side effects.
- Invite links are built from `REFRAME_APP_URL`, then `NEXT_PUBLIC_APP_URL`, then `NEXT_PUBLIC_SITE_URL`.
- The repo has a manual RLS checklist, but real A/B testing is blocked or unreliable until OTP and invite emails reach real accounts.

### Current Diffs / Technical Inconsistencies

| Finding | Evidence | Impact | Required resolution |
|---|---|---|---|
| OTP email provider is outside app code. | Auth start route calls `supabase.auth.signInWithOtp`; no app email send occurs there. | Adding Resend REST code to the app will not change OTP delivery. | Configure Supabase Auth custom SMTP with Resend. |
| Workspace invites already use Resend REST. | `lib/reframe/account/email.ts` sends to `https://api.resend.com/emails`. | The invite issue is not lack of Resend integration. | Fix production URL/env and verify Resend domain/config. |
| Invite URL can fall back to public site envs. | `REFRAME_APP_URL || NEXT_PUBLIC_APP_URL || NEXT_PUBLIC_SITE_URL`. | Production can accidentally send preview or localhost links if envs are wrong. | Require `REFRAME_APP_URL` in staging/production and fail smoke checks on localhost. |
| Error message says `REFRAME_APP_URL` is required, but code allows fallbacks. | `readWorkspaceInviteEmailConfig()` permits fallback envs. | Operators may think config is stricter than runtime behavior. | PRD requires runtime docs and an environment smoke test; optional follow-up can make production strict. |
| Account rate limits are in-memory. | `lib/reframe/account/rate-limit.ts` stores buckets in a module `Map`. | Useful for local/pilot, weak across serverless instances. | Keep for pilot; public launch requires CAPTCHA and/or durable throttling. |
| Resend usage may share one API key. | Waitlist and invite paths both read `RESEND_API_KEY`. | Shared key increases blast radius. | Use sending-restricted keys and document key ownership; code can keep one env in MVP if Ops accepts. |

### Why Now

- We need real user A/B accounts to validate RLS cross-workspace denial.
- Supabase default Auth email is restricted and not intended for production.
- Broken invite links undermine the account/workspace trust flow before users reach product value.
- Email domain setup, SMTP settings, redirect URLs, and smoke tests are operational prerequisites; they cannot be solved only by React or route code.

## 3. Goal / Non-goals

### Goals

- Send Supabase Auth OTP emails through Resend-backed SMTP in staging and production.
- Keep app-owned workspace invites on Resend REST with app-level invite rows as the source of truth.
- Keep waitlist notification behavior on Resend REST.
- Ensure workspace invite emails always link to the configured Reframe app origin outside local development.
- Document runtime env, Supabase dashboard settings, DNS, and smoke-test requirements.
- Preserve account RLS/security behavior while enabling real email-based RLS testing.
- Make failures observable without logging raw invite tokens, OTPs, or raw email payloads beyond required transactional provider data.

### Non-goals

- No Clerk/Auth0/WorkOS migration.
- No replacement of Supabase Auth.
- No Supabase Auth Admin invite flow.
- No email/password, password reset, magic-link-only, or social login work.
- No new email queue, worker, retry scheduler, or webhook processor in this slice.
- No React Email/template system migration.
- No marketing/broadcast email strategy.
- No account UI redesign beyond copy/states needed to reflect email delivery failures.
- No `.env` edits in repo.

## 4. Target Users and Use Cases

| User | Use case | Trigger | Desired outcome |
|---|---|---|---|
| Founder-owner | Invite collaborator to workspace. | Submits invite form from `/account`. | Invite email arrives from verified Reframe sender and link opens the deployed app. |
| Invited collaborator | Accept workspace access. | Opens invite email and completes OTP. | Joins only the invited workspace if email/token match. |
| Existing founder | Sign in to account. | Opens `/account` and requests OTP. | Receives six-digit code and session is established after verification. |
| Internal QA | Run RLS A/B checklist. | Creates real A/B test accounts. | Can sign in both users and verify cross-workspace denial. |
| Ops/Engineering | Validate production email readiness. | Before enabling pilot traffic. | DNS, SMTP, env, templates, and smoke tests pass. |

## 5. MVP Scope

### In Scope

- Resend verified transactional domain or subdomain.
- Supabase Auth custom SMTP configured to use Resend.
- Supabase Magic Link email template changed to a code-first OTP template with `{{ .Token }}`.
- Production/staging runtime env documented and validated:
  - `REFRAME_APP_URL`
  - `RESEND_API_KEY`
  - `REFRAME_INVITE_EMAIL_FROM`
  - waitlist notification envs
  - Supabase Auth Site URL and redirect allow list
- Workspace invite smoke test proving email URL origin is not localhost.
- OTP smoke test proving real email delivery through the configured provider.
- RLS checklist flow using real A/B accounts.
- Optional focused tests/docs updates to lock current invite URL behavior.

### Out of Scope

- Durable rate-limit store.
- Provider failover.
- Resend webhooks and bounce ingestion.
- Bulk/batch email sending.
- Email preference center or unsubscribe management.
- Marketing email, newsletters, or waitlist drip campaigns.
- Billing or seat enforcement tied to invites.

### Release Shape

- **MVP:** Dashboard/env setup plus minimal code/docs/test updates needed to guarantee Resend-backed OTP delivery and non-local invite URLs in staging/production.
- **V1 follow-up:** Durable rate limits, resend-invite action, email delivery dashboard/runbook, and optional Resend webhooks for bounces.
- **Future:** Multi-provider failover, queued delivery, branded React Email templates, and marketing email segmentation.

## 6. User Experience and Flow

### Entry Points

- `/account` signed-out OTP entry.
- `/account?invite=<token>` from workspace invite email.
- Waitlist submission modal/flow.
- Internal smoke-test checklist before RLS QA.

### Core Flow: Account OTP

1. User opens `/account` signed out.
2. User enters email and submits `Email code`.
3. App validates CSRF and rate limits, then calls Supabase `signInWithOtp`.
4. Supabase Auth sends the OTP through Resend SMTP.
5. User enters six-digit code.
6. App verifies OTP through Supabase, sets session cookies, repairs account/workspace rows, and renders `/account`.

### Core Flow: Workspace Invite

1. Owner/admin enters invite email and role.
2. App validates role, CSRF, rate limits, actor claims, and workspace admin/owner role.
3. App creates or refreshes the app-level `workspace_invites` row through RPC.
4. App sends invite through Resend REST using an idempotency key tied to `inviteId`.
5. Email contains `REFRAME_APP_URL/account?invite=<raw-token>`.
6. App records delivery as `sent`, `failed`, or `skipped`.
7. Invitee opens link, requests OTP, verifies matching email, and accepts membership.

### Core Flow: Waitlist Notification

1. Visitor submits waitlist form.
2. App persists or updates Supabase waitlist row.
3. App sends notification through Resend REST when configured.
4. App records notification delivery state without blocking the persisted waitlist row.

### State Requirements

| State | Required behavior | Copy/content | Notes |
|---|---|---|---|
| Auth email empty | Disable submit or show field error. | "Enter a valid email address." | Existing validation covers this. |
| OTP send loading | Preserve email input and disable duplicate submit. | "Sending code..." | Current UI has busy state; copy can remain minimal. |
| OTP sent | Show code entry and resend timing. | "Check your email for the six-digit code." | Do not mention whether account exists. |
| OTP provider failure | Return retryable generic error. | "Could not start verification." | Log provider error code/status only. |
| Invite send success | Show pending invite with delivery status. | "Invite created." | Existing UI shows pending invite rows. |
| Invite email failed | Keep app invite state and expose retry-safe state. | "Invite was created, but the email could not be sent." | Current API returns partial failure; V1 can add resend action. |
| Invite link wrong origin | Fail smoke test before pilot. | No user-facing copy. | Production blocker. |
| Permission denied | Hide owner/admin controls for members and reject stale-client mutations. | "You do not have permission to change this workspace." | Server remains source of truth. |
| Email config missing | Block invite sends with typed 503. | "Workspace invites are not configured." | Current route already maps config errors. |
| Offline/degraded | Preserve form input; allow retry after connection returns. | "Connection lost. Try again." | No background queue in MVP. |

### UX Principles

- Auth email copy is transactional, short, and code-first.
- Invite email copy names the workspace and role but does not include private project/media context.
- Public auth responses do not reveal whether an email has an account.
- Invite acceptance errors do not reveal private workspace details before token/email verification.
- Operational failures use actionable but generic copy; detailed provider errors stay in logs.

### Accessibility and Responsive Behavior

- `/account` email and OTP fields must retain visible labels or accessible names.
- OTP input remains numeric, six digits, and keyboard accessible.
- Status messages for send/verify/invite success or failure should be announced through an `aria-live` region when touched.
- Invite form remains usable on mobile with stacked email, role, and action controls.

## 7. Functional Requirements

| ID | Requirement | Priority | Acceptance signal |
|---|---|---|---|
| FR-1 | Supabase Auth in staging/production must send email OTP through Resend SMTP, not Supabase's default mailer. | P0 | Real non-team email receives OTP after `/account` request; Supabase Auth email logs show custom SMTP path/provider behavior. |
| FR-2 | Supabase Magic Link template must render a six-digit `{{ .Token }}` as the primary login method. | P0 | Received email contains a six-digit code usable in `/account`; code verifies with `verifyOtp({ type: "email" })`. |
| FR-3 | Workspace invites must continue to be app-level invites, not Supabase Auth Admin invites. | P0 | No `inviteUserByEmail` use; invite row exists before email send. |
| FR-4 | Workspace invite email links must use `REFRAME_APP_URL` in staging/production. | P0 | Smoke test invite body contains the configured app origin and never `localhost`, `127.0.0.1`, or an unintended preview origin. |
| FR-5 | App-owned invite and waitlist emails must send through Resend REST using server-only keys. | P0 | REST calls include server-side `Authorization: Bearer ...`; no Resend key appears in client bundles. |
| FR-6 | Invite email sends must remain idempotent per invite. | P0 | Retrying the same invite send uses `workspace-invite/{inviteId}` idempotency key. |
| FR-7 | Invite delivery state must be recorded after the email side effect. | P0 | `workspace_invites.delivery_status`, `delivery_email_id`, and `delivery_error` reflect sent/failed/skipped states. |
| FR-8 | Waitlist persistence must remain independent from notification email delivery. | P0 | Waitlist row persists even when Resend notification is unconfigured or fails. |
| FR-9 | Production runtime docs must list required env and dashboard settings without committing secrets. | P0 | Docs include Resend, Supabase SMTP, Auth template, and URL settings; `.env` files are untouched. |
| FR-10 | Real A/B RLS test setup must be executable after email configuration. | P0 | Users A and B can receive OTP, sign in, and run `docs/checks/account-checklist.md`. |
| FR-11 | Public self-serve launch must be gated on bot protection or equivalent durable abuse controls. | P1 | Launch checklist blocks public traffic until CAPTCHA/durable throttling is configured. |
| FR-12 | Production email smoke tests must fail closed on local origins. | P0 | QA script or automated test flags `localhost`, `127.0.0.1`, and empty `REFRAME_APP_URL` in non-local environments. |

## 8. Non-functional Requirements

| Category | Requirement | Target |
|---|---|---|
| Reliability | OTP and invite emails use production-grade provider configuration. | Supabase default mailer is not used outside local/team testing. |
| Deliverability | Transactional sending domain has SPF, DKIM, and DMARC. | Sample auth/invite emails pass SPF/DKIM/DMARC. |
| Security | Secrets stay server/dashboard only. | No Resend or Supabase service keys in client code, logs, or committed docs. |
| Privacy | Email analytics/logs avoid raw PII when not required. | App logs use coarse error codes; analytics omit raw email, tokens, OTP. |
| Abuse resistance | OTP/invite starts are throttled. | Existing app limits remain; public launch requires CAPTCHA/durable controls. |
| Performance | Invite creation remains responsive for pilot traffic. | Synchronous invite route returns in acceptable pilot latency; queue deferred. |
| Observability | Provider failures are visible. | Structured logs and DB delivery fields identify sent/failed/skipped state. |
| Accessibility | Account email flows remain operable by keyboard/screen reader. | Labels, focus, status messages, and disabled states are testable. |

## 9. Data, API, and Integration Contracts

### Data Model

| Entity | Fields | Owner | Validation | Retention |
|---|---|---|---|---|
| `workspace_invites` | `workspace_id`, `email_display`, `email_hash`, `role`, `token_hash`, `status`, `delivery_status`, `delivery_error`, `delivery_email_id`, `expires_at`, `accepted_by`, `accepted_at`, `revoked_at` | Account workspace SQL/RPCs | Role is `admin` or `member`; token/email hashes length checked; pending unique per workspace/email. | Keep for pilot support/audit until retention PRD. |
| `waitlist_signups` | Email, company URL, growth challenge, notification status/error/email ID | Waitlist backend | Existing waitlist validation and Supabase persistence. | Existing waitlist retention policy. |
| Supabase Auth user | Email identity, OTP/session state | Supabase Auth | OTP issued by Supabase; app verifies through Supabase client. | Supabase Auth retention/config. |
| Deployment config | `REFRAME_APP_URL`, Resend From addresses, Supabase URLs/keys | Ops | Non-empty production URL; no localhost in staging/prod. | Runtime secret/config only, not committed. |

### API Surface

| Endpoint/action | Input | Output | Auth | Failure behavior |
|---|---|---|---|---|
| `POST /api/reframe/auth/otp/start` | `{ email, mode, inviteToken?, returnTo? }` | `{ ok, nextStep, maskedEmail, resendAfterSeconds }` | Public + CSRF + app rate limits; invite mode uses service-role gate RPC only to validate token/email. | Generic 400/429/502/503; no account enumeration. |
| `POST /api/reframe/auth/verify` | `{ email, token, returnTo? }` | Session cookies plus account or project redirect payload | Public + CSRF + app rate limits; Supabase verifies OTP. | Generic invalid code; no workspace data until verified. |
| `POST /api/reframe/account/workspaces/:workspaceId/invites` | `{ email, role }` | `{ ok, invite, error? }` | Authenticated actor, owner/admin role, CSRF, rate limits. | App invite may be created while email send fails; response reports delivery error safely. |
| `POST /api/reframe/account/invites/accept` | `{ token }` | `{ ok, workspace, invite }` | Authenticated verified actor, CSRF, token/email match. | 403 mismatch/different user; 410 expired/revoked; no membership created. |
| `POST /api/waitlist` | Waitlist form payload | Public waitlist response | Public + waitlist validation/rate limit. | Persistence failure blocks; notification failure records failed/skipped side effect. |

### External Integrations

| Integration | Purpose | Auth | Webhooks/events | Rate limits/costs | Failure handling |
|---|---|---|---|---|---|
| Supabase Auth custom SMTP | Sends OTP emails. | Resend SMTP credentials configured in Supabase dashboard. | None in MVP. | Supabase imposes custom SMTP auth email rate limits; default starts low and must be reviewed. | OTP start returns generic failure if provider send fails. |
| Resend SMTP | Transport for Supabase Auth emails. | SMTP host `smtp.resend.com`, port `465`, username `resend`, password API key. | None in MVP. | Resend account/team limits apply. | Supabase Auth surfaces send error; app logs generic provider failure. |
| Resend REST API | App-owned workspace invite and waitlist notification emails. | Server-only Resend API key. | None in MVP. | Resend docs list rate/quota limits and plan pricing; verify dashboard before launch. | Invite records failed/skipped delivery; waitlist persists before notification side effect. |
| Resend Domains/DNS | Deliverability. | DNS control for sending domain. | DNS status in Resend dashboard. | No direct app cost; plan limits apply. | Launch blocks until SPF/DKIM verified and DMARC configured. |

### Migration / Backfill

- No database migration is required solely to configure Resend SMTP.
- No waitlist backfill.
- No account membership backfill beyond existing account repair RPC.
- Required production config changes happen in deployment env, Resend dashboard, and Supabase dashboard.
- Do not edit `.env` files in the repo.

## 10. AI/Automation Behavior

No AI behavior ships in this slice. Email routing, OTP verification, invite delivery, and RLS validation are deterministic system behavior.

## 11. Analytics and Success Metrics

### Product / Operational Metrics

| Metric | Definition | Target | Instrumentation |
|---|---|---|---|
| OTP send success | OTP start returns provider success and user receives email. | 100% in smoke tests; pilot baseline tracked. | Supabase Auth logs + app route status. |
| Invite link correctness | Invite email link origin equals `REFRAME_APP_URL`. | 100% in staging/prod smoke tests. | Test/manual email inspection. |
| Invite delivery success | `workspace_invites.delivery_status = sent`. | Track pilot baseline; investigate repeated failures. | DB field + route logs. |
| Waitlist notification persistence | Waitlist row persists regardless of notification side effect. | 100% persistence on valid submissions. | Supabase row + notification status. |
| RLS test readiness | User A/B can sign in with real emails and run checklist. | Checklist executable before pilot invites. | Manual QA record. |

### Required Events / Logs

| Event/log | Trigger | Properties | Privacy notes |
|---|---|---|---|
| `account_otp_start_failed` | Supabase Auth OTP start fails. | provider error name/status, mode | No raw email or OTP. |
| `workspace_invite_delivery_mark_failed` | Delivery state RPC fails. | coarse error code, invite id if internal-only | No raw token. |
| `workspace_invite_email_failed` | Resend invite send fails. | provider status/error class, invite id | No raw token; avoid raw email in analytics. |
| `waitlist_notification_failed` | Resend waitlist notification fails. | provider status/error class | Raw waitlist payload stays in DB, not analytics. |
| `email_smoke_test_failed` | Preflight detects bad origin/provider. | environment, bad origin category | No secrets. |

## 12. Edge Cases and Failure States

| Case | Expected behavior | User-facing copy/action |
|---|---|---|
| Supabase default mailer still active in production | Launch blocker; OTP smoke test fails for non-team email. | Internal only; do not expose pilot invites. |
| `REFRAME_APP_URL` missing in production | Invite smoke test fails; route should be treated as misconfigured. | "Workspace invites are not configured." |
| `REFRAME_APP_URL` set to localhost | Production smoke test fails before pilot. | Internal only. |
| Resend API key missing for invite send | App invite route returns 503 and records/returns safe config failure. | "Workspace invites are not configured." |
| Resend REST send fails after invite row creation | Keep invite pending with failed/skipped delivery; do not create membership. | "Invite was created, but the email could not be sent." |
| OTP email delayed | User can wait or request another code after resend window. | "Check your email for the six-digit code." |
| User opens old invite link | Acceptance rejects expired/revoked/accepted-by-different-user tokens. | "This invite is no longer active." |
| Wrong user accepts invite | Deny membership if verified email hash mismatches invite hash. | "This invite cannot be accepted from this account." |
| Provider rate limit hit | Return retryable generic error and log provider rate-limit class. | "Too many attempts. Try again shortly." |
| Email tracking rewrites auth links | Avoid link-primary auth; use code-first OTP template. | N/A for code entry. |

## 13. Security, Privacy, and Abuse Considerations

- **Sensitive data:** raw emails, OTPs, raw invite tokens, token hashes, email hashes, workspace names, membership roles.
- **Access control:** Supabase Auth remains identity provider; RLS stays based on Supabase user identity and workspace membership.
- **Secret handling:** Resend API keys and SMTP credentials live only in deployment/Supabase dashboards. They must never be prefixed `NEXT_PUBLIC_`.
- **Invite token handling:** raw token appears only in the invite URL and acceptance request. DB stores token hash only.
- **Email enumeration:** public OTP start and invite OTP gate keep generic responses.
- **Provider abuse:** OTP and invites can be abused to damage domain reputation. Public launch requires CAPTCHA/equivalent durable abuse controls beyond current in-memory buckets.
- **Domain reputation:** keep transactional auth/invite email separate from marketing; avoid promotional copy in OTP emails.
- **Logging:** do not log raw OTP, raw invite token, email body, or full raw email except where explicitly needed in provider payload.
- **RLS:** email deliverability does not replace RLS checks; account checklist remains mandatory.

## 14. Dependencies and Constraints

| Dependency/constraint | Impact | Owner | Status |
|---|---|---|---|
| Resend verified domain | Required before reliable production sending. | Ops | Needed. |
| Resend API key | Required for REST invite/waitlist and SMTP password. | Ops | Existing env likely present for waitlist; production scope must be reviewed. |
| Supabase Auth custom SMTP | Required for OTP emails to real users. | Ops/Engineering | Needed. |
| Supabase Auth templates | Required for six-digit OTP UX. | Product/Engineering | Needed. |
| `REFRAME_APP_URL` | Required for invite links. | Ops/Engineering | Missing/wrong value causes localhost links. |
| Existing account RLS SQL | Must remain source of authorization truth. | Engineering | Present in migration/checklist. |
| Existing app invite flow | Must stay app-level, not Auth Admin invite. | Engineering | Present. |
| No `.env` edits | Runtime changes happen outside repo. | Engineering/Ops | Required by AGENTS.md. |
| Mixed lockfiles | Do not install dependencies without approval. | Engineering | No dependency needed. |

### Runtime Configuration Contract

| Variable/setting | Required in | Purpose | Notes |
|---|---|---|---|
| `REFRAME_APP_URL` | Staging/production | Canonical account/invite origin. | Must not be localhost or preview unless environment is intentionally preview. |
| `RESEND_API_KEY` | Server runtime + Supabase SMTP password | Sends app emails and/or Auth SMTP. | Prefer sending-restricted/domain-scoped key where possible. |
| `REFRAME_INVITE_EMAIL_FROM` | Server runtime | From address for workspace invites. | Use verified transactional domain. |
| `WAITLIST_NOTIFICATION_FROM` | Server runtime | From address for internal waitlist notifications. | Existing waitlist path. |
| `WAITLIST_NOTIFICATION_TO` | Server runtime | Waitlist notification recipients. | Existing waitlist path. |
| Supabase Auth SMTP settings | Supabase dashboard | OTP email delivery. | Host `smtp.resend.com`, port `465`, username `resend`. |
| Supabase Site URL / Redirect URLs | Supabase dashboard | Auth URL safety. | Must include production `/account` origin and approved staging origins. |
| Supabase Magic Link template | Supabase dashboard | OTP code content. | Include `{{ .Token }}`; avoid marketing copy. |

## 15. Rollout, Migration, and Rollback

- **Rollout:** Configure and verify staging first, then production. Do not send pilot invites until OTP, invite, DNS, and RLS smoke checks pass.
- **Migration:** No DB migration required for this slice. Existing migrations must already be applied for account/invite RLS.
- **Rollback:** Disable or hide invite UI/endpoints and revert Supabase Auth SMTP to the prior provider if Resend delivery is broken. Keep app-level invite rows; pending invites can expire or be revoked.
- **Support/Ops:** Monitor Supabase Auth email failures, Resend logs, `workspace_invites.delivery_status`, waitlist notification failures, 401/403/429 route rates, and RLS denial logs.

## 16. Acceptance Criteria

The feature is ready to ship when:

- [ ] Resend domain/subdomain is verified with SPF and DKIM.
- [ ] DMARC exists for the transactional sending domain with at least a monitoring policy.
- [ ] Supabase Auth custom SMTP is configured with Resend in staging and production.
- [ ] Supabase Magic Link template includes a six-digit `{{ .Token }}` as the primary auth code.
- [ ] A real non-team email can receive an OTP from `/account` and complete sign-in.
- [ ] A workspace owner/admin can send an invite email from `/account`.
- [ ] The received invite email link starts with the configured `REFRAME_APP_URL` and does not include localhost in staging/production.
- [ ] Invite email send uses Resend REST with an idempotency key based on `inviteId`.
- [ ] Invite acceptance still requires OTP-verified matching email and creates exactly one membership.
- [ ] Waitlist submission still persists when Resend notification is missing or fails.
- [ ] Runtime docs/checklist identify all required env and dashboard settings without committing secrets.
- [ ] Static review shows no `inviteUserByEmail`, `signInWithPassword`, or service-role ordinary account reads in account/invite flows.
- [ ] RLS A/B checklist can be run with two real accounts after email setup.
- [ ] `/demo` has no diff.

## 17. QA / Validation Plan

| Test | Type | Owner | Pass criteria |
|---|---|---|---|
| Supabase SMTP config smoke | Manual dashboard + real email | Ops/Engineering | Non-team real email receives OTP through configured sender. |
| OTP verify | Manual + route tests | Engineering | Valid six-digit code establishes session and loads `/account`. |
| Invite URL origin | Unit/manual email inspection | Engineering | Invite body contains `REFRAME_APP_URL/account?invite=` and no localhost. |
| Invite delivery state | Route/unit/manual | Engineering | Sent/failed/skipped status recorded correctly. |
| Invite acceptance | Manual + route tests | Engineering | Matching email succeeds once; mismatched/expired/revoked/reused fail. |
| Waitlist notification | Existing route/unit/manual | Engineering | Persistence succeeds before notification side effect. |
| Service-role static review | Static grep | Engineering | No forbidden auth/admin patterns in account/invite reads. |
| RLS A/B matrix | Manual SQL/API | Engineering | Account checklist passes for anon, A/B, roles, field filtering, invite failures. |
| Deliverability | Manual provider/email headers | Ops | SPF, DKIM, DMARC pass on sample OTP and invite messages. |
| Typecheck/tests for touched code | Static/unit | Engineering | `npm run typecheck` and focused tests pass if implementation touches TS. |

### Manual QA Script

1. Confirm Supabase project has Resend SMTP enabled.
2. Confirm Magic Link template shows a six-digit OTP code.
3. In staging, open `/account` signed out.
4. Request OTP for `you+reframe-a@domain.com`.
5. Confirm email arrives from the verified sender and code works.
6. Sign in as owner A and create/send invite to `you+reframe-b@domain.com`.
7. Inspect email link and confirm origin equals `REFRAME_APP_URL`.
8. Open invite in separate browser profile, request OTP, verify as B, and accept.
9. Confirm B is a member and cannot see pending invites.
10. Run cross-workspace denial checks from `docs/checks/account-checklist.md`.
11. Submit waitlist form and confirm row persistence plus notification state.

## 18. Risks and Open Questions

### Risks

| Risk | Severity | Mitigation | Decision needed? |
|---|---|---|---|
| Invite links continue pointing to localhost | High | Require `REFRAME_APP_URL`; add smoke check that fails on local origins. | Need canonical URL. |
| Supabase default mailer remains active | High | Configure Resend SMTP before A/B or pilot testing. | No. |
| Operators expect app code to control OTP send | High | Document OTP provider is Supabase dashboard config; app only starts/verifies OTP. | No. |
| Resend account/domain not ready | High | Verify domain and sender before exposing invite UI to pilots. | Need domain choice. |
| Shared Resend API key blast radius | Medium | Use sending-restricted/domain-scoped API keys where possible. | Maybe. |
| Current in-memory rate limits are insufficient for public launch | Medium | Keep pilot limited; gate public self-serve on CAPTCHA/durable throttling. | Yes before public launch. |
| Email copy hurts deliverability | Medium | Keep auth emails short, transactional, no promotional claims. | No. |
| Provider outage blocks OTP | Medium | Manual rollback/provider change; failover deferred. | No for MVP. |

### Open Questions

| Question | Why it matters | Default assumption | Owner |
|---|---|---|---|
| What is the exact production `REFRAME_APP_URL`? | Invite links and Supabase Auth redirect URLs depend on it. | Use the canonical deployed app origin, not landing-only domain. | Product/Ops |
| Which transactional sending domain should be verified? | DNS/domain choice affects deliverability and From addresses. | Use a subdomain such as `mail.<domain>` or `auth.<domain>`. | Product/Ops |
| Should app REST sends and Supabase SMTP use separate Resend API keys? | Separate keys reduce blast radius and simplify revocation. | Use separate sending-restricted keys if Resend account plan supports it cleanly. | Engineering/Ops |
| Can preview deployments send real emails? | Prevents accidental invites from unapproved origins. | Only staging and production send real email; local uses explicit test env. | Engineering/Ops |
| Is public self-serve signup imminent? | Determines whether CAPTCHA/durable throttling is P0 or launch gate. | Not public until RLS/email smoke tests pass. | Product |

## 19. Sources and Fact-check Notes

| Claim/assumption | Source | Date accessed | Confidence |
|---|---|---|---|
| Supabase default Auth SMTP is not production, may only send to pre-authorized team addresses, and currently has a very small limit. | Supabase custom SMTP docs: https://supabase.com/docs/guides/auth/auth-smtp | 2026-05-07 | High |
| Supabase Auth works with custom SMTP providers including Resend. | Supabase custom SMTP docs: https://supabase.com/docs/guides/auth/auth-smtp | 2026-05-07 | High |
| Resend Supabase SMTP settings are host `smtp.resend.com`, port `465`, username `resend`, password API key. | Resend Supabase SMTP guide: https://resend.com/docs/send-with-supabase-smtp | 2026-05-07 | High |
| Supabase email OTP uses Magic Link template with `{{ .Token }}` and `verifyOtp` can verify code. | Supabase passwordless email docs: https://supabase.com/docs/guides/auth/auth-email-passwordless and email template docs: https://supabase.com/docs/guides/auth/auth-email-templates | 2026-05-07 | High |
| Supabase warns email tracking can break auth links; code-first OTP avoids link prefetch/tracking issues. | Supabase email template docs: https://supabase.com/docs/guides/auth/auth-email-templates | 2026-05-07 | High |
| Resend requires verified domain and provides SPF/DKIM domain setup. | Resend domain docs: https://resend.com/docs/dashboard/domains/introduction | 2026-05-07 | High |
| DMARC should be configured after SPF/DKIM; monitoring policy can start at `p=none`. | Resend DMARC docs: https://resend.com/docs/dashboard/domains/dmarc | 2026-05-07 | High |
| Resend supports idempotency keys on `POST /emails`. | Resend idempotency docs: https://resend.com/docs/dashboard/emails/idempotency-keys | 2026-05-07 | High |
| Resend rate limits and quotas are team/account dependent and should be checked in the dashboard before launch. | Resend usage limits docs: https://resend.com/docs/api-reference/rate-limit | 2026-05-07 | High |
| Resend free/pro pricing and monthly volume can materially affect public launch cost. | Resend pricing: https://resend.com/pricing | 2026-05-07 | Medium; pricing can change. |
| Current repo invite emails use Resend REST and `REFRAME_APP_URL` first. | `lib/reframe/account/email.ts` | 2026-05-07 | High |
| Current OTP routes start/verify Supabase Auth OTP and do not send OTP email themselves. | `app/api/reframe/auth/otp/start/route.ts`, `app/api/reframe/auth/verify/route.ts` | 2026-05-07 | High |
| Current waitlist path persists Supabase row before Resend notification side effect. | `lib/waitlist/submit.ts` | 2026-05-07 | High |
| Account RLS/manual A/B validation is required before pilot invites. | `docs/checks/account-checklist.md` | 2026-05-07 | High |

## Appendix: Self-review

### Pass 1: Engineering / Integration

- Confirmed OTP send is controlled by Supabase Auth config, not app email code.
- Confirmed workspace invites already use Resend REST and app-level `workspace_invites`.
- Confirmed localhost-link fix belongs to runtime URL config and smoke testing, with optional production-strict code follow-up.
- Critical gate: data/API/integration contracts included.

### Pass 2: Product / UX / Scope

- Kept feature atomic: production transactional email readiness for account/invite/waitlist, not all account management.
- Excluded Clerk, email queue, marketing email, template redesign, and webhooks.
- Included user-visible states for OTP, invite, provider failures, and permission-denied behavior.
- Critical gate: non-goals and UI states included.

### Pass 3: Security / QA / Operations

- Verified secrets remain dashboard/server-only and `.env` edits are out of scope.
- Preserved app-level invite source of truth and RLS checklist.
- Added deliverability, SPF/DKIM/DMARC, rate limit, and bot-abuse constraints.
- Critical gate: acceptance criteria and validation plan are testable.

### Rubric Score

| Area | Score |
|---|---:|
| BLUF clarity | 10/10 |
| Atomic scope | 10/10 |
| User/problem clarity | 9/10 |
| Functional requirements | 10/10 |
| UI/UX flow | 9/10 |
| Technical contracts | 15/15 |
| AI/integration rigor | 10/10 |
| Metrics and analytics | 6/7 |
| Risk and security | 8/8 |
| Acceptance and QA | 10/10 |
| **Total** | **97/100** |

## Appendix: Changelog

| Date | Change | Author |
|---|---|---|
| 2026-05-07 | Initial PRD drafted from repo audit and Resend/Supabase research. | Codex |
