-- Reframe intake auth handoff schema, RLS, and claim RPC.
-- Run in the Supabase SQL editor before enabling /intake traffic.

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
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_email_hash_length check (length(email_hash) >= 32)
);

create table if not exists public.workspaces (
  id uuid primary key default extensions.gen_random_uuid(),
  slug text not null unique,
  name text not null,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint workspaces_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);

create table if not exists public.workspace_memberships (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (workspace_id, user_id),
  constraint workspace_memberships_role_check check (role in ('owner', 'admin', 'member'))
);

create table if not exists public.intake_drafts (
  id uuid primary key default extensions.gen_random_uuid(),
  token_hash text not null unique,
  status text not null default 'draft',
  business_url text,
  product_url text,
  campaign_goal text not null default '',
  founder_note text not null default '',
  source_references jsonb not null default '[]'::jsonb,
  email_hash text,
  expires_at timestamptz not null,
  claimed_user_id uuid references auth.users(id) on delete set null,
  claimed_workspace_id uuid references public.workspaces(id) on delete set null,
  claimed_project_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint intake_drafts_status_check check (
    status in ('draft', 'auth_required', 'verification_pending', 'claimed', 'expired')
  ),
  constraint intake_drafts_claimed_state_check check (
    (status = 'claimed') =
    (
      claimed_user_id is not null and
      claimed_workspace_id is not null and
      claimed_project_id is not null
    )
  ),
  constraint intake_drafts_business_url_length check (business_url is null or length(business_url) <= 2048),
  constraint intake_drafts_product_url_length check (product_url is null or length(product_url) <= 2048),
  constraint intake_drafts_campaign_goal_length check (length(campaign_goal) <= 240),
  constraint intake_drafts_founder_note_length check (length(founder_note) <= 4000),
  constraint intake_drafts_source_references_array check (jsonb_typeof(source_references) = 'array')
);

create table if not exists public.projects (
  id uuid primary key default extensions.gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  slug text not null,
  name text not null,
  intake_draft_id uuid references public.intake_drafts(id) on delete set null,
  created_by uuid not null references auth.users(id) on delete restrict,
  intake_snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint projects_workspace_slug_key unique (workspace_id, slug),
  constraint projects_intake_draft_id_key unique (intake_draft_id),
  constraint projects_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);

alter table public.intake_drafts
  drop constraint if exists intake_drafts_claimed_project_id_fkey;

alter table public.intake_drafts
  add constraint intake_drafts_claimed_project_id_fkey
  foreign key (claimed_project_id) references public.projects(id)
  on delete set null
  deferrable initially deferred;

create unique index if not exists intake_drafts_claimed_project_id_key
  on public.intake_drafts (claimed_project_id)
  where claimed_project_id is not null;

create index if not exists intake_drafts_email_hash_idx on public.intake_drafts (email_hash);
create index if not exists intake_drafts_expires_at_idx on public.intake_drafts (expires_at);
create index if not exists workspace_memberships_user_id_idx on public.workspace_memberships (user_id);
create index if not exists projects_workspace_id_idx on public.projects (workspace_id);

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

drop trigger if exists intake_drafts_set_updated_at on public.intake_drafts;
create trigger intake_drafts_set_updated_at
before update on public.intake_drafts
for each row execute function security.set_updated_at();

drop trigger if exists projects_set_updated_at on public.projects;
create trigger projects_set_updated_at
before update on public.projects
for each row execute function security.set_updated_at();

alter table public.profiles enable row level security;
alter table public.workspaces enable row level security;
alter table public.workspace_memberships enable row level security;
alter table public.intake_drafts enable row level security;
alter table public.projects enable row level security;

revoke all on table public.profiles from anon, authenticated;
revoke all on table public.workspaces from anon, authenticated;
revoke all on table public.workspace_memberships from anon, authenticated;
revoke all on table public.intake_drafts from anon, authenticated;
revoke all on table public.projects from anon, authenticated;

grant select on table public.profiles to authenticated;
grant select on table public.workspaces to authenticated;
grant select on table public.workspace_memberships to authenticated;
grant select on table public.projects to authenticated;

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
    where wm.workspace_id = p_workspace_id
      and wm.user_id = p_user_id
  );
$$;

revoke all on function security.is_workspace_member(uuid, uuid) from public, anon, authenticated;
grant execute on function security.is_workspace_member(uuid, uuid) to authenticated;

drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own
on public.profiles
for select
to authenticated
using (id = (select auth.uid()));

drop policy if exists workspaces_select_member on public.workspaces;
create policy workspaces_select_member
on public.workspaces
for select
to authenticated
using (security.is_workspace_member(id, (select auth.uid())));

drop policy if exists workspace_memberships_select_own on public.workspace_memberships;
create policy workspace_memberships_select_own
on public.workspace_memberships
for select
to authenticated
using (user_id = (select auth.uid()));

drop policy if exists projects_select_workspace_member on public.projects;
create policy projects_select_workspace_member
on public.projects
for select
to authenticated
using (security.is_workspace_member(workspace_id, (select auth.uid())));

