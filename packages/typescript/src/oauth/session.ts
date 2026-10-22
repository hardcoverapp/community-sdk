// An OAuth session owns the token lifecycle (spec/03 Auth): sign-in, refresh
// at the right time, one refresh at a time, storing before use, and a single
// signed-out signal. Pass it to the client as `auth`.
import { auth } from "../generated/auth.ts";
import { HardcoverError, OAuthError, RateLimitError, SignedOutError, type SignedOutReason } from "../core/errors.ts";
import type { TokenSource } from "../core/client.ts";
import {
  createAuthorization,
  exchangeCode,
  parseRedirect,
  pollDeviceToken,
  refreshTokens,
  revokeToken,
  startDeviceAuthorization,
  throwIfAborted,
  type AuthorizationAttempt,
  type DeviceAuthorization,
} from "./flows.ts";
import { resolveConfig, type OAuthConfig, type ResolvedOAuthConfig } from "./http.ts";
import type { TokenStore } from "./store.ts";
import { sessionView, type SessionTokens, type TokenSet } from "./tokens.ts";

const REFRESH_SKEW_MS = auth.oauth.refresh.skewSeconds * 1_000;
const REFRESH_RETRY_MS = auth.oauth.refresh.retryAfterFailureSeconds * 1_000;

export interface OAuthSessionOptions extends OAuthConfig {
  /**
   * Where tokens live. Required, so where your users' tokens end up is a
   * choice: `secureStore(SecureStore, key)` on React Native, `memoryStore()`
   * for a script.
   */
  store: TokenStore;

  /** Your registered redirect URI, used by `authorize()` unless it's given one. */
  redirectUri?: string;

  /**
   * Called once each time the session loses its tokens: revoked, expired,
   * signed out (here or in another process sharing the store). Show sign-in
   * here. Requests that needed a token also reject with SignedOutError.
   */
  onSignedOut?: (reason: SignedOutReason) => void;
}

export class OAuthSession implements TokenSource {
  readonly #config: ResolvedOAuthConfig;
  readonly #store: TokenStore;
  readonly #redirectUri: string | undefined;
  readonly #onSignedOut: ((reason: SignedOutReason) => void) | undefined;

  /** The newest tokens this session knows of; undefined until the store is first read. */
  #tokens: TokenSet | null | undefined;

  /** The first read of the store, shared by everyone who needs it. */
  #loading: Promise<TokenSet | null> | undefined;

  /** The refresh in flight, shared by everyone who needs it. */
  #refreshing: Promise<TokenSet> | undefined;

  /**
   * Goes up on every sign-in and sign-out. A refresh that started under an
   * older generation belongs to a session that has ended, so it never saves.
   * Clients also read it to know when their cached user is stale.
   */
  #generation = 0;

  /** After the token endpoint fails, keep using a still-valid access token until then. */
  #retryRefreshAt = 0;

  constructor(options: OAuthSessionOptions) {
    if (!options.store) {
      throw new TypeError("Pass a token store: secureStore(...) in an app, memoryStore() for a script.");
    }

    this.#config = resolveConfig(options);
    this.#store = options.store;
    this.#redirectUri = options.redirectUri;
    this.#onSignedOut = options.onSignedOut;
  }

  // Sign-in

  /**
   * Starts a browser sign-in. Open `attempt.url` (on React Native, with
   * expo-web-browser's openAuthSessionAsync), then pass the redirect URL and
   * this attempt to `completeAuthorization`.
   */
  authorize(options: { scopes: readonly string[]; redirectUri?: string; extraParams?: Record<string, string> }): AuthorizationAttempt {
    const redirectUri = options.redirectUri ?? this.#redirectUri;

    return createAuthorization(this.#config, { ...options, redirectUri: redirectUri ?? "" });
  }

  /** Checks the redirect against the attempt, exchanges the code and stores the tokens. */
  async completeAuthorization(redirectUrl: string, attempt: AuthorizationAttempt): Promise<SessionTokens> {
    const code = parseRedirect(redirectUrl, attempt);

    const tokens = await exchangeCode(this.#config, {
      code,
      codeVerifier: attempt.codeVerifier,
      redirectUri: attempt.redirectUri,
    });

    await this.#signedIn(tokens);

    return sessionView(tokens);
  }

