# 06. Open questions and discrepancies

These were found while mapping the API (2026-09-28). Each one needs an owner and
a decision before the SDK depends on it. Record decisions in
`app/docs/decisions/` where they affect the app.

## API behavior: docs vs. code

| # | Topic | Docs say | Code does | Impact on SDK |
|---|---|---|---|---|
| 1 | OAuth access token lifetime | `expires_in: 3600` (1h) | `ACCESS_TOKEN_TTL = 1.week` (`rails/app/controllers/oauth2/tokens_controller.rb`) | SDK trusts `expires_in` from the response, so it's safe either way. Docs need fixing |
| 2 | Top-level field limit | Flat max of 5 (1 for `search`), 403 `top_level_limit_exceeded` | Refuses when fields exceed the tier's burst capacity, 403 `request_exceeds_capacity` (`api/app/services/graphql_query_limit.rb`) | SDK chunks at 5 and maps both codes. Which is intended? |
| 3 | Browser use | "Limitations" says queries can't run in the browser; "Important notes" says CORS is open | CORS open; SPA OAuth client type exists | TS SDK is isomorphic. Docs should say "browser OK with PKCE, never with a PAT" |
| 4 | Depth limit | Roadmap item (max 3) | None (`api_limits.yaml` is `{}`) | If it ships, `GetList` (list → list_books → book) and `GetLibrary` sit at depth 3. Keep all shared operations at depth ≤ 3 |
| 5 | Rate-limit error body | One documented shape | Three shapes (`{error,message}`, `{errors:[..],message}`, OAuth `{error,error_description}`) | SDK normalizes. Worth unifying server-side |
| 6 | Action error envelopes | Not documented | Mixed `error: String` vs `errors: [String]` across output types | SDK handles both. Worth unifying in `actions.graphql` on the next breaking window |

## For the API project

17. **Action error responses expose internals.** A failing `insert_list_book`
    (bad book id) returned `extensions.internal` with the Rails webhook URL, the
    full request, and the Rails response headers, **including a
    `_clientverse_session` Set-Cookie and an XSRF token**, to the token holder.
    Likely Hasura dev mode on the local stack only; confirm it's off on staging
    and prod.
18. **Unhelpful action error for a missing book.** Rails answered 422 with an
    empty HTML body, so Hasura reported "not a valid json response from webhook"
    instead of a clear "book not found".
19. **Server-side bulk add.** A user has asked for bulk scan-and-add. An action
    like `add_list_books(list_id, isbns: [String!])` resolving on the server
    would make `lists.addBooks` a pass-through (spec/03 principle 2).
20. **Percent progress in the API.** Accepting `progress_percent` on
    `DatesReadInput` would remove the SDK's client-side conversion.

21. **Docs site: journal event list is incomplete.** `field-descriptions.json`
    lists journal events as "note, quote, status_currently_reading,
    status_read, rated, reviewed, progress_updated, etc." The model has 16
    (`app/rails/app/models/reading_journal.rb`), including
    `user_book_read_started`/`_finished`, which are what the server writes
    when a read starts and finishes. `shared/enums.json` JournalEvent has the
    full list with labels; use it on the docs branch.

22. **Goal privacy is ignored on create.** `GoalsController#new_goal` merges
    `privacy_setting_id: current_user.account_privacy_setting_id` over the
    input, so `insert_goal` always uses the account default even though
    `GoalInput.privacy_setting_id` is accepted. `update_goal` respects it.
    The SDK works around it with one follow-up update; remove that once fixed.
23. **Docs site: goal metrics.** `field-descriptions.json` says "books, pages,
    etc."; the model validates exactly `book`, `page`, `hour` (singular), and
    hour goals report `progress` in seconds against a target in hours.

24. **Browsers can't see the rate-limit headers.** `api/config/initializers/cors.rb`
    exposes `RateLimit-Policy`, `RateLimit`, `Retry-After` and the legacy
    `X-RateLimit-*` headers, and the preflight says so. But the actual POST
    response carries Hasura's `Access-Control-Expose-Headers`
    (`X-Hasura-Query-Cache-Key, …, Warning`), copied through by
    `reverse_proxy` in `api/app/controllers/graphql_controller.rb`, which
    replaces the gateway's. So in a browser the SDK can't pace proactively; it
    falls back to 429 handling. Native React Native isn't affected (no CORS).
    Confirmed fix (local, 2026-09-28): `HASURA_GRAPHQL_DISABLE_CORS=true` on
    Hasura behind the gateway; the POST response then exposes the gateway's
    list and the playground shows live rate-limit state. Stripping upstream
    `access-control-*` headers in the proxy would also work. Still to check:
    whether staging and prod already set it (one request with a real token, see
    the curl in the playground section of spec/04). Found by the SDK
    playground.

