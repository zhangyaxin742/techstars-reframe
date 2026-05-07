# Account Workspace Management Runtime Notes

## SQL

Apply `docs/account-workspace-management-supabase.sql` before enabling `/account`.

Then execute the RLS matrix in `docs/account-workspace-management-db-rls-checklist.md`.

## Required Runtime Environment

Do not commit these values.

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `REFRAME_CSRF_SECRET`
- `REFRAME_EMAIL_HASH_SECRET`
- `REFRAME_INVITE_TOKEN_SECRET`
- `RESEND_API_KEY`
- `REFRAME_INVITE_EMAIL_FROM`
- `REFRAME_APP_URL`

Fallbacks exist for some secrets during local setup, but production should use dedicated `REFRAME_*` secrets instead of relying on `SUPABASE_SERVICE_ROLE_KEY`.

## Auth

`/account` uses Supabase email OTP only.

Do not add password fields, password reset, email/password signup, or Supabase Auth Admin invites for this surface.

## Service Role

Account and workspace routes use the normal Supabase server/route client and validated `getClaims()` actor identity.

Do not use the service-role client for account payload reads, member list reads, active workspace switching, user-scoped profile updates, app-level invite acceptance, or ordinary workspace mutations.

Any future service-role operation must first authenticate the requester with the normal server Supabase client, derive the actor user ID, verify workspace membership/role, and only then perform the service-role operation.

## Invite Lifecycle

Workspace invites are application-level rows in `workspace_invites`.

The route creates or reissues the app-level invite row first, then sends email through Resend, then records delivery status with `mark_workspace_invite_delivery`.

Invite acceptance requires an authenticated Supabase user. `accept_workspace_invite` compares the verified auth email hash to the invite email hash before creating membership.
