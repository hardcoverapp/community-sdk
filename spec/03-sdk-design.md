# 03. SDK design (language-neutral)

These rules apply to every language. Language-specific notes are at the end.
Where a language's idiom conflicts with a rule here, the idiom wins on
**naming and syntax** only, never on behavior. Behavior is pinned by the
[conformance suite](../shared/conformance).

## Principles

1. **Operations are data.** Every GraphQL document lives once, in
   `shared/operations/`. Languages generate types from these files plus
   `api-snapshot/schema.graphql` and never hand-write query strings.
2. **Thin, honest wrappers.** Resource methods map closely to operations. Any
   convenience (percent progress, remove-book-by-ids) is documented as a
   convenience, with its extra request count stated.
3. **Always an escape hatch.** `client.graphql(query, variables)` runs anything
   the token allows, with the same auth, retries and error mapping.
4. **Fail loudly, typed.** Every failure becomes a class from
   [`shared/errors.json`](../shared/errors.json). No `{data, errors}` tuples
   leak out of resource methods.
5. **Never double-write.** Mutations are not retried when it's unknown whether
   they landed.

## Layers

```
┌──────────────────────────────────────────────────────────┐
│ Resources   me · books · search · library · reads ·      │  hand-written, thin
│             journal · lists · goals                       │
├──────────────────────────────────────────────────────────┤
│ Operations  generated typed documents + result types      │  codegen from shared/
├──────────────────────────────────────────────────────────┤
│ Core        request pipeline: auth → send → classify →    │  hand-written
│             retry → unwrap envelopes → typed error        │
├──────────────────────────────────────────────────────────┤
│ Transport   HTTP (fetch / URLSession / OkHttp / httpx)    │  pluggable; mock in tests
└──────────────────────────────────────────────────────────┘
      Auth       TokenProvider: static PAT | OAuth (refreshing)
```

## Client configuration

| Option | Default | Notes |
|---|---|---|
| `token` or `tokenProvider` | required | A string is treated as a static token |
| `environment` | `prod` | `prod`, `staging` or `local`, from `shared/environments.json` |
| `endpoint` | from environment | Overrides the GraphQL URL (Conductor ports, proxies) |
| `transport` | platform HTTP | Swap in the mock transport for tests |
| `maxRetries` | 3 | Applies to 429 and to query-only network/5xx retries |
| `timeoutMs` | 35000 | Just above the server's 30s |
| `userAgent` | `hardcover-sdk-<lang>/<version>` | Callers append their app name. The gateway logs it per token |
| `timezone` | `me.timezone`, then the runtime zone | Used for `user_date` defaults |
| `onRateLimit` | none | Hook called with parsed headers after each response |

## Auth

- **`TokenProvider`** is the only thing the core knows about. It exposes
  `getToken()` and optionally `refresh()`.
- **Static token (PAT).** Detect the prefix. Warn once on a legacy JWT, and
  reject `hc_rt_` / `hc_ac_` with a clear message.
- **OAuth helpers** live in a separate entry point so PAT-only users don't pay
  for them:
  - `buildAuthorizeUrl({clientId, redirectUri, scopes, state})` returns
    `{url, codeVerifier}`. It is S256 only.
  - `exchangeCode({code, codeVerifier, clientSecret?})` returns `TokenSet`.
  - `startDeviceAuthorization({clientId, scopes})`, then `pollDeviceToken(...)`.
    Polling handles `authorization_pending` and `slow_down` (+5s each)
    internally and stops at `expires_in`.
  - `refresh(tokenSet)` rotates. The provider **must persist the new refresh
    token before using the new access token**, via an `onTokens(tokenSet)`
    callback, because reusing a rotated refresh token revokes the whole family.
    Concurrent refreshes are de-duplicated, as in the app's
    `refreshSessionToken.ts`.
  - `revoke(token)`.
- **On 401** with a refreshable provider: refresh once, replay once, then raise
  `AuthenticationError`.
- **Scope helpers.** Generate `requiredScopes(operationName)` from
  `api-snapshot/capability-scopes.json` and show it in each method's doc
  comment. A `ScopeError` message names the missing scope and links to the PAT
  link builder.

## Request pipeline

1. Serialize `{query, variables, operationName}`. The query comes from the
   generated document; `operationName` makes gateway logs readable.
