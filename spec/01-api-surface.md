# 01. The public API surface

This page records what a third party can actually reach today, taken from the app
repo (`app/`) at `9d8335df0` (2026-09-28). Paths are relative to `app/`.

## Topology

```
client ──Bearer hc_*──▶ api.hardcover.app  (api/, Rails gateway)
                         ├─ /v1/graphql ──▶ Hasura ──actions──▶ rails/ (/hasura/*)
                         │                           └─search──▶ search-proxy/ (Rust) ──▶ Typesense
                         ├─ /oauth2/{token,device,revoke,introspect} ──▶ rails/
                         ├─ /.well-known/oauth-authorization-server
                         └─ /capabilities   (scope + operation map, public, cached 1 day)
```

- **One GraphQL endpoint.** There's no REST API for third parties. `api/` is a
  reverse proxy that authenticates, checks scopes, rate-limits, then forwards
  to Hasura. Requests whose body contains `mutation` go to the primary DB and
  everything else goes to a read replica (`api/app/controllers/graphql_controller.rb`).
  Reading immediately after a write can therefore be briefly stale. SDK
  mutations return the written row from the action envelope so callers don't
  need a follow-up read.
- **Batching.** A top-level JSON array of `{query, variables}` is accepted, and
  each item is scope-checked separately.
- **No anonymous access.** Every request needs a user-bound token.
- **Introspection** is enabled for all roles. `api_limits.yaml` is empty, so
  Hasura enforces no depth or node limits.

| Environment | GraphQL | Web (authorize, device link) |
|---|---|---|
| prod | `https://api.hardcover.app/v1/graphql` | `https://hardcover.app` |
| staging | `https://api-staging.hardcover.app/v1/graphql` | unconfirmed |
| local | `http://localhost:8081/v1/graphql` | `http://localhost:3000` |

Canonical copy: [`shared/environments.json`](../shared/environments.json).

## Authentication

Every token matches `hc_<type>_<44 base58 chars>`. The gateway hashes it, looks
it up, and mints a 5-minute Hasura JWT carrying the token's scopes as session
variables (`api/app/controllers/application_controller.rb`).

| Prefix | Kind | Lifetime | Notes |
|---|---|---|---|
| `hc_pat_` | Personal access token | User picks: 30d, 90d, 1y (default), never, or custom | Created at Account → API Access. A pre-filled link is `https://hardcover.app/account/api/keys/new?scope=...` |
| `hc_at_` | OAuth access token | **1 week** in code (`ACCESS_TOKEN_TTL`), docs say 3600 | See [open questions](06-open-questions.md) |
| `hc_rt_` | OAuth refresh token | 6 months, **rotates on every use** | Reusing a rotated refresh token revokes the whole family |
| `hc_ac_` | Authorization code | 10 min, single use | |
| (JWT) | Legacy API key | until expiry, ~1 year deprecation window | Full access, half the burst capacity |

API tokens and OAuth are **beta-gated** behind user feature flags
(`Features :api_tokens`, `:oauth_apps`).

### OAuth flows

- **Authorization code + PKCE.** `S256` only. `web_app` clients are
  confidential and must also send the client secret (Basic or
  `client_secret_post`). SPA and native clients are public and must not send one.
  Redirect URIs match exactly. They must be https, except http on loopback
  hosts (any port, per OAuth 2.1), and `native` apps may also register a
  private-use custom scheme such as `myapp://oauth/callback` (RFC 8252;
  `rails/app/models/developer_app.rb`).
- **Device grant (RFC 8628).** `POST /oauth2/device` returns `device_code`,
  `user_code`, `verification_uri` (`/link`), `verification_uri_complete`, with
  a 15-minute expiry. Poll interval is 5s and grows 5s per `slow_down`. The app
  must have device grant enabled.
- **Refresh.** An optional `scope` narrows the grant. It fails with
  `re-authorization required` if the user's app authorization went stale.
- **Revoke (RFC 7009)** always returns 200. **Introspect (RFC 7662)** is for
  confidential clients only.

Sources: `rails/app/controllers/oauth2/*`, `docs/api-authentication.md`.

### Scopes

Defined in `shared/scope_definitions.yml` and published at `/capabilities`
(snapshot: [`api-snapshot/capabilities.json`](../api-snapshot/capabilities.json)).

- **Hierarchical.** A parent grants its children. There are two extra
  implications: `read:me:email` grants `read:me:content`, and
  `write:catalog:edit` grants `write:catalog:append`.
- **Effective scopes** are the user's allowed scopes intersected with the
  requested scopes. `all` is user-only and can't be requested by clients.