  /**
   * Signs in on a device without a browser (a TV, a CLI). `onCode` gets the
   * code to show the user; this resolves once they approve it at
   * `verificationUri`, and the tokens are stored.
   */
  async signInWithDevice(options: {
    scopes: readonly string[];
    onCode: (device: DeviceAuthorization) => void;
    signal?: AbortSignal;
  }): Promise<SessionTokens> {
    throwIfAborted(options.signal);

    const device = await startDeviceAuthorization(this.#config, options);

    options.onCode(device);

    const tokens = await pollDeviceToken(this.#config, device, { signal: options.signal });

    await this.#signedIn(tokens);

    return sessionView(tokens);
  }

  // State

  /**
   * What the user granted: `scope`, `expiresAt`, the `idToken`. Null when
   * signed out. The refresh token stays inside the session: using it anywhere
   * else would spend it, and the server would revoke the sign-in.
   */
  async tokens(): Promise<SessionTokens | null> {
    const tokens = await this.#load();

    return tokens ? sessionView(tokens) : null;
  }

  async isSignedIn(): Promise<boolean> {
    return (await this.#load()) !== null;
  }

  // Used by the client

  /** Changes whenever the signed-in user may have changed (a sign-in or a sign-out). */
  userVersion(): number {
    return this.#generation;
  }

  /** A current access token, refreshed first if it's about to expire. */
  async getAccessToken(): Promise<string> {
    const tokens = await this.#load();

    if (!tokens) throw new SignedOutError("not-signed-in");

    if (!this.#expiresSoon(tokens)) return tokens.accessToken;

    // Without a refresh token, use the access token until it actually expires.
    if (!tokens.refreshToken) {
      if (!this.#expired(tokens)) return tokens.accessToken;

      throw await this.#endSession("expired");
    }

    // The token endpoint failed a moment ago; the access token still works.
    if (!this.#expired(tokens) && this.#now() < this.#retryRefreshAt) return tokens.accessToken;

    try {
      const fresh = await this.#refresh(tokens.accessToken);
      return fresh.accessToken;
    } catch (error) {
      return this.#accessTokenDespite(error);
    }
  }

  /** The server refused `rejectedToken` (401). Returns a fresh token to replay with, or throws SignedOutError. */
  async refreshAfterUnauthorized(rejectedToken: string): Promise<string> {
    const fresh = await this.#refresh(rejectedToken);

    return fresh.accessToken;
  }

  // Sign-out

  /** Revokes the tokens on the server (best effort), clears the store and calls onSignedOut. */
  async signOut(): Promise<void> {
    const signOut = async () => {
      // What the store holds now: another process may have rotated the pair.
      const stored = await this.#store.get();
      const tokens = stored ?? this.#tokens ?? null;

      if (tokens) {
        try {
          // Revoking either token revokes both.
          await revokeToken(this.#config, tokens.refreshToken ?? tokens.accessToken);
        } catch {
          // Offline or already revoked: the local sign-out still happens.
        }
      }

      await this.#endSession("signed-out", Boolean(tokens));
    };

    await (this.#store.lock ? this.#store.lock(signOut) : signOut());
  }

  // Refresh

  // One refresh at a time in this process; the store's lock covers others.
  #refresh(staleAccessToken: string): Promise<TokenSet> {
    if (!this.#refreshing) {
      const generation = this.#generation;

      const refresh = this.#store.lock
        ? this.#store.lock(() => this.#refreshLocked(staleAccessToken, generation))
        : this.#refreshLocked(staleAccessToken, generation);

      this.#refreshing = refresh.finally(() => {
        this.#refreshing = undefined;
      });
    }

    return this.#refreshing;
  }

  async #refreshLocked(staleAccessToken: string, generation: number): Promise<TokenSet> {
    this.#throwIfEnded(generation);

    // Read the store again: another tab or process may have refreshed while
    // this one waited for the lock.
    const stored = await this.#store.get();
    this.#throwIfEnded(generation);

    // Signed out elsewhere (another tab, or the app's extension).
    if (!stored) throw await this.#endSession("signed-out");

    // Someone already rotated past the stale token: in the store (another
    // process), or only in memory (a save here that failed). Use those
    // instead of spending a refresh token that's already been used.
    const newer = [stored, this.#tokens].find((tokens) => tokens && tokens.accessToken !== staleAccessToken);
    if (newer) {
      this.#tokens = newer;
      return newer;
    }

    if (!stored.refreshToken) {
      throw await this.#endSession(this.#expired(stored) ? "expired" : "revoked");
    }

    let next: TokenSet;
    try {
      next = await refreshTokens(this.#config, stored.refreshToken);
    } catch (error) {
      this.#throwIfEnded(generation);

      // Revoked on the website, re-authorization required, expired or replayed.
      if (error instanceof OAuthError && error.code === "invalid_grant") {
        throw await this.#endSession("revoked");
      }

      // Offline or a server error: keep the tokens and let the caller retry.
      throw error;
    }

    if (generation !== this.#generation) {
      // Signed out, or someone else signed in, while this was in flight.
      // Don't bring these tokens back: retire them on the server instead.
      revokeToken(this.#config, next.refreshToken ?? next.accessToken).catch(() => {});
      throw new SignedOutError("signed-out");
    }

    // The old refresh token is spent. Keep the new pair, store it, then use it.
    await this.#save(next);

    return next;
  }

  // A refresh failed while getting a token for a request. If it was the token
  // endpoint (offline, rate limited, down) and the access token hasn't
  // expired yet, use it and try refreshing again a little later.
  #accessTokenDespite(error: unknown): string {
    const latest = this.#tokens;
    const endpointFailed = error instanceof HardcoverError && !(error instanceof SignedOutError);

    if (!endpointFailed || !latest || this.#expired(latest)) throw error;

    const retryAfterMs = error instanceof RateLimitError ? error.retryAfterSeconds * 1_000 : 0;
    this.#retryRefreshAt = this.#now() + Math.max(REFRESH_RETRY_MS, retryAfterMs);

    return latest.accessToken;
  }

  #throwIfEnded(generation: number): void {
    if (generation !== this.#generation) throw new SignedOutError("signed-out");
  }

  #expiresSoon(tokens: TokenSet): boolean {
    if (tokens.expiresAt === undefined) return false;

    return tokens.expiresAt - this.#now() <= REFRESH_SKEW_MS;
  }

  #expired(tokens: TokenSet): boolean {
    return tokens.expiresAt !== undefined && tokens.expiresAt <= this.#now();
  }

  #now(): number {
    return this.#config.now().getTime();
  }

  // Storage

  #load(): Promise<TokenSet | null> {
    if (this.#tokens !== undefined) return Promise.resolve(this.#tokens);

    // One read, shared. If a sign-in or sign-out lands first, it wins.
    this.#loading ??= this.#store.get().then((stored) => {
      this.#loading = undefined;
      if (this.#tokens === undefined) this.#tokens = stored;
      return this.#tokens;
    });

    return this.#loading;
  }

  // Memory first, so a failed store write can't strand the session on a
  // refresh token the server has already rotated. The write's error still
  // reaches the caller.
  async #save(tokens: TokenSet): Promise<void> {
    this.#tokens = tokens;
    this.#retryRefreshAt = 0;

    await this.#store.set(tokens);
  }

  // A sign-in may be a different user than before.
  async #signedIn(tokens: TokenSet): Promise<void> {
    this.#generation++;

    await this.#save(tokens);
  }

  // Clears the tokens and tells the app once. Returns the error to throw.
  async #endSession(reason: SignedOutReason, hadTokens = Boolean(this.#tokens)): Promise<SignedOutError> {
    this.#tokens = null;
    this.#generation++;

    try {
      await this.#store.set(null);
    } finally {
      if (hadTokens) this.#notify(reason);
    }

    return new SignedOutError(reason);
  }

  // The app's handler runs outside the session's own flow: if it throws, the
  // error surfaces on its own (like an unhandled error) instead of replacing
  // SignedOutError or leaving the session half signed out.
  #notify(reason: SignedOutReason): void {
    try {
      this.#onSignedOut?.(reason);
    } catch (error) {
      setTimeout(() => {
        throw error;
      }, 0);
    }
  }
}
