# Intake Auth Handoff DB/RLS Checklist

Use this checklist after running [intake-auth-handoff-supabase.sql](/C:/Users/user/Documents/GitHub/techstars-reframe/docs/intake-auth-handoff-supabase.sql:1) in Supabase. It exists because this repo does not yet include a local Supabase test harness.

## Privilege Review

- Confirm `anon` has no table privileges on `profiles`, `workspaces`, `workspace_memberships`, `intake_drafts`, or `projects`.
- Confirm `authenticated` has `select` only on `profiles`, `workspaces`, `workspace_memberships`, and `projects`.
- Confirm `authenticated` has no direct privileges on `intake_drafts`.
- Confirm no direct `insert`, `update`, or `delete` grants exist for `authenticated` on any intake auth handoff table.
- Confirm `public.claim_intake_draft(text, text, text, text)` has execute granted to `authenticated` only.
- Confirm execute is revoked from `public`, `anon`, and `authenticated` on `security.claim_intake_draft(text, text, text, text)`.

Suggested inspection query:

```sql
select table_schema, table_name, grantee, privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name in (
    'profiles',
    'workspaces',
    'workspace_memberships',
    'intake_drafts',
    'projects'
  )
order by table_name, grantee, privilege_type;
```

## Policy Review

- `profiles` select policy must be `id = auth.uid()`.
- `workspace_memberships` select policy must be `user_id = auth.uid()` and must not query `workspace_memberships` recursively.
- `workspaces` and `projects` may use `security.is_workspace_member(...)`.
- `intake_drafts` must have no direct anon/authenticated access policy in this slice.
- No insert/update/delete policy should exist on `profiles`, `workspaces`, `workspace_memberships`, `intake_drafts`, or `projects`.

Suggested inspection query:

```sql
select schemaname, tablename, policyname, cmd, roles, qual, with_check
from pg_policies
where schemaname = 'public'
  and tablename in (
    'profiles',
    'workspaces',
    'workspace_memberships',
    'intake_drafts',
    'projects'
  )
order by tablename, policyname;
```

## Function Hardening Review

- `security.is_workspace_member` and both `claim_intake_draft` functions must have explicit `search_path`.
- `security.claim_intake_draft` and `public.claim_intake_draft` must be `security definer`.
- All table/function references inside `claim_intake_draft` must be schema-qualified.

Suggested inspection query:

```sql
select
  n.nspname as schema_name,
  p.proname as function_name,
  p.prosecdef as security_definer,
  p.proconfig as function_config
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname in ('public', 'security')
  and p.proname in ('is_workspace_member', 'claim_intake_draft')
order by schema_name, function_name;
```

## Claim Idempotency Checks

- Create one verified Supabase Auth user and one unclaimed `intake_drafts` row with a server-computed `token_hash`.
- Call `public.claim_intake_draft(...)` twice as that authenticated user with the same token hash.
- Expected result: both calls return the same `workspace_slug` and `project_slug`.
- Expected row counts: one `profiles` row for the user, one default owner membership if no prior workspace exists, one `projects` row for the draft, and one `intake_drafts` row with `status = 'claimed'`.
- Repeat with an already-claimed draft and the same user.
- Expected result: RPC returns the existing project with `reused_existing_project = true`.

## Cross-Workspace Denial Checks

- Create or claim separate drafts for User A and User B.
- As User A, selecting User B's `profiles` row must return zero rows.
- As User A, selecting User B's `workspace_memberships` row must return zero rows.
- As User A, selecting User B's workspace must return zero rows.
- As User A, selecting User B's project must return zero rows.
- As User B, repeat the inverse checks against User A data.

## Conflict And Expiry Checks

- Claim a draft as User A, then call `public.claim_intake_draft(...)` with the same token hash as User B.
- Expected result: generic `intake_draft_claim_conflict` error; no owner identity is exposed.
- Create an expired draft and call `public.claim_intake_draft(...)`.
- Expected result: generic `intake_draft_expired` error, draft status becomes `expired`, and no project row is created.
