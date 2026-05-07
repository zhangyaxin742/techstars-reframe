-- Reframe account and workspace management schema, RLS, and RPC contract.
-- Run in Supabase SQL editor after the intake auth handoff schema, or in a
-- fresh project before enabling /account pilot traffic.

create extension if not exists pgcrypto with schema extensions;

create schema if not exists security;
revoke all on schema security from public;
grant usage on schema security to authenticated;

create or replace function security.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function security.slugify(p_value text, p_fallback text)
returns text
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_slug text;
begin
  v_slug := regexp_replace(lower(coalesce(p_value, '')), '[^a-z0-9]+', '-', 'g');
  v_slug := regexp_replace(v_slug, '(^-+|-+$)', '', 'g');

  if v_slug = '' then
    return p_fallback;
  end if;

  return v_slug;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email_display text not null,
  email_hash text not null unique,
  display_name text,
  avatar_url text,
  active_workspace_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_email_hash_length check (length(email_hash) >= 32),
  constraint profiles_display_name_length check (display_name is null or length(display_name) <= 120),
  constraint profiles_avatar_url_length check (avatar_url is null or length(avatar_url) <= 2048)
);

alter table public.profiles
  add column if not exists avatar_url text;

alter table public.profiles
  add column if not exists active_workspace_id uuid;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_display_name_length'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_display_name_length
      check (display_name is null or length(display_name) <= 120)
      not valid;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_avatar_url_length'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_avatar_url_length
      check (avatar_url is null or length(avatar_url) <= 2048)
      not valid;
  end if;
end;
$$;

create table if not exists public.workspaces (
  id uuid primary key default extensions.gen_random_uuid(),
  slug text not null unique,
  name text not null,
  created_by uuid not null references auth.users(id) on delete restrict,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint workspaces_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint workspaces_name_length check (length(name) between 2 and 80)
);

alter table public.workspaces
  add column if not exists archived_at timestamptz;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'workspaces_name_length'
      and conrelid = 'public.workspaces'::regclass
  ) then
    alter table public.workspaces
      add constraint workspaces_name_length
      check (name is null or length(name) between 2 and 80)
      not valid;
  end if;
end;
$$;

create table if not exists public.workspace_memberships (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null,
  joined_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (workspace_id, user_id),
  constraint workspace_memberships_role_check check (role in ('owner', 'admin', 'member'))
);

alter table public.workspace_memberships
  add column if not exists joined_at timestamptz not null default now();

create table if not exists public.workspace_invites (
  id uuid primary key default extensions.gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  email_display text not null,
  email_hash text not null,
  role text not null,
  token_hash text not null unique,
  status text not null default 'pending',
  invited_by uuid not null references auth.users(id) on delete restrict,
  accepted_by uuid references auth.users(id) on delete set null,
  delivery_status text not null default 'pending',
  delivery_error text,
  delivery_email_id text,
  delivery_attempted_at timestamptz,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  revoked_at timestamptz,
  constraint workspace_invites_role_check check (role in ('admin', 'member')),
  constraint workspace_invites_status_check check (status in ('pending', 'accepted', 'revoked', 'expired')),
  constraint workspace_invites_delivery_status_check check (delivery_status in ('pending', 'sent', 'failed', 'skipped')),
  constraint workspace_invites_email_hash_length check (length(email_hash) >= 32),
  constraint workspace_invites_token_hash_length check (length(token_hash) >= 32)
);

alter table public.profiles
  drop constraint if exists profiles_active_workspace_id_fkey;

alter table public.profiles
  add constraint profiles_active_workspace_id_fkey
  foreign key (active_workspace_id) references public.workspaces(id)
  on delete set null;

create index if not exists profiles_active_workspace_id_idx on public.profiles (active_workspace_id);
create index if not exists workspaces_created_by_idx on public.workspaces (created_by);
create index if not exists workspace_memberships_user_id_idx on public.workspace_memberships (user_id);
create index if not exists workspace_memberships_workspace_id_idx on public.workspace_memberships (workspace_id);
create index if not exists workspace_invites_workspace_status_idx on public.workspace_invites (workspace_id, status);
create index if not exists workspace_invites_email_status_idx on public.workspace_invites (email_hash, status);
create unique index if not exists workspace_invites_token_hash_key
  on public.workspace_invites (token_hash);

create unique index if not exists workspace_invites_pending_workspace_email_key
  on public.workspace_invites (workspace_id, email_hash)
  where status = 'pending';

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function security.set_updated_at();

