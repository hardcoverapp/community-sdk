# API snapshot

A frozen copy of the public Hardcover API contract. SDK codegen and the offline
contract tests run against these files, never against the live API.

| File | What it is | Copied from |
|---|---|---|
| `schema.graphql` | SDL from a full introspection of `https://api.hardcover.app/v1/graphql` as the `user` role | `hardcover-docs` @ `2f93db9` (2026-08-28) |
| `capabilities.json` | Raw `/capabilities` payload: scope tree and operation map | same |
| `capability-scopes.json` | Operation name to `{read, write}` scopes (any one scope is sufficient) | same |
| `capability-field-scopes.json` | Column-level scope requirements (`users.email`, `users.librarian_roles`) | same |

The upstream sources of truth live in the app repo:

- Scopes and the operation map: `app/shared/scope_definitions.yml` (generated into `app/api/config/capabilities.json`)
- Actions: `app/hasura/metadata/actions.graphql`, `actions.yaml`
- Table permissions: `app/hasura/metadata/databases/Default/tables/`

## Refreshing

Refreshing is a deliberate, reviewed change. The drift check in
[spec/04-testing.md](../spec/04-testing.md#layer-2-contract-tests) tells you when it's needed.

1. Run the docs pipeline: `docs/scripts/schema-tools/update-all.sh <token>`, or
   point it at staging to preview unreleased changes.
2. Copy the four files here and update the table above with the commit and date.
3. Run the contract tests. A breaking diff must come with SDK changes in the same PR.
