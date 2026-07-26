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

## Follow-up review P1 — adapter evidence enrichment

### RED

Added deterministic adapter tests for the real provider source shape
`{ uri, title }`. Before the fix:

```text
npx vitest run tests/unit/research.test.js
```

Result: exit 1, 14 passed / 2 failed. `fetch` was never called for the provider
link and incomplete page metadata was returned as a source instead of rejected.

### GREEN

```text
npx vitest run tests/unit/research.test.js tests/unit/content-research.test.js tests/unit/generate.test.js
```

Result: exit 0 — 3 test files passed, 26 tests passed.

`researchContext` now enriches up to five provider/cache links server-side,
using public DNS resolution, private-address rejection, no credentials, manual
redirect rejection, an HTML-only request, and a five-second timeout. It extracts
publisher, publication date and summary from page metadata, records the
consulted time, then passes the record through the existing strict source
contract. Incomplete or unsafe links are omitted, so the wrapper returns its
explicit unavailable state rather than fabricating evidence. Generated images
remain outside this evidence-fetch path.

## Follow-up security review — DNS-pinned evidence retrieval

### RED

Expanded the deterministic research tests for a pinned custom lookup (the DNS
rebind prevention model), IPv4-mapped IPv6 rejection, redirect rejection, and
an HTML body exceeding 256 KiB. Before replacing the global fetch path:

```text
npx vitest run tests/unit/research.test.js
```

Result: exit 1, 17 passed / 2 failed. The production path did not call the
HTTP(S) transport with a pinned lookup; it still used global fetch.

### GREEN

```text
npx vitest run tests/unit/research.test.js tests/unit/content-research.test.js tests/unit/generate.test.js
```

Result: exit 0 — 3 test files passed, 29 tests passed.

The adapter now resolves addresses first and rejects unsafe ranges, including
IPv4-mapped IPv6 forms. It performs HTTP(S) through a custom `lookup` returning
only the selected vetted address while preserving the original hostname as SNI
and Host. Redirects are not followed, credentials are omitted, and declared or
streamed HTML over 256 KiB is rejected before metadata parsing.
