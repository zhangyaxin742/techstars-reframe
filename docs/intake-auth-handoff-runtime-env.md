# Intake Auth Handoff Runtime Configuration

Do not commit these values to the repo or `.env` files.

Required for the Supabase SSR client/proxy foundation:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` or `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Required before the full `/intake` auth handoff can be enabled:

- `REFRAME_CSRF_SECRET`, preferred for HMAC-signing CSRF cookies; if omitted, route code falls back to a 32+ character `SUPABASE_SERVICE_ROLE_KEY`
- `REFRAME_DRAFT_TOKEN_SECRET`, preferred for hashing draft bearer tokens before storage; if omitted, route code falls back to a 32+ character `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` for trusted server-only draft persistence and admin operations where strictly required
- Supabase Auth passwordless email OTP enabled
- Supabase email template includes `{{ .Token }}` for code-entry UX
- Supabase Auth redirect allow-list includes the app origin and `/intake/verify`
