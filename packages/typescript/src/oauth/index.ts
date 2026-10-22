// @hardcover/sdk/oauth: sign-in and the token lifecycle (spec/03 Auth).
// A separate entry point, so apps that only use a personal access token
// don't ship any of it.
import * as flows from "./flows.ts";
import { resolveConfig, type OAuthConfig } from "./http.ts";
import type { TokenSet } from "./tokens.ts";

export { OAuthSession, type OAuthSessionOptions } from "./session.ts";
export { memoryStore, secureStore, type SecureKeyValue, type TokenStore } from "./store.ts";
export type { SessionTokens, TokenSet } from "./tokens.ts";
export type { OAuthConfig, OAuthEndpoints } from "./http.ts";
export type { RandomSource } from "./pkce.ts";
export type {
  AuthorizationAttempt,
  AuthorizationOptions,
  DeviceAuthorization,
  ExchangeCodeOptions,
  RefreshOptions,
} from "./flows.ts";
export { OAuthError, SignedOutError, type SignedOutReason } from "../core/errors.ts";

// The flows as plain functions, for apps that keep tokens themselves (e.g. a
// server storing them per user). Each takes the same config as OAuthSession.
// Most apps want OAuthSession instead: it does the storing and the timing.

/** Builds the authorize URL with PKCE (S256), `state` and, for `openid`, a `nonce`. Keep the attempt for `parseRedirect`. */
export function createAuthorization(config: OAuthConfig, options: flows.AuthorizationOptions): flows.AuthorizationAttempt {
  return flows.createAuthorization(resolveConfig(config), options);
}

/**
 * Reads the redirect back to your app and returns the authorization code.
 * Throws OAuthError when the user declined (`access_denied`), the server
 * refused, or the redirect doesn't belong to this attempt (`state_mismatch`,
 * `issuer_mismatch`).
 */
export function parseRedirect(redirectUrl: string, attempt: Pick<flows.AuthorizationAttempt, "state" | "issuer">): string {
  return flows.parseRedirect(redirectUrl, attempt);
}

/** Exchanges an authorization code for tokens. A code works once. */
export function exchangeCode(config: OAuthConfig, options: flows.ExchangeCodeOptions): Promise<TokenSet> {
  return flows.exchangeCode(resolveConfig(config), options);
}

/**
 * Trades a refresh token for a new pair. The old refresh token is spent:
 * store the new one before anything else, because sending the old one again
 * revokes the whole sign-in.
 */
export function refreshTokens(config: OAuthConfig, refreshToken: string, options?: flows.RefreshOptions): Promise<TokenSet> {
  return flows.refreshTokens(resolveConfig(config), refreshToken, options);
}

/** Revokes a token. Revoking either the access or refresh token revokes both. */
export function revokeToken(config: OAuthConfig, token: string): Promise<void> {
  return flows.revokeToken(resolveConfig(config), token);
}

/** Starts a device sign-in (RFC 8628): show `userCode` and `verificationUri`, then `pollDeviceToken`. */
export function startDeviceAuthorization(config: OAuthConfig, options: { scopes: readonly string[] }): Promise<flows.DeviceAuthorization> {
  return flows.startDeviceAuthorization(resolveConfig(config), options);
}

/**
 * Polls until the user approves or declines, or the code expires. Network
 * blips are retried; `access_denied` and `expired_token` throw OAuthError.
 * Aborting `signal` stops it right away.
 */
export function pollDeviceToken(
  config: OAuthConfig,
  device: flows.DeviceAuthorization,
  options?: { signal?: AbortSignal },
): Promise<TokenSet> {
  return flows.pollDeviceToken(resolveConfig(config), device, options);
}
