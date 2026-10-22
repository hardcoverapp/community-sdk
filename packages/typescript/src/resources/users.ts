import type { HardcoverClient } from "../core/client.ts";
import type { WithJsonColumns } from "../core/json-columns.ts";
import { BlockType } from "../generated/enums.ts";
import type {
  GetBlockedUsersQuery,
  GetFollowersQuery,
  GetFollowingQuery,
  UserProfileFragment,
} from "../generated/graphql.ts";
import { operations } from "../operations.ts";
import { DEFAULT_LIMIT, toPage, type Page, type PageOptions } from "./page.ts";

/** A reader's public profile. */
export type UserProfile = WithJsonColumns<UserProfileFragment>;

/** Someone who follows a reader, and since when. */
export type Follower = WithJsonColumns<GetFollowersQuery["followed_users"][number]>;

/** Someone a reader follows, and since when. */
export type Following = WithJsonColumns<GetFollowingQuery["followed_users"][number]>;

/** A reader the signed-in user blocked, with the kind of block (`BlockType`). */
export type BlockedUser = WithJsonColumns<GetBlockedUsersQuery["user_blocks"][number]>;

export interface BlockOptions {
  /**
   * `BlockType.Full` (the default) stops follows, likes and notifications;
   * `BlockType.Invites` only stops club and buddy-read invites.
   */
  type?: BlockType;
}

/** Readers: profiles, who follows whom, and blocks. */
export class UsersResource {
  private readonly client: HardcoverClient;

  constructor(client: HardcoverClient) {
    this.client = client;
  }

  // ---- Profiles ----

  /** Scopes: `read:users`. */
  async get(id: number): Promise<UserProfile | null> {
    const { users_by_pk } = await this.client.request(operations.GetUser, { id });

    return users_by_pk ?? null;
  }

  /** Usernames are case-insensitive. Scopes: `read:users`. */
  async getByUsername(username: string): Promise<UserProfile | null> {
    const { users } = await this.client.request(operations.GetUserByUsername, { username: username.replace(/^@/, "") });

    return users[0] ?? null;
  }

  /** Who follows a reader, most recent first. Scopes: `read:social`. */
  async followers(userId: number, { limit = DEFAULT_LIMIT, offset = 0 }: PageOptions = {}): Promise<Page<Follower>> {
    const { followed_users } = await this.client.request(operations.GetFollowers, { userId, limit, offset });

    return toPage(followed_users, limit, offset);
  }

  /** Who a reader follows, most recent first. Scopes: `read:social`. */
  async following(userId: number, { limit = DEFAULT_LIMIT, offset = 0 }: PageOptions = {}): Promise<Page<Following>> {
    const { followed_users } = await this.client.request(operations.GetFollowing, { userId, limit, offset });

    return toPage(followed_users, limit, offset);
  }

  // ---- Following ----

  /** Follows a reader. Scopes: `write:social`. */
  async follow(userId: number): Promise<void> {
    await this.client.request(operations.FollowUser, { userId });
  }

  /** Stops following a reader. Scopes: `write:social`. */
  async unfollow(userId: number): Promise<void> {
    await this.client.request(operations.UnfollowUser, { userId, removeFollower: false });
  }

  /** Removes a reader who follows you. Scopes: `write:social`. */
  async removeFollower(userId: number): Promise<void> {
    await this.client.request(operations.UnfollowUser, { userId, removeFollower: true });
  }

  // ---- Blocking ----

  /**
   * Blocks a reader. A full block (the default) also ends follows both ways
   * and stops their likes and notifications. Scopes: `write:social`.
   */
  async block(userId: number, { type = BlockType.Full }: BlockOptions = {}): Promise<void> {
    await this.client.request(operations.BlockUser, { userId, type });
  }

  /**
   * Lifts every block on a reader. Returns false if they weren't blocked. The
   * API deletes blocks by id, so this looks them up first.
   * Scopes: `read:me:content`, `read:social`, `write:social`.
   */
  async unblock(userId: number): Promise<boolean> {
    const blocks = (await this.blocked()).filter((block) => block.blockedUser?.id === userId);

    for (const block of blocks) {
      await this.client.request(operations.UnblockUser, { id: block.id });
    }

    return blocks.length > 0;
  }

  /** Readers the signed-in user blocked, most recent first. Scopes: `read:me:content`, `read:social`. */
  async blocked(): Promise<BlockedUser[]> {
    const userId = await this.client.me.id();
    const { user_blocks } = await this.client.request(operations.GetBlockedUsers, { userId });

    return user_blocks;
  }
}
