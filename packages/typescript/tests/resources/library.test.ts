// Resource behavior the SDK owns: input mapping (idiomatic in, wire names out,
// only fields the caller set), date defaults, validation, unwrapping, paging.
// Real response shapes are covered by tests/live.
import { describe, expect, it } from "vitest";
import { NotFoundError, UserBookStatus, PrivacySetting } from "../../src/index.ts";
import type { MockResponse } from "../../src/testing/index.ts";
import { me, setupWith } from "../helpers.ts";

const ME = me({ timezone: "America/Denver" });
// 02:30 UTC on Sep 29 is still Sep 28 in Denver.
const NOW = new Date("2026-09-29T02:30:00Z");
const setup = (...responses: MockResponse[]) => setupWith({ now: () => NOW }, ...responses);


const userBookEnvelope = (field: string, userBook: Record<string, unknown>) => ({
  status: 200,
  body: { data: { [field]: { id: userBook.id, error: null, userBook } } },
});

describe("library.add", () => {
  it("defaults to Want to Read and sends only what was set", async () => {
    const { client, sent } = setup(userBookEnvelope("insert_user_book", { id: 7, bookId: 100, statusId: 1 }));
    const entry = await client.library.add(100);

    expect(entry).toMatchObject({ id: 7, bookId: 100, statusId: 1 });
    expect(sent()).toEqual([
      expect.objectContaining({ operationName: "AddUserBook", variables: { object: { book_id: 100, status_id: 1 } } }),
    ]);
  });

  it("maps idiomatic options to wire fields", async () => {
    const { client, sent } = setup(userBookEnvelope("insert_user_book", { id: 7 }));
    await client.library.add(100, {
      status: UserBookStatus.CurrentlyReading,
      editionId: 5,
      privacy: PrivacySetting.Private,
      rating: 4,
      startDate: "2026-09-01",
    });

    expect(sent()[0]!.variables).toEqual({
      object: { book_id: 100, status_id: 2, edition_id: 5, privacy_setting_id: 3, rating: 4, user_start_date: "2026-09-01" },
    });
  });

  it("marks Read with today's date in the user's timezone", async () => {
    const { client, sent } = setup(ME, userBookEnvelope("insert_user_book", { id: 7 }));
    await client.library.add(100, { status: UserBookStatus.Read });

    expect(sent().map((r) => r.operationName)).toEqual(["Me", "AddUserBook"]);
    expect(sent()[1]!.variables).toEqual({ object: { book_id: 100, status_id: 3, user_date: "2026-09-28" } });
  });

  it("uses an explicit read date without looking up the user", async () => {
    const { client, sent } = setup(userBookEnvelope("insert_user_book", { id: 7 }));
    await client.library.add(100, { status: UserBookStatus.Read, date: "2025-12-31" });

    expect(sent()).toHaveLength(1);
    expect(sent()[0]!.variables).toEqual({ object: { book_id: 100, status_id: 3, user_date: "2025-12-31" } });
  });
});

describe("library.update / setStatus / rate", () => {
  it("sends only the fields in the patch", async () => {
    const { client, sent } = setup(userBookEnvelope("update_user_book", { id: 7, rating: 4.5 }));
    const entry = await client.library.update(7, { rating: 4.5 });

    expect(entry.rating).toBe(4.5);
    expect(sent()[0]).toMatchObject({ operationName: "UpdateUserBook", variables: { id: 7, object: { rating: 4.5 } } });
    expect(Object.keys(sent()[0]!.variables.object as object)).toEqual(["rating"]);
  });

  it("maps review and notes fields only when given", async () => {
    const { client, sent } = setup(userBookEnvelope("update_user_book", { id: 7 }));
    await client.library.update(7, { review: { markdown: "Loved it", hasSpoilers: false }, notes: "gift from Sam" });

    expect(sent()[0]!.variables.object).toEqual({
      review_markdown: "Loved it",
      review_has_spoilers: false,
      private_notes: "gift from Sam",
    });
  });

  it("setStatus to Read defaults the date like add does", async () => {
    const { client, sent } = setup(ME, userBookEnvelope("update_user_book", { id: 7 }));
    await client.library.setStatus(7, UserBookStatus.Read);

    expect(sent()[1]!.variables).toEqual({ id: 7, object: { status_id: 3, user_date: "2026-09-28" } });
  });

  it("setStatus to other statuses sends no date", async () => {
    const { client, sent } = setup(userBookEnvelope("update_user_book", { id: 7 }));
    await client.library.setStatus(7, UserBookStatus.Paused);

    expect(sent()[0]!.variables).toEqual({ id: 7, object: { status_id: 4 } });
  });

  it("rate accepts half stars and null, and rejects anything else before sending", async () => {
    const { client, sent } = setup(userBookEnvelope("update_user_book", { id: 7 }), userBookEnvelope("update_user_book", { id: 7 }));
    await client.library.rate(7, 3.5);
    await client.library.rate(7, null);
    await expect(client.library.rate(7, 3.3)).rejects.toThrow(RangeError);
    await expect(client.library.rate(7, 0)).rejects.toThrow(RangeError);
    await expect(client.library.rate(7, 5.5)).rejects.toThrow(RangeError);

    expect(sent().map((r) => (r.variables.object as { rating: unknown }).rating)).toEqual([3.5, null]);
  });
});

