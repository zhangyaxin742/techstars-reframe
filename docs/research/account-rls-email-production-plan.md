# Account RLS Testing And Production Email Plan

Accessed: 2026-05-07

## BLUF

Use Supabase Auth OTP for the current MVP because the repo's RLS policies depend on Supabase `auth.uid()` and cookie-aware server clients. For testing, create two real reachable email accounts and exercise the `/account` UI plus the manual RLS matrix. For production email, move Supabase Auth OTP delivery off the default Supabase mailer and onto custom SMTP, preferably through the same transactional provider already used for workspace invite delivery.

## Current Repo Constraints

- `/account` already has email OTP UI through `components/account/account-page-client.tsx`.
- OTP start uses `supabase.auth.signInWithOtp`.
- OTP verify uses `supabase.auth.verifyOtp`, then calls `public.ensure_account_workspace`.
- Account/workspace RLS is defined in `supabase/migrations/0002_account-workspace-management-supabase.sql`.
- The RLS checklist is manual because the repo does not include a live Supabase DB test harness.
- Workspace invite delivery is already implemented as app-level email through `lib/reframe/account/email.ts`.

## RLS Test Setup

1. Apply `0001_intake-auth-handoff-supabase.sql`, then `0002_account-workspace-management-supabase.sql`.
2. Configure required runtime secrets outside git.
3. Configure Supabase Auth email OTP template to include the six-digit `{{ .Token }}`.
4. Use two real reachable emails:
   - User A: `you+reframe-a@example.com`
   - User B: `you+reframe-b@example.com`
5. Open `/account` in two separate browser profiles or incognito windows.
6. Sign in A and B through email OTP.
7. Confirm each account gets a profile, default workspace, and owner membership.
8. Record workspace A ID and workspace B ID from `GET /api/reframe/account` or Supabase dashboard.

## Required Manual RLS Matrix

- Anon requests cannot read or mutate `profiles`, `workspaces`, `workspace_memberships`, or `workspace_invites`.
- User A cannot read workspace B, workspace B memberships, workspace B pending invites, or set `profiles.active_workspace_id` to workspace B.
- User B cannot perform the inverse against workspace A.
- A regular member cannot create or revoke invites.
- Owner/admin can create `admin` and `member` invites, but cannot create `owner` invites.
- Regular members do not receive pending invites or member email addresses in `GET /api/reframe/account`.
- Invite acceptance rejects mismatched email, expired token, revoked token, and reused token by a different user.

## Production Email Recommendation

Use two lanes:

1. Supabase Auth OTP email: configure Supabase custom SMTP.
2. Workspace invite email: keep app-level Resend delivery because `workspace_invites` is the application source of truth.

Resend is the lowest-friction SMTP choice for this repo because app-level invite delivery already uses Resend semantics. AWS SES or Postmark are acceptable alternatives if deliverability operations prefer them.

## Production Setup Checklist

- Verify a dedicated auth sending domain or subdomain, for example `auth.reframe.example`.
- Configure SPF, DKIM, and DMARC for that sending domain.
- Configure Supabase Auth custom SMTP with:
  - SMTP host
  - SMTP port
  - SMTP user
  - SMTP password
  - sender name
  - default From address, for example `Reframe <no-reply@auth.reframe.example>`
- Configure Supabase Auth Site URL and Redirect URLs for production `/account` and invite acceptance paths.
- Configure the Magic Link / OTP email template to show `{{ .Token }}` clearly.
- Disable tracking/link rewriting for Auth emails.
- Keep marketing email on a separate domain/provider path from auth email.
- Set or review Supabase Auth OTP and email rate limits.
- Add CAPTCHA or equivalent bot defense before public self-serve signup.
- Keep app-level throttles around OTP start, OTP verify, invite creation, and invite acceptance.

## Validation Plan

- Send OTP to user A and B real emails and complete `/account` sign-in.
- Refresh `/account`; confirm session persists and no duplicate workspace rows are created.
- Run `docs/checks/account-checklist.md` privilege, policy, function, RLS, and API field checks.
- Invite a third real email as `member`, accept it, and confirm member field filtering.
- Attempt all cross-workspace mutation/read denials from the checklist.
- Confirm Auth OTP and invite emails arrive from the expected domains and pass SPF/DKIM/DMARC.

## Sources

- Supabase custom SMTP docs, https://supabase.com/docs/guides/auth/auth-smtp, accessed 2026-05-07.
- Supabase passwordless email OTP docs, https://supabase.com/docs/guides/auth/auth-email-passwordless, accessed 2026-05-07.
- Supabase email templates docs, https://supabase.com/docs/guides/auth/auth-email-templates, accessed 2026-05-07.
- Supabase Auth rate limits docs, https://supabase.com/docs/guides/auth/rate-limits, accessed 2026-05-07.
- Supabase production checklist, https://supabase.com/docs/guides/deployment/going-into-prod, accessed 2026-05-07.
- Resend Supabase guide, https://resend.com/docs/knowledge-base/getting-started-with-resend-and-supabase, accessed 2026-05-07.
