# Account Workspace Management DB/RLS Checklist

Use this checklist after running [account-workspace-management-supabase.sql](/C:/Users/user/Documents/GitHub/techstars-reframe/docs/account-workspace-management-supabase.sql:1) in Supabase. This repo does not currently include a local Supabase test harness, so these checks are the required manual SQL matrix until automated DB tests exist.

## Privilege Review

- Confirm `anon` has no table privileges on `profiles`, `workspaces`, `workspace_memberships`, or `workspace_invites`.
- Confirm `authenticated` has `select` only on `workspaces`, `workspace_memberships`, and `workspace_invites`.
- Confirm `authenticated` has `select` plus column-scoped `update(display_name, avatar_url, active_workspace_id)` on `profiles`.
- Confirm `authenticated` has no direct `insert`, `delete`, or broad table-level `update` privileges on any account/workspace table.
- Confirm account creation/repair, workspace creation, invite creation, delivery marking, revoke, and accept are exposed only through explicit RPCs.
- Confirm no Supabase Auth Admin invite state is referenced by SQL or policies.

Suggested inspection query:

```sql
select table_schema, table_name, grantee, privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name in (
    'profiles',
    'workspaces',
    'workspace_memberships',
    'workspace_invites'
  )
order by table_name, grantee, privilege_type;
```

## Policy Review

- `profiles` select policy must be `id = auth.uid()`.
- `profiles` update policy must require `id = auth.uid()` and validate `active_workspace_id` membership.
- `workspaces` select policy must require workspace membership.
- `workspace_memberships` select policy must require workspace membership through a non-recursive helper.
- `workspace_invites` select policy must require owner/admin role.
- There must be no direct insert/update/delete policies for `workspace_invites`; writes happen through RPCs.
- There must be no policy that lets regular members read pending invite emails.

Suggested inspection query:

```sql
select schemaname, tablename, policyname, cmd, roles, qual, with_check
from pg_policies
where schemaname = 'public'
  and tablename in (
    'profiles',
    'workspaces',
    'workspace_memberships',
    'workspace_invites'
  )
order by tablename, policyname;
```

## Function Hardening Review

- `security.is_workspace_member`, `security.workspace_role`, `security.is_workspace_admin`, and account RPCs must have explicit `search_path`.
- Security-definer functions must schema-qualify table/function references.
- Execute on `security.ensure_account_workspace` must be revoked from `public`, `anon`, and `authenticated`; use the public wrapper only.
- Execute on public account RPCs must be granted to `authenticated` and revoked from `public` and `anon`.
- No function should use or require a Supabase service/secret key to authorize ordinary account payload reads.

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
  and p.proname in (
    'is_workspace_member',
    'workspace_role',
    'is_workspace_admin',
    'ensure_account_workspace',
    'create_workspace',
    'create_workspace_invite',
    'mark_workspace_invite_delivery',
    'revoke_workspace_invite',
    'accept_workspace_invite'
  )
order by schema_name, function_name;
```

## Required RLS Test Matrix

Set up:

1. Create test users A and B through Supabase Auth.
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

## Suggested SQL Assertions

Run these checks with role/user context switched through Supabase API clients or SQL test tooling that can issue JWT-authenticated requests.

### Anon Denial

- Select from `profiles`, `workspaces`, `workspace_memberships`, and `workspace_invites` as anon.
- Attempt insert/update/delete on those tables as anon.
- Expected: zero rows or permission denied; no mutation succeeds.

### Cross-Workspace Denial

- As user A, select workspace B by ID.
- As user A, select workspace B memberships.
- As user A, select workspace B pending invites.
- As user A, update `profiles.active_workspace_id` to workspace B.
- Repeat inverse checks as user B against workspace A.
- Expected: zero rows or denied mutations.

### Role Behavior

- As a regular member, call `create_workspace_invite(...)`.
- As a regular member, call `revoke_workspace_invite(...)`.
- As admin, call `create_workspace_invite(...)` with role `owner`.
- As owner/admin, call `create_workspace_invite(...)` with role `admin` and `member`.
- Expected: member calls denied; owner role denied; admin/member invites accepted for owner/admin only.

### Invite Acceptance

- Create a pending invite for `invited@example.com`.
- Accept as a verified user with a different email hash.
- Accept after setting `expires_at` in the past.
- Accept after revoking the invite.
- Accept once as the invited user, then attempt acceptance with a different user.
- Expected: mismatched, expired, revoked, and different-user reuse all fail; same-user repeated acceptance is idempotent.

## API Field Contract Review

- `GET /api/reframe/account` for owner/admin may include:
  - own profile
  - active workspace
  - memberships
  - active workspace members with allowed email/name/role/joined fields
  - pending invites for active workspace
- `GET /api/reframe/account` for member must not include:
  - pending invites
  - raw invite token or token hash
  - invite email hashes
  - fields outside the limited current-workspace member summary
- `GET /api/reframe/workspaces/:workspaceId/members` must return full member list only for owner/admin.

## Service-Role Static Review

Run before shipping:

```powershell
rg -n "getSession|signInWithPassword|resetPasswordForEmail|inviteUserByEmail|SUPABASE_SERVICE_ROLE_KEY|serviceRole" app lib components
```

Expected:

- No `getSession()` authorization.
- No email/password or password reset calls.
- No Supabase Auth Admin invite calls.
- Service/secret key references are limited to server-only config, hashing fallback, existing waitlist/intake infrastructure, and any explicitly reviewed privileged operation.
- No service-role client is used for ordinary account payload reads, member list reads, active workspace switching, or user-scoped profile updates.

## `/demo` Freeze Check

Run before final commit:

```powershell
git diff -- app/demo
```

Expected: no diff.
