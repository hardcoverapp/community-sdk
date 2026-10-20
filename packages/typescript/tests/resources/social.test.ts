// People and social: profiles, follows, blocks, likes, feeds and friends on a
// book. The server owns the rules (a full block ends follows); the SDK picks
// the right action shape and finds block ids the API deletes by.
import { describe, expect, it } from "vitest";
import { BlockType, LikeableType, NotFoundError } from "../../src/index.ts";
import { me, ok, setup } from "../helpers.ts";

const profile = (id: number, username: string) => ({ id, username, name: null, cachedImage: {} });

describe("users", () => {
  it("getByUsername drops a leading @", async () => {
    const { client, sent } = setup(ok({ users: [profile(7, "sam")] }));

    expect(await client.users.getByUsername("@sam")).toMatchObject({ id: 7 });
    expect(sent()[0]!.variables).toEqual({ username: "sam" });
  });

  it("followers and following page a reader's connections", async () => {
    const { client, sent } = setup(
      ok({ followed_users: [{ id: 1, user: profile(8, "ana") }] }),
      ok({ followed_users: [{ id: 2, followedUser: profile(9, "kim") }] }),
    );

    expect((await client.users.followers(7)).items[0]).toMatchObject({ user: { username: "ana" } });
    expect((await client.users.following(7)).items[0]).toMatchObject({ followedUser: { username: "kim" } });
    expect(sent().map((request) => request.operationName)).toEqual(["GetFollowers", "GetFollowing"]);
  });

  it("unfollow and removeFollower are the same action, in opposite directions", async () => {
    const { client, sent } = setup(
      ok({ delete_followed_user: { id: 1, error: null } }),
      ok({ delete_followed_user: { id: 2, error: null } }),
    );

    await client.users.unfollow(7);
    await client.users.removeFollower(7);

    expect(sent().map((request) => request.variables)).toEqual([
      { userId: 7, removeFollower: false },
      { userId: 7, removeFollower: true },
    ]);
  });

  it("block defaults to a full block; invites-only is one option away", async () => {
    const { client, sent } = setup(ok({ insert_block: { id: 1, error: null } }), ok({ insert_block: { id: 2, error: null } }));

    await client.users.block(7);
    await client.users.block(7, { type: BlockType.Invites });

    expect(sent().map((request) => request.variables)).toEqual([
      { userId: 7, type: "UserBlock" },
      { userId: 7, type: "BlockInvite" },
    ]);
  });

  it("unblock deletes every block on that reader, found by id", async () => {
    const blocks = [
      { id: 31, type: "UserBlock", blockedUser: profile(7, "sam") },
      { id: 32, type: "BlockInvite", blockedUser: profile(7, "sam") },
      { id: 33, type: "UserBlock", blockedUser: profile(8, "ana") },
    ];
    const { client, sent } = setup(me(), ok({ user_blocks: blocks }), ok({ delete_user_blocks_by_pk: { id: 31 } }), ok({ delete_user_blocks_by_pk: { id: 32 } }));

    expect(await client.users.unblock(7)).toBe(true);
    expect(sent().slice(2).map((request) => request.variables)).toEqual([{ id: 31 }, { id: 32 }]);
  });

  it("unblock is false when the reader wasn't blocked", async () => {
    const { client } = setup(me(), ok({ user_blocks: [] }));

    expect(await client.users.unblock(7)).toBe(false);
  });
});

describe("likes", () => {
  it("like and unlike return the new count", async () => {
    const { client, sent } = setup(ok({ upsert_like: { id: 1, likesCount: 4 } }), ok({ delete_like: { likesCount: 3 } }));

    expect(await client.likes.like(LikeableType.Review, 55)).toBe(4);
    expect(await client.likes.unlike(LikeableType.Review, 55)).toBe(3);
    expect(sent()[0]!.variables).toEqual({ likeableId: 55, likeableType: "UserBook" });
  });
});

describe("activities", () => {
  it("following is the signed-in user's feed", async () => {
    const { client, sent } = setup(me(), ok({ activities: [{ id: 1, event: "UserBookActivity" }] }));
    const page = await client.activities.following({ limit: 5 });

    expect(page.items).toHaveLength(1);
    expect(sent()[1]).toMatchObject({ operationName: "GetFollowingActivities", variables: { userId: 42, limit: 5, offset: 0 } });
  });

  it("delete throws NotFoundError for an activity that isn't yours or doesn't exist", async () => {
    const { client } = setup(ok({ delete_activities_by_pk: null }));

    await expect(client.activities.delete(1)).rejects.toThrow(NotFoundError);
  });
});

describe("books.friends", () => {
  it("returns the entries of people you follow, skipping empty rows", async () => {
    const entry = { id: 5, bookId: 100, statusId: 3, rating: 4, user: profile(8, "ana") };
    const { client, sent } = setup(me(), ok({ following_user_books: [{ userBook: entry }, { userBook: null }] }));

    expect(await client.books.friends(100)).toEqual([entry]);
    expect(sent()[1]!.variables).toEqual({ userId: 42, bookId: 100, limit: 25 });
  });
});
