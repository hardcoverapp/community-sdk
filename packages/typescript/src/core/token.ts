// Local token checks at construction (spec/03 principle 7): fix what can be
// fixed, refuse clearly only when the SDK genuinely can't proceed. The server
// remains the authority on whether a token is valid. The prefixes and their
// messages are shared by every SDK (shared/auth.json).
import { auth } from "../generated/auth.ts";

/**
 * Cleans a pasted token and rejects values that can never be a bearer token.
 * `warn` is called for tokens that work but shouldn't be used.
 */
export function normalizeToken(raw: unknown, warn: (message: string) => void): string {
  // Copy-paste slips: surrounding whitespace, trailing newlines, "Bearer ".
  const token = typeof raw === "string" ? raw.trim().replace(/^bearer(\s+|$)/i, "").trim() : "";

  if (!token) throw new TypeError(auth.tokens.missingMessage);

  const rule = auth.tokens.prefixes.find((candidate) => token.startsWith(candidate.prefix));

  if (rule?.action === "refuse") throw new TypeError(rule.message);
  if (rule?.action === "warn") warn(rule.message);

  return token;
}
