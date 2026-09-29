# Hardcover SDK

Client libraries for the [Hardcover](https://hardcover.app) GraphQL API. There
is one shared, language-neutral contract, and each language is a thin layer on
top of it.

**Status: TypeScript core in progress.** The first two official consumers
are the Hardcover docs site (live examples) and a React Native app, so
TypeScript comes first and must run in both the browser and React Native.
Swift, Kotlin (Java-friendly) and Python follow once the shared layer has
proven itself.

## Language matrix

Generated from [`languages.json`](languages.json). Run `pnpm matrix` after
changing it.

<!-- MATRIX:START -->
| Feature | TypeScript | Swift | Kotlin (Java-friendly) | Python |
|---|:-:|:-:|:-:|:-:|
| **Core** |  |  |  |  |
| GraphQL transport + raw query escape hatch | ✅ | ⬜ | ⬜ | ⬜ |
| Normalized error taxonomy | ✅ | ⬜ | ⬜ | ⬜ |
| Action envelope unwrapping (`error` / `errors`) | ✅ | ⬜ | ⬜ | ⬜ |
| Rate-limit headers, 429 retry, request chunking | 🟡 | ⬜ | ⬜ | ⬜ |
| Types generated from `shared/operations` | ✅ | ⬜ | ⬜ | ⬜ |
| **Auth** |  |  |  |  |
| Personal access token | 🟡 | ⬜ | ⬜ | ⬜ |
| OAuth authorization code + PKCE | ⬜ | ⬜ | ⬜ | ⬜ |
| OAuth device grant | ⬜ | ⬜ | ⬜ | ⬜ |
| Refresh rotation + revoke | ⬜ | ⬜ | ⬜ | ⬜ |
| **Resources** |  |  |  |  |
| `me` (read) | ✅ | ⬜ | ⬜ | ⬜ |
| `books` / `editions` (read) | ✅ | ⬜ | ⬜ | ⬜ |
| `search` (read) | ✅ | ⬜ | ⬜ | ⬜ |
| `library` (user books): read | ✅ | ⬜ | ⬜ | ⬜ |
| `library` (user books): write | ✅ | ⬜ | ⬜ | ⬜ |
| `reads` (dates + progress): read | ✅ | ⬜ | ⬜ | ⬜ |
| `reads` (dates + progress): write | 🟡 | ⬜ | ⬜ | ⬜ |
| `journal`: read | ✅ | ⬜ | ⬜ | ⬜ |
| `journal`: write | ✅ | ⬜ | ⬜ | ⬜ |
| `lists`: read | ✅ | ⬜ | ⬜ | ⬜ |
| `lists`: write | ✅ | ⬜ | ⬜ | ⬜ |
| `goals`: read | ✅ | ⬜ | ⬜ | ⬜ |
| `goals`: write | ✅ | ⬜ | ⬜ | ⬜ |
| **Testing** |  |  |  |  |
| Mock transport + shared fixtures | 🟡 | ⬜ | ⬜ | ⬜ |
| Shared conformance suite passes | ✅ | ⬜ | ⬜ | ⬜ |
| Contract tests vs `api-snapshot` | 🟡 | ⬜ | ⬜ | ⬜ |
| Live integration tests: reads (opt-in) | ✅ | ⬜ | ⬜ | ⬜ |
| Live integration tests: writes (opt-in, real-user flows) | ✅ | ⬜ | ⬜ | ⬜ |
| **Runtimes** |  |  |  |  |
| Node + browser (docs site) | 🟡 | ➖ | ➖ | ➖ |
| React Native (Hermes) | ⬜ | ➖ | ➖ | ➖ |
| **Release** |  |  |  |  |
| Published to package registry | ⬜ | ⬜ | ⬜ | ⬜ |

✅ done · 🟡 partial · ⬜ planned · ➖ not applicable
<!-- MATRIX:END -->

A cell turns ✅ only when that language passes the matching
[conformance cases](shared/conformance). See
[spec/05](spec/05-adding-a-language.md).

## Layout

```
api-snapshot/     frozen copy of the public schema + scope map (codegen input)
shared/
  operations/     every GraphQL document, once (validated against the snapshot)
  enums.json      status, privacy, reading format, date precision, search types
  errors.json     error taxonomy + how to recognize each raw failure
  environments.json  prod / staging / local endpoints
  conformance/    language-neutral behavior tests every SDK must pass
  fixtures/       recorded, scrubbed API responses for mock clients
packages/         one directory per language (empty for now)
scripts/          case-operations, validate-operations, render-matrix
spec/             the design
```

## Spec

1. [The public API surface](spec/01-api-surface.md): endpoints, auth, scopes,
   actions, limits, error shapes
2. [How the app uses the data](spec/02-app-usage.md): the first-party client
   patterns and domain rules to mirror
3. [SDK design](spec/03-sdk-design.md): layers, pipeline, casing, resources,
   versioning
4. [Testing](spec/04-testing.md): mocks, contract and drift tests, opt-in live
   tests
5. [Adding a language](spec/05-adding-a-language.md)
6. [Open questions](spec/06-open-questions.md)

## Commands

```sh
pnpm install
pnpm validate:operations   # shared/operations vs api-snapshot/schema.graphql
pnpm matrix                # regenerate the table above
```

## Live tests

These are off by default and arrive with the TypeScript package. To run them against a real server, set a test
account's token:

```sh
HARDCOVER_API_KEY=hc_pat_... HARDCOVER_ENV=staging pnpm test:live
```

See [spec/04](spec/04-testing.md#layer-3-live-integration) for every variable,
including local and Conductor targets.