2. Send with `Authorization: Bearer <token>` and `User-Agent`.
3. Parse the `RateLimit` and `RateLimit-Policy` headers (fall back to
   `X-RateLimit-*`) into `client.rateLimit` and call `onRateLimit`.
4. Classify the response with the `match` rules in `errors.json`. The first
   match wins, in file order.
5. Retry:
   - **429:** sleep `Retry-After`, up to `maxRetries`. Skip the retry if the
     daily window is the exhausted one.
   - **Network failure, 5xx or 408:** retry **queries only**, with backoff of
     250ms, 1s, then 4s.
   - **Mutations** get no network retry. Raise `NetworkError` with
     `mayHaveSucceeded: true`.
6. Unwrap action envelopes. For each top-level field whose selection contains
   `error` or `errors`, a non-null `error` or a non-empty `errors` raises
   `ActionError{operation, messages}`.
7. Return the typed data.

### Chunking

`client.batch([...ops])` packs operations into requests of at most **5**
top-level fields each, and at most **1** `search` per request. It merges the
results in order and reports per-item failures without failing the whole
batch. Resource methods never exceed 5 on their own.

## Casing

- Shared operations use the schema's **snake_case field names with no
  aliases**, which keeps them schema-true and codegen-friendly.
- **Each language's codegen maps to its idiom.** TS, Swift and JVM use
  camelCase property names; Python keeps snake_case.
- **Input objects** (`UserBookCreateInput`, etc.) are generated the same way.
  The SDK converts back to snake_case on the wire.
- **This differs from the app**, which aliases by hand. It's intentional: hand
  aliases are what drifted in the old `sdk/` scaffold.

## Types for JSON columns

Several fields are `jsonb` and have no schema type:

- `cached_image`, `cached_contributors`, `cached_tags`
- `search.results`
- `activities.data`
- `reading_journals.metadata`
- `goals.conditions`

For v1, ship hand-written types for `cached_image`, `cached_contributors`,
`cached_tags` and the per-`query_type` search hits. Keep each as a small
override map next to codegen, and mark them as "shape observed, not
guaranteed". Everything else stays as untyped JSON.

## First consumers

The first two official uses set v1 priorities. A feature either of them needs
ships before anything they don't.

| Consumer | Runtime | Needs first |
|---|---|---|
| Docs site (`hardcover-docs`) | Browser, Astro build (Node) | PAT auth, `search`, `books`, `library`, `reads`; readable example code for each guide page |
| React Native app | Hermes | OAuth PKCE with a native custom-scheme redirect, device grant, refresh rotation, `me`, `library`, `reads`, `journal`, `lists`, `search` |

## Resources (v1)

Each method notes its operation, its required scope and any extra requests.

| Resource | Methods | Operations |
|---|---|---|
| `me` | `get()` (cached per client) | Me |
| `books` | `get(id)`, `getBySlug(slug)`, `getMany(ids)`, `editions(bookId, page)`, `findByIsbn(isbns)`, `trending({duration, page})` (2 requests: ids, then books) | GetBook, GetBookBySlug, GetBooks, GetEditionsForBook, FindEditionsByIsbn, TrendingBookIds |
| `search` | `books(q, opts)`, `authors`, `series`, `lists`, `users`, `characters`, `publishers`, `prompts`, `raw(q, type, opts)` | Search |
| `library` | `list({status, page})`, `iterate({status})`, `count({status})`, `forBook(bookId)`, `get(id)`, `add(bookId, {status, editionId, rating, privacy})`, `update(id, patch)`, `setStatus(id, status, {date})`, `rate(id, rating)`, `remove(id)` | GetLibrary, CountLibrary, GetUserBookForBook, GetUserBook, AddUserBook, UpdateUserBook, RemoveUserBook |
| `reads` | `start(userBookId, {date, editionId})`, `setProgress(readId, {pages \| seconds \| percent})`, `finish(readId, {date, precision})`, `update`, `remove` | AddUserBookRead, UpdateUserBookRead, RemoveUserBookRead |
| `journal` | `forBook(bookId, page)`, `add({bookId, event, entry, privacy, tags})`, `remove(id)` | GetJournalForBook, AddJournalEntry, DeleteJournalEntry |
| `lists` | `mine(page)`, `forUser(userId, page)`, `get(id, page)`, `create`, `update`, `delete`, `addBook(listId, bookId, {editionId, position})`, `removeBook(listId, bookId)` (2 requests) | GetListsForUser, GetList, CreateList, UpdateList, DeleteList, AddBookToList, RemoveListBook |
| `goals` | `list({includeArchived})` | GetGoals |

