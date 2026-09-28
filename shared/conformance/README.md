# Conformance suite

Language-neutral behavior tests. Every SDK ships a small runner that loads
each case in `cases.json`, feeds `responses` through its mock transport in order,
invokes `call`, and checks `expect`. A language is not "done" on a feature
row in the README matrix until the matching cases pass.

These are hand-written and synthetic on purpose: they pin SDK behavior
(error mapping, retries, envelopes), not API data. Recorded API data lives
in `../fixtures`.

## Case format

```jsonc
{
  "id": "rate-limit/retry-after",         // unique, path-like
  "covers": ["rate-limit"],               // feature ids from languages.json
  "call": { "op": "Me", "variables": {} },// operation name from shared/operations, or "raw"
  "client": { "maxRetries": 2 },          // optional client options
  "responses": [                          // served in order, one per HTTP request
    { "status": 429, "headers": { "retry-after": "1" }, "body": { "error": "Too Many Requests" } },
    { "status": 200, "body": { "data": { "me": [] } } }
  ],
  "expect": {
    "requests": 2,                        // exact HTTP request count
    "sleptSeconds": [1],                  // runners inject a fake clock
    "result": "ok"                        // or { "error": "RateLimitError", "fields": { ... } }
  }
}
```

Runners must use a fake clock so retry cases run instantly.
