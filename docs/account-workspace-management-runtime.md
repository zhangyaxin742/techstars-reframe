# Account Workspace Management Runtime Notes

## SQL

Apply [`0002_account-workspace-management-supabase.sql`](../supabase/migrations/0002_account-workspace-management-supabase.sql) before enabling `/account`.

Then execute the RLS matrix in `docs/account-workspace-management-db-rls-checklist.md`.

## Required Runtime Environment

Do not commit these values.

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `REFRAME_CSRF_SECRET`
- `REFRAME_EMAIL_HASH_SECRET`
- `REFRAME_INVITE_TOKEN_SECRET`
- `RESEND_API_KEY`
- `REFRAME_INVITE_EMAIL_FROM`
- `REFRAME_APP_URL`

Account email hashes and invite token hashes require dedicated `REFRAME_*` secrets. Do not reuse `SUPABASE_SERVICE_ROLE_KEY` for account/workspace token material.

## Auth

`/account` uses Supabase email OTP only.

Do not add password fields, password reset, email/password signup, or Supabase Auth Admin invites for this surface.

## Service Role

Account and workspace routes use the normal Supabase server/route client and validated `getClaims()` actor identity.

Do not use the service-role client for account payload reads, member list reads, active workspace switching, user-scoped profile updates, app-level invite acceptance, or ordinary workspace mutations.

The pre-auth invite OTP gate is the narrow exception: `/api/reframe/auth/otp/start` validates CSRF, request shape, email hash, invite-token hash, and rate limits, then calls `resolve_workspace_invite_for_otp` with the server-only service-role key. That RPC is not executable by `anon` or `authenticated`, so clients cannot call it directly.

Any future service-role operation must first authenticate the requester with the normal server Supabase client, derive the actor user ID, verify workspace membership/role, and only then perform the service-role operation.

## Invite Lifecycle

Workspace invites are application-level rows in `workspace_invites`.

The route creates or reissues the app-level invite row first, then sends email through Resend, then records delivery status with `mark_workspace_invite_delivery`.

Invite acceptance requires an authenticated Supabase user. `accept_workspace_invite` compares the verified auth email hash to the invite email hash before creating membership.
