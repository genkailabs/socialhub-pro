# Task 2 report — Pesquisa e mídia com evidência rastreável

## RED

Command:

```text
npx vitest run tests/unit/content-research.test.js
```

Result: exit 1 as expected before implementation. Vitest could not resolve
`@/lib/content-source-contract` from `tests/unit/content-research.test.js`.
This proves the newly specified contract module was absent.

After adding the generate integration test, the focused command also failed as
expected before its implementation:

```text
npx vitest run tests/unit/generate.test.js
```

Result: exit 1. The new test showed `researchContext` was called once despite a
`verifiedResearch` override being supplied.

## GREEN

Command:

```text
npx vitest run tests/unit/content-research.test.js tests/unit/generate.test.js
```

Result: exit 0 — 2 test files passed, 10 tests passed.

## Delivered

- `validateContentSources` normalizes serializable factual sources and image provenance, rejects invalid/duplicate/missing records, and distinguishes AI-generated images.
- `researchForOpportunity` invokes the existing `researchContext` adapter once and returns `{ status: 'unavailable', reason, research: null }` for provider failure or invalid provenance.
- `generateCreative` accepts `verifiedResearch`, injects it into the content prompt, and skips a second `researchContext` call.

## Self-review

- Verified only the five task files plus this report are included in the task diff.
- No external/provider calls were performed by tests; all research inputs are deterministic mocks.
- Existing generation behavior remains covered when no `verifiedResearch` override is passed.

## Known integration consideration

The current `researchContext` provider/cache contract may return legacy sources
without the required provenance metadata. Those records now correctly produce
the explicit unavailable outcome until the upstream adapter supplies complete
source fields; this task intentionally does not fabricate them.
