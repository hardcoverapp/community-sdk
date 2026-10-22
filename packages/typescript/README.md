# @hardcover/sdk

The official TypeScript client for the [Hardcover](https://hardcover.app) API,
built by the Hardcover team for the community. It runs in Node 22.12+,
browsers, Deno, Bun and React Native (Hermes), with no runtime dependencies.
It's ES modules only; CommonJS code on Node 22.12+ can still `require()` it.

> **Pre-release.** The API it wraps is stable, but names may still change
> before 1.0.

```sh
npm install @hardcover/sdk
```

Testing with Jest? Let Jest compile the package by exempting it from
`transformIgnorePatterns`, e.g. `"node_modules/(?!@hardcover/sdk)"` (alongside
any packages you already list there). Vitest needs nothing.

## Quick start

Get a personal access token at hardcover.app → Account → API Access. Keep it
out of source control and out of browser bundles.

```ts
import { HardcoverClient, UserBookStatus } from "@hardcover/sdk";

const hc = new HardcoverClient({ token: process.env.HARDCOVER_TOKEN, userAgent: "my-reading-app/1.0" });

const me = await hc.me.get();
const reading = await hc.library.list({ status: UserBookStatus.CurrentlyReading });

for (const entry of reading.items) console.log(entry.book.title);
```

Typed resources cover the library and reads, lists, journal, goals, vibes,
prompts, the catalog (books, authors, series, editions), people and feeds,
notifications and search. `hc.request(operations.X, variables)` runs any
built-in operation, and `hc.graphql(query)` runs anything your token's scopes
allow, with the same auth, retries and errors.

## Signing users in (OAuth)

Apps that act for other people use OAuth. The session owns the tokens:
it refreshes them before they expire, never spends a refresh token twice,
stores each new pair before using it, and tells you once when the user needs
to sign in again. You decide where tokens are stored.

```ts
import * as SecureStore from "expo-secure-store";
import { openAuthSessionAsync } from "expo-web-browser";
import { HardcoverClient } from "@hardcover/sdk";
import { OAuthSession, secureStore } from "@hardcover/sdk/oauth";

const session = new OAuthSession({
  clientId: "your-client-id", // hardcover.app → Account → Developer apps
  redirectUri: "yourapp://oauth/callback",
  store: secureStore(SecureStore, "hardcover-tokens"),
  onSignedOut: () => showSignIn(),
});
const hc = new HardcoverClient({ auth: session });

const attempt = session.authorize({ scopes: ["read:me:content", "read:library"] });
const result = await openAuthSessionAsync(attempt.url, attempt.redirectUri);
if (result.type === "success") await session.completeAuthorization(result.url, attempt);
```

TVs and command-line tools can use `session.signInWithDevice(...)` instead.
On React Native, install `react-native-get-random-values` (or pass
`expo-crypto` as `random`) so sign-in has a secure random source.

## What the client handles

- **Rate limits.** It paces itself from the API's headers, backs off when
  other apps share your budget, and can batch concurrent reads into one
  request (`batch: true`).
- **Errors.** Every failure is a typed error: `ScopeError` names the missing
  scopes, `RateLimitError` says how long to wait, `SignedOutError` means show
  sign-in.
- **Retries.** Reads are retried after network and server errors; writes are
  never sent twice.
- **Testing.** `MockTransport` from `@hardcover/sdk/testing` drives a real
  client with canned responses.

## More

- [Examples](https://github.com/hardcoverapp/community-sdk/tree/main/packages/typescript/examples),
  each one type-checked against the SDK
- [The design and the API it wraps](https://github.com/hardcoverapp/community-sdk/tree/main/spec)
- [Issues](https://github.com/hardcoverapp/community-sdk/issues)
