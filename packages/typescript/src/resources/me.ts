import type { HardcoverClient } from "../core/client.ts";
import { HardcoverError } from "../core/errors.ts";
import type { MeQuery } from "../generated/graphql.ts";
import { operations } from "../operations.ts";
import type { WithJsonColumns } from "../core/json-columns.ts";

export type Me = WithJsonColumns<MeQuery["me"][number]>;

/**
 * The token's user. Fetched once per client and shared by resources that need
 * the user id. With an OAuth session, it's fetched again after a different
 * sign-in or a sign-out.
 */
export class MeResource {
  #cached: Promise<Me> | undefined;

  /** The auth's user version the cache was filled under. */
  #cachedFor = 0;

  private readonly client: HardcoverClient;
  readonly #userVersion: () => number;

  constructor(client: HardcoverClient, userVersion: () => number = () => 0) {
    this.client = client;
    this.#userVersion = userVersion;
  }

  /** Concurrent callers share one request. Scopes: `read:me`. */
  get({ refresh = false }: { refresh?: boolean } = {}): Promise<Me> {
    // Someone else signed in, or nobody is: the cached user isn't theirs.
    if (this.#cachedFor !== this.#userVersion()) this.forget();

    if (!this.#cached || refresh) {
      this.#cachedFor = this.#userVersion();
      this.#cached = this.client.request(operations.Me).then(({ me }) => {
        const user = me[0];
        if (!user) throw new HardcoverError("The API returned no user for this token");
        return user;
      });
      this.#cached.catch(() => {
        this.#cached = undefined;
      });
    }
    return this.#cached;
  }

  /** Drops the cached user, so the next call asks the server. Scopes: none (no request). */
  forget(): void {
    this.#cached = undefined;
  }

  /** Scopes: `read:me`. */
  async id(): Promise<number> {
    return (await this.get()).id;
  }
}
