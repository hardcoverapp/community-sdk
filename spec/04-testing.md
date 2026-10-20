# 04. Testing

Testing has three layers, and each answers a different question:

| Layer | Question | Network | Runs |
|---|---|---|---|
| 1. Mock transport + fixtures | Does the SDK behave correctly? | none | every commit |
| 2. Contract tests | Does the SDK still match the API? | none, plus a scheduled live introspection | every commit, plus nightly drift |
| 3. Live integration | Does it actually work against a real server? | yes, opt-in | locally or in CI when a key is set |

Layers 1 and 2 must pass without secrets, so forks and outside contributors
get full CI.

## Layer 1: mock transport and fixtures

Every SDK's transport is an interface, and the mock implementation ships
**publicly** (`@x/sdk/testing`, `HardcoverTesting`, …) so SDK users can
test their own code too.

- **`MockTransport`** takes a queue of responses (a request handler form is
  planned). It records every request for
  assertions.
- Planned: **`mockClient({ fixtures })`** answers by operation name plus variables from
  `shared/fixtures/`. Unknown operations fail loudly with the operation name,
  never with a silent empty result.
- **Fake clock.** Retry and backoff read time through an injectable clock, so
  rate-limit tests run instantly.
- **Conformance suite.** [`shared/conformance/cases.json`](../shared/conformance/cases.json)
  holds the language-neutral behavior cases: error mapping, action envelopes,
  429 handling, the no-retry-on-mutation rule. Each language ships a roughly
  50-line runner. **These cases are the definition of parity**; a README
  matrix cell turns ✅ only when the covering cases pass.
- **Unit tests** cover the logic an SDK owns: progress math, local dates,
  rating validation, chunking, header parsing, PKCE generation.
  Trivial pass-through methods don't need their own tests.

## Layer 2: contract tests

These assert that nothing changed underneath the SDK.

### Static checks (every commit, offline)

1. **`scripts/validate-operations.mjs`** validates every document in
   `shared/operations` against `api-snapshot/schema.graphql`. A removed field,
   renamed argument or changed input type fails CI.
2. **Codegen freshness.** Regenerate each language's types and fail if the
   output differs from what's committed.
3. **Scope map.** Every operation's root fields exist in
   `capability-scopes.json`, so an unmapped root, which the gateway would block,
   fails CI.
