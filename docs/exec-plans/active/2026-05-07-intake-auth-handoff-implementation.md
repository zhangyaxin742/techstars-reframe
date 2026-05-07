# Intake Auth Handoff Implementation Plan

### Ordered implementation sequence

1. Inspect `package-lock.json`, `pnpm-lock.yaml`, and current package scripts; output the exact package-manager install command for user approval before installing anything.
2. Add Supabase dependencies after approval without changing package-manager strategy.
3. Add Supabase SSR client/proxy utilities and document required env vars without editing `.env`.
4. Add a shared CSRF issue/verify utility with unit tests before implementing any state-changing intake/auth routes.
5. Add SQL migration for enums/tables, DB constraints, non-recursive RLS policies, helper functions, and the claim RPC.
6. Add focused DB/RLS tests or a SQL review checklist for cross-workspace denial and claim idempotency.
7. Add `POST /api/reframe/intake/drafts` with validation, draft cookie creation, and minimum-field draft restore coverage.
8. Add `POST /api/reframe/intake/continue` with email OTP send, app-level IP/email/draft throttles, and identical public response shape.
9. Add `/intake/verify` UI and `POST /api/reframe/auth/verify` with `verifyOtp`, cookie persistence, and claim RPC call.
10. Add minimal `/app/[workspaceSlug]/projects/[projectSlug]` placeholder target only if needed for redirect verification.
11. Switch landing CTA to `/intake` only after route, auth, CSRF, RLS, idempotency tests pass, and CAPTCHA/stronger bot defense is ready for public launch.
