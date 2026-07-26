# Task 3 report — Persistência e geração idempotente do pacote diário

## RED

Command (PowerShell uses the `.cmd` shim):

```text
npx.cmd vitest run tests/unit/daily-content-actions.test.js
```

Result: exit 1 as expected before implementation. Vitest could not resolve
`@/lib/daily-content-data`; 1 suite failed and no tests were collected. This
proved that the new persistence/orchestration boundary did not exist.

## GREEN

Focused command:

```text
npx.cmd vitest run tests/unit/daily-content-actions.test.js
```

Result: exit 0 — 1 test file passed, 9 tests passed.

Required regression command:

```text
npx.cmd vitest run tests/unit/daily-content-actions.test.js tests/unit/ai-governance.test.js tests/unit/generate.test.js
```

Result: exit 0 — 3 test files passed, 17 tests passed.

Production integration command:

```text
npm.cmd run build
```

Result: exit 0. Next.js compiled, type/lint checks completed, 26 static pages
were generated, and the standalone package was prepared. The existing Sentry,
webpack cache-size, and Supabase Edge Runtime warnings remained non-fatal.

## Delivered

- Additive `daily_content_packages` table with owner-only authenticated RLS,
  the five required states, and `UNIQUE (brand_id, content_date)`.
- Reviewable topic/goal/format/reason, verified source records, generated
  content, media URLs, alt text, recommended schedule, approval/schedule dates,
  and safe failure metadata. No provider secrets or raw responses are stored.
- A unique row plus conditional updates protects same-day races. Existing
  `ready|approved|scheduled` rows are reused without regeneration; an existing
  `draft` always reports in progress and only an absent or `failed` row can
  start generation.
- Pure injected orchestration plus authenticated Supabase adapters. The
  production boundary maps Task 2's validated `available` result to the Task 3
  `verified` state and passes only that research to `generateCreative` with
  provider research disabled.
- `prepareDailyContent`, `approveDailyContent`, and `scheduleDailyContent`
  Server Actions with serializable results and guarded `ready -> approved ->
  scheduled` transitions. Scheduling requires a valid future ISO date.

## Security and self-review

- Unauthenticated and RLS-hidden brands stop before reservation or generation.
- The migration has no anon/public policy and both `USING` and `WITH CHECK`
  require `brands.user_id = auth.uid()`.
- A missing verified factual source records a safe failed outcome and never
  calls the generator.
- Conditional status/unique-row updates close duplicate generation and transition
  races; a loser receives `generation_in_progress` or `state_conflict`.
- Static inspection found no `posts` access, publication API, social-network
  call, token/secret field, or raw provider response in the Task 3 production
  files. Unit spies also prove preparation and scheduling do not publish.
- `git diff --check` reported no whitespace errors after staging the task files.
- The migration was not applied locally or remotely. Nothing was published or
  deployed.

## Blocking review corrections

### RED

Focused reviewer command:

```text
npx.cmd vitest run tests/unit/daily-content-actions.test.js tests/unit/generate.test.js
```

Result before the corrections: exit 1 — 2 files failed, 7 tests failed and 14
passed. The failures proved that a live draft could regenerate, three
non-strict date formats were accepted, SQL lacked the named drift repair and
transition trigger, and a failed second upload left the first file behind.

Two additional self-review RED checks were run separately:

- `2027-02-30T15:00:00Z` was normalized to March and incorrectly accepted.
- Both PL/pgSQL blocks lacked the required semicolon after `END`.

Each check failed for the expected reason before its corresponding fix.

### GREEN

Focused command after all corrections:

```text
npx.cmd vitest run tests/unit/daily-content-actions.test.js tests/unit/generate.test.js
```

Result: exit 0 — 2 files passed, 23 tests passed.

Required regression command:

```text
npx.cmd vitest run tests/unit/daily-content-actions.test.js tests/unit/ai-governance.test.js tests/unit/generate.test.js
```

Result: exit 0 — 3 files passed, 26 tests passed.

Production integration command:

```text
npm.cmd run build
```

Result: exit 0. Next.js compiled, type/lint checks completed, all 26 static
pages were generated, and the standalone package was prepared. Existing
Sentry and webpack cache-size warnings remained non-fatal.

### Corrected invariants

- No draft is ever reclaimed by elapsed time. Both the service and the
  race-conflict adapter return `generation_in_progress`; only `failed -> draft`
  is retryable.
- A database trigger permits only insert-as-draft and the legal edges
  `draft -> ready|failed`, `failed -> draft`, `ready -> approved`, and
  `approved -> scheduled`, including writes made through the owner API.
- Scheduling accepts only a valid future ISO-8601 timestamp containing `T` and
  an explicit `Z` or numeric timezone offset. Date-only, space-separated,
  locale, impossible calendar dates, and past timestamps are rejected.
- `generateCreative` tracks successful storage paths and removes all of them
  when any later render, upload, or public-URL step fails.
- The migration defines `daily_content_packages_brand_date_key` and checks
  `pg_constraint`; a partially created table either receives the named unique
  constraint or fails visibly if preexisting data violates it.
- The migration was not applied locally or remotely. No publish/deploy action
  was performed.
