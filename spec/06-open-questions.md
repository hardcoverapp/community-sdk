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

11. **Official or community?** The old `sdk/` scaffold called itself
    "community-powered" and pointed at a nonexistent `hardcover/hardcover-sdk`
    repo. The package namespace (`@hardcover/…` on npm, PyPI name, Maven group),
    the GitHub org, and the license all depend on this.
12. **JVM language.** Decided 2026-09-28: Kotlin with a Java-friendly API
    (see [03](03-sdk-design.md#language-notes)). Java apps load Kotlin
    libraries natively; the interop cost is API design, enforced by a Java
    test source set ([05](05-adding-a-language.md)).
13. **Existing community SDKs.** `hardcoverpy` (Python, pydantic) and
    `hardcover-rs` (Rust) are in the docs showcase. Collaborate, bless, or
    ignore? At minimum, compare their method surfaces with ours before building
    Python.
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
