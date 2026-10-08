# Examples

Each file is a self-contained, type-checked function you can copy into an app.
`pnpm typecheck` compiles them against the SDK, so an API change that breaks
an example fails CI instead of drifting from the docs. These will move into the
Hardcover docs site pages as each resource lands there.

| Example | Shows |
|---|---|
| [quick-start.ts](quick-start.ts) | Creating a client, reading your shelf, rate-limit state |
| [shelve-a-book.ts](shelve-a-book.ts) | Add, status, rating, review, remove |
| [reading-progress.ts](reading-progress.ts) | Progress in pages / percent / seconds, backdating with `occurredAt`, a re-read |
| [bulk-scan-to-list.ts](bulk-scan-to-list.ts) | Scanning barcodes into a list by exact ISBN, one or a whole shelf |
| [search.ts](search.ts) | Searching every type, tuning with the API's options |
| [books.ts](books.ts) | Book details, editions, exact ISBN lookup, trending, ordered batches |
| [journal.ts](journal.ts) | Notes and quotes; why most journal entries are the server's job |
| [vibes.ts](vibes.ts) | Building a recommendation vibe from signals, and reading results honestly |
| [goals.ts](goals.ts) | Reading challenges, merge-on-update, `goalProgress()` units |
| [errors-and-testing.ts](errors-and-testing.ts) | Error types apps handle, and testing with `MockTransport` |
