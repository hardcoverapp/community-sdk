// Live checks of the ways a server refuses OAuth, and what the SDK makes of
// each. Run through `node scripts/oauth-smoke.ts rejections [step]`; with a
// step name, only that step runs.
//
// The first steps run on their own (your approval of the read scopes is
// remembered from earlier runs). The last three ask you to click: Deny on a
// consent page, Deny on the device page, and Remove on the Authorized apps
// page. Removing deletes your approval, so the next browser run shows the
// consent page again.
//
// Optional: HARDCOVER_OAUTH_NO_DEVICE_CLIENT_ID, a second app with the device
// grant turned off, checks that the device endpoint refuses it.
import { argv, env, exit } from "node:process";
import { HardcoverClient, OAuthError, SignedOutError } from "../src/index.ts";
import { environments } from "../src/generated/environments.ts";
import { memoryStore, OAuthSession, refreshTokens, startDeviceAuthorization } from "../src/oauth/index.ts";
import { browserRedirect, check, environment, report, requireClientId, thrown, USER_AGENT } from "./oauth-live.ts";

const clientId = requireClientId();
const config = { clientId, environment, userAgent: USER_AGENT };

const DATA_SCOPES = ["read:me", "read:library"];

// A scope the app may ask for but you haven't approved yet, so the consent
// page shows instead of approving silently.
const UNAPPROVED_SCOPES = ["read:lists"];

const webOrigin = new URL(environments[environment].authorize ?? "http://localhost:3000").origin;

// Steps, in the order they run.
const STEPS = {
  "unknown-client": unknownClient,
  "unallowed-scope": unallowedScope,
  "refresh-replay": refreshReplay,
  "no-device-grant": noDeviceGrant,
  "deny-consent": denyConsent,
  "deny-device": denyDevice,
  "remove-on-website": removeOnWebsite,
};

const only = argv[3] as keyof typeof STEPS | undefined;
if (only && !(only in STEPS)) {
  console.error(`Unknown step ${only}. Steps: ${Object.keys(STEPS).join(", ")}`);
  exit(1);
}

for (const [name, step] of Object.entries(STEPS)) {
  if (only && name !== only) continue;

  console.log(`\n# ${name}\n`);
  await step();
}

report();

// Automatic

async function unknownClient() {
  const error = await thrown(() =>
    startDeviceAuthorization({ ...config, clientId: "not-a-registered-client" }, { scopes: DATA_SCOPES }),
  );

  check(`an unknown client id is refused with invalid_client (${describe(error)})`, isOAuthError(error, "invalid_client"));
}

async function unallowedScope() {
  const { session } = newSession();
  const { url, attempt } = await browserRedirect(session, ["write:library"]);
  const error = await thrown(() => session.completeAuthorization(url, attempt));

  check(`a scope the app isn't allowed comes back as invalid_scope (${describe(error)})`, isOAuthError(error, "invalid_scope"));
  check("nothing was stored", (await session.tokens()) === null);
}

async function refreshReplay() {
  const { session, client, store, signedOut } = newSession();
  await signIn(session, DATA_SCOPES);

  // The script reads its own store: the session never hands out the refresh token.
  const first = (await store.get())!;
  await session.refreshAfterUnauthorized(first.accessToken);

  // What a second copy of the app would do with a stale refresh token.
  const replay = await thrown(() => refreshTokens(config, first.refreshToken!));
  check(`replaying a spent refresh token is refused with invalid_grant (${describe(replay)})`, isOAuthError(replay, "invalid_grant"));

  // The server revokes the whole sign-in, including the pair this session holds.
  const next = await thrown(() => client.me.get());
  check(`the session's next request ends in SignedOutError "revoked" (${describe(next)})`, isSignedOut(next, "revoked"));
  check("the session cleared its store", (await store.get()) === null);
  check(`onSignedOut was called once, with revoked (${signedOut.join() || "never"})`, signedOut.join() === "revoked");
}

async function noDeviceGrant() {
  const noDeviceClientId = env.HARDCOVER_OAUTH_NO_DEVICE_CLIENT_ID;

  if (!noDeviceClientId) {
    console.log("skipped: set HARDCOVER_OAUTH_NO_DEVICE_CLIENT_ID to an app without the device grant");
    return;
  }

  const error = await thrown(() =>
    startDeviceAuthorization({ ...config, clientId: noDeviceClientId }, { scopes: DATA_SCOPES }),
  );

  check(`an app without the device grant is refused with unauthorized_client (${describe(error)})`, isOAuthError(error, "unauthorized_client"));
}

// Needs you

async function denyConsent() {
  const { session } = newSession();
  action(`On the consent page that opens (asking for ${UNAPPROVED_SCOPES.join(" ")}), click Deny.`);

  const { url, attempt } = await browserRedirect(session, UNAPPROVED_SCOPES);
  const error = await thrown(() => session.completeAuthorization(url, attempt));

  check(`denying consent comes back as access_denied (${describe(error)})`, isOAuthError(error, "access_denied"));
  check("nothing was stored", (await session.tokens()) === null);
}

async function denyDevice() {
  const { session } = newSession();

  const error = await thrown(() =>
    session.signInWithDevice({
      scopes: UNAPPROVED_SCOPES,
      onCode: ({ userCode }) => action(`Go to ${webOrigin}/link, enter ${userCode}, then click Deny.`),
    }),
  );

  check(`denying a device code ends polling with access_denied (${describe(error)})`, isOAuthError(error, "access_denied"));
  check("nothing was stored", (await session.tokens()) === null);
}

async function removeOnWebsite() {
  const { session, client, store, signedOut } = newSession();
  action("If a consent page opens, click Approve.");
  await signIn(session, DATA_SCOPES);

  const me = await client.me.get();
  check(`signed in as ${me.username} before removing the app`, Boolean(me.id));

  action(`Open ${webOrigin}/account/api/authorized-apps and remove this app. The script checks every 5 seconds for 5 minutes.`);

  // Ask until the server stops accepting the session, as an app would on its
  // next request. `refresh` because me.get() caches the user.
  let error: unknown;
  for (let attempt = 0; attempt < 60 && !error; attempt++) {
    await new Promise((resolve) => setTimeout(resolve, 5_000));
    error = await thrown(() => client.me.get({ refresh: true }));
  }

  check(`after removing the app, requests end in SignedOutError "revoked" (${describe(error)})`, isSignedOut(error, "revoked"));
  check("the session cleared its store", (await store.get()) === null);
  check(`onSignedOut was called once, with revoked (${signedOut.join() || "never"})`, signedOut.join() === "revoked");
}

// Helpers

function newSession() {
  const signedOut: string[] = [];
  const store = memoryStore();
  const session = new OAuthSession({ ...config, store, onSignedOut: (reason) => signedOut.push(reason) });
  const client = new HardcoverClient({ auth: session, environment, userAgent: USER_AGENT });

  return { session, client, store, signedOut };
}

async function signIn(session: OAuthSession, scopes: readonly string[]) {
  const { url, attempt } = await browserRedirect(session, scopes);
  await session.completeAuthorization(url, attempt);
}

function isOAuthError(error: unknown, code: string): boolean {
  return error instanceof OAuthError && error.code === code;
}

function isSignedOut(error: unknown, reason: string): boolean {
  return error instanceof SignedOutError && error.reason === reason;
}

function describe(error: unknown): string {
  return error instanceof Error ? `${error.name}: ${error.message}` : String(error);
}

function action(text: string) {
  console.log(`\n>>> YOUR TURN: ${text}\n`);
}
