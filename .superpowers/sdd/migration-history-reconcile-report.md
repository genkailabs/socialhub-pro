# Migration history reconciliation

Date: 2026-07-26

## Changes

- Restored the already-applied paid-traffic migrations unchanged:
  - `20260726000100_paid_traffic.sql`
  - `20260726000200_paid_traffic_account_selection.sql`
- Renumbered the daily-content migrations without changing their SQL:
  - `20260726000200_daily_content_packages.sql` -> `20260726000300_daily_content_packages.sql`
  - `20260726000300_daily_content_cleanup_jobs.sql` -> `20260726000400_daily_content_cleanup_jobs.sql`
- Updated the unit test paths for the renamed daily-content migrations.

## Verification

- Compared both restored paid-traffic SQL files with the supplied source using `git diff --no-index --ignore-space-at-eol`; no SQL-content differences were reported.
- Confirmed the SHA-256 values of both daily-content SQL files remained unchanged across their renames.
- `npm.cmd test -- tests/unit/daily-content-actions.test.js`: 32/32 tests passed.
- `npx --yes supabase@latest db push --linked --dry-run`: the only pending migrations are `20260726000300_daily_content_packages.sql` and `20260726000400_daily_content_cleanup_jobs.sql`.

No migration was applied and no deployment was performed.
