# Resend Primary Email Provider Research

Accessed: 2026-05-07

## BLUF

Use Resend as Reframe's primary transactional email provider, but split transport by surface: Supabase Auth OTP emails should go through Resend SMTP configured in Supabase Auth, while application-owned emails such as workspace invites and waitlist notifications should continue using the Resend REST API. The current localhost invite-link problem is most likely a missing or incorrect `REFRAME_APP_URL`, not a missing Resend integration.

## Recommendation

Ship now.

- Configure Resend SMTP in Supabase for Auth OTP and magic-link-style emails.
- Keep workspace invites on the app-level Resend API path because the repo already creates `workspace_invites` first, sends with a Resend idempotency key, and records delivery state.
- Set `REFRAME_APP_URL` in production to the canonical app origin, for example `https://app.reframe.example`, so invite links stop pointing to localhost.
- Use one verified transactional sending domain or subdomain for auth and app emails, for example `auth.reframe.example` or `mail.reframe.example`.
- Keep marketing/broadcast email separate from product/auth email.

## Current Repo Constraints

- Waitlist notification email already uses Resend REST at `https://api.resend.com/emails` in `lib/waitlist/submit.ts`.
- Workspace invite email already uses Resend REST in `lib/reframe/account/email.ts`.
- Workspace invite URLs are built as:
  - `REFRAME_APP_URL`
  - else `NEXT_PUBLIC_APP_URL`
  - else `NEXT_PUBLIC_SITE_URL`
- Workspace invite email requires:
  - `RESEND_API_KEY`
  - `REFRAME_INVITE_EMAIL_FROM`
  - `REFRAME_APP_URL`
- Supabase Auth OTP sending is not controlled by app code. It is controlled by Supabase Auth email provider settings.
- Supabase Auth routes in app code call `signInWithOtp` and `verifyOtp`; they do not send OTP email directly.
- Do not edit `.env` files in this repo. Production env changes must be made in the deployment provider and Supabase dashboard.

## Verified External Findings

### Supabase Auth Email

Supabase Auth requires a custom SMTP server for production email delivery. Its default SMTP server is for demos/testing, may only send to pre-authorized organization/team addresses, currently has a very small send limit, and has no delivery SLA.

Supabase custom SMTP works with SMTP providers including Resend. Required settings are SMTP host, port, user, password, sender name, and default From address.

Supabase email OTP uses the Magic Link template. To send a six-digit code, the template must include `{{ .Token }}`. Supabase documents the code-based `verifyOtp({ email, token, type: "email" })` flow and warns that link tracking can break auth links.

### Resend SMTP

Resend's Supabase SMTP guide lists:

- Host: `smtp.resend.com`
- Port: `465`
- Username: `resend`
- Password: Resend API key

Resend requires an API key and a verified sending domain before production sending.

### Resend REST API

The app-owned email path should continue using Resend REST because it supports:

- HTTPS API delivery from route/server code.
- Sending-access API keys.
- Idempotency keys on `POST /emails`.
- Response email IDs for delivery state.
- Straightforward structured error handling.

The existing invite flow already uses `Idempotency-Key: workspace-invite/{inviteId}` and records `delivery_status`, `delivery_error`, and `delivery_email_id` through `mark_workspace_invite_delivery`.

### Resend Limits And Cost

Current Resend docs state a default team rate limit of 5 requests per second in the rate-limit page, while another API reference page says 2 requests per second. Treat this as plan/account-specific and verify the team's Settings Usage page before public launch.

Free transactional sending is currently documented as 100 emails/day and 3,000 emails/month. Pro is listed at $20/month for 50,000 emails/month with paid overages. Pricing can change, so confirm in the Resend dashboard before committing launch volume.

## MVP Scope

- Production Supabase Auth OTP email through Resend SMTP.
- Production workspace invite email through existing Resend REST API.
- Production waitlist notification through existing Resend REST API.
- Correct production origin for invite links.
- Runtime docs and a smoke-test checklist.

## Non-Goals

- No Clerk migration.
- No Supabase Auth Admin invite flow.
- No marketing/broadcast email platform migration.
- No new email queue until usage approaches Resend request limits or retries need durability.
- No new npm dependency is required; existing server `fetch` is enough.

## Architecture Plan

### Lane 1: Supabase Auth OTP

Configure Supabase Auth custom SMTP:

- SMTP host: `smtp.resend.com`
- SMTP port: `465`
- SMTP user: `resend`
- SMTP password: Resend sending API key
- Sender name: `Reframe`
- Sender email: `no-reply@<verified-transactional-domain>`

Configure Auth templates:

- Magic Link template subject: `Your Reframe sign-in code`
- Magic Link template body includes `{{ .Token }}` as the primary code.
- Keep any link secondary or omit it for the current code-entry UI.
- Disable provider-side link tracking for auth messages.

Configure Auth URL settings:

- Site URL: production app origin.
- Redirect allow list includes production `/account` and any deployed preview/staging origins used for QA.

### Lane 2: Workspace Invites

Keep app-owned invite email in `lib/reframe/account/email.ts`.

Required production env:

