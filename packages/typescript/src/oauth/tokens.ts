// A signed-in user's tokens, in the shape every SDK stores them
// (shared/auth.json oauth.tokenSet).
import { OAuthError } from "../core/errors.ts";

export interface TokenSet {
  /** `hc_at_…`, sent as the Bearer token. */
  accessToken: string;

  /** `hc_rt_…`. Absent for an identity-only sign-in without `offline_access`. */
  refreshToken?: string;

  /** The OpenID Connect id token (a signed JWT), when the scopes included `openid`. Not verified by the SDK. */
  idToken?: string;

  /** The granted scopes, space-separated, as the server returned them. They can be fewer than asked for. */
  scope: string;

  /** Epoch ms when the access token expires. Absent if the server didn't say. */
  expiresAt?: number;
}

/**
 * What an OAuth session shows the app: everything but the refresh token,
 * which only the session may spend. `canRefresh` says whether there is one.
 */
export type SessionTokens = Readonly<Omit<TokenSet, "refreshToken">> & { readonly canRefresh: boolean };

export function sessionView(tokens: TokenSet): SessionTokens {
  const { refreshToken, ...rest } = tokens;

  return { ...rest, canRefresh: Boolean(refreshToken) };
}

/** Turns a token endpoint answer into a TokenSet, timing expiry from `receivedAt`. */
export function parseTokenResponse(body: Record<string, unknown>, receivedAt: Date): TokenSet {
  const accessToken = body.access_token;

  if (typeof accessToken !== "string" || !accessToken) {
    throw new OAuthError("invalid_response", "The token endpoint's answer has no access_token.");
  }

  const tokens: TokenSet = {
    accessToken,
    scope: typeof body.scope === "string" ? body.scope : "",
  };

  if (typeof body.refresh_token === "string" && body.refresh_token) tokens.refreshToken = body.refresh_token;
  if (typeof body.id_token === "string" && body.id_token) tokens.idToken = body.id_token;

  if (typeof body.expires_in === "number" && Number.isFinite(body.expires_in)) {
    tokens.expiresAt = receivedAt.getTime() + body.expires_in * 1_000;
  }

  return tokens;
}

/** Checks a value read back from storage. Anything else is treated as no tokens. */
export function isTokenSet(value: unknown): value is TokenSet {
  if (!value || typeof value !== "object") return false;

  const tokens = value as Record<string, unknown>;

  return (
    typeof tokens.accessToken === "string" &&
    tokens.accessToken.length > 0 &&
    typeof tokens.scope === "string" &&
    (tokens.refreshToken === undefined || typeof tokens.refreshToken === "string") &&
    (tokens.idToken === undefined || typeof tokens.idToken === "string") &&
    (tokens.expiresAt === undefined || typeof tokens.expiresAt === "number")
  );
}
