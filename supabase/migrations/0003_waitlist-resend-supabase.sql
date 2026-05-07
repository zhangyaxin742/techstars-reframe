create table if not exists public.waitlist_signups (
  email text primary key,
  company_url text not null,
  growth_challenge text not null constraint waitlist_signups_growth_challenge_length check (char_length(growth_challenge) <= 2000),
  source text not null,
  landing_page text not null,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  referrer text,
  first_submitted_at timestamptz not null,
  last_submitted_at timestamptz not null,
  submission_count integer not null default 1,
  ip_hash text,
  user_agent text,
  payload jsonb not null default '{}'::jsonb,
  notification_status text not null default 'pending',
  notification_error text,
  notification_email_id text,
  notified_at timestamptz
);

alter table public.waitlist_signups
  add column if not exists email text,
  add column if not exists company_url text,
  add column if not exists growth_challenge text,
  add column if not exists source text,
  add column if not exists landing_page text,
  add column if not exists utm_source text,
  add column if not exists utm_medium text,
  add column if not exists utm_campaign text,
  add column if not exists referrer text,
  add column if not exists first_submitted_at timestamptz,
  add column if not exists last_submitted_at timestamptz,
  add column if not exists submission_count integer default 1,
  add column if not exists ip_hash text,
  add column if not exists user_agent text,
  add column if not exists payload jsonb default '{}'::jsonb,
  add column if not exists notification_status text default 'pending',
  add column if not exists notification_error text,
  add column if not exists notification_email_id text,
  add column if not exists notified_at timestamptz;

alter table public.waitlist_signups
  alter column submission_count set default 1,
  alter column payload set default '{}'::jsonb,
  alter column notification_status set default 'pending';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'waitlist_signups_growth_challenge_length'
      and conrelid = 'public.waitlist_signups'::regclass
  ) then
    alter table public.waitlist_signups
      add constraint waitlist_signups_growth_challenge_length
      check (growth_challenge is null or char_length(growth_challenge) <= 2000)
      not valid;
  end if;
end;
$$;

create index if not exists waitlist_signups_last_submitted_at_idx
  on public.waitlist_signups (last_submitted_at desc);

alter table public.waitlist_signups enable row level security;

comment on table public.waitlist_signups is
  'Canonical Reframe waitlist signups persisted before any Resend side effects.';