- `RESEND_API_KEY`
- `REFRAME_INVITE_EMAIL_FROM`
- `REFRAME_APP_URL`
- `REFRAME_INVITE_TOKEN_SECRET`
- `REFRAME_EMAIL_HASH_SECRET`

Set `REFRAME_APP_URL` to the canonical deployed app URL. This directly fixes invite links that currently point to localhost.

### Lane 3: Waitlist Notification

Keep existing waitlist notification path in `lib/waitlist/submit.ts`.

Required production env:

- `RESEND_API_KEY`
- `WAITLIST_NOTIFICATION_FROM`
- `WAITLIST_NOTIFICATION_TO`
- optional `WAITLIST_NOTIFICATION_REPLY_TO`

## DNS And Deliverability Plan

- Verify a dedicated transactional subdomain in Resend, for example `mail.reframe.example`.
- Add Resend-provided SPF and DKIM records.
- Add DMARC at `_dmarc.<domain>` with `p=none` first, then tighten after monitoring.
- Use a stable From address for auth, for example `Reframe <no-reply@mail.reframe.example>`.
- Use a stable From address for invites, for example `Reframe <invites@mail.reframe.example>`.
- Do not use the same domain reputation path for marketing blasts and auth OTP.
- Watch bounces/spam complaints and suppress known-bad addresses before repeated sends.

## Implementation Steps

1. In Resend, verify the chosen transactional domain or subdomain.
2. Create one sending-restricted API key for app emails.
3. Create or reuse a Resend API key for Supabase SMTP.
4. In Supabase Dashboard, configure Auth custom SMTP with Resend.
5. In Supabase Dashboard, update the Magic Link template to include `{{ .Token }}`.
6. In deployment env, set `REFRAME_APP_URL` to the production origin.
7. In deployment env, set invite/waitlist Resend From addresses.
8. Send OTP to a real account and complete `/account` sign-in.
9. Send a workspace invite and verify the link origin is production, not localhost.
10. Run the RLS checklist with real users A and B.

## Validation Plan

- OTP smoke test: signed-out user opens `/account`, receives Resend-delivered OTP, verifies code, and gets a Supabase cookie session.
- Invite smoke test: owner sends invite, email arrives from the verified domain, link points to `REFRAME_APP_URL/account?invite=...`, invitee completes OTP and accepts.
- Waitlist smoke test: waitlist submission persists before email side effect and sends notification when configured.
- Deliverability check: sample messages pass SPF, DKIM, and DMARC.
- Rate-limit check: confirm Resend Usage page limit before public traffic.
- RLS check: run `docs/checks/account-checklist.md` with real A/B accounts.

## Risks And Mitigations

| Risk | Severity | Mitigation |
| --- | --- | --- |
| Invite links point to localhost | High | Set `REFRAME_APP_URL` in every non-local environment and add an env smoke test. |
| Supabase default mailer blocks user OTP | High | Configure Resend SMTP before real A/B testing or production. |
| Auth links break due to tracking | Medium | Use OTP code-first template and disable link tracking for auth emails. |
| Duplicate invites sent on retry | Medium | Keep Resend idempotency key per `inviteId`; app already does this. |
| Email provider rate limits | Medium | Add queue/backoff before high-volume launch; current pilot can stay synchronous. |
| Secret overexposure | High | Use sending-restricted API keys where possible; never expose Resend keys to client code. |
| Domain reputation damage | Medium | Separate transactional and marketing domains; monitor bounces/spam. |

## Open Questions

- What is the canonical production app URL for `REFRAME_APP_URL`?
- Which domain/subdomain should carry transactional email reputation?
- Are preview deployments allowed to send real OTP/invites, or should only staging/production send email?
- Should waitlist notifications and product auth/invites share one Resend team/API key or use separate keys for blast-radius control?

## Sources

- Supabase custom SMTP docs, https://supabase.com/docs/guides/auth/auth-smtp, accessed 2026-05-07.
- Supabase passwordless email OTP docs, https://supabase.com/docs/guides/auth/auth-email-passwordless, accessed 2026-05-07.
- Supabase email templates docs, https://supabase.com/docs/guides/auth/auth-email-templates, accessed 2026-05-07.
- Supabase Resend integration page, https://supabase.com/partners/integrations/resend, accessed 2026-05-07.
- Resend Supabase SMTP guide, https://resend.com/docs/send-with-supabase-smtp, accessed 2026-05-07.
- Resend Supabase guide, https://resend.com/docs/knowledge-base/getting-started-with-resend-and-supabase, accessed 2026-05-07.
- Resend domain docs, https://resend.com/docs/dashboard/domains/introduction, accessed 2026-05-07.
- Resend DMARC docs, https://resend.com/docs/dashboard/domains/dmarc, accessed 2026-05-07.
- Resend usage limits docs, https://resend.com/docs/api-reference/rate-limit, accessed 2026-05-07.
- Resend account quotas and limits, https://resend.com/docs/knowledge-base/account-quotas-and-limits, accessed 2026-05-07.
- Resend idempotency keys docs, https://resend.com/docs/dashboard/emails/idempotency-keys, accessed 2026-05-07.
- Resend API key docs, https://resend.com/docs/dashboard/api-keys/introduction, accessed 2026-05-07.
- Resend pricing, https://resend.com/pricing, accessed 2026-05-07.