Methods scoped to "my" data resolve `userId` from `me.get()`, which is cached
per client. Callers can pass `userId` to skip that request.

### Pagination

- Page methods take `{limit, offset}` and return
  `{items, limit, offset, hasMore}`. `hasMore` is true when
  `items.length === limit`; no count request is made.
- `iterate()` is a lazy async sequence. It stops at the table's row cap (see
  [01](01-api-surface.md#query-roots-reachable-by-tokens)) and **respects rate
  limits** by awaiting the bucket.

### Search

- `search.<type>()` sets `query_type`, applies the docs' default
  `fields`/`weights`/`sort` for that type, and decodes `results` into typed
  hits.
- `raw()` returns the undecoded JSON.
- Every call is 1 request, which counts as 1 of the 5 allowed top-level fields
  and is the only `search` allowed in that request.

## Versioning and releases

- **One monorepo, one tag stream per language** (`typescript-v1.2.0`), using
  release-please with one component per package. The old `sdk/` scaffold's
  config can be reused.
- **Semver is per language.** A breaking API snapshot change is a major bump in
  every language that exposes the affected surface.
- **Pre-1.0 while the API is beta-gated.** 1.0 waits until tokens and OAuth
  are generally available.
- Every package records the `api-snapshot` commit it was generated against,
  exposed as `SDK.apiSnapshot`.

## Language notes

- **TypeScript (first).**
  - Isomorphic: `fetch` only, no Node built-ins in core. It runs in Node 20+,
    Deno, Bun and browsers.
  - ESM with a CJS build.
  - Codegen: `@graphql-codegen/cli` with `typed-document-node` and
    `namingConvention: change-case-all#camelCase` for fields.
  - Entry points: `@x/sdk` (client), `@x/sdk/oauth`, `@x/sdk/testing` (mock
    client and fixtures).
  - **Browser caution.** The docs contradict each other on browser use (see
    [06](06-open-questions.md)). Recommend PKCE for SPAs and never shipping a
    PAT in client code.
  - **The docs site is a first-class consumer.** `GraphQLExplorer` examples can
    show an "SDK" tab rendered from the same operation name.
  - **React Native is a first-class runtime** (Hermes), tested separately from
    Node and browsers:
    - No `AbortSignal.timeout`, WebCrypto or Node built-ins in core. Timeouts
      use `AbortController` plus `setTimeout`.
    - OAuth helpers take a pluggable crypto (`sha256`, `randomBytes`) so apps
      can pass `expo-crypto` or `react-native-quick-crypto`.
    - Redirects use a `native` app's custom scheme, opened with the platform
      auth session (e.g. `expo-web-browser` `openAuthSessionAsync`).
    - The SDK never persists tokens. `onTokens` hands them to the app for
      Keychain/Keystore storage (e.g. `expo-secure-store`), never AsyncStorage.
    - The published package bundles `shared/*.json`; Metro can't import
      outside the package.
- **Swift.**
  - async/await with `Sendable` types.
  - Codegen: `apollo-ios` codegen, or a lightweight generator over the same
    documents.
  - OAuth via `ASWebAuthenticationSession` in an optional module.
- **Kotlin, Java-friendly.** One JVM package that serves Kotlin, Android and
  plain Java callers, the way OkHttp does.
  - Kotlin source with coroutines (`suspend`) as the primary API.
  - A Java-facing surface on every public entry point: `CompletableFuture`
    and blocking variants, `@JvmOverloads` on default arguments,
    `@JvmStatic` on factories, `@file:JvmName` so there are no `*Kt`
    classes, and nullability annotations that Java tooling respects.
  - No `Flow`, `Result` or inline value classes in the Java-visible API.
  - Codegen: `apollo-kotlin` Kotlin models from the shared documents.
  - OkHttp transport.
- **Python.**
  - Sync and async clients over `httpx`.
  - Codegen: `ariadne-codegen` (pydantic models) from the same documents.
  - snake_case preserved.
  - An existing community SDK (`hardcoverpy`, in the docs showcase) is worth
    comparing before building.
