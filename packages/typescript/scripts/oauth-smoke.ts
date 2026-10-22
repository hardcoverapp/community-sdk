// Interactive OAuth check against a real server (spec/04). You approve the
// sign-in yourself, so it never runs in CI. Token values are never printed.
//
//   HARDCOVER_OAUTH_CLIENT_ID=… node scripts/oauth-smoke.ts             browser sign-in (loopback redirect)
//   HARDCOVER_OAUTH_CLIENT_ID=… node scripts/oauth-smoke.ts device      device sign-in
//   HARDCOVER_OAUTH_CLIENT_ID=… node scripts/oauth-smoke.ts identity    OpenID only: id token, no refresh token
//   HARDCOVER_OAUTH_CLIENT_ID=… node scripts/oauth-smoke.ts offline     OpenID + offline_access: id token and a refresh token
//   HARDCOVER_OAUTH_CLIENT_ID=… node scripts/oauth-smoke.ts rejections  every way the server refuses (oauth-rejections.ts)
//
// HARDCOVER_ENV picks the environment (default local). Register the app with
// redirect URI http://127.0.0.1/callback; loopback redirects match on any
// port, so this script can listen wherever it's free.
import { argv, exit } from "node:process";
import { HardcoverClient } from "../src/index.ts";
import { memoryStore, OAuthSession } from "../src/oauth/index.ts";
import { accepted, browserRedirect, check, environment, report, requireClientId, USER_AGENT } from "./oauth-live.ts";

const MODES = {
  browser: ["read:me", "read:library"],
  device: ["read:me", "read:library"],
  identity: ["openid", "profile"],
  offline: ["openid", "profile", "offline_access"],
  rejections: [],
} as const;

const mode = (argv[2] ?? "browser") as keyof typeof MODES;
if (!(mode in MODES)) {
  console.error(`Unknown mode ${mode}. Use one of: ${Object.keys(MODES).join(", ")}`);
  exit(1);
}

if (mode === "rejections") {
  await import("./oauth-rejections.ts");
} else {
  await signInChecks(MODES[mode]);
}

async function signInChecks(scopes: readonly string[]) {
  const clientId = requireClientId();
  const identity = mode === "identity" || mode === "offline";

  const signedOut: string[] = [];
  const store = memoryStore();
  const session = new OAuthSession({
    clientId,
    environment,
    store,
    userAgent: USER_AGENT,
    onSignedOut: (reason) => signedOut.push(reason),
  });
  const client = new HardcoverClient({ auth: session, environment, userAgent: USER_AGENT });

  let nonce: string | undefined;

  if (mode === "device") {
    await session.signInWithDevice({
      scopes,
      onCode: ({ userCode, verificationUri }) => console.log(`Go to ${verificationUri} and enter ${userCode}\n`),
    });
  } else {
    const { url, attempt } = await browserRedirect(session, scopes);
    await session.completeAuthorization(url, attempt);
    nonce = attempt.nonce;
  }

  // The script reads its own store: the session never hands out the refresh token.
  const first = (await store.get())!;

  // The token sign-out should revoke: the latest one the session holds.
  let latestAccessToken = first.accessToken;

  check(`granted scopes are what was asked (${first.scope})`, scopes.every((s) => first.scope.split(" ").includes(s)));

  if (identity) {
    identityChecks();
  } else {
    latestAccessToken = await dataChecks();
  }

  await session.signOut();
  check("sign-out cleared the store", (await store.get()) === null);
  check("sign-out revoked the token on the server", !(await accepted(latestAccessToken)));
  check("onSignedOut was called once, with signed-out", signedOut.join() === "signed-out");

  report();

  // Data scopes: a refresh token, requests, rotation and the late-401 rule.
  // Returns the access token the session ends up with.
  async function dataChecks(): Promise<string> {
    check("sign-in stored an access token and a refresh token", first.accessToken.startsWith("hc_at_") && Boolean(first.refreshToken?.startsWith("hc_rt_")));

    const me = await client.me.get();
    check(`requests work with the session (signed in as ${me.username})`, Boolean(me.id));

    // What a 401 triggers: one refresh, then the replay uses the new token.
    const refreshed = await session.refreshAfterUnauthorized(first.accessToken);
    const second = await store.get();
    check("refresh rotated both tokens", refreshed !== first.accessToken && second!.refreshToken !== first.refreshToken);
    check("the new access token works", await accepted(refreshed));
    check("the old access token stopped working", !(await accepted(first.accessToken)));

    // A second 401 for the same old token must not refresh again.
    const again = await session.refreshAfterUnauthorized(first.accessToken);
    check("a late 401 for the old token reuses the new one (no second refresh)", again === refreshed);

    return refreshed;
  }

  // OpenID: the id token carries our nonce and client id; offline_access decides the refresh token.
  function identityChecks() {
    const claims = decodeClaims(first.idToken);

    check("sign-in returned an id token", Boolean(claims));
    check("the id token's nonce is the one this attempt sent", Boolean(nonce) && claims?.nonce === nonce);
    check("the id token is for this app (aud)", claims?.aud === clientId || (Array.isArray(claims?.aud) && claims.aud.includes(clientId)));
    console.log(`      claims: ${Object.keys(claims ?? {}).sort().join(", ")}; iss ${String(claims?.iss)}`);

    const lifetimeMinutes = Math.round(((first.expiresAt ?? 0) - Date.now()) / 60_000);

    if (mode === "offline") {
      check("offline_access returned a refresh token", Boolean(first.refreshToken?.startsWith("hc_rt_")));
      check(`offline_access gets the full access lifetime (${lifetimeMinutes} min)`, lifetimeMinutes > 60);
    } else {
      check("identity-only sign-in has no refresh token", first.refreshToken === undefined);
      check(`identity-only access token is short-lived (${lifetimeMinutes} min)`, lifetimeMinutes > 0 && lifetimeMinutes <= 15);
    }
  }
}

// Reads the id token's claims without verifying it, only to compare values.
function decodeClaims(idToken: string | undefined): Record<string, unknown> | undefined {
  const payload = idToken?.split(".")[1];
  if (!payload) return undefined;

  return JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as Record<string, unknown>;
}
