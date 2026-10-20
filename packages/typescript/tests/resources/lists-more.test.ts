// Lists beyond adding books: reordering (as the app does it), following, and
// collaborative members. The server owns who may invite whom; the SDK checks a
// reorder covers the whole list before changing anything.
import { describe, expect, it } from "vitest";
import { ListMemberStatus } from "../../src/index.ts";
import { me, ok, setup } from "../helpers.ts";

const list = { id: 9, name: "Favorites", ranked: true, listBooks: [] };

describe("lists.reorder", () => {
  it("clears positions, sets the new order from 0 in batches of 5, then touches the list", async () => {
    const ids = [16, 15, 14, 13, 12, 11];
    const { client, sent } = setup(
      ok({ lists_by_pk: list }),
      ok({ list_books: [11, 12, 13, 14, 15, 16].map((id) => ({ id })) }),
      ok({ update_list_books: { affected_rows: 6 } }),
      ok({ p0: { id: 16 }, p1: { id: 15 }, p2: { id: 14 }, p3: { id: 13 }, p4: { id: 12 } }),
      ok({ p0: { id: 11 } }),
      ok({ update_list: { id: 9, list: { id: 9, name: "Favorites" } } }),
    );

    await client.lists.reorder(9, ids);

    const names = sent().map((request) => request.operationName);
    expect(names).toEqual(["GetList", "GetListBookIds", "ClearListPositions", "SetListPositions", "SetListPositions", "UpdateList"]);

    expect(sent()[2]!.variables).toEqual({ listId: 9, listBookIds: ids });
    expect(sent()[3]!.query).toContain("p0: update_list_books_by_pk(pk_columns: { id: 16 }, _set: { position: 0 })");
    expect(sent()[4]!.query).toContain("p0: update_list_books_by_pk(pk_columns: { id: 11 }, _set: { position: 5 })");
    expect(sent()[5]!.variables).toEqual({ id: 9, object: { name: "Favorites" } });
  });

  it("refuses an order that leaves out a book or repeats one, before changing anything", async () => {
    const onList = ok({ list_books: [{ id: 11 }, { id: 12 }] });
    const { client, sent } = setup(ok({ lists_by_pk: list }), onList, ok({ lists_by_pk: list }), onList);

    await expect(client.lists.reorder(9, [12])).rejects.toThrow(RangeError);
    await expect(client.lists.reorder(9, [12, 12])).rejects.toThrow(RangeError);
    expect(sent().map((request) => request.operationName)).not.toContain("ClearListPositions");
  });
});

it("lists.reorder refuses an unranked list", async () => {
  const { client, sent } = setup(ok({ lists_by_pk: { ...list, ranked: false } }));

  await expect(client.lists.reorder(9, [11])).rejects.toThrow(RangeError);
  expect(sent()).toHaveLength(1);
});

describe("following lists", () => {
  it("follow, unfollow and followed", async () => {
    const { client, sent } = setup(
      ok({ upsert_followed_list: { id: 1, errors: [] } }),
      ok({ delete_followed_list: { success: true } }),
      me(),
      ok({ followed_lists: [{ id: 1, list: { id: 9 } }] }),
    );

    await client.lists.follow(9);
    expect(await client.lists.unfollow(9)).toBe(true);
    expect((await client.lists.followed()).items[0]).toMatchObject({ list: { id: 9 } });
    expect(sent()[3]!.variables).toMatchObject({ userId: 42 });
  });
});

describe("collaborative lists", () => {
  it("invite sends the list and the reader", async () => {
    const { client, sent } = setup(ok({ insert_list_member: { id: 3, list_id: 9, user_id: 7 } }));
    await client.lists.invite(9, 7);

    expect(sent()[0]!.variables).toEqual({ object: { list_id: 9, user_id: 7 } });
  });

  it("respond sends the answer by name", async () => {
    const { client, sent } = setup(
      ok({ update_list_member: { list_id: 9, user_id: 42, status: "accepted" } }),
      ok({ update_list_member: { list_id: 9, user_id: 42, status: "spam" } }),
    );

    await client.lists.respond(9, ListMemberStatus.Accepted);
    await client.lists.respond(9, ListMemberStatus.Spam);

    expect(sent().map((request) => request.variables)).toEqual([
      { listId: 9, status: "accepted" },
      { listId: 9, status: "spam" },
    ]);
  });

  it("removeMember reports whether someone was removed", async () => {
    const { client } = setup(ok({ delete_list_member: { list_id: 9, user_id: 7, removed: true } }));

    expect(await client.lists.removeMember(9, 7)).toBe(true);
  });

  it("members and memberships", async () => {
    const member = { id: 3, listId: 9, userId: 7, status: ListMemberStatus.Invited, user: { username: "sam" } };
    const { client, sent } = setup(ok({ list_members: [member] }), me(), ok({ list_members: [] }));

    expect(await client.lists.members(9)).toEqual([member]);
    expect(await client.lists.memberships()).toEqual([]);
    expect(sent()[2]!.variables).toEqual({ userId: 42 });
  });
});
