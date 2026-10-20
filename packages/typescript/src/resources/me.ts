import type { HardcoverClient } from "../core/client.ts";
import { HardcoverError } from "../core/errors.ts";
import type { MeQuery } from "../generated/graphql.ts";
import { operations } from "../operations.ts";

export type Me = MeQuery["me"][number];

/** The token's user. Fetched once per client and shared by resources that need the user id. */
export class MeResource {
  #cached: Promise<Me> | undefined;

  private readonly client: HardcoverClient;

  constructor(client: HardcoverClient) {
    this.client = client;
  }

  /** Concurrent callers share one request. Scopes: `read:me`. */
  get({ refresh = false }: { refresh?: boolean } = {}): Promise<Me> {
    if (!this.#cached || refresh) {
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

  /** Scopes: `read:me`. */
  async id(): Promise<number> {
    return (await this.get()).id;
  }
}
