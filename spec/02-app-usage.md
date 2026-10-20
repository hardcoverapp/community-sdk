# 02. How the Hardcover app uses the data

This page covers what the first-party clients do today, so the SDK can mirror
real usage instead of guessing. Paths are relative to
`app/rails/app/javascript/` unless noted.

## Clients

| Client | How it gets data |
|---|---|
| Web | Inertia props rendered by Rails serializers for page loads (217 pages), plus Apollo Client against `/v1/graphql` for logged-in interactivity and all writes |
| iOS and Android | Capacitor shells that load `https://hardcover.app/` (`app/rails/capacitor.config.ts`). No native API client and no native auth. Plugins: barcode scanner for ISBN lookup, share, app links, in-app purchase |
| Logged-out web | Inertia only; no GraphQL |

The SDK is not a replacement for Inertia props. It targets the same GraphQL
surface the app's Apollo layer uses, authenticated with PAT or OAuth tokens
instead of the browser session JWT. The session JWT comes from `POST /api/token`
and depends on the session cookie, so it is not usable by third parties.

## Apollo layer

- **Setup.** Client in `lib/apollo/client.tsx`, cache in `lib/apollo/cache.ts`.
  Operations are `gql` literals in `queries/<domain>/`,
  `services/*/actions/`, and `features/*/queries/`. That's about 135 queries,
  101 mutations and 52 fragments, with no subscriptions.
- **No codegen.** Result types are hand-written in `types/*.tsx`. This is the
  main thing the SDK should do better.
- **camelCase aliases everywhere** (`bookId: book_id`). The SDK deliberately
  does **not** copy this; see [03 casing](03-sdk-design.md#casing).
- **Cache keys are composite:** `user_books` by (user, book), `list_books` by
  (list, book), `likes` by (likeable id, likeable type, user).
- **Rate-limit awareness:**
  - Batch mutations are split into groups of 5 (`lib/apollo/limits.ts`).
  - On 429 the client waits for `X-RateLimit-Reset` and retries up to 5 times
    (`lib/apollo/retry.ts`).
  - **User-book mutations are not retried on a dropped connection.** The app
    re-reads to check whether the write landed
    (`services/UserBookService/verifyThenOfferRetry.ts`).
- **Action envelopes.** The app rejects when `error` is set on an action
  result. It is inconsistent about `errors` arrays.

## Operation inventory by domain

`A` means Hasura action and `T` means direct table mutation.

| Domain | App operations | Writes | SDK v1 |
|---|---|---|---|
| Books / editions | FindBookBySlug, FindBookById, FindBooksByIds, FindBooksByIsbn, FindEditionsForBook, FindTrendingBooksForDashboard | A (librarian) | read |
| Search | Typesense direct from browser (`lib/search/typesenseDirect.ts`) with a rotating key | none | via the `search` action |
| User books | FindUserBook, FindUserBookByBookAndUser, findUserBookDetails (by status), FindFavoritesForUser; Create/Update/DestroyUserBook | A | read + write |
| Reads / progress | getDatesReadByUserandBook; Insert/Update/DeleteUserBookRead | A | read + write |
| Reading journal | Insert/Update/DeleteReadingJournalEntry | A | read + write |
| Lists | FindUserLists, FindListById, FindListsForUserAndBook; Create/Update/DeleteList, UpdateListPositions | A, T (positions) | read + write |
| Goals | FindUserGoals, FindGoalById; Create/Update/DeleteGoal, UpdateGoalProgress | A (plus legacy T) | read |
| Follows, likes, blocks | FindFollows, Create/DeleteFollowedUser, Upsert/DeleteFollowedList, Create/DeleteLike | A, T (blocks) | later |
| Activities / feed | FindActivitiesForUser, FindActivitiesForBook; DeleteActivity | T | later |
| Prompts | FindPrompts, FindPromptAnswersFor*; Create/Delete prompt and answer | A, T | later |
| Tags | FindTagsByCategory, SearchTags; SaveTags (`upsert_tags`) | A | later |
| Notifications | GetNotifications, GetNotificationsCount; MarkNotificationsAsRead | T | later |
| Imports | FindImports; AddImportForUser, RetryImport | A | later |
| User / settings | UpdateUserInfo, UpdatePrivacyLevel, DeleteAccount | A | **blocked for tokens** |

Some features are Rails-only today, with no GraphQL surface, so an SDK can't
reach them yet: groups and clubs, discussions, dashboards, buddy reads,
uploads, and account import/export files.

## Domain rules the SDK must replicate

These are enforced in client code, not by the API. The canonical ids are in
[`shared/enums.json`](../shared/enums.json).

### Status

The status ids are 1 Want to Read, 2 Currently Reading, 3 Read, 4 Paused,
5 DNF and 6 Ignored (`types/UserBookStatusType.tsx`).

### Dates

- `user_date` and `user_start_date` are **local** `YYYY-MM-DD` dates in the
  user's timezone, not UTC.
- Setting status to Read sets `user_date` to today unless the caller supplies
  dates. The app's client sends the device's date
  (`services/UserBookService/useUserBookService.ts`); when `user_date` is
  absent, the server stamps `user.local_date`, today in the reader's own
  timezone (`UserBookService#user_current_date`, falling back to UTC).
- The SDK sends no default date and lets the server stamp it. `users.timezone`
  is owner-only in Hasura and API tokens can't read it, and the server is the
  one place that knows the reader's zone (app decision record
  `2026-09-16-day-bucketed-writes-round-trip`).
- `finished_at_precision` is 0 unknown, 1 day, 2 month, 3 year. Use it when
  only a month or year is known.

### Progress

- Stored as `progress_pages` (physical and ebook) or `progress_seconds`
  (audiobook) on a `user_book_reads` row. Which field applies depends on the
  **edition's** `reading_format_id`.
- Percent is a UI-only concept (`components/progress/.../progressMath.ts`):
  - `pct = floor(value / total * 100)`
  - `value = ceil(pct / 100 * total)`, where `total` is `edition.pages` or
    `edition.audio_seconds`
- The SDK exposes a `setProgress({ percent | pages | seconds })` helper with the
  same math, and throws if the edition has no total.

### Update inputs are whitelisted

The app only sends fields from `editFields` (`services/UserBookService/constants.ts`).
The SDK sends only the fields the caller set, which also keeps
`write:reviews`-protected arguments out of plain status updates.

### Other rules

- **Rating** is 0.5 to 5 in 0.5 steps, and `null` clears it. Validate
  client-side for a better error than the server's.
- **Pagination** is limit/offset everywhere with `_aggregate` for counts. There
  are no cursors.
- **Search results.** `results` is raw Typesense JSON and its shape depends on
  `query_type`. The docs guide (`docs/src/content/docs/api/guides/Searching.mdx`)
  lists fields, default `fields`/`weights`/`sort` per type, and examples. The
  app's own defaults are in `lib/search/typesenseDirect.ts`.
