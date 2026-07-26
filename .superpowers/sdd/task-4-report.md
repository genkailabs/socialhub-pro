# Task 4 report — Conteúdo de hoje no Composer

## RED

```text
npx.cmd vitest run tests/unit/daily-content-brief.test.jsx
```

Result: exit 1 as expected before implementation. Vitest could not resolve
`@/components/composer/DailyContentBrief`; the new decision surface and the
ephemeral Composer adapter did not exist.

## GREEN

Focused result:

```text
npx.cmd vitest run tests/unit/daily-content-brief.test.jsx
```

Result: exit 0 — 1 test file passed, 8 tests passed. Coverage includes ready
deliverables/source/action visibility, unavailable state, prepare success and
error, ready-only approval, future-only scheduling, and package-to-Composer
hydration without a post id.

Required regression:

```text
npx.cmd vitest run tests/unit/daily-content-brief.test.jsx tests/unit/composer-canvas-fixes.test.jsx
```

Result: exit 0 — 2 test files passed, 13 tests passed.

Production integration:

```text
npm.cmd run build
```

Result: exit 0. Next.js compiled, type/lint checks completed, all 26 pages
were generated, and the standalone package was prepared. Existing Sentry source
map/global-error warnings remain non-fatal.

## Delivered

- The authenticated `/composer` page reads the active brand's package for the
  current day through the owner-scoped server data helper. Query failures and
  absent/failed/draft packages produce a precise prepare/unavailable state;
  no success state is invented.
- The first Composer viewport now has an editorial decision panel for topic,
  reason, generated IA art, caption, hashtags, alt text, recommended time,
  stored source anchors/provenance, and a concise Hub explanation.
- `Preparar conteúdo`, `Aprovar`, and `Agendar` consume the Task 3 server
  actions and their serializable responses. Scheduling is blocked locally
  without a future timestamp, while the server action remains the authority.
  None of these UI paths creates or publishes a post.
- `Editar` reloads `/composer?daily=<package-id>` and injects an ephemeral
  `initialDraft` with the package's actual caption, hashtags, alt text, media,
  and available headline layer. Its `id` is null, so the existing Composer only
  creates a post if the user explicitly saves one.

## Review corrections

### RED

```text
npx.cmd vitest run tests/unit/daily-content-brief.test.jsx
```

Result: exit 1 as expected. The new timezone helper did not exist, so Vitest
could not resolve `@/lib/daily-content-date`. This captured the missing
São Paulo date boundary before changing the server page. Once the helper was
introduced, the added UI regressions also exercised the prior behavior:
injected content claimed "Rascunho salvo", internal evidence was hidden,
long captions were expanded, and unavailable messages were duplicated.

### GREEN

Focused result:

```text
npx.cmd vitest run tests/unit/daily-content-brief.test.jsx tests/unit/composer-canvas-fixes.test.jsx
```

Result: exit 0 — 2 test files passed, 19 tests passed.

Production integration:

```text
npm.cmd run build
```

Result: exit 0. Next.js compiled, type/lint checks completed, all 26 pages
were generated, and the standalone package was prepared. Existing Sentry
global-error/source-map warnings remain non-fatal.

### Corrected behavior

- An injected daily package is explicitly ephemeral and the Composer says
  "Conteúdo do dia carregado" until the user chooses to save it.
- The current-day lookup uses `America/Sao_Paulo`, including around UTC
  midnight.
- Internal approved-context evidence is visible even without an external URL.
- Hub copy now states why the theme was selected or why preparation is
  unavailable. Long captions start collapsed with an accessible reveal so the
  decision actions remain near the first viewport.
- Unavailable state and action errors each have one accessible announcement.
