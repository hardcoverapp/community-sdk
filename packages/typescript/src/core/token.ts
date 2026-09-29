// Local token checks at construction (spec/03 principle 7): fix what can be
// fixed, refuse clearly only when the SDK genuinely can't proceed. The server
// remains the authority on whether a token is valid.

/**
 * Cleans a pasted token and rejects values that can never be a bearer token.
 * `warn` is called for tokens that work but shouldn't be used.
 */
export function normalizeToken(raw: unknown, warn: (message: string) => void): string {
  // Copy-paste slips: surrounding whitespace, trailing newlines, "Bearer ".
  const token = typeof raw === "string" ? raw.trim().replace(/^bearer(\s+|$)/i, "").trim() : "";

  if (!token) {
    throw new TypeError(
      "Hardcover token is missing. Pass a personal access token (hc_pat_…) or an OAuth access token (hc_at_…), e.g. from an environment variable that is actually set.",
    );
  }
  if (token.startsWith("hc_rt_")) {
    // Never exchanged here, even with OAuth configured: refresh tokens rotate,
    // so this would spend the copy in the user's config and the next run would
    // replay it, revoking the token family. Refresh tokens belong to a
    // tokenProvider that stores each rotated token (spec/03 Auth).
    throw new TypeError("That's an OAuth refresh token (hc_rt_…). Use the access token (hc_at_…) it came with, or exchange the refresh token for a new access token.");
  }
  if (token.startsWith("hc_ac_")) {
    throw new TypeError("That's an OAuth authorization code (hc_ac_…). Exchange it at the token endpoint for an access token (hc_at_…) and use that.");
  }
  if (token.startsWith("eyJ")) {
    warn(
      "Hardcover: this is a legacy JWT API key. It's deprecated and gets half the burst rate limit; create a personal access token (hc_pat_…) at hardcover.app → Account → API Access.",
    );
  }
  return token;
}
