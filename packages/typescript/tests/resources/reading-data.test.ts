// Reading data: reads edited by hand, finished reads across the library, and
// owned editions. The server journals reads and creates the Owned list; the
// SDK maps idiomatic fields, sends only what was set, and finds the Owned
// list when the API has no un-own action.
import { describe, expect, it } from "vitest";
import { DatePrecision } from "../../src/index.ts";
import { me, ok, setup } from "../helpers.ts";

const read = { id: 77, userBookId: 7, startedAt: "2026-01-02", finishedAt: "2026-01-20" };
const readEnvelope = (root: string) => ok({ [root]: { id: 77, error: null, userBookRead: read } });

describe("reads edited by hand", () => {
  it("add maps the dates to wire fields", async () => {
    const { client, sent } = setup(readEnvelope("insert_user_book_read"));
    await client.reads.add(7, { startedAt: "2026-01-02", finishedAt: "2026-01-20", precision: DatePrecision.Day });

    expect(sent()[0]).toMatchObject({
      operationName: "AddUserBookRead",
      variables: { userBookId: 7, read: { started_at: "2026-01-02", finished_at: "2026-01-20", finished_at_precision: 1 } },
    });
  });

  it("update sends only what was set, and null clears a date", async () => {
    const { client, sent } = setup(readEnvelope("update_user_book_read"));
    await client.reads.update(77, { finishedAt: null });

    expect(sent()[0]!.variables).toEqual({ id: 77, read: { finished_at: null } });
  });

  it("delete removes the read", async () => {
    const { client, sent } = setup(ok({ delete_user_book_read: { id: 77, error: null } }));
    await client.reads.delete(77);

    expect(sent()[0]).toMatchObject({ operationName: "RemoveUserBookRead", variables: { id: 77 } });
  });
});

describe("reads.finished", () => {
  it("pages the signed-in user's reads finished in a range", async () => {
    const row = { ...read, userBook: { id: 7, bookId: 100, rating: 4.5, book: { id: 100 } } };
    const { client, sent } = setup(me(), ok({ user_book_reads: [row] }));
    const page = await client.reads.finished({ from: "2026-01-01", to: "2026-12-31", limit: 10 });

    expect(page.items[0]).toMatchObject({ finishedAt: "2026-01-20", userBook: { book: { id: 100 } } });
    expect(sent()[1]!.variables).toEqual({ userId: 42, from: "2026-01-01", to: "2026-12-31", limit: 10, offset: 0 });
  });
});

describe("owned editions", () => {
  it("markOwned returns the Owned list row", async () => {
    const row = { id: 5, listId: 9, bookId: 100, editionId: 300 };
    const { client, sent } = setup(ok({ edition_owned: { id: 5, listBook: row } }));

    expect(await client.library.markOwned(300)).toEqual(row);
    expect(sent()[0]!.variables).toEqual({ editionId: 300 });
  });

  it("owned is empty before anything is marked owned", async () => {
    const { client } = setup(me(), ok({ lists: [] }));

    expect((await client.library.owned()).items).toEqual([]);
  });

  it("unmarkOwned is false when there's no Owned list", async () => {
    const { client, sent } = setup(me(), ok({ lists: [] }));

    expect(await client.library.unmarkOwned(100)).toBe(false);
    expect(sent()).toHaveLength(2);
  });

  it("unmarkOwned removes the book from the Owned list", async () => {
    const { client, sent } = setup(
      me(),
      ok({ lists: [{ id: 9, listBooks: [] }] }),
      ok({ list_books: [{ id: 5 }] }),
      ok({ delete_list_book: { id: 5 } }),
    );

    expect(await client.library.unmarkOwned(100)).toBe(true);
    expect(sent().map((request) => request.operationName)).toEqual(["Me", "GetOwnedBooks", "FindListBook", "RemoveListBook"]);
    expect(sent()[2]!.variables).toEqual({ listId: 9, bookId: 100 });
  });
});
