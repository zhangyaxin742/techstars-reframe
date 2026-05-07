# Technical Research Report: Supabase Migration Hardening

**Date:** 2026-05-07
**Author:** Codex
**Decision status:** Approved for implementation
**Implementation decision:** Ship now

## BLUF

Harden the existing Supabase migrations with additive, idempotent compatibility edits so they can run against both fresh databases and existing pilot databases without losing waitlist/account data.

## Recommendation

- Patch `0003` with explicit `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` statements for app-required waitlist columns.
- Patch `0002` with explicit compatibility constraints for profile/workspace validation that are skipped by `CREATE TABLE IF NOT EXISTS` when `0001` already created the shared tables.
- Patch `0002` to drop the stale membership self-select policy from `0001` before installing the current workspace-wide membership visibility policy.
- Patch `0002` so default workspace repair handles deterministic slug collisions by reusing the existing slug row.
- Move invite OTP gate execution behind the server route by granting `resolve_workspace_invite_for_otp` only to `service_role`.
- Keep auth assumptions aligned to the most recent account PRD: email OTP only, no password auth.

## Current Repo Constraints

- SQL migrations live in `supabase/migrations`.
- The waitlist table may already exist with production users.
- The account/workspace migrations are additive and should not rewrite existing data.
- The most recent account PRD says workspace members may see limited member summaries, while owner/admin users can manage invites.

## Sources

- `docs/reframe-mvp-cutdown.md`, accessed 2026-05-07.
- `docs/prds/2026-05-07-intake-auth-handoff.md`, accessed 2026-05-07.
- `docs/prds/2026-05-07-account-workspace-management.md`, accessed 2026-05-07.
- `supabase/migrations/0001_intake-auth-handoff-supabase.sql`, accessed 2026-05-07.
- `supabase/migrations/0002_account-workspace-management-supabase.sql`, accessed 2026-05-07.
- `supabase/migrations/0003_waitlist-resend-supabase.sql`, accessed 2026-05-07.

## Implementation Plan

1. Add compatibility column statements to `0003` after the `CREATE TABLE IF NOT EXISTS`.
2. Add guarded constraint blocks to `0002` for constraints that are skipped when shared tables already exist.
3. Drop `workspace_memberships_select_own` in `0002` so the current account policy is the only membership select policy.
4. Make `ensure_account_workspace` conflict-safe when its deterministic workspace slug already exists.
5. Revoke `resolve_workspace_invite_for_otp` from browser roles, grant it to `service_role`, and update the OTP start route to call the RPC with a server-only client.
6. Review SQL diff for destructive changes; none should drop tables, truncate data, or rewrite existing rows.

## Validation Plan

- Review migration SQL diff.
- Confirm no docs/data SQL drift is introduced.
- Run the focused OTP start route test because invite gate execution moved from the anon auth client to a server-only client.

## Risks

- Existing legacy rows could violate stricter PRD constraints. Compatibility constraints are added as `NOT VALID` where they might conflict with existing data, so future writes are protected without blocking the migration on old rows.
- Waitlist legacy rows may have nulls in newly added columns. New runtime writes populate these fields; existing rows can be backfilled later if needed.
