# Conformance suite

Language-neutral behavior tests. Every SDK ships a small runner for each file
below; a port that passes them all behaves like every other SDK. A language is
not "done" on a feature row in the README matrix until the matching cases pass.

| File | Pins | TypeScript runner |
|---|---|---|
| `cases.json` | Error mapping, envelopes, retries, rate-limit state (format below) | `tests/conformance.test.ts` |
| `vectors.json` | Pure functions: rate-limit headers, request cost, token cleanup, ISBNs, local dates, goal progress, library cursors | `tests/vectors-conformance.test.ts` |
| `client.json` | Behavior over time: pacing, batching, retries | `tests/client-conformance.test.ts` |
| `resources/*.json` | Every resource method: what it sends and returns | `tests/resources-conformance.test.ts` |
| `oauth.json` | Sign-in, redirects, the session's token lifecycle | `tests/oauth-conformance.test.ts` |

Values these cases depend on (retry timings, page sizes, limits) come from
`../client.json` and `../auth.json`, never from another SDK's source.

These are hand-written and synthetic on purpose: they pin SDK behavior
(error mapping, retries, envelopes), not API data. Recorded API data lives
in `../fixtures`.

## Case format (`cases.json`)

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

## Vectors (`vectors.json`)

Pure functions every SDK owns, checked without a client or transport. Each
top-level key is a group with a `$comment` naming the function and any rule a
port must follow, plus `cases` (or, for `libraryCursor`, `encode` and
`decode`). A case is `{ "name", "in", "out" }`.

- Compare `out` as JSON. A missing key and `null` both mean absent.
- Errors are `{ "error": "<kind>" }`. Kinds: `missingToken`, `refusedToken`
  (with the auth.json `prefix`), `invalidCursor`. Map each to the language's
  argument error; token errors must carry the auth.json message.
- `token` warnings name the auth.json rule by `prefix`; check the warning
  callback got that rule's message once.
- `goalProgress` numbers compare within 1e-9.
- `localDate` must not depend on the runtime's locale or default timezone.

Groups: `rateLimit`, `requestCost`, `token`, `isbn`, `localDate`,
`goalProgress`, `libraryCursor`.

## Client behavior over time (`client.json`)

Pacing, batching (the request planner) and retries. Same conventions as `cases.json` where they fit: ops by name from `shared/operations` (`"raw"` with a `query` for the escape hatch), `client` options (`batch`, `pace`, `maxRetries`), `random`, and `responses` served one per HTTP request in send order.

- **`steps`** run in order. A step is a call, `{ "together": [calls] }` (all issued before any is awaited), or `{ "advanceSeconds": n }` (the app spent time elsewhere).
- **Fake clock.** Each sleep is recorded in `sleptSeconds` and returns at once; when it returns, time jumps to when that sleep would have ended, never backwards. Sleeps started together overlap like real timers, so calls issued together all decide their wait from the same moment.
- **`transport: "held"`** holds every request. The runner lets the client settle (send, sleep, group whatever it can), answers the oldest held request with the next response, and repeats until nothing is held. `expect.inFlight` lists how many were held at each answer. Without it, the transport answers at once.

Expectations, all optional:

- **`requests`**: one entry per HTTP request. An operation name (`null` when anonymous) for a plain request, or a list of names for a JSON array (a batch). The list length is the batch size. **`requestsUnordered`** compares the same shape ignoring order.
- **`sleptSeconds`**, **`inFlight`**: as above.
- **`results`**: one per call, in issue order: `"ok"`, `{ "data": … }` (exact data returned), or `{ "error": "Name", "fields": { … } }`. When absent, every call must succeed.

"Together" means issued in the same moment with no waiting between them. The TypeScript planner groups reads issued within one macrotask; other languages may collect them differently, as long as calls issued together end up in the same run.

## Resources (`resources/*.json`)

One file per resource. Each case calls one resource method and checks what it
sends and returns. TypeScript runs them in `tests/resources-conformance.test.ts`.

```jsonc
{
  "id": "library/add-maps-options",
  "method": "library.add",                  // canonical camelCase; map to your casing
  "args": [100, { "status": 2, "editionId": 5 }],  // positional, options object last
  "responses": [ { "status": 200, "body": { "data": { … } } } ],
  "expect": {
    "requests": [ { "operationName": "AddUserBook", "variables": { "object": { … } } } ],
    "result": { "id": 7 }                   // or "error" (+ "fields") instead of "result"
  }
}
```

- **Casing.** `method`, option keys and SDK-made result keys (`hasMore`,
  `listBookId`) are camelCase; convert them to your convention. Response
  bodies and API fields in `result` are canonical snake_case, as in
  `shared/operations`; a language that aliases reshapes each body by walking
  the document it sent. Result keys compare with case and underscores ignored.
  Variables are wire names and compare exactly.
- **The cached user.** Methods that look up `me` list the `Me` response first
  and expect the `Me` request. `calls` runs several calls on one client (with
  `"concurrent": true` they start together); the last one is checked.
- **Requests** are exact and in order. `query` appears only for documents the
  SDK builds itself and compares with whitespace removed.
- **`result`** of `null` means no value (void, or null). Matchers:
  `{"$any": true}`, `{"$type": "string"}`, `{"$approx": 20.51, "digits": 2}`,
  `{"$error": "GraphQLError"}` (an error object inside a result).
- **`error`** is a name from `errors.json`, checked with `fields`, or
  `ArgumentError`: the language's own bad-argument error, raised before any
  request the case doesn't list.
- A name without a dot is a top-level function. (None today: `goalProgress` is pinned in `vectors.json`.)
