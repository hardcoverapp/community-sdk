# Hardcover SDK

Hardcover's official SDKs, built for the community. Client libraries for the
[Hardcover](https://hardcover.app) GraphQL API, maintained by the Hardcover
team and open to contributions.

There is one shared, language-neutral contract (operations, enums, errors and
behavior tests), and each language is a thin layer on top of it. The API
decides; the SDK passes its answers through, and takes care of what every app
would otherwise repeat:

- typed resources (`library`, `reads`, `lists`, `journal`, `goals`, `vibes`,
  `prompts`, `books`, `search`) with one consistent shape across them
- rate limits: pacing from the API's headers, backoff when other apps share the
  same budget, and opt-in batching of concurrent reads
- one error taxonomy, with missing scopes and failed actions spelled out
- local details apps get wrong: ISBN cleanup, token cleanup
- incremental library sync with a server-side cursor

**Status: TypeScript in progress.** The first consumers are the Hardcover docs
site (live examples) and a React Native app, so TypeScript comes first and must
run in browsers, Node and React Native (Hermes). Swift, Kotlin (Java-friendly),
Python and Ruby follow once the shared layer has proven itself. Nothing is
published to a package registry yet.

## Language matrix

Generated from [`languages.json`](languages.json). Run `pnpm matrix` after
changing it.

<!-- MATRIX:START -->
| Feature | TypeScript | Swift | Kotlin (Java-friendly) | Python | Ruby |
|---|:-:|:-:|:-:|:-:|:-:|
| **Core** |  |  |  |  |  |
| GraphQL transport + raw query escape hatch | ✅ | ⬜ | ⬜ | ⬜ | ⬜ |
| Normalized error taxonomy | ✅ | ⬜ | ⬜ | ⬜ | ⬜ |
| Action envelope unwrapping (`error` / `errors`) | ✅ | ⬜ | ⬜ | ⬜ | ⬜ |
| Rate-limit pacing, 429 backoff, request batching | 🟡 | ⬜ | ⬜ | ⬜ | ⬜ |
| Types generated from `shared/operations` | ✅ | ⬜ | ⬜ | ⬜ | ⬜ |
| **Auth** |  |  |  |  |  |
| Personal access token | ✅ | ⬜ | ⬜ | ⬜ | ⬜ |
| OAuth authorization code + PKCE | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| OAuth device grant | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| Refresh rotation + revoke | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| **Resources** |  |  |  |  |  |
| `me` (read) | ✅ | ⬜ | ⬜ | ⬜ | ⬜ |
| `books` / `editions` (read) | ✅ | ⬜ | ⬜ | ⬜ | ⬜ |
| `search` (read) | ✅ | ⬜ | ⬜ | ⬜ | ⬜ |
| `library` (user books): read | ✅ | ⬜ | ⬜ | ⬜ | ⬜ |
| `library` (user books): write | ✅ | ⬜ | ⬜ | ⬜ | ⬜ |
| `reads` (dates + progress): read | ✅ | ⬜ | ⬜ | ⬜ | ⬜ |
| `reads` (dates + progress): write | 🟡 | ⬜ | ⬜ | ⬜ | ⬜ |
| `journal`: read | ✅ | ⬜ | ⬜ | ⬜ | ⬜ |
| `journal`: write | ✅ | ⬜ | ⬜ | ⬜ | ⬜ |
| `lists`: read | ✅ | ⬜ | ⬜ | ⬜ | ⬜ |
| `lists`: write | ✅ | ⬜ | ⬜ | ⬜ | ⬜ |
| `goals`: read | ✅ | ⬜ | ⬜ | ⬜ | ⬜ |
| `goals`: write | ✅ | ⬜ | ⬜ | ⬜ | ⬜ |
| `vibes`: read | ✅ | ⬜ | ⬜ | ⬜ | ⬜ |
| `vibes`: write (Supporter perk) | ✅ | ⬜ | ⬜ | ⬜ | ⬜ |
| `prompts`: read | ✅ | ⬜ | ⬜ | ⬜ | ⬜ |
| `prompts`: write (ask, answer, follow) | ✅ | ⬜ | ⬜ | ⬜ | ⬜ |
| **Testing** |  |  |  |  |  |
| Mock transport + shared fixtures | 🟡 | ⬜ | ⬜ | ⬜ | ⬜ |
| Shared conformance suite passes | ✅ | ⬜ | ⬜ | ⬜ | ⬜ |
| Contract tests vs `api-snapshot` | ✅ | ⬜ | ⬜ | ⬜ | ⬜ |
| Live integration tests: reads (opt-in) | ✅ | ⬜ | ⬜ | ⬜ | ⬜ |
| Live integration tests: writes (opt-in, real-user flows) | ✅ | ⬜ | ⬜ | ⬜ | ⬜ |
| **Runtimes** |  |  |  |  |  |
| Node + browser (docs site) | 🟡 | ➖ | ➖ | ➖ | ➖ |
| React Native (Hermes) | 🟡 | ➖ | ➖ | ➖ | ➖ |
| **Release** |  |  |  |  |  |
| Published to package registry | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |

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
packages/         one directory per language (typescript/ first), plus playground/
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

## Playground

A local page for trying any SDK call against a real API:

```sh
pnpm playground   # http://localhost:5173
```

Paste a personal access token under Connection (kept in that browser's local
storage; local development only), pick a resource and method, fill in the
inputs, and run it. The page shows the result, every request the SDK sent, the
rate-limit state, and typed errors with their fields. Methods that change data
are labeled, and anything that deletes asks first.

Local setup: browsers only see the rate-limit headers if local Hasura runs with
`HASURA_GRAPHQL_DISABLE_CORS: "true"` (spec/04, spec/06 #24).

## Live tests

These are off by default; mocks always come first. To run them against a real server, set a test
account's token:

```sh
cd packages/typescript
HARDCOVER_API_KEY=hc_pat_... HARDCOVER_ENV=staging pnpm test:live          # reads
HARDCOVER_API_KEY=hc_pat_... HARDCOVER_ENV=local pnpm test:live:writes      # plus real-user writes
```

See [spec/04](spec/04-testing.md#layer-3-live-integration) for every variable,
including local and Conductor targets.

## Contributing

Issues and pull requests are welcome. Start with the [spec](#spec): changes to
behavior go through the shared layer (`shared/`) and its conformance cases, so
every language stays in step. [spec/05](spec/05-adding-a-language.md) covers
adding a language. Live tests are opt-in and only act the way a real reader
would; they never probe limits or access rules.