4. **Matrix freshness.** `scripts/render-matrix.mjs --check`.
5. **Nullable list filters.** An optional list variable used in `_in` / `_nin`
   must declare a default. Hasura rejects `_in: null` at runtime ("expected a
   list, but found null") instead of ignoring the filter; the first live run
   caught this in `GetLibrary`.

### Drift check (nightly and on demand)

This needs `HARDCOVER_API_KEY`. The key needs broad read scopes; introspection
is cost-free.

1. Introspect the target environment (`prod` by default, `staging` to catch
   changes before they ship) and fetch `/capabilities`.
2. Diff against `api-snapshot/` with a breaking-change classifier
   (`@graphql-inspector/core`):
   - **Breaking, and touches a field in `shared/operations`:** fail and open
     an issue naming the operation and the SDK methods affected.
   - **Breaking elsewhere, or dangerous:** warn.
   - **Additive:** report as "snapshot refresh available".
   - **Scope changes** (an operation's required scopes changed): fail, because
     they break callers silently.
3. Re-run `validate-operations.mjs` against the live schema. This is the
   definitive "would the SDK still work" check.

Running the drift check against **staging** is how we find out before prod
does. It's worth wiring into the app repo's deploy pipeline later, so an app
PR that breaks an SDK operation is flagged on the PR itself.

### React Native (Hermes) check

`pnpm hermes:smoke` bundles a smoke script and checks it two ways:
1. **Syntax:** transforms the bundle with `@react-native/babel-preset`
   (`hermes-stable`, as Metro ships it) and compiles it with the current
   `hermesc` from `hermes-compiler`. Runs everywhere, including CI.
2. **Runtime** (with `HERMES_BIN`): lowers everything and runs it on a Hermes
   CLI engine, driving the SDK through `MockTransport`. The CLI has no `Intl`
   time zones, so date checks skip there.

`tests/runtime-globals.test.ts` guards the same ground statically (no
Node-only or browser-only globals in `src/`, and no `await` inside an object
spread, which React Native's async transform miscompiles). The definitive check
is a smoke screen in the real React Native app, when that work starts; until
then the matrix row stays 🟡.

## Layer 3: live integration

These run real operations against a real server. **Mocks are always the
default.** Live tests run only when explicitly invoked (`pnpm test:live` in
TypeScript; each language provides an equivalent command). Having a key in
`.env` or the shell never turns live calls on by itself, so the default test
command, an IDE run button, or a bare test-runner invocation over the live
files all stay offline.

### Environment variables

The same names are used in every language.

| Variable | Purpose |
|---|---|
| `HARDCOVER_LIVE` | `1` is the explicit opt-in. Set only by the live test command, never by hand in `.env`. Without it every live test is skipped |
| `HARDCOVER_API_KEY_LIMITED` | Optional second token with only `read:catalog`, for the error-handling contract checks. Skipped without it |
| `HARDCOVER_API_KEY` | Credential for the live suite; does not enable it. A PAT for a **dedicated test account**, never a personal account |
| `HARDCOVER_ENV` | `local`, `staging` or `prod` (default `staging`), resolved through `shared/environments.json` |
| `HARDCOVER_API_URL` | Overrides the GraphQL URL (e.g. Conductor `http://localhost:<port+1>/v1/graphql`) |
| `HARDCOVER_LIVE_WRITES` | Set only by the live **writes** command (`pnpm test:live:writes` in TypeScript), never in `.env`. Without it, tests that change data are skipped even under `test:live` |
| `HARDCOVER_RECORD` | Planned: `1` writes scrubbed responses into `shared/fixtures/` |
| `HARDCOVER_TEST_BOOK_ID` | Pins the write tests' randomly chosen book, to repeat a run exactly. Each run logs the one it chose |
| `HARDCOVER_ALLOW_REMOTE_WRITES` | Required, on top of the writes command, for writes against any remote target (staging or prod). Local data is disposable; remote data isn't |
| `HARDCOVER_OAUTH_CLIENT_ID` | Enables the device-grant smoke test, which is interactive and never runs in CI |

Developers put these in an untracked `.env` file. CI reads them from
environment-scoped secrets (`staging`, `prod`), and the live job is a
separate, explicitly triggered CI job that calls the live test command.

### Test design rules

- **Act like a real user, nothing more.** Live tests only do what a real
  person using an app built on the SDK would do: search, shelve a book, update
  progress, write a journal entry, build a list. They never probe access
  control, scopes, rate limits, validation or other server-side limits. That
  behavior belongs to the API project's own tests. The SDK's job is to
  *handle* the errors those limits return, which the mock-based conformance
  cases (layer 1) verify from the documented response shapes.
- **Error-handling contract checks are the exception, and stay small.** A
  handful of live calls may deliberately cause a real error to confirm the SDK
  handles the server's actual response (a mock written from reading the code
  can be wrong, or drift). They check the SDK's handling, never which rules
  the API enforces. Today: `HARDCOVER_API_KEY_LIMITED`, a token with only
  `read:catalog`, confirms a real 403 becomes a `ScopeError` whose
  `missingScopes` lists every scope the gateway named. Nothing is written; the
  gateway rejects before running. That token belongs to the same user, so its
  tests wait for the shared allowance first (the burst budget is per user).
- **Discover read targets.** Tests find their data at runtime (the most
  popular book with a slug and ISBN, the token user's own lists and shelf)
  instead of hard-coding ids, so one suite runs on local, staging and prod.
- **Writes clean up after themselves.** Each write test creates what it needs
  (a list named `sdk-test-<runId>`, a user book on a known book) and deletes it
  in `finally` or teardown. Planned: a sweeper that deletes `sdk-test-*` lists older than 1
  hour to recover from crashed runs.
- **Stay inside the rate limit.** Run serially with one shared client (the
  TypeScript live config sets `isolate: false`) so the SDK's pacing sees every
  request made with the token. The target is zero 429s per run; count them on
  the local gateway (`docker logs hardcover-api | grep -c "Completed 429"`).
  Never trigger a 429 on purpose; 429 handling is covered by conformance cases.
- **Remote data is read-only by default.** Writes run only under the writes
  command, and against staging or prod only with
  `HARDCOVER_ALLOW_REMOTE_WRITES=1` as well. Local data is disposable, so local
  write tests may use any book; remote ones only touch books not already on the
  shelf, and always clean up.

### Local and Conductor

Against a local stack (`make` in `app/`, API on `:8081`):

1. Seed or create a test user with the `api_tokens` feature flag.
2. Mint a PAT.
3. Set `HARDCOVER_ENV=local`.

For a Conductor workspace, use `HARDCOVER_API_URL=http://localhost:$((CONDUCTOR_PORT+1))/v1/graphql`.
Running the SDK's live suite against a workspace with an API change in flight
is the fastest way to see whether that change breaks SDK consumers.

**Browser setup (local).** Until the API fix for spec/06 #24 lands, local Hasura
needs `HASURA_GRAPHQL_DISABLE_CORS: "true"` (e.g. in an untracked
`app/docker-compose.override.yml` under `services.hasura.environment`, then
`docker compose up -d hasura`). Without it browsers can't read the rate-limit
headers, so the playground and browser apps can't pace proactively. Check a
target with:

```sh
curl -s -D - -o /dev/null -X POST <graphql-url> -H "Origin: https://example.com" \
  -H "content-type: application/json" -H "authorization: Bearer <token>" \
  -d '{"query":"{ me { id } }"}' | grep -i access-control-expose
```

`RateLimit-Policy, RateLimit, …` is good; `X-Hasura-Query-Cache-Key, …` means
the headers are hidden.

**Search after a restore.** A restored staging dump has no Typesense index, so
`search` returns `"Not found."` and the live search tests skip.
`scripts/local/partial-search-index.rb` queues the app's own index jobs over a
small popular slice (about 10k documents, all eight types, a couple of
minutes). Its header has the two commands to run it.
