# Fixtures

Recorded real API responses, shared by every SDK's mock transport and
exported to SDK users as a ready-made mock client
(spec/04-testing.md#layer-1-mock-transport-and-fixtures).

## Layout

```
fixtures/
  <OperationName>/
    <case>.json
```

```jsonc
{
  "operation": "GetBook",
  "variables": { "id": 328491 },
  "recordedAt": "2026-10-01T18:00:00Z",
  "env": "staging",
  "snapshot": "2f93db9",                // api-snapshot commit it was valid against
  "response": { "status": 200, "headers": { }, "body": { "data": { } } }
}
```

## Recording

Fixtures are produced by the live test suite in record mode
(`HARDCOVER_RECORD=1`), never written by hand. The recorder must scrub:

- `Authorization` and any `hc_*` token string
- `email`, `unconfirmed_email`
- `private_notes`
- the test account's username and id (replaced with stable placeholders)

A fixture is matched by operation name plus a canonical JSON of its
variables. Keep one `default.json` per operation; add named cases only when
a response shape actually differs (empty, partial, error envelope).

Empty for now: the recorder (`HARDCOVER_RECORD=1`) is planned as part of the
test tooling work. Until then, mock tests use small inline responses and the
live suites cover real response shapes.
