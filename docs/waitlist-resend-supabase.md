# Waitlist Backend: Supabase + Resend

This waitlist flow now keeps Supabase as the source of truth and uses Resend only for email-side effects.

## Environment

Required:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Optional but recommended:

- `WAITLIST_RATE_LIMIT_SALT`

Required for internal notifications:

- `RESEND_API_KEY`
- `WAITLIST_NOTIFICATION_FROM`
- `WAITLIST_NOTIFICATION_TO`

Optional:

- `WAITLIST_NOTIFICATION_REPLY_TO`
- `NEXT_PUBLIC_SUPABASE_URL`
  Use only as a server-side fallback if `SUPABASE_URL` is not set.

## Database setup

Run [supabase/migrations/0003_waitlist-resend-supabase.sql](../supabase/migrations/0003_waitlist-resend-supabase.sql) in the Supabase SQL editor.

The table stores the submitted signup fields:

- `email`
- `company_url`
- `growth_challenge`
- `source`
- `landing_page`
- `utm_source`
- `utm_medium`
- `utm_campaign`
- `referrer`

It also stores server-captured operational metadata:

- `first_submitted_at`
- `last_submitted_at`
- `submission_count`
- `ip_hash`
- `user_agent`
- `payload`
- notification sync fields

## Runtime behavior

The request flow is:

1. Validate JSON body, origin, and core fields
2. Drop filled honeypot submissions silently
3. Apply backend rate limiting by email and IP
4. Upsert the canonical waitlist row in Supabase
5. Send a Resend notification email
6. Record notification status back in Supabase

If Resend fails, the signup still succeeds because Supabase persistence already completed.

## Security notes

- Raw IP addresses are not stored; the backend stores a one-way hash instead.
- Current protection is backend-only: origin checks, honeypot handling, and rate limiting.
- A real CAPTCHA is not wired because that would require a client token and therefore a UI change.