| Read | Write |
|---|---|
| `read:catalog` (`:data`, `:search`) | `write:library` (includes journal, imports) |
| `read:library`, `read:journal`, `read:lists`, `read:goals`, `read:prompts`, `read:vibes`, each with `:public` / `:following` / `:private` (privacy ids 1/2/3) | `write:reviews` |
| `read:me` (`:content`, `:email`, `:roles`) | `write:lists`, `write:goals`, `write:prompts`, `write:social`, `write:notifications` |
| `read:users`, `read:notifications`, `read:social`, `read:account` | `write:vibes` (Supporter perk) |
| | `write:catalog:{append,edit,map,split}` (need librarian roles) |

The gateway also protects individual columns and arguments:

- **Protected columns.** `users.email` needs `read:me:email`, and
  `users.librarian_roles` needs `read:me:roles`.
- **Protected arguments.** Any `review`, `review_raw`, `review_slate`,
  `review_markdown`, `review_has_spoilers`, `reviewed_at` or `sponsored_review`
  argument needs `write:reviews`, whether given inline or in variables. **An SDK
  updating a user book must not send review fields unless the caller set them**,
  or a `write:library`-only token fails.

## Query roots reachable by tokens

From the `operations:` map in `scope_definitions.yml`. Where the table has them,
`_by_pk` and `_aggregate` variants exist too.

| Scope | Roots |
|---|---|
| `read:catalog` | books, editions, authors, series, book_series, contributions, characters, book_characters, publishers, tags, taggings, tag_categories, taggable_counts, images, links, languages, countries, reading_formats, privacy_settings, book_categories, book_collections, book_mappings, book_statuses, user_book_statuses, contributor_roles…, `books_trending` |
| `read:catalog:search` | `search` |
| `read:me` / `read:users` | me, users, users_by_pk |
| `read:library` | user_books, user_book_reads |
| `read:journal` | reading_journals, reading_journals_summary |
| `read:goals` | goals |
| `read:lists` | lists, list_books, list_members, followed_lists, filter_lists… |
| `read:notifications` | notifications, notification_deliveries, notification_types, notification_settings |
| `read:prompts` | prompts, prompt_answers, prompt_books_summary, followed_prompts |
| `read:social` | activities, follows, followed_users, followed_user_books, likes, user_blocks |
| `read:vibes` | vibes |
| `read:account` | collection_imports, collection_import_results, newsletter, referrals_for_user, subscriptions |

**Row caps.** Most selects cap the rows one query returns, and a larger
`limit` is cut to the cap without an error. API tokens get the `user` role
(`user_email` with the email scope, which inherits `user`). Caps for `user`, from
`app/hasura/metadata/databases/Default/tables/*.yaml` (checked 2026-10-19;
`book_series` and `series` confirmed against production):

| Cap | Tables |
|---|---|
| 100 | activities, authors, book_characters, book_collections, characters, collection_imports, contributions, filter_lists, goals, images, likes, list_members, lists, notification_deliveries, notification_settings, notifications, prompt_answers, prompt_books_summary, prompts, publishers, reading_journals, reading_journals_summary, series, tags, users, vibes |
| 500 | book_mappings |
| 997 | book_series |
| 998 | taggable_counts |
| 1000 | books, contributor_role_categories, contributor_role_specializations, contributor_roles, contributor_specializations, filter_list_entities, followed_user_books, following_user_books, follows, links, list_books, tag_categories, taggings, user_blocks, user_book_reads, user_referrals |
| 2000 | filter_list_subscriptions |
| 5000 | editions |

Not capped: `user_books` and the remaining tables. The `reader` base role is
lower for `follows` and `user_book_reads` (100), but it's never issued in a
token. `books_trending` (a Rails action, not a Hasura permission) returns at
most 100 ids per call. Pagination helpers must stop at the cap instead of
looping forever, and a page shorter than the requested `limit` only means
"done" when the limit was at or under the cap.

## Writes: Hasura actions

There are 86 actions (`hasura/metadata/actions.graphql`, `actions.yaml`),
handled by `rails/app/controllers/hasura/*`. `search` is the exception and is
handled by `search-proxy/`. Nearly every write is an action. The ones in SDK v1
scope:

