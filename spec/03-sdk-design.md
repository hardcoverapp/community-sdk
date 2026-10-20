# 03. SDK design (language-neutral)

These rules apply to every language. Language-specific notes are at the end.
Where a language's idiom conflicts with a rule here, the idiom wins on
**naming and syntax** only, never on behavior. Behavior is pinned by the
[conformance suite](../shared/conformance).

## Principles

**Why the SDK exists.** It does what every app would otherwise have to work
out and repeat on its own: the easy-to-forget local details (splitting a scope
list into an array, cleaning up pasted ISBNs, idiomatic casing),
friendly interaction with the API (typed errors, pacing, retries that never
double-write), and the hard parts (bulk adds with partial failures, targeting
the right read on a re-read). What the API decides (matching, journaling,
permissions, read lifecycles) stays in the API. Principle 2 is the other half
of this.

1. **Operations are data.** Every GraphQL document lives once, in
   `shared/operations/`. Languages generate types from these files plus
   `api-snapshot/schema.graphql` and never hand-write query strings.
2. **Thin, honest wrappers; the API does the work.** Resource methods map
   closely to operations. When the API can do something (search matching,
   journaling, starting and finishing reads), the SDK passes through instead of
   reimplementing it, so API improvements reach SDK users without an SDK
   release. SDK-side logic is limited to client concerns (auth, retries, rate
   limits, input mapping) and to gaps the API doesn't cover yet. Each such gap
   is documented as a candidate to move into the API, with its extra request
   count stated. Current gaps: percent progress (the API takes only pages or
   seconds), the local-date default when marking a book Read, and applying
   privacy after goal creation (spec/06 #22).
3. **Always an escape hatch.** `client.graphql(query, variables)` runs anything
   the token allows, with the same auth, retries and error mapping.
4. **Fail loudly, typed.** Every failure becomes a class from
   [`shared/errors.json`](../shared/errors.json). No `{data, errors}` tuples
   leak out of resource methods.
5. **Never double-write.** Mutations are not retried when it's unknown whether
   they landed.
6. **Don't expose what users shouldn't write.** State the SDK owns (rate-limit
   state, the clock, request internals) is read-only or private, and values
   the server owns (goal progress, journal entries the server writes) have no
   setter. Decided 2026-09-28: if users shouldn't write it, the SDK doesn't
   invite them to.
7. **Never break on something the SDK has the pieces to fix, durably.**
   (Decided 2026-09-28.) A pasted token with whitespace or a `Bearer ` prefix
   is cleaned up, not rejected. But a fix must give the same result on every
   run and must not depend on state the SDK can't keep. A fix that works
   today and breaks tomorrow is worse than a clear error. The SDK only refuses
   when it genuinely can't proceed, and then says exactly what's wrong and what
   to use instead.

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
      Auth       static token today; TokenProvider (OAuth, refreshing) planned
```

### Naming

- **Consistency first** (decided 2026-09-28): the same kind of thing always
  has the same shape. What a method acts on comes first as positional ids,
  container before item (`lists.addBook(listId, bookId, options)`,
  `journal.add(bookId, entry)`); options come last as one object. Every paged
  method returns a `Page`. Every "doesn't exist" is a `NotFoundError`.
- **remove** takes a book off something the user keeps (`library.remove`,
  `lists.removeBook`). **delete** destroys something the user owns
  (`lists.delete`, `goals.delete`, `journal.delete`).
- `get(id)` returns `null` when nothing exists; methods that change something
  missing throw.
- Every public method's doc comment ends with one `Scopes:` line (tested), so
  editors show the scopes it needs on hover.

## Client configuration

| Option | Default | Notes |
|---|---|---|
| `token` | required | A PAT or OAuth access token. (`tokenProvider` for refreshing OAuth tokens: planned) |
| `environment` | `prod` | `prod`, `staging` or `local`, from `shared/environments.json` |
| `endpoint` | from environment | Overrides the GraphQL URL (Conductor ports, proxies) |
| `transport` | platform HTTP | Swap in the mock transport for tests |
| `maxRetries` | 3 | Applies to 429 and to query-only network/5xx retries |
| `timeoutMs` | 35000 | Just above the server's 30s |
| `userAgent` | `hardcover-sdk-<lang>/<version>` | Callers append their app name. The gateway logs it per token |
| `onRateLimit` | none | Hook called with parsed headers after each response |
| `onWarning` | `console.warn` | Problems that don't stop the client, e.g. a deprecated legacy JWT |
| `pace` | true | Wait for the rate-limit allowance before sending (see Pacing) |
| `sleep` | `setTimeout` | Injectable for tests |
| `now` | current time | Injectable clock for tests (pacing) |

Date defaults belong to the server: with no date given, it records the
reader's local day from their own timezone (spec/02, Dates).

## Auth

Status: static tokens are built (checks below); OAuth is planned, after
packaging and test tooling.

- **`TokenProvider`** (planned) is the only thing the core knows about. It
  exposes `getToken()` and optionally `refresh()`.
- **Static token (built).** At construction: whitespace and a pasted `Bearer `
  prefix are cleaned up; a missing token, a refresh token (`hc_rt_`) or an
  authorization code (`hc_ac_`) throws a `TypeError` saying what to use
  instead; a legacy JWT works but triggers one `onWarning` (default
  `console.warn`); any other format is sent as-is for the server to judge.
  A refresh token is always refused as `token`, even once OAuth exists:
  refresh tokens rotate, so exchanging one would spend the copy in the user's
  `.env`; the next run would replay it and the API would revoke the whole
  token family. Refresh tokens only go through `tokenProvider`, which hands
  every rotated token to the app to store (`onTokens`).
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

### Pacing

On by default (`pace: false` turns it off). The gateway charges one unit per
top-level field, minimum 1 per request (introspection and
`insert_reading_journal` fields add nothing), and every
response reports the remaining burst allowance and refill rate. Before sending,
the client counts its own request's cost the same way and reserves it from the
last known allowance, minus what its other unanswered requests have already
reserved; if that's short, it sleeps until enough has refilled. The cost is
given back when the response arrives (or the send fails). Requests sent at the
same moment therefore queue behind each other instead of all spending the same
remaining units. Before the first response, the client doesn't know its tier:
it sends up to 5 units (the smallest burst, a free-tier legacy JWT) and holds
the rest until an answer brings real numbers. A server that sends no
rate-limit headers releases them all (spec/06 #29). A 429 is still handled
(and retried) when pacing is off or another client shares the token; after
waiting one out, pacing stands down until fresh headers arrive so it never
double-waits. The daily cap is never waited out.

The allowance is **per user, not per token**. Two clients (or two tokens) for
the same person share one budget, and each only paces from the responses it
has seen. Apps should use one client per user.

Measured on the local stack: the live writes suite went from hundreds of 429s
per run to zero, with the same total duration.

### Contention backoff

The rate-limit budget is per user, not per token, so two apps (or two
clients) for one person compete for it, and each only sees the headers of its
own responses. Pacing alone makes competing clients wake at the same moment
and collide again. Decided 2026-10-07:

- A 429 when the client had no rate-limit state, or when its last headers
  showed the allowance spent, is ordinary: wait exactly `Retry-After`.
- A 429 when the last headers said there *was* room for this request is
  **contention** (someone else spent it). So is any second 429 in a row. The
  wait becomes `Retry-After` plus a random extra of up to
  `min(30s, 1s × 2^k)`, where `k` counts the contended 429s in a row (full
  jitter), so competing clients spread out instead of waking together.
- `k` resets after a successful response. The random source is injectable
  (`random`) so tests and conformance runners are deterministic.

### Request planner

Grouping calls into fewer HTTP requests, without changing what they mean.
Built 2026-10-07 (TypeScript), opt-in with the client option `batch: true`.

- The gateway accepts a **JSON array** of `{query, variables, operationName}`
  and answers with an array in the same order. It charges the sum of the
  items' fields (minimum 1 for the whole request) and rejects any request
  over the tier's burst capacity (403). So the planner groups concurrent reads
  into arrays sized to the remaining allowance and the burst capacity from
  `RateLimit-Policy`, using 5 (the smallest tier, free over a legacy JWT)
  until a response says otherwise. A lone read goes out as a plain request.
- **Mutations are barriers.** A mutation waits for everything issued before
  it, runs alone, and holds back everything issued after it. Reads are
  grouped, and identical reads (same document and variables) sent once, only
  within a run of reads; nothing is grouped, reordered or de-duplicated
  across a mutation.
- One failed item (GraphQL or action error) rejects only its caller. The
  gateway checks scopes, operation names and size for the whole array, so
  when it rejects the array for one of those, each item is sent alone to get
  its own answer. A 429 or network failure retries the whole array (reads
  only); a daily-cap 429 rejects every item.
- `graphql()` is never grouped: it's the escape hatch, sent as written.
- **Why an option, not a scope** (the earlier `client.batch(async () => …)`
  idea): there's no async context tracking on Hermes or in browsers, so a
  scope can't tell its calls from unrelated ones made concurrently. Reads
  issued within one macrotask, or while an earlier request is waiting on the
  allowance, join the same run.

### Incremental reads

Built 2026-10-07 for the library: `library.changes({ since, knownIds, limit })`
returns entries changed after a cursor, oldest first, with the next cursor and
`hasMore`.

- **The cursor is the server's, never the client's clock.** It's the
  `(updated_at, id)` of the last row returned, so paging through a run of
  equal timestamps neither skips nor repeats, and device clock skew can't lose
  changes. `updated_at` stays the server's string, which keeps microseconds a
  JS `Date` would round. Apps store the cursor as an opaque string.
- **Reads count as changes**: a read's change touches its entry.
- **Removals need ids.** Entries are deleted outright and the API has no
  deletion feed ([06](06-open-questions.md) #27). With `knownIds`, the SDK
  also reads every entry id (one field) and returns `removedIds`. Apps pass it
  once per sync, not on every page.
- Apps upsert by id. Next candidates: lists (`list_books` don't touch their
  list, so a list's changes need their own cursor), vibes, journal.

### Not in the core (modules later)

- **Caching**: off. A hidden cache serves stale data and hides server-side
  writes (journal entries the server records). Incremental reads (below)
  cover the "only what changed" need; a pluggable cache can come later as an
  optional module.
- **Stats** (decided 2026-10-07, not built): a limited, optional module. It
  covers what every reading app's stats screen repeats: fetching a period's
  finished reads with their books, tags and editions (paged and paced), and
  the period itself (life, year, month or custom, in a timezone the app
  passes: API tokens can't read the reader's profile timezone, see spec/02),
  plus the basic totals and breakdowns (books, pages, time read, ratings,
  formats, genres and moods, top authors). Anything more specific (pace
  prediction, heatmaps, how a chart looks) is the app's. Module boundary and
  packaging (e.g. `@hardcover/sdk/stats`) come with packaging.
- **API versions**: when the API adds a version header, the client sends the
  version it was generated against and passes deprecation notices to
  `onWarning`. The format and support window are the API side's call.

### Chunking

`lists.addBooks` sends its adds 5 per request. The 5 is the smallest tier's
burst capacity, so a request never exceeds what any token can pay for; reads
use the request planner instead.

## Casing

Decided 2026-09-28: **every SDK follows its language's naming convention.**
TypeScript, Swift and Kotlin use camelCase; Python uses snake_case.

- **Shared operations stay canonical.** `shared/operations` uses the schema's
  snake_case field names with no aliases, so they stay schema-true and match
  the API docs.
- **Casing is a build step, not runtime conversion.**
  `scripts/case-operations.mjs --case <camel|snake>` rewrites the shared
  operations for a language by aliasing each multi-word field
  (`releaseYear: release_year`). The server returns idiomatic keys directly,
  and codegen produces idiomatic types from the rewritten documents. There is
  no key-renaming pass over responses, so JSON column contents
  (`cached_image`, `search.results`) are never touched.
- **Operation root fields are never aliased** (`insert_user_book`,
  `user_books`). Conformance cases, the scope map and
  `ActionError.operation` stay identical across languages. Resource methods
  unwrap roots, so users rarely see them.
- **Arguments and input objects can't be aliased.** Generated input types keep
  wire names. Resource methods take idiomatic inputs and map them to wire
  fields explicitly, which is also how "send only fields the caller set" is
  enforced.
- **Both documents are validated.** CI runs `validate-operations` on
  `shared/operations` and on each language's rewritten output, which catches
  alias collisions.
- **Fixtures are recorded canonical** (snake_case, from `shared/operations`).
  A language that aliases reshapes them in its mock client using the same
  rewrite, so one fixture set serves every language.
- **JSON column contents** keep their stored keys. Hand-written types for
  `cached_image` and similar may expose idiomatic names, but that mapping is
  explicit per type, never a blanket conversion.
- **Exception: search hits.** Search documents come from the index as JSON
  with snake_case keys and string ids. Their keys are index field names, never
  user content, so the SDK converts them all to the language's casing and ids
  to numbers. `search.raw()` keeps the untouched response.
- **Planned: field descriptions as doc comments.** The docs site's
  hand-written `field-descriptions.json` (e.g. "Category ID (1=Book,
  2=Novella, …)") can feed codegen so generated types carry them as hover
  tooltips in every language. Nice-to-have, not a v1 requirement.
- **This differs from the app**, which aliases by hand in each query. Hand
  aliases are what drifted in the old `sdk/` scaffold; generated aliases can't.

## Types for JSON columns

Several fields are `jsonb` and have no schema type:

- `cached_image`, `cached_contributors`, `cached_tags`, `cached_featured_series`
- `search.results`
- `activities.data`
- `reading_journals.metadata`
- `goals.conditions`

For v1, ship hand-written types for `cached_image`, `cached_contributors`,
`cached_tags`, `cached_featured_series` and the per-`query_type` search hits.
Keep each as a small override map next to codegen, and mark them as "shape
observed, not guaranteed". Everything else stays as untyped JSON.

Built in TypeScript (2026-10-20): `core/json-columns.ts` holds the four
`cached_*` types and maps them by field name onto every response that
`request()` returns and every public type (`BookSummary`, `LibraryListItem`,
…), at any depth. Contents keep their stored keys (`color_name`,
`books_count`; `cached_tags` entries are stored camelCase). Every field is
optional: an empty column arrives as `{}`, and the server may add or drop
keys. The raw generated types (`BookSummaryFragment`) stay `unknown`.

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
| `books` | `get(id)`, `getBySlug(slug)`, `getMany(ids)` (in the order given; missing ids skipped), `editions(bookId, page)`, `findByIsbn(isbns)` (exact ISBN-13/10, spaces and hyphens fine), `trending({ duration, limit, offset })` (2 requests: ids, then books, in trending order; `limit` capped at the API's 100), `released({ from, to, limit, offset })` (first released in the range, most readers first; reissues excluded). Read-only; catalog writes need librarian roles and come later | GetBook, GetBookBySlug, GetBooks, GetEditionsForBook, FindEditionsByIsbn, TrendingBookIds, ReleasedBooks |
| `search` | `books`, `authors`, `series`, `characters`, `lists`, `prompts`, `publishers`, `users` (query, `{ page, perPage, fields, weights, typos, sort, filterBy }`) → `{ hits, ids, found, page, perPage }` with numeric ids and idiomatic keys; `raw(query, { type })` untouched. The query passes straight through; the API owns matching. Barcode scans use exact ISBN lookup instead (see Search below) | Search |
| `library` | `list({ status, limit, offset })`, `count({ status })`, `forBook(bookId)`, `get(id)`, `add(bookId, options)`, `update(id, patch)`, `setStatus(id, status, { date, occurredAt })`, `rate(id, rating)`, `remove(id)`. `status` is one value or a list. Planned: `iterate({ status })` | GetLibrary, CountLibrary, GetUserBookForBook, GetUserBook, AddUserBook, UpdateUserBook, RemoveUserBook |
| `reads` | `list(userBookId)`, `current(userBookId)`, `setProgress(userBookId, { pages \| seconds \| percent, occurredAt })`. Starting and finishing are driven by `library.setStatus` (Currently Reading starts a read, a new one on a re-read; Read finishes it). Manual date editing (`start`/`finish`/`update`/`remove` with explicit dates) is planned | GetUserBook, UpdateUserBookRead (later: AddUserBookRead, RemoveUserBookRead) |
| `journal` | `forBook(bookId, page)`, `add({ bookId, event = note, entry, privacy = the reader's activity privacy setting (the app's default for journal entries), editionId, date, tags = [], metadata })`, `update(id, patch)`, `delete(id)`, `clearForBook(bookId)`. Everything the API allows, any `JournalEvent`; each server-written event's doc comment names the call that already writes it (adding it manually duplicates it; a manual `progress_updated` merges into the day's entry). Journal `date` is a day (the API's `action_at` here is a date, not a timestamp) | GetJournalForBook, AddJournalEntry, UpdateJournalEntry, DeleteJournalEntry, ClearJournalForBook |
| `lists` | `mine(page)`, `forUser(userId, page)`, `get(id, page)`, `create`, `update`, `delete`, `addBook(listId, bookId, { editionId, position })`, `removeBook(listId, bookId)` (2 requests; returns false if absent), `addBooks(listId, codes)`: bulk add by exact ISBN-13/ISBN-10 (one lookup, adds batched 5 per request, per-item retry on a failed batch; unmatched codes such as UPCs are reported as `no_exact_edition`, never guessed) | GetListsForUser, GetList, CreateList, UpdateList, DeleteList, AddBookToList, FindListBook, RemoveListBook, FindEditionsByIsbn |
| `goals` | `list({ includeArchived })`, `get(id)`, `create(fields)`, `update(id, patch)` (2 requests: the API's update takes the whole goal, so the SDK reads and merges), `archive`/`unarchive`, `refreshProgress(id)`, `delete(id)`; plus `goalProgress(goal)` → `{ current, target, percent }` in the goal's unit (hour goals: target in hours, API progress in seconds). Progress is server-calculated. `create` applies a requested privacy with one follow-up update while the API ignores it on create (spec/06 #22) | GetGoals, GetGoal, CreateGoal, UpdateGoal, RefreshGoalProgress, DeleteGoal |
| `vibes` | `mine(page)`, `forUser(userId, page)`, `get(id)`, `books(id, page)` (cached results in ranked order, with `resultsPending`/`generatedAt`; 2 requests), `create({ title, description, privacy, signals, exclusions, dynamicSignals })`, `update(id, { …, addSignals, addExclusions, dynamicSignals })`, `delete(id)`. Signals are idiomatic shapes mapped to the API's nested attributes; taxonomy values are suggestions (any string accepted, the server validates). Supporter, custom-only and follower rules stay server-side | GetVibesForUser, GetVibe, GetVibeBookIds, CreateVibe, UpdateVibe, DeleteVibe, GetBooks |

Methods scoped to "my" data resolve `userId` from `me.get()`, which is cached
per client, so it costs one request per client, not per call.

### Journal entries are the server's job

The server journals status changes, read starts and finishes, progress,
ratings and reviews itself (`rails/app/services/user_book_service.rb`), with a
10-minute debounce. Resource methods never write journal entries for those, or
every step would appear twice. `journal.add` accepts any event, but apps
normally use it for what only the reader writes (notes, quotes); each
`JournalEvent` doc comment names the call that already journals it. `occurredAt` on library and reads methods sets `action_at`, so
the server's entry carries when the reading actually happened.

### Pagination

- Page methods take `{limit, offset}` and return
  `{items, limit, offset, hasMore}`. `hasMore` is true when
  `items.length === limit`; no count request is made.
- Planned: `iterate()`, a lazy async sequence that stops at the table's row
  cap (see [01](01-api-surface.md#query-roots-reachable-by-tokens)) and paces
  itself like every request.

### Search

- `search.<type>()` sets `query_type` and passes the query and options
  through untouched; the API's own defaults apply. It returns typed hits with
  numeric ids and idiomatic keys, plus `found`.
- `raw()` returns the untouched response.
- **Barcode scans don't use search** (decided with the API side, 2026-09-28):
  a scan identifies one edition, so apps match it exactly with
  `books.findByIsbn` (single) or `lists.addBooks` (bulk) against
  `isbn_13`/`isbn_10`. Search is only a fallback the app offers when there's
  no exact match. (The web app's scanner currently feeds search; switching it
  is an app-side change.)
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
- Planned: every package records the `api-snapshot` commit it was generated
  against, exposed as `SDK.apiSnapshot`.

## Language notes

- **TypeScript (first).**
  - Isomorphic: `fetch` only, no Node built-ins in core. It runs in Node 20+,
    Deno, Bun and browsers.
  - ESM today; a CJS build comes with packaging.
  - Codegen: `@graphql-codegen/cli` (`typescript-operations` and
    `typed-document-node`) over the `--case camel` rewrite of the shared
    operations.
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
- **Ruby** (requested by the API side, 2026-09-28; Hardcover itself runs on
  Rails).
  - snake_case (`--case snake`: the canonical operations, unchanged), Ruby
    naming (`library.set_status`, `goals.refresh_progress`), keyword arguments
    for options.
  - A plain-Ruby gem with no Rails dependency, so it works in scripts, bots and
    Rails apps alike. `Net::HTTP` transport (or Faraday if an adapter is
    wanted), Zeitwerk loading, RBS signatures generated from the operations.
  - Same shared contract: enums, errors, conformance cases and environments
    from `shared/`.
- **Python.**
  - Sync and async clients over `httpx`.
  - Codegen: `ariadne-codegen` (pydantic models) from the same documents.
  - snake_case preserved.
  - An existing community SDK (`hardcoverpy`, in the docs showcase) is worth
    comparing before building.