create or replace function security.claim_intake_draft(
  p_token_hash text,
  p_email_display text,
  p_email_hash text,
  p_workspace_name text default 'My Workspace'
)
returns table (
  workspace_id uuid,
  workspace_slug text,
  project_id uuid,
  project_slug text,
  reused_existing_project boolean,
  claim_status text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_draft public.intake_drafts%rowtype;
  v_workspace_id uuid;
  v_workspace_slug text;
  v_workspace_name text;
  v_project_id uuid;
  v_project_slug text;
  v_project_name text;
  v_user_suffix text;
begin
  if v_user_id is null then
    raise exception 'not_authenticated' using errcode = 'P0001';
  end if;

  if p_token_hash is null or length(p_token_hash) < 32 then
    raise exception 'invalid_draft_token' using errcode = 'P0001';
  end if;

  if p_email_display is null or trim(p_email_display) = '' or p_email_hash is null or length(p_email_hash) < 32 then
    raise exception 'invalid_profile_identity' using errcode = 'P0001';
  end if;

  select *
  into v_draft
  from public.intake_drafts
  where token_hash = p_token_hash
  for update;

  if not found then
    raise exception 'intake_draft_not_found' using errcode = 'P0001';
  end if;

  if v_draft.status <> 'claimed' and v_draft.expires_at <= now() then
    update public.intake_drafts
    set status = 'expired'
    where id = v_draft.id;

    raise exception 'intake_draft_expired' using errcode = 'P0001';
  end if;

  if v_draft.status = 'claimed' then
    if v_draft.claimed_user_id = v_user_id then
      select w.id, w.slug, p.id, p.slug
      into v_workspace_id, v_workspace_slug, v_project_id, v_project_slug
      from public.projects p
      join public.workspaces w on w.id = p.workspace_id
      where p.id = v_draft.claimed_project_id;

      return query
      select
        v_workspace_id,
        v_workspace_slug,
        v_project_id,
        v_project_slug,
        true,
        'claimed'::text;
      return;
    end if;

    raise exception 'intake_draft_claim_conflict' using errcode = 'P0001';
  end if;

  insert into public.profiles (id, email_display, email_hash)
  values (v_user_id, lower(trim(p_email_display)), p_email_hash)
  on conflict (id) do update
    set email_display = excluded.email_display,
        email_hash = excluded.email_hash;

  select w.id, w.slug
  into v_workspace_id, v_workspace_slug
  from public.workspaces w
  join public.workspace_memberships wm on wm.workspace_id = w.id
  where wm.user_id = v_user_id
  order by wm.created_at asc
  limit 1;

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
  end if;

  insert into public.workspace_memberships (workspace_id, user_id, role)
  values (v_workspace_id, v_user_id, 'owner')
  on conflict (workspace_id, user_id) do nothing;

  v_project_slug := 'campaign-' || substring(replace(v_draft.id::text, '-', '') from 1 for 12);
  v_project_name := nullif(trim(v_draft.campaign_goal), '');

  if v_project_name is null then
    v_project_name := 'Reframe campaign';
  end if;

  insert into public.projects (
    workspace_id,
    slug,
    name,
    intake_draft_id,
    created_by,
    intake_snapshot
  )
  values (
    v_workspace_id,
    v_project_slug,
    v_project_name,
    v_draft.id,
    v_user_id,
    jsonb_build_object(
      'businessUrl', v_draft.business_url,
      'productUrl', v_draft.product_url,
      'campaignGoal', v_draft.campaign_goal,
      'founderNote', v_draft.founder_note,
      'sourceReferences', v_draft.source_references
    )
  )
  on conflict (intake_draft_id) do update
    set intake_draft_id = excluded.intake_draft_id
  returning id, slug into v_project_id, v_project_slug;

  update public.intake_drafts
  set status = 'claimed',
      claimed_user_id = v_user_id,
      claimed_workspace_id = v_workspace_id,
      claimed_project_id = v_project_id
  where id = v_draft.id;

  return query
  select
    v_workspace_id,
    v_workspace_slug,
    v_project_id,
    v_project_slug,
    false,
    'claimed'::text;
end;
$$;

create or replace function public.claim_intake_draft(
  p_token_hash text,
  p_email_display text,
  p_email_hash text,
  p_workspace_name text default 'My Workspace'
)
returns table (
  workspace_id uuid,
  workspace_slug text,
  project_id uuid,
  project_slug text,
  reused_existing_project boolean,
  claim_status text
)
language sql
security definer
set search_path = ''
as $$
  select *
  from security.claim_intake_draft(
    p_token_hash,
    p_email_display,
    p_email_hash,
    p_workspace_name
  );
$$;

revoke all on function security.claim_intake_draft(text, text, text, text) from public, anon, authenticated;
revoke all on function public.claim_intake_draft(text, text, text, text) from public, anon;
grant execute on function public.claim_intake_draft(text, text, text, text) to authenticated;
