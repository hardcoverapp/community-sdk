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
12. **JVM language.** Java or Kotlin? `apollo-kotlin` can emit Java-only code,
    so codegen doesn't force the choice. The public API style does.
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