drop trigger if exists workspaces_set_updated_at on public.workspaces;
create trigger workspaces_set_updated_at
before update on public.workspaces
for each row execute function security.set_updated_at();

drop trigger if exists workspace_memberships_set_updated_at on public.workspace_memberships;
create trigger workspace_memberships_set_updated_at
before update on public.workspace_memberships
for each row execute function security.set_updated_at();

alter table public.profiles enable row level security;
alter table public.workspaces enable row level security;
alter table public.workspace_memberships enable row level security;
alter table public.workspace_invites enable row level security;

revoke all on table public.profiles from anon, authenticated;
revoke all on table public.workspaces from anon, authenticated;
revoke all on table public.workspace_memberships from anon, authenticated;
revoke all on table public.workspace_invites from anon, authenticated;

grant select on table public.profiles to authenticated;
grant update (display_name, avatar_url, active_workspace_id) on table public.profiles to authenticated;
grant select on table public.workspaces to authenticated;
grant select on table public.workspace_memberships to authenticated;
grant select on table public.workspace_invites to authenticated;

create or replace function security.is_workspace_member(
  p_workspace_id uuid,
  p_user_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.workspace_memberships wm
    join public.workspaces w on w.id = wm.workspace_id
    where wm.workspace_id = p_workspace_id
      and wm.user_id = p_user_id
      and w.archived_at is null
  );
$$;

create or replace function security.workspace_role(
  p_workspace_id uuid,
  p_user_id uuid
)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select wm.role
  from public.workspace_memberships wm
  join public.workspaces w on w.id = wm.workspace_id
  where wm.workspace_id = p_workspace_id
    and wm.user_id = p_user_id
    and w.archived_at is null
  limit 1;
$$;

