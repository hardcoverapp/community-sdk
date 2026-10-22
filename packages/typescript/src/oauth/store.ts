// Where an OAuth session keeps tokens. The session decides *when* to read and
// write; the store only decides *where*, because that's platform-specific.
import { isTokenSet, type TokenSet } from "./tokens.ts";

export interface TokenStore {
  get(): Promise<TokenSet | null>;

  /** Writes the tokens, or clears them with null. Must not resolve until they're durable. */
  set(tokens: TokenSet | null): Promise<void>;

  /**
   * Runs `fn` while no other process sharing this store can run its own.
   * Provide it when tabs, processes or an app and its extension share the
   * tokens: refreshing in two places at once spends the same refresh token
   * twice, and the server revokes the sign-in. The session already prevents
   * that within one process.
   */
  lock?<T>(fn: () => Promise<T>): Promise<T>;
}

/** Keeps tokens in memory, gone when the process ends. For tests, scripts and servers that store tokens elsewhere. */
export function memoryStore(initial: TokenSet | null = null): TokenStore {
  let tokens = initial;

  return {
    async get() {
      return tokens;
    },
    async set(next) {
      tokens = next;
    },
  };
}

/** expo-secure-store's shape, and that of most Keychain/Keystore wrappers. */
export interface SecureKeyValue {
  getItemAsync(key: string): Promise<string | null>;
  setItemAsync(key: string, value: string): Promise<void>;
  deleteItemAsync(key: string): Promise<void>;
}

/**
 * Stores tokens as JSON under `key` in a secure key-value store, e.g.
 * `secureStore(SecureStore, "hardcover-tokens")` with expo-secure-store.
 * Never pass AsyncStorage or localStorage: they aren't encrypted.
 */
export function secureStore(storage: SecureKeyValue, key: string): TokenStore {
  if (!key?.trim()) throw new TypeError("Pass the key your app stores its Hardcover tokens under.");

  return {
    async get() {
      const raw = await storage.getItemAsync(key);
      if (!raw) return null;

      try {
        const parsed: unknown = JSON.parse(raw);
        return isTokenSet(parsed) ? parsed : null;
      } catch {
        return null;
      }
    },
    async set(tokens) {
      if (tokens) await storage.setItemAsync(key, JSON.stringify(tokens));
      else await storage.deleteItemAsync(key);
    },
  };
}
