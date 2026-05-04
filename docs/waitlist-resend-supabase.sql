create table if not exists public.waitlist_signups (
  email text primary key,
  company_url text not null,
  growth_challenge text not null check (char_length(growth_challenge) <= 2000),
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

create index if not exists waitlist_signups_last_submitted_at_idx
  on public.waitlist_signups (last_submitted_at desc);

alter table public.waitlist_signups enable row level security;

comment on table public.waitlist_signups is
  'Canonical Reframe waitlist signups persisted before any Resend side effects.';