describe("library reads", () => {
  it("list pages the signed-in user's shelf by status", async () => {
    const items = [{ id: 1 }, { id: 2 }];
    const { client, sent } = setup(ME, { status: 200, body: { data: { user_books: items } } });
    const page = await client.library.list({ status: UserBookStatus.Read, limit: 2 });

    expect(page).toEqual({ items, limit: 2, offset: 0, hasMore: true });
    expect(sent()[1]).toMatchObject({ operationName: "GetLibrary", variables: { userId: 42, statusIds: [3], limit: 2, offset: 0 } });
  });

  it("list without a status omits the filter so the operation default applies", async () => {
    const { client, sent } = setup(ME, { status: 200, body: { data: { user_books: [] } } });
    const page = await client.library.list();

    expect(page.hasMore).toBe(false);
    expect(sent()[1]!.variables).toEqual({ userId: 42, limit: 25, offset: 0 });
  });

  it("count and forBook", async () => {
    const { client, sent } = setup(
      ME,
      { status: 200, body: { data: { user_books_aggregate: { aggregate: { count: 12 } } } } },
      { status: 200, body: { data: { user_books: [] } } },
    );

    expect(await client.library.count()).toBe(12);
    expect(await client.library.forBook(100)).toBeNull();
    expect(sent().map((r) => r.operationName)).toEqual(["Me", "CountLibrary", "GetUserBookForBook"]);
  });

  it("remove of an entry that isn't there is a NotFoundError", async () => {
    const { client } = setup({ status: 200, body: { data: { delete_user_book: { id: null, bookId: null, userId: null } } } });
    await expect(client.library.remove(7)).rejects.toThrow(NotFoundError);
  });

  it("remove returns nothing and sends the id", async () => {
    const { client, sent } = setup({ status: 200, body: { data: { delete_user_book: { id: 7, bookId: 100, userId: 42 } } } });
    await expect(client.library.remove(7)).resolves.toBeUndefined();
    expect(sent()[0]).toMatchObject({ operationName: "RemoveUserBook", variables: { id: 7 } });
  });
});

describe("library occurredAt", () => {
  it("backdates status changes via action_at", async () => {
    const { client, sent } = setup({
      status: 200,
      body: { data: { update_user_book: { id: 7, error: null, userBook: { id: 7 } } } },
    });
    await client.library.update(7, { status: UserBookStatus.Paused, occurredAt: "2026-09-24T21:00:00-06:00" });
    expect(sent()[0]!.variables).toEqual({ id: 7, object: { status_id: 4, action_at: "2026-09-24T21:00:00-06:00" } });
  });
});

describe("library.changes", () => {
  const entry = (id: number, updatedAt: string) => ({ id, updatedAt, bookId: id * 10 });
  const changes = (...rows: unknown[]): MockResponse => ({ status: 200, body: { data: { user_books: rows } } });
  const ids = (...rows: number[]): MockResponse => ({ status: 200, body: { data: { user_books: rows.map((id) => ({ id })) } } });
  const T1 = "2026-10-07T01:00:00.123456+00:00";
  const T2 = "2026-10-07T02:00:00.654321+00:00";

  it("starts from the beginning and returns a cursor at the last row, keeping the server's microseconds", async () => {
    const { client, sent } = setupWith({}, me(), changes(entry(1, T1), entry(2, T2)));
    const result = await client.library.changes({ limit: 2 });

    expect(sent()[1]).toMatchObject({ operationName: "GetLibraryChanges", variables: { userId: 42, limit: 2 } });
    expect(sent()[1]!.variables).not.toHaveProperty("after");
    expect(result).toMatchObject({ cursor: `${T2}|2`, hasMore: true });
    expect(result.items.map((e) => e.id)).toEqual([1, 2]);
    expect(result).not.toHaveProperty("removedIds");
  });

  it("resumes after the cursor's timestamp and id, so equal timestamps across a page aren't skipped", async () => {
    const { client, sent } = setupWith({}, me(), changes());
    const result = await client.library.changes({ since: `${T1}|7` });
    expect(sent()[1]!.variables).toMatchObject({ after: T1, afterId: 7 });
    expect(result).toMatchObject({ items: [], cursor: `${T1}|7`, hasMore: false });
  });

  it("returns a null cursor when nothing has synced yet", async () => {
    const { client } = setupWith({}, me(), changes());
    expect((await client.library.changes()).cursor).toBeNull();
  });

  it("finds removals from knownIds with one ids-only read", async () => {
    const { client, sent } = setupWith({}, me(), changes(entry(1, T1)), ids(1, 2));
    const result = await client.library.changes({ knownIds: [1, 2, 3, 3] });
    expect(sent()[2]).toMatchObject({ operationName: "GetLibraryIds", variables: { userId: 42 } });
    expect(result.removedIds).toEqual([3]);
  });

  it("rejects a cursor it didn't make", async () => {
    const { client } = setupWith({}, me());
    await expect(client.library.changes({ since: "2026-10-07" })).rejects.toThrow(RangeError);
  });
});
