# Supabase Migration Map

## Folder

- SQL migrations now live in `supabase/migrations/*.sql`.
- Static docs, runbooks, and checklists stay in `docs/*.md`.

## Runtime Order

Run these in Supabase SQL editor or your migration runner in this order:

1. `0001_intake-auth-handoff-supabase.sql`
2. `0002_account-workspace-management-supabase.sql`
3. `0003_waitlist-resend-supabase.sql`

## Upgrade Notes

- If your project already has tables from intake-auth handoff, migration `0002_account-workspace-management-supabase.sql` includes compatibility additions for `public.profiles` (`avatar_url`, `active_workspace_id`).
- If this project is new, running `0001` then `0002` is sufficient for the `/account` and workspace-management schema layer.
- `0003_waitlist-resend-supabase.sql` is independent and can be run after the above or anytime before waitlist routes are enabled.

## Related Docs

- [account-workspace-management-runtime.md](./account-workspace-management-runtime.md)
- [account-workspace-management-db-rls-checklist.md](./account-workspace-management-db-rls-checklist.md)
- [intake-auth-handoff-db-rls-checklist.md](./intake-auth-handoff-db-rls-checklist.md)
- [waitlist-resend-supabase.md](./waitlist-resend-supabase.md)
