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
  "calls": [ … ],                         // or several calls in order on one client; the last one is checked
  "random": 0.5,                          // optional: fixed value for the client's random source (jitter)
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

## OAuth (`oauth.json`)

The OAuth session and flows (spec/03 Auth), checked against `auth.json`.
Every case uses client id `test-client`, environment `prod`, and a fake clock
starting at `now` that each sleep moves forward.

- **`vectors`**: SHA-256, base64url and the RFC 7636 PKCE example. Inputs are
  ASCII.
- **`authorize`**: build the authorize URL with a random source that returns
  zero bytes. Compare `params` as a map (order is free). `argumentError`
  means the call refuses its arguments.
- **`redirects`**: parse a redirect against `attempt`; expect a `code` or an
  `OAuthError` with `code`.
- **`tokenResponses`**: turn a token endpoint body into the stored
  `tokenSet` shape, timed from `now`.
- **`device`** and **`sessions`**: run against a real session and client.
  `responses` are queued **per endpoint** (`graphql`, `token`, `revoke`,
  `device`), so concurrent requests can go out in any order. `stored` is the
  store's starting value; `storeAfterFirstRead`, when present, is what every
  later read returns (another process refreshed). `calls` are operations,
  `{ "session": "signOut" }`, or `{ "resource": "me.get" }` (the client's
  cached signed-in user); with `concurrent` they start together.

  Expectations: `result`; `bearers` (GraphQL Authorization tokens in order)
  or `bearersUnordered`; `forms` (decoded form bodies sent to each
  endpoint); `stored` (the store afterwards, or `"unchanged"`); `signedOut`
  (reasons passed to `onSignedOut`, in order); `sleptSeconds`.
