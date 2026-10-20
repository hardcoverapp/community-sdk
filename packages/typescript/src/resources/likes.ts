import type { HardcoverClient } from "../core/client.ts";
import type { LikeableType } from "../generated/enums.ts";
import { operations } from "../operations.ts";

/**
 * Likes on activities, lists, journal entries, reviews and vibes. A review is
 * liked as its library entry: `LikeableType.Review` with the entry's id.
 */
export class LikesResource {
  private readonly client: HardcoverClient;

  constructor(client: HardcoverClient) {
    this.client = client;
  }

  /** Likes something. Safe to repeat. Returns its new like count. Scopes: `write:social`. */
  async like(type: LikeableType, id: number): Promise<number> {
    const { upsert_like } = await this.client.request(operations.Like, { likeableId: id, likeableType: type });

    return upsert_like?.likesCount ?? 0;
  }

  /** Takes a like back. Returns the new like count. Scopes: `write:social`. */
  async unlike(type: LikeableType, id: number): Promise<number> {
    const { delete_like } = await this.client.request(operations.Unlike, { likeableId: id, likeableType: type });

    return delete_like?.likesCount ?? 0;
  }
}
