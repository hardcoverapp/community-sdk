// Resource behavior the SDK owns: input mapping (idiomatic in, wire names out,
// only fields the caller set), date defaults, validation, unwrapping, paging.
// Real response shapes are covered by tests/live.
import { describe, expect, it } from "vitest";
import { HardcoverClient, UserBookStatus, PrivacySetting } from "../../src/index.ts";
import { MockTransport, type MockResponse } from "../../src/testing/index.ts";

const ME = { status: 200, body: { data: { me: [{ id: 42, username: "reader", timezone: "America/Denver" }] } } };
// 02:30 UTC on Sep 29 is still Sep 28 in Denver.
const NOW = new Date("2026-09-29T02:30:00Z");

function setup(...responses: MockResponse[]) {
  const transport = new MockTransport(responses);
  const client = new HardcoverClient({ token: "hc_pat_test", transport, now: () => NOW });
  const sent = () =>
    transport.requests.map((r) => JSON.parse(r.body) as { operationName: string; variables: Record<string, unknown> });
  return { client, transport, sent };
}

const userBookEnvelope = (field: string, userBook: Record<string, unknown>) => ({
  status: 200,
  body: { data: { [field]: { id: userBook.id, error: null, userBook } } },
});

describe("me", () => {
  it("fetches once and caches, including concurrent callers", async () => {
    const { client, sent } = setup(ME);
    const [a, b] = await Promise.all([client.me.get(), client.me.get()]);
    const c = await client.me.get();
    expect(a.username).toBe("reader");
    expect(b).toBe(a);
    expect(c).toBe(a);
    expect(sent()).toHaveLength(1);
  });

  it("refetches on request", async () => {
    const { client, sent } = setup(ME, ME);
    await client.me.get();
    await client.me.get({ refresh: true });
    expect(sent()).toHaveLength(2);
  });
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

  it("remove returns nothing and sends the id", async () => {
    const { client, sent } = setup({ status: 200, body: { data: { delete_user_book: { id: 7, bookId: 100, userId: 42 } } } });
    await expect(client.library.remove(7)).resolves.toBeUndefined();
    expect(sent()[0]).toMatchObject({ operationName: "RemoveUserBook", variables: { id: 7 } });
  });
});
