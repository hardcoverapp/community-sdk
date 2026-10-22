// The OAuth flows as plain functions (spec/03 Auth). OAuthSession builds on
// these; apps that keep tokens themselves (a server storing them per user) can
// use them directly.
import { auth } from "../generated/auth.ts";
import { NetworkError, OAuthError, ServerError, TimeoutError } from "../core/errors.ts";
import { codeChallenge, randomToken } from "./pkce.ts";
import { formEncode, postForm, type ResolvedOAuthConfig } from "./http.ts";
import { parseTokenResponse, type TokenSet } from "./tokens.ts";

const { pkce, device: deviceDefaults } = auth.oauth;

export interface AuthorizationOptions {
  /** What to ask the user for. Always explicit: there's no default set of scopes. */
  scopes: readonly string[];

  /** Must match a redirect URI registered for your app, exactly. */
  redirectUri: string;

  /** Extra parameters for the authorize page, e.g. `{ prompt: "consent" }`. */
  extraParams?: Record<string, string>;
}

/**
 * One sign-in attempt: open `url` in the browser, then pass the redirect to
 * `parseRedirect` (or `OAuthSession.completeAuthorization`) with this object.
 * It's plain JSON, so it can wait in sessionStorage across a page redirect.
 */
export interface AuthorizationAttempt {
  url: string;
  redirectUri: string;
  state: string;
  codeVerifier: string;
  /** Sent when the scopes include `openid`; it comes back inside the id token. */
  nonce: string | undefined;
  /** The `iss` the redirect must carry. */
  issuer: string;
}

/** Builds the authorize URL with PKCE (S256), `state` and, for `openid`, a `nonce`. */
export function createAuthorization(config: ResolvedOAuthConfig, options: AuthorizationOptions): AuthorizationAttempt {
  const { endpoints } = config;

  if (!endpoints.authorize) {
    throw new TypeError("This environment has no authorize page URL. Pass it as endpoints.authorize.");
  }

  const redirectUri = requireRedirectUri(options.redirectUri);
  const scope = requireScopes(options.scopes);

  const random = config.random();
  const codeVerifier = randomToken(random, pkce.verifierBytes);
  const state = randomToken(random, pkce.stateBytes);
  const nonce = scope.split(" ").some(impliesOpenId) ? randomToken(random, pkce.nonceBytes) : undefined;

  const query = formEncode({
    ...options.extraParams,
    response_type: "code",
    client_id: config.clientId,
    redirect_uri: redirectUri,
    scope,
    state,
    nonce,
    code_challenge: codeChallenge(codeVerifier),
    code_challenge_method: pkce.method,
  });

  const separator = endpoints.authorize.includes("?") ? "&" : "?";

  return {
    url: `${endpoints.authorize}${separator}${query}`,
    redirectUri,
    state,
    codeVerifier,
    nonce,
    issuer: endpoints.issuer,
  };
}

/**
 * Reads the redirect back to your app and returns the authorization code.
 * Throws OAuthError when the user declined (`access_denied`), the server
 * refused the request, or the redirect doesn't belong to this attempt
 * (`state_mismatch`, `issuer_mismatch`): never exchange a code you can't tie
 * to the attempt that asked for it.
 */
export function parseRedirect(redirectUrl: string, attempt: Pick<AuthorizationAttempt, "state" | "issuer">): string {
  const params = queryParams(redirectUrl);

  // Check where it came from before reading anything else, errors included.
  if (params.state !== attempt.state) {
    throw new OAuthError("state_mismatch", "The redirect's state doesn't match this sign-in attempt.");
  }

  // An empty iss says nothing, so it counts as absent (spec/06 #41).
  if (params.iss && params.iss !== attempt.issuer) {
    throw new OAuthError("issuer_mismatch", `The redirect came from ${params.iss}, not ${attempt.issuer}.`);
  }

  if (params.error) throw new OAuthError(params.error, params.error_description);

  if (!params.code) throw new OAuthError("invalid_request", "The redirect has no authorization code.");

  return params.code;
}

/** Exchanges an authorization code for tokens. A code works once. */
export interface ExchangeCodeOptions {
  code: string;
  /** From the attempt that started this sign-in. */
  codeVerifier: string;
  /** The same redirect URI the attempt used. */
  redirectUri: string;
}

export async function exchangeCode(config: ResolvedOAuthConfig, options: ExchangeCodeOptions): Promise<TokenSet> {
  const body = await postForm(config, config.endpoints.token, {
    grant_type: "authorization_code",
    code: options.code,
    code_verifier: options.codeVerifier,
    redirect_uri: options.redirectUri,
  });

  return parseTokenResponse(body, config.now());
}

/**
 * Trades a refresh token for a new pair. The old refresh token is spent:
 * store the new one before anything else, because sending the old one again
 * revokes the whole sign-in.
 */
export interface RefreshOptions {
  /** Narrow the grant to fewer scopes. */
  scopes?: readonly string[];
}

export async function refreshTokens(
  config: ResolvedOAuthConfig,
  refreshToken: string,
  options: RefreshOptions = {},
): Promise<TokenSet> {
  const body = await postForm(config, config.endpoints.token, {
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    scope: options.scopes ? requireScopes(options.scopes) : undefined,
  });

  return parseTokenResponse(body, config.now());
}

/** Revokes a token. Revoking either the access or refresh token revokes both. */
export async function revokeToken(config: ResolvedOAuthConfig, token: string): Promise<void> {
  await postForm(config, config.endpoints.revoke, { token });
}