| Action | Args | Returns | Scope |
|---|---|---|---|
| `insert_user_book` | `object: UserBookCreateInput!` | `UserBookIdType {id, error, user_book}` | write:library (+write:reviews) |
| `update_user_book` | `id!, object: UserBookUpdateInput!` | `UserBookIdType` | write:library (+write:reviews) |
| `delete_user_book` | `id!` | `UserBookDeleteType {id, book_id, user_id, user_book}` | write:library |
| `insert_user_book_read` | `user_book_id!, user_book_read: DatesReadInput!` | `UserBookReadIdType {id, error, user_book_read}` | write:library |
| `update_user_book_read` | `id!, object: DatesReadInput!` | `UserBookReadIdType` | write:library |
| `delete_user_book_read` | `id!` | `UserBookReadIdType` | write:library |
| `upsert_user_book_reads` | `user_book_id!, datesRead: [DatesReadInput]!` | `UserBooksReadUpsertType` | write:library |
| `insert_reading_journal` | `object: ReadingJournalCreateType!` | `ReadingJournalOutput {id, errors, reading_journal}` | write:library (free: zero rate-limit cost) |
| `delete_reading_journal` | `id!` | `DeleteReadingJournalOutput` | write:library |
| `insert_list` / `update_list` | `object: ListInput!` / `id!, object` | `ListIdType {id, errors, list}` | write:lists |
| `delete_list` | `id!` | `ListDeleteType {success}` | write:lists |
| `insert_list_book` | `object: ListBookInput! {list_id!, book_id!, edition_id, position}` | `ListBookIdType {id, list_book}` | write:lists |
| `delete_list_book` | `id!` (**the list_books row id**) | `ListBookDeleteType {id, list_id, list}` | write:lists |
| `insert_goal` / `update_goal` / `delete_goal` | `object: GoalInput!` / `id!` | `GoalIdType {id, errors, goal}` | write:goals |
| `search` (query) | `query!, query_type, page, per_page, fields, weights, typos, sort, filter_by` | `SearchOutput {ids, results: jsonb, error, …}` | read:catalog:search |
| `books_trending` (query) | `duration: TrendingDuration, limit, offset` (`from`/`to` deprecated) | `TrendingBookType {ids, error}` | read:catalog |

Other groups for later SDK phases:

- **Social:** `insert_follow`, `insert_followed_user`, `upsert_like`, `insert_block`
- **Prompts:** `insert_prompt`, `insert_prompt_answer`
- **Vibes:** `insert_vibe`
- **Imports:** `insert_collection_import`
- **Catalog editing** (librarian-gated): `insert_book`, `upsert_book`,
  `insert_edition`, `book_normalize`, `insert_book_mapping`
- **Tags:** `upsert_tags`

These actions are **blocked for tokens**: `update_user`,
`update_user_privacy_setting`, `update_newsletter`, `email_user_*`,
`receipt_validate`, `insert_report`, and `hey`.

A few table-level writes are exposed directly:

- `update_list_books` (reordering)
- `update_notification_deliveries`
- `insert/update_notification_settings`
- `delete_activities`, `insert/delete_user_blocks`
- `update_prompt_answers`, `update_collection_import_results`

### Observed write behavior (local, 2026-09-28)

- **`insert_list_book` is idempotent.** Adding a book already on the list returns
  the existing row (same id), even when a different edition is passed; the
  stored edition doesn't change.
- **One failing action drops the whole response.** In a request with several
  aliased action mutations, actions run in order: those before the failure are
  committed, the failing one and those after are not, and the response holds
  only `errors` (no `data` for the ones that succeeded). Clients must not infer
  "nothing happened" from a failed batch.

## Limits

Source: `api/app/controllers/api/application_controller.rb`,
`api/app/services/graphql_query_limit.rb`.

- **Rate limit.** Each user has a token bucket plus a daily cap. Tier, user and
  per-token overrides can all change it, and a developer app's buffer is added
  on top.

  | Tier | Burst | Refill | Daily |
  |---|---|---|---|
  | free | 10 | 1/s | 5,000 |
  | supporter | 15 | 1/s | 50,000 |

- **Cost** is the number of top-level fields in the request, with fragments
  expanded, with a minimum of 1 per request. Introspection and
  `insert_reading_journal` fields add nothing, so a request of only those
  costs 1.
- **Oversized requests.** A request with more top-level fields than the burst
  capacity is refused with 403. The docs state a flat limit of 5 top-level
  fields and 1 `search` per request, so **the SDK chunks at 5**, which is safe
  under both.
- **Timeouts.** Queries time out at 30s and search at 2s. Gateway read timeout
  is 30s and Rack is 45s.
- **Banned filter operators:** `_like`, `_ilike`, `_regex`, `_similar` and
  their negations.
- **Per-IP shield:** 500 requests per minute.
- **Headers:**
  - `RateLimit-Policy: "<Tier>";q=..;w=60;burst=N, "daily";q=..;w=86400`
  - `RateLimit: "<Tier>";r=..;t=.., "daily";r=..;t=..`
  - legacy `X-RateLimit-*`
  - `Retry-After` on 429

## Error shapes

There are five shapes in the wild. [`shared/errors.json`](../shared/errors.json)
maps every one of them onto a single taxonomy.

| Source | Shape |
|---|---|
| Gateway auth and scope | `{error, error_description, scope?}` plus `WWW-Authenticate` |
| OAuth endpoints | `{error, error_description}` (RFC 6749 codes) |
| Rate limit (429) | `{error: "Too Many Requests", message}` |
| Oversized request (403) | `{errors: ["request_exceeds_capacity"], message}` |
| Hasura | `{errors: [{message, extensions: {path, code}}]}` |
| Action envelopes (HTTP 200) | `data.<action>.error: String` **or** `data.<action>.errors: [String]` |