create or replace function security.is_workspace_admin(
  p_workspace_id uuid,
  p_user_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(security.workspace_role(p_workspace_id, p_user_id), '') in ('owner', 'admin');
$$;

revoke all on function security.is_workspace_member(uuid, uuid) from public, anon, authenticated;
revoke all on function security.workspace_role(uuid, uuid) from public, anon, authenticated;
revoke all on function security.is_workspace_admin(uuid, uuid) from public, anon, authenticated;
grant execute on function security.is_workspace_member(uuid, uuid) to authenticated;
grant execute on function security.workspace_role(uuid, uuid) to authenticated;
grant execute on function security.is_workspace_admin(uuid, uuid) to authenticated;

drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own
on public.profiles
for select
to authenticated
using (id = (select auth.uid()));

drop policy if exists profiles_update_own_safe_fields on public.profiles;
create policy profiles_update_own_safe_fields
on public.profiles
for update
to authenticated
using (id = (select auth.uid()))
with check (
  id = (select auth.uid())
  and (
    active_workspace_id is null
    or security.is_workspace_member(active_workspace_id, (select auth.uid()))
  )
);

drop policy if exists workspaces_select_member on public.workspaces;
create policy workspaces_select_member
on public.workspaces
for select
to authenticated
using (security.is_workspace_member(id, (select auth.uid())));

drop policy if exists workspace_memberships_select_member_workspace on public.workspace_memberships;
drop policy if exists workspace_memberships_select_own on public.workspace_memberships;
create policy workspace_memberships_select_member_workspace
on public.workspace_memberships
for select
to authenticated
using (security.is_workspace_member(workspace_id, (select auth.uid())));

drop policy if exists workspace_invites_select_owner_admin on public.workspace_invites;
create policy workspace_invites_select_owner_admin
on public.workspace_invites
for select
to authenticated
using (security.is_workspace_admin(workspace_id, (select auth.uid())));

create or replace function security.ensure_account_workspace(
  p_email_display text,
  p_email_hash text,
  p_workspace_name text default 'My Workspace'
)
returns table (
  profile_id uuid,
  active_workspace_id uuid,
  active_workspace_slug text,
  active_workspace_role text,
  repaired_profile boolean,
  repaired_workspace boolean
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_workspace_id uuid;
  v_workspace_slug text;
  v_workspace_role text;
  v_workspace_name text;
  v_user_suffix text;
  v_repaired_profile boolean := false;
  v_repaired_workspace boolean := false;
begin
  if v_user_id is null then
    raise exception 'not_authenticated' using errcode = 'P0001';
  end if;

  if p_email_display is null or trim(p_email_display) = '' or p_email_hash is null or length(p_email_hash) < 32 then
    raise exception 'invalid_profile_identity' using errcode = 'P0001';
  end if;

  insert into public.profiles (id, email_display, email_hash)
  values (v_user_id, lower(trim(p_email_display)), p_email_hash)
  on conflict (id) do update
    set email_display = excluded.email_display,
        email_hash = excluded.email_hash
  returning (xmax = 0) into v_repaired_profile;

  select p.active_workspace_id, w.slug, wm.role
  into v_workspace_id, v_workspace_slug, v_workspace_role
  from public.profiles p
  join public.workspaces w on w.id = p.active_workspace_id
  join public.workspace_memberships wm on wm.workspace_id = w.id and wm.user_id = p.id
  where p.id = v_user_id
    and w.archived_at is null
  limit 1;

  if v_workspace_id is null then
    select w.id, w.slug, wm.role
    into v_workspace_id, v_workspace_slug, v_workspace_role
    from public.workspace_memberships wm
    join public.workspaces w on w.id = wm.workspace_id
    where wm.user_id = v_user_id
      and w.archived_at is null
    order by coalesce(wm.joined_at, wm.created_at) asc
    limit 1;
  end if;

  if v_workspace_id is null then
    v_user_suffix := substring(replace(v_user_id::text, '-', '') from 1 for 12);
    v_workspace_name := nullif(trim(coalesce(p_workspace_name, '')), '');

    if v_workspace_name is null then
      v_workspace_name := 'My Workspace';
    end if;

    v_workspace_slug := security.slugify(v_workspace_name, 'workspace') || '-' || v_user_suffix;

    insert into public.workspaces (slug, name, created_by)
    values (v_workspace_slug, v_workspace_name, v_user_id)
    on conflict (slug) do nothing
    returning id, slug into v_workspace_id, v_workspace_slug;

    if v_workspace_id is null then
      select id, slug
      into v_workspace_id, v_workspace_slug
      from public.workspaces
      where slug = security.slugify(v_workspace_name, 'workspace') || '-' || v_user_suffix;
    end if;

    insert into public.workspace_memberships (workspace_id, user_id, role)
    values (v_workspace_id, v_user_id, 'owner');

    v_workspace_role := 'owner';
    v_repaired_workspace := true;
  end if;

  update public.profiles
  set active_workspace_id = v_workspace_id
  where id = v_user_id
    and active_workspace_id is distinct from v_workspace_id;

  return query
  select
    v_user_id,
    v_workspace_id,
    v_workspace_slug,
    v_workspace_role,
    v_repaired_profile,
    v_repaired_workspace;
end;
$$;

create or replace function public.ensure_account_workspace(
  p_email_display text,
  p_email_hash text,
  p_workspace_name text default 'My Workspace'
)
returns table (
  profile_id uuid,
  active_workspace_id uuid,
  active_workspace_slug text,
  active_workspace_role text,
  repaired_profile boolean,
  repaired_workspace boolean
)
language sql
security definer
set search_path = ''
as $$
  select *
  from security.ensure_account_workspace(p_email_display, p_email_hash, p_workspace_name);
$$;

create or replace function public.create_workspace(
  p_name text default 'My Workspace'
)
returns table (
  workspace_id uuid,
  workspace_slug text,
  workspace_name text,
  membership_role text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_workspace_id uuid;
  v_workspace_slug text;
  v_workspace_name text;
  v_user_suffix text;
begin
  if v_user_id is null then
    raise exception 'not_authenticated' using errcode = 'P0001';
  end if;

  v_workspace_name := nullif(trim(coalesce(p_name, '')), '');

  if v_workspace_name is null then
    v_workspace_name := 'My Workspace';
  end if;

  if length(v_workspace_name) < 2 or length(v_workspace_name) > 80 then
    raise exception 'invalid_workspace_name' using errcode = 'P0001';
  end if;

  v_user_suffix := substring(replace(v_user_id::text, '-', '') from 1 for 12);
  v_workspace_slug := security.slugify(v_workspace_name, 'workspace') || '-' || substring(replace(extensions.gen_random_uuid()::text, '-', '') from 1 for 8);

  insert into public.workspaces (slug, name, created_by)
  values (v_workspace_slug, v_workspace_name, v_user_id)
  returning id, slug into v_workspace_id, v_workspace_slug;

  insert into public.workspace_memberships (workspace_id, user_id, role)
  values (v_workspace_id, v_user_id, 'owner');

  update public.profiles
  set active_workspace_id = v_workspace_id
  where id = v_user_id;

  return query
  select v_workspace_id, v_workspace_slug, v_workspace_name, 'owner'::text;
end;
$$;

create or replace function public.create_workspace_invite(
  p_workspace_id uuid,
  p_email_display text,
  p_email_hash text,
  p_role text,
  p_token_hash text,
  p_expires_at timestamptz
)
returns table (
  invite_id uuid,
  workspace_id uuid,
  workspace_name text,
  email_display text,
  role text,
  status text,
  expires_at timestamptz,
  created boolean
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_existing public.workspace_invites%rowtype;
  v_inserted public.workspace_invites%rowtype;
begin
  if v_user_id is null then
    raise exception 'not_authenticated' using errcode = 'P0001';
  end if;

  if not security.is_workspace_admin(p_workspace_id, v_user_id) then
    raise exception 'workspace_invite_forbidden' using errcode = 'P0001';
  end if;

  if p_role not in ('admin', 'member') then
    raise exception 'invalid_invite_role' using errcode = 'P0001';
  end if;

  if p_email_display is null or trim(p_email_display) = '' or p_email_hash is null or length(p_email_hash) < 32 then
    raise exception 'invalid_invite_email' using errcode = 'P0001';
  end if;

  if p_token_hash is null or length(p_token_hash) < 32 then
    raise exception 'invalid_invite_token' using errcode = 'P0001';
  end if;

  if p_expires_at <= now() then
    raise exception 'invalid_invite_expiration' using errcode = 'P0001';
  end if;

  if exists (
    select 1
    from public.profiles p
    join public.workspace_memberships wm on wm.user_id = p.id
    where p.email_hash = p_email_hash
      and wm.workspace_id = p_workspace_id
  ) then
    raise exception 'workspace_invite_existing_member' using errcode = 'P0001';
  end if;

  select *
  into v_existing
  from public.workspace_invites wi
  where wi.workspace_id = p_workspace_id
    and wi.email_hash = p_email_hash
    and wi.status = 'pending'
  limit 1;

  if found then
    update public.workspace_invites
    set token_hash = p_token_hash,
        role = p_role,
        invited_by = v_user_id,
        delivery_status = 'pending',
        delivery_error = null,
        delivery_email_id = null,
        delivery_attempted_at = null,
        expires_at = p_expires_at
    where id = v_existing.id
    returning * into v_existing;

    return query
    select
      v_existing.id,
      v_existing.workspace_id,
      (select w.name from public.workspaces w where w.id = v_existing.workspace_id),
      v_existing.email_display,
      v_existing.role,
      v_existing.status,
      v_existing.expires_at,
      false;
    return;
  end if;

  insert into public.workspace_invites (
    workspace_id,
    email_display,
    email_hash,
    role,
    token_hash,
    status,
    invited_by,
    expires_at
  )
  values (
    p_workspace_id,
    lower(trim(p_email_display)),
    p_email_hash,
    p_role,
    p_token_hash,
    'pending',
    v_user_id,
    p_expires_at
  )
  returning * into v_inserted;

  return query
  select
    v_inserted.id,
    v_inserted.workspace_id,
    (select w.name from public.workspaces w where w.id = v_inserted.workspace_id),
    v_inserted.email_display,
    v_inserted.role,
    v_inserted.status,
    v_inserted.expires_at,
    true;
end;
$$;

create or replace function public.mark_workspace_invite_delivery(
  p_workspace_id uuid,
  p_invite_id uuid,
  p_delivery_status text,
  p_delivery_email_id text default null,
  p_delivery_error text default null
)
returns table (
  invite_id uuid,
  delivery_status text,
  delivery_email_id text,
  delivery_error text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_invite public.workspace_invites%rowtype;
begin
  if v_user_id is null then
    raise exception 'not_authenticated' using errcode = 'P0001';
  end if;

  if not security.is_workspace_admin(p_workspace_id, v_user_id) then
    raise exception 'workspace_invite_forbidden' using errcode = 'P0001';
  end if;

  if p_delivery_status not in ('pending', 'sent', 'failed', 'skipped') then
    raise exception 'invalid_delivery_status' using errcode = 'P0001';
  end if;

  update public.workspace_invites
  set delivery_status = p_delivery_status,
      delivery_email_id = p_delivery_email_id,
      delivery_error = left(p_delivery_error, 1000),
      delivery_attempted_at = now()
  where id = p_invite_id
    and workspace_id = p_workspace_id
  returning * into v_invite;

  if not found then
    raise exception 'workspace_invite_not_found' using errcode = 'P0001';
  end if;

  return query
  select v_invite.id, v_invite.delivery_status, v_invite.delivery_email_id, v_invite.delivery_error;
end;
$$;

create or replace function public.revoke_workspace_invite(
  p_workspace_id uuid,
  p_invite_id uuid
)
returns table (
  invite_id uuid,
  status text,
  revoked_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_invite public.workspace_invites%rowtype;
begin
  if v_user_id is null then
    raise exception 'not_authenticated' using errcode = 'P0001';
  end if;

  if not security.is_workspace_admin(p_workspace_id, v_user_id) then
    raise exception 'workspace_invite_forbidden' using errcode = 'P0001';
  end if;

  update public.workspace_invites
  set status = 'revoked',
      revoked_at = now()
  where id = p_invite_id
    and workspace_id = p_workspace_id
    and status = 'pending'
  returning * into v_invite;

  if not found then
    raise exception 'workspace_invite_not_pending' using errcode = 'P0001';
  end if;

  return query
  select v_invite.id, v_invite.status, v_invite.revoked_at;
end;
$$;

create or replace function public.accept_workspace_invite(
  p_token_hash text,
  p_email_display text,
  p_email_hash text
)
returns table (
  workspace_id uuid,
  workspace_slug text,
  membership_role text,
  invite_status text,
  reused_existing_membership boolean
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_invite public.workspace_invites%rowtype;
  v_workspace public.workspaces%rowtype;
  v_existing_membership boolean := false;
begin
  if v_user_id is null then
    raise exception 'not_authenticated' using errcode = 'P0001';
  end if;

  if p_token_hash is null or length(p_token_hash) < 32 then
    raise exception 'invalid_invite_token' using errcode = 'P0001';
  end if;

  if p_email_display is null or trim(p_email_display) = '' or p_email_hash is null or length(p_email_hash) < 32 then
    raise exception 'invalid_profile_identity' using errcode = 'P0001';
  end if;

  select *
  into v_invite
  from public.workspace_invites
  where token_hash = p_token_hash
  for update;

  if not found then
    raise exception 'workspace_invite_not_found' using errcode = 'P0001';
  end if;

  if v_invite.status = 'accepted' then
    if v_invite.accepted_by = v_user_id then
      select *
      into v_workspace
      from public.workspaces
      where id = v_invite.workspace_id;

      return query
      select v_workspace.id, v_workspace.slug, v_invite.role, v_invite.status, true;
      return;
    end if;

    raise exception 'workspace_invite_reused_by_different_user' using errcode = 'P0001';
  end if;

  if v_invite.status = 'revoked' then
    raise exception 'workspace_invite_revoked' using errcode = 'P0001';
  end if;

  if v_invite.status = 'expired' or v_invite.expires_at <= now() then
    update public.workspace_invites
    set status = 'expired'
    where id = v_invite.id;

    raise exception 'workspace_invite_expired' using errcode = 'P0001';
  end if;

  if v_invite.email_hash <> p_email_hash then
    raise exception 'workspace_invite_email_mismatch' using errcode = 'P0001';
  end if;

  select *
  into v_workspace
  from public.workspaces
  where id = v_invite.workspace_id
    and archived_at is null;

  if not found then
    raise exception 'workspace_invite_workspace_unavailable' using errcode = 'P0001';
  end if;

  insert into public.profiles (id, email_display, email_hash, active_workspace_id)
  values (v_user_id, lower(trim(p_email_display)), p_email_hash, v_invite.workspace_id)
  on conflict (id) do update
    set email_display = excluded.email_display,
        email_hash = excluded.email_hash,
        active_workspace_id = excluded.active_workspace_id;

  v_existing_membership := exists (
    select 1
    from public.workspace_memberships
    where workspace_id = v_invite.workspace_id
      and user_id = v_user_id
  );

  insert into public.workspace_memberships (workspace_id, user_id, role)
  values (v_invite.workspace_id, v_user_id, v_invite.role)
  on conflict (workspace_id, user_id) do nothing;

  update public.workspace_invites
  set status = 'accepted',
      accepted_by = v_user_id,
      accepted_at = now()
  where id = v_invite.id;

  return query
  select v_workspace.id, v_workspace.slug, v_invite.role, 'accepted'::text, v_existing_membership;
end;
$$;

create or replace function public.resolve_workspace_invite_for_otp(
  p_token_hash text,
  p_email_hash text
)
returns table (
  valid boolean,
  state text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_invite public.workspace_invites%rowtype;
begin
  if p_token_hash is null or length(p_token_hash) < 32 or p_email_hash is null or length(p_email_hash) < 32 then
    return query select false, 'invalid_request'::text;
    return;
  end if;

  select *
  into v_invite
  from public.workspace_invites
  where token_hash = p_token_hash
  limit 1;

  if not found then
    return query select false, 'not_found'::text;
    return;
  end if;

  if v_invite.status = 'revoked' then
    return query select false, 'revoked'::text;
    return;
  end if;

  if v_invite.status = 'accepted' then
    return query select false, 'accepted'::text;
    return;
  end if;

  if v_invite.status = 'expired' or v_invite.expires_at <= now() then
    update public.workspace_invites
    set status = 'expired'
    where id = v_invite.id
      and status = 'pending';

    return query select false, 'expired'::text;
    return;
  end if;

  if v_invite.email_hash <> p_email_hash then
    return query select false, 'email_mismatch'::text;
    return;
  end if;

  return query select true, 'pending'::text;
end;
$$;

create or replace function public.get_workspace_account_members(
  p_workspace_id uuid
)
returns table (
  workspace_id uuid,
  user_id uuid,
  role text,
  joined_at timestamptz,
  created_at timestamptz,
  display_name text,
  email_display text,
  avatar_url text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_requester_role text;
begin
  if v_user_id is null then
    raise exception 'not_authenticated' using errcode = 'P0001';
  end if;

  v_requester_role := security.workspace_role(p_workspace_id, v_user_id);

  if v_requester_role is null then
    raise exception 'workspace_member_read_forbidden' using errcode = 'P0001';
  end if;

  return query
  select
    wm.workspace_id,
    wm.user_id,
    wm.role,
    wm.joined_at,
    wm.created_at,
    p.display_name,
    case
      when v_requester_role in ('owner', 'admin') then p.email_display
      else null
    end as email_display,
    p.avatar_url
  from public.workspace_memberships wm
  left join public.profiles p on p.id = wm.user_id
  where wm.workspace_id = p_workspace_id
  order by wm.created_at asc;
end;
$$;

create or replace function public.get_workspace_pending_invites(
  p_workspace_id uuid
)
returns table (
  id uuid,
  workspace_id uuid,
  email_display text,
  role text,
  status text,
  expires_at timestamptz,
  delivery_status text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'not_authenticated' using errcode = 'P0001';
  end if;

  if not security.is_workspace_admin(p_workspace_id, v_user_id) then
    raise exception 'workspace_invite_read_forbidden' using errcode = 'P0001';
  end if;

  return query
  select
    wi.id,
    wi.workspace_id,
    wi.email_display,
    wi.role,
    wi.status,
    wi.expires_at,
    wi.delivery_status
  from public.workspace_invites wi
  where wi.workspace_id = p_workspace_id
    and wi.status = 'pending'
  order by wi.created_at asc;
end;
$$;

revoke all on function security.ensure_account_workspace(text, text, text) from public, anon, authenticated;
revoke all on function public.ensure_account_workspace(text, text, text) from public, anon;
revoke all on function public.create_workspace(text) from public, anon;
revoke all on function public.create_workspace_invite(uuid, text, text, text, text, timestamptz) from public, anon;
revoke all on function public.mark_workspace_invite_delivery(uuid, uuid, text, text, text) from public, anon;
revoke all on function public.revoke_workspace_invite(uuid, uuid) from public, anon;
revoke all on function public.accept_workspace_invite(text, text, text) from public, anon;
revoke all on function public.resolve_workspace_invite_for_otp(text, text) from public, anon, authenticated;
revoke all on function public.get_workspace_account_members(uuid) from public, anon;
revoke all on function public.get_workspace_pending_invites(uuid) from public, anon;

grant execute on function public.ensure_account_workspace(text, text, text) to authenticated;
grant execute on function public.create_workspace(text) to authenticated;
grant execute on function public.create_workspace_invite(uuid, text, text, text, text, timestamptz) to authenticated;
grant execute on function public.mark_workspace_invite_delivery(uuid, uuid, text, text, text) to authenticated;
grant execute on function public.revoke_workspace_invite(uuid, uuid) to authenticated;
grant execute on function public.accept_workspace_invite(text, text, text) to authenticated;
grant execute on function public.resolve_workspace_invite_for_otp(text, text) to service_role;
grant execute on function public.get_workspace_account_members(uuid) to authenticated;
grant execute on function public.get_workspace_pending_invites(uuid) to authenticated;