/** What to show the user while a device sign-in waits (RFC 8628). */
export interface DeviceAuthorization {
  deviceCode: string;
  /** The short code the user types, e.g. "WDJB-MJHT". */
  userCode: string;
  /** Where the user types it. */
  verificationUri: string;
  /** The same page with the code filled in, good for a QR code. */
  verificationUriComplete: string | undefined;
  /** Seconds between polls, as the server asked. */
  interval: number;
  /** Epoch ms when the code stops working. */
  expiresAt: number;
}

export async function startDeviceAuthorization(
  config: ResolvedOAuthConfig,
  options: { scopes: readonly string[] },
): Promise<DeviceAuthorization> {
  const body = await postForm(config, config.endpoints.device, { scope: requireScopes(options.scopes) });

  const deviceCode = body.device_code;
  const userCode = body.user_code;
  const verificationUri = body.verification_uri;

  if (typeof deviceCode !== "string" || typeof userCode !== "string" || typeof verificationUri !== "string") {
    throw new OAuthError("invalid_response", "The device endpoint's answer is missing device_code, user_code or verification_uri.");
  }

  const expiresIn = positiveNumber(body.expires_in) ?? deviceDefaults.defaultExpiresInSeconds;

  return {
    deviceCode,
    userCode,
    verificationUri,
    verificationUriComplete: typeof body.verification_uri_complete === "string" ? body.verification_uri_complete : undefined,
    interval: positiveNumber(body.interval) ?? deviceDefaults.defaultIntervalSeconds,
    expiresAt: config.now().getTime() + expiresIn * 1_000,
  };
}

/**
 * Polls until the user approves or declines, or the code expires. Waits
 * `interval` between polls and slows down when the server asks.
 * `authorization_pending` and `slow_down` never surface; `access_denied` and
 * `expired_token` do, as OAuthError. A network blip or a server error is
 * retried at the next interval: the user may already have typed the code.
 * Aborting `signal` stops it right away, with the signal's reason.
 */
export async function pollDeviceToken(
  config: ResolvedOAuthConfig,
  device: DeviceAuthorization,
  options: { signal?: AbortSignal } = {},
): Promise<TokenSet> {
  const { signal } = options;
  let interval = device.interval;

  for (;;) {
    await sleepUnlessAborted(config, interval * 1_000, signal);

    if (config.now().getTime() >= device.expiresAt) {
      throw new OAuthError("expired_token", "The device code expired before the user approved it.");
    }

    try {
      const body = await postForm(config, config.endpoints.token, {
        grant_type: "urn:ietf:params:oauth:grant-type:device_code",
        device_code: device.deviceCode,
      });

      return parseTokenResponse(body, config.now());
    } catch (error) {
      if (error instanceof OAuthError && error.code === "authorization_pending") continue;

      if (error instanceof OAuthError && error.code === "slow_down") {
        interval += deviceDefaults.slowDownIncrementSeconds;
        continue;
      }

      // Try again next interval; the code stays valid until it expires.
      if (error instanceof NetworkError || error instanceof TimeoutError || error instanceof ServerError) continue;

      throw error;
    }
  }
}

/** Throws the signal's reason if it's already aborted. */
export function throwIfAborted(signal: AbortSignal | undefined): void {
  if (!signal?.aborted) return;

  // Hermes's AbortSignal may have no `reason`.
  throw signal.reason ?? new Error("Device sign-in was cancelled");
}

// The configured sleep, cut short when the signal aborts.
async function sleepUnlessAborted(config: ResolvedOAuthConfig, ms: number, signal: AbortSignal | undefined): Promise<void> {
  throwIfAborted(signal);

  if (!signal) return config.sleep(ms);

  let onAbort: (() => void) | undefined;
  const aborted = new Promise<void>((resolve) => {
    onAbort = resolve;
    signal.addEventListener("abort", onAbort);
  });

  try {
    await Promise.race([config.sleep(ms), aborted]);
  } finally {
    signal.removeEventListener("abort", onAbort!);
  }

  throwIfAborted(signal);
}

// Reads ?a=b&c=d without URL/URLSearchParams, which React Native implements
// only partly. The fragment is ignored (auth.json oauth.redirect).
function queryParams(url: string): Record<string, string | undefined> {
  const withoutFragment = url.split("#")[0]!;
  const start = withoutFragment.indexOf("?");
  const params: Record<string, string> = {};

  if (start === -1) return params;

  for (const pair of withoutFragment.slice(start + 1).split("&")) {
    if (!pair) continue;

    const equals = pair.indexOf("=");
    const key = decode(equals === -1 ? pair : pair.slice(0, equals));
    const value = decode(equals === -1 ? "" : pair.slice(equals + 1));

    // The first value wins, so an appended duplicate can't override it.
    if (!(key in params)) params[key] = value;
  }

  return params;
}

function decode(component: string): string {
  try {
    return decodeURIComponent(component.replace(/\+/g, " "));
  } catch {
    return component;
  }
}

function requireScopes(scopes: readonly string[] | undefined): string {
  const list = (scopes ?? []).flatMap((scope) => scope.split(/\s+/)).filter(Boolean);

  if (list.length === 0) {
    throw new TypeError("Pass the scopes your app needs, e.g. [\"read:library\"]. There's no default set.");
  }

  return [...new Set(list)].join(" ");
}

function requireRedirectUri(redirectUri: string | undefined): string {
  const value = redirectUri?.trim();

  if (!value) {
    throw new TypeError("Pass your app's redirectUri, exactly as registered for it on Hardcover.");
  }

  return value;
}

function impliesOpenId(scope: string): boolean {
  return (auth.oauth.identityScopes.scopes as readonly string[]).includes(scope);
}

function positiveNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : undefined;
}
