# 05. Adding a language

The first SDK (TypeScript) proves the shared layer. Each later language is
mostly a transport, a codegen config and a conformance runner.

## What a language gets for free

These already exist in `shared/` and `api-snapshot/`:

- every operation and fragment (`shared/operations/`)
- enums (`shared/enums.json`)
- the error taxonomy and matching rules (`shared/errors.json`)
- environments (`shared/environments.json`)
- behavior tests (`shared/conformance/`)
- recorded API responses (`shared/fixtures/`)
- the schema and scope map (`api-snapshot/`)

## What a language must build

| # | Piece | Done when |
|---|---|---|
| 1 | Codegen config over `shared/operations` and `api-snapshot/schema.graphql` | Types are generated in CI, and the freshness check passes |
| 2 | Enum and error generation from `shared/*.json` | No hand-written copies of ids or error names |
| 3 | Transport interface, platform HTTP transport, mock transport | Conformance runner uses the mock |
| 4 | Core pipeline (auth, classify, retry, unwrap, rate-limit state) | Every case in `shared/conformance` passes |
| 5 | Resources (v1 list in [03](03-sdk-design.md#resources-v1)) | Public API reviewed for idiom |
| 6 | OAuth helpers | PKCE unit tests pass; device-grant smoke test run once by hand |
| 7 | Live suite reading the shared env vars | Green against staging |
| 8 | Fixture-backed public mock client | Documented in the package README |
| 9 | Row in `languages.json`, with support flags set honestly | `matrix:check` passes |
| 10 | Release component in release-please config | First pre-release published |

## Review checklist for a new language

- [ ] Shared data is consumed from disk or generated from it. Nothing is copied
      by hand.
- [ ] Mutations are never retried after a network failure.
- [ ] Update methods send only the fields the caller set.
- [ ] Rotated refresh tokens are persisted before use.
- [ ] `requiredScopes` appears in method docs.
- [ ] The live suite cleans up after itself and refuses prod writes by default.
- [ ] The README matrix matches reality.

## Shared-layer changes

A change in `shared/` or `api-snapshot/` affects every language. The PR must:

1. pass `validate-operations`,
2. regenerate every language's code, and
3. run every language's conformance suite.

CI path filters make this automatic. A new conformance case can land ahead of
the implementations only if it's marked `"pending": ["swift", ...]`, which
keeps the matrix honest.