25. **Vibe signals and exclusions aren't readable.** Tokens can add them
    (`vibe_signals_attributes`, `vibe_exclusions_attributes` on `insert_vibe` /
    `update_vibe`) but no `vibe_signals` / `vibe_exclusions` tables are exposed,
    so apps can't show a vibe's signals, and can't remove one (removal needs the
    signal's id). The SDK names its update options `addSignals` /
    `addExclusions` for that reason.
26. **Vibe results are only generated by the website.** `cached_book_ids` is
    filled by `Recommendations::VibeBooksService` when a vibe is viewed on
    hardcover.app; a vibe created through the API has no books (confirmed live:
    `books_generated_at` null) and an edited one keeps stale results until
    viewed. An API action to resolve a vibe's books would close this; the SDK
    reports `resultsPending` meanwhile.

27. **No deletion feed for incremental sync.** `library.changes` reads
    entries by `updated_at`, but removed entries are deleted outright (only
    paper_trail's `CachedVersion` records them, and it isn't exposed), so the
    SDK finds removals by diffing the app's ids against an ids-only read of the
    whole library. A deletions feed (or soft deletes) would make removals as
    cheap as changes. Related: `update_all`-style bulk updates (e.g. book
    merges re-pointing `book_id`) skip `updated_at` and won't show up as
    changes; `list_books` don't touch their list.

## From consumers

Found by real apps using the SDK. The first internal consumer is the Hardcover
Weekly video (`~/Developer/hardcover/weekly-video`, 2026-10-19): a Node script
that reads trending books, new releases and reader counts with a read-only
production token. The mobile apps come next and will likely hit the same things.

### Already changed (2026-10-19)

- **The SDK runs from source under plain Node.** Node 24 strips types but
  can't transform them, and two things stopped it: generated code imported
  `DocumentTypeDecoration` as a value (codegen now sets `useTypeImports: true`),
  and 18 constructors used parameter properties (`constructor(private readonly
  client)`) in the resources, errors and `TransportFailure`. They're now plain
  fields, and `erasableSyntaxOnly` in `tsconfig.json` keeps it that way. This
  doesn't replace packaging (#28).
- **`books.released({ from, to, limit, offset })`** with the shared
  `ReleasedBooks` operation: books first released in a date range, most readers
  first, active books only. It mirrors the site's release calendar
  (`Letterbooks::Finders::UpcomingFinder`: `Book.active` by `release_date`) and
  uses the book's own release date, so reissues and translations aren't "new".
  Test, example and spec/03 row added.
- **`books.trending` caps `limit` at 100.** The API silently returns at most
  100 ids, so `limit: 200` came back with 100 books and `hasMore: false`. The
  cap is now in the SDK, `hasMore` is right, and callers page with `offset`.
  Test added; the cap is in spec/01's row caps.
### Open: SDK

28. **Packaging is the real fix for non-bundler consumers.** The source runs
    under Node now (above), but a published package can't ship `.ts`: Node
    refuses to strip types under `node_modules`. The video links the package
    with `link:`, which resolves outside `node_modules`, so it works today only
    for local consumers. ESM/CJS builds stay first in the next steps.
29. **A cold burst without `batch` fails.** 25 concurrent `books.get` calls
    sent before any rate-limit headers arrived all went out at once, and the
    resulting 429s outlasted `maxRetries` (`RateLimitError`, burst window,
    tier limit 30). With `batch: true` the same code runs cleanly. Options: make
    `batch` the default, or have pacing assume the smallest burst capacity (10)
    until the first headers arrive. Mobile screens that fan out per-row lookups
    will hit this.
    **Done (2026-10-20):** pacing took the second option. Until the first
    headers arrive, the client sends up to 5 units (the free tier's 10, halved
    for a legacy JWT, since the token type alone doesn't say which applies),
    then holds the rest for that answer. Every request also reserves its cost
    before it goes out, so concurrent requests queue behind each other instead
    of all spending the same remaining units (spec/03, Pacing). `batch` stays
    opt-in.
30. **Series for a list of books costs one request each.** `BookSummary` has
    no series; only `BookDetail` (via `get`) does, so the video's
    "one book per series" filter does 25 `GetBook` calls. A `getMany` variant
    returning `BookDetail` (one `books(where: { id: { _in } })` request), or
    `bookSeries` on the summary, would make it one. Mobile book lists showing
    "Series #3" need the same.
    **Done (2026-10-20, branch `featured-series`):** `BookSummary` now carries
    `cachedFeaturedSeries`, the site's own main series for the book (jsonb:
    `{ series: { id, name, … }, position, … }`, `{}` when none). One request
    per list again; the video's trending filter uses it. A book's full series
    list still needs `get`.
