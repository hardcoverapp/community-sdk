# API snapshot

A frozen copy of the public Hardcover API contract. SDK codegen and the offline
contract tests run against these files, never against the live API.

| File | What it is |
|---|---|
| `schema.graphql` | SDL from a full introspection of the API as a token's role |
| `capabilities.json` | Raw `/capabilities` payload: scope tree and operation map |
| `capability-scopes.json` | Operation name to `{read, write}` scopes (any one scope is sufficient) |
| `capability-field-scopes.json` | Column-level scope requirements (`users.email`, `users.librarian_roles`) |
| `source.json` | Where and when this snapshot was taken (written by the refresh script) |

Current snapshot: local API on app `main` at `f5baad36b` (2026-10-07), which
includes unreleased changes such as buddy-read privacy. The first snapshot
(2026-08-28) came from the docs repo's prod introspection.

## Refreshing

```sh
pnpm snapshot:check                       # report drift against a live API (default: local)
pnpm snapshot:check -- --env staging      # or prod, or --url <graphql url>
pnpm snapshot:refresh                     # also update this folder and source.json
```

The script fetches introspection and `/capabilities`, converts them with the
docs site's own converters (run from a scratch directory, so the docs repo
isn't touched), and reports breaking, dangerous and added schema changes,
scope-map changes, and whether `shared/operations` still validate. It fails
only when SDK operations break or scopes change.

After refreshing: `pnpm codegen` in each package, then the tests. A refresh
that breaks an operation must ship with the SDK change in the same commit.

**Local gotcha:** after pulling app commits that add SQL functions used by
Hasura computed fields, Hasura may start before Rails runs the migration and
drop the affected permissions as inconsistent (e.g. the whole `user` role on
`user_books`). The drift check then reports false removals. Reload Hasura's
metadata once Rails has migrated (`reload_metadata` via the metadata API, or
restart `hasura`).