31. **jsonb fields arrive as `unknown`.** Every consumer casts `cachedImage`
    (`{ url, color, width, height }`) and `cachedContributors`
    (`[{ author: { name, slug, … }, contribution }]`). Typed shapes or small
    helpers (cover URL, primary author, a series label like "Red Rising Saga
    #1" from `cachedFeaturedSeries`) would save every app the same code.

### Open: for the API project

32. **`books_trending` caps at 100 ids, undocumented.** A larger `limit` is cut
    without notice. Worth stating in the docs (or returning an error).
33. **Trending has no counts, and there's no growth ranking.** `books_trending`
    returns ids only, ranked by distinct readers finishing in the window
    (`TrendingBookService`). The video's "fastest growing" scene snapshots
    `users_count` weekly and divides the gain by last week's count, which only
    works from the second week and only for books already in a trending pool. A
    `books_trending(ranking: growth)` option, or counts alongside the ids, would
    be accurate from day one; the server already has the per-window counts.
    **In progress:** hardcoverapp/hardcover#4630 (Ziv) adds a `books_growth`
    action from nightly snapshots, ranked by gained / (start + 50). The SDK
    draft, `books.growth()`, waits on the `books-growth` branch until it deploys.

34. **Odd row caps.** `book_series` is capped at 997 (raised from 100 in
    `bddaa2ba2`, 2024-08-06, "to make series page work") and `taggable_counts`
    at 998, where everything else is 100, 500, 1000, 2000 or 5000. Intentional
    (kept just under 1000 for a reason), or should they be 1000? The docs
    should show whatever is chosen. Full list in spec/01.
35. **Row caps aren't in the API docs.** None of the per-table caps (spec/01)
    appear on the docs site, so a client asking for more silently gets fewer
    rows. Each cap belongs on its resource's own schema page (Kylie's call,
    2026-10-19), not in one central limits table. Filed as
    hardcoverapp/hardcover-docs#231, assigned to Kylie.

36. **`books_trending` can return an empty list.** On a cache miss,
    `TrendingBookService` returns `[]` and only queues a background warm (a
    deliberate guard against recomputing under load), so a call can briefly see
    no trending books at all. Seen 2026-10-20 from the weekly video. Consumers
    need a short retry, or the SDK could retry once when `ids` is empty; the
    API could also mark the result as "warming". Also worth documenting:
    `duration: week` is a rolling last-7-days window, not a calendar week.

## Environment and access

7. **Staging web host.** `api-staging.hardcover.app` is confirmed. What's the
   staging web host for `/oauth2/authorize` and `/link`?
8. **Staging data.** Is staging restored from prod (see the `staging-restorer`
   symlink in `app/docs/`)? If so, prod ids can be reused in
   `live-targets.json`, and staging test accounts may be reset without warning.
9. **Test accounts.** Tokens and OAuth are gated on the `api_tokens` and
   `oauth_apps` feature flags. We need dedicated flagged test users on staging
   (and prod, read-only), plus an OAuth app with device grant enabled for smoke
   tests.
10. **Rate limit for CI.** Should the CI test account get a per-token override,
    or should the suite stay inside the free tier? The spec currently assumes
    free tier.

## Project and ownership

11. **Official or community?** Decided 2026-10-07: official, built for the
    community to use and contribute to. The repo is
    `github.com/hardcoverapp/community-sdk` (private for now). Still open: the
    package names (`@hardcover/…` on npm, PyPI, Maven group, gem) and the
    license.
12. **JVM language.** Decided 2026-09-28: Kotlin with a Java-friendly API
    (see [03](03-sdk-design.md#language-notes)). Java apps load Kotlin
    libraries natively; the interop cost is API design, enforced by a Java
    test source set ([05](05-adding-a-language.md)).
13. **Existing community SDKs.** Decided 2026-10-07: `hardcoverpy` (Python)
    and `hardcover-rs` (Rust) in the docs showcase are unofficial third-party
    projects; no collaboration or endorsement. Worth a glance at HardCoverPy's
    method names before building Python, nothing more.
14. **Docs integration.** Should the docs site's `GraphQLExplorer` gain an
    "SDK" tab? Should the Showcase gain a "Library/SDK" category? Should this
    spec move under the docs site once it stabilizes?
15. **Old `sdk/` folder.** Retired 2026-09-28 (moved to Trash, never
    committed). Its operations had known bugs (`delete_list_book` signature, a
    nonexistent `SearchOutput.found`) and stale limits. Its release-please setup
    (one component per package, `-v` tag separator) is the model for
    [03 versioning](03-sdk-design.md#versioning-and-releases).

## Schema snapshot

16. `api-snapshot/` is from the docs repo at 2026-08-28. Refresh it from
    staging before codegen starts, and run the first drift check at the same
    time.
