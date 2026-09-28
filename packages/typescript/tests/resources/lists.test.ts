// Lists, plus lists.addBooks: bulk add by exact ISBN. The SDK does the work
// that's awkward by hand (one lookup, batching, partial failures); all book
// matching stays an exact API lookup, with no guessing.
import { describe, expect, it } from "vitest";
import { ActionError, HardcoverClient, PrivacySetting } from "../../src/index.ts";
import { MockTransport, type MockResponse } from "../../src/testing/index.ts";

const ME = { status: 200, body: { data: { me: [{ id: 42, username: "reader", timezone: "UTC" }] } } };
const ok = (data: unknown): MockResponse => ({ status: 200, body: { data } });

function setup(...responses: MockResponse[]) {
  const transport = new MockTransport(responses);
  const client = new HardcoverClient({ token: "hc_pat_test", transport, sleep: async () => {} });
  const sent = () =>
    transport.requests.map(
      (r) => JSON.parse(r.body) as { query: string; operationName?: string; variables?: Record<string, unknown> },
    );
  return { client, sent };
}

describe("lists CRUD", () => {
  it("create maps idiomatic input and unwraps the list", async () => {
    const { client, sent } = setup(ok({ insert_list: { id: 9, errors: null, list: { id: 9, name: "Book club" } } }));
    const list = await client.lists.create({ name: "Book club", privacy: PrivacySetting.Private, ranked: true });

    expect(list).toMatchObject({ id: 9, name: "Book club" });
    expect(sent()[0]).toMatchObject({
      operationName: "CreateList",
      variables: { object: { name: "Book club", privacy_setting_id: 3, ranked: true } },
    });
  });

  it("create surfaces validation errors from the envelope", async () => {
    const { client } = setup(ok({ insert_list: { id: null, errors: ["Name can't be blank"], list: null } }));
    await expect(client.lists.create({ name: "" })).rejects.toThrow(ActionError);
  });

  it("update sends only the fields in the patch", async () => {
    const { client, sent } = setup(ok({ update_list: { id: 9, errors: [], list: { id: 9 } } }));
    await client.lists.update(9, { description: "Picks for 2027" });
    expect(sent()[0]!.variables).toEqual({ id: 9, object: { description: "Picks for 2027" } });
  });

  it("delete throws when the server reports no success", async () => {
    const { client } = setup(ok({ delete_list: { success: true } }), ok({ delete_list: { success: false } }));
    await expect(client.lists.delete(9)).resolves.toBeUndefined();
    await expect(client.lists.delete(9)).rejects.toThrow(/not deleted/i);
  });

  it("mine pages the signed-in user's lists", async () => {
    const { client, sent } = setup(ME, ok({ lists: [{ id: 1 }] }));
    const page = await client.lists.mine({ limit: 10 });
    expect(page).toEqual({ items: [{ id: 1 }], limit: 10, offset: 0, hasMore: false });
    expect(sent()[1]).toMatchObject({ operationName: "GetListsForUser", variables: { userId: 42, limit: 10, offset: 0 } });
  });
});

describe("lists.addBook / removeBook", () => {
  it("addBook sends list, book and optional edition", async () => {
    const { client, sent } = setup(ok({ insert_list_book: { id: 70, listBook: { id: 70, bookId: 100, editionId: 5 } } }));
    const row = await client.lists.addBook(9, 100, { editionId: 5 });
    expect(row).toMatchObject({ id: 70, bookId: 100 });
    expect(sent()[0]!.variables).toEqual({ object: { list_id: 9, book_id: 100, edition_id: 5 } });
  });

  it("removeBook looks up the row, then deletes it by id", async () => {
    const { client, sent } = setup(ok({ list_books: [{ id: 70 }] }), ok({ delete_list_book: { id: 70, listId: 9 } }));
    expect(await client.lists.removeBook(9, 100)).toBe(true);
    expect(sent().map((r) => r.operationName)).toEqual(["FindListBook", "RemoveListBook"]);
    expect(sent()[1]!.variables).toEqual({ id: 70 });
  });

  it("removeBook returns false when the book isn't on the list", async () => {
    const { client, sent } = setup(ok({ list_books: [] }));
    expect(await client.lists.removeBook(9, 100)).toBe(false);
    expect(sent()).toHaveLength(1);
  });
});

describe("lists.addBooks (bulk, exact ISBN)", () => {
  const edition = (id: number, bookId: number, isbn13: string | null, isbn10: string | null = null) => ({
    id, bookId, isbn13, isbn10, title: null,
  });

  it("looks up every code in one request, cleaning spaces and hyphens", async () => {
    const { client, sent } = setup(ok({ editions: [] }));
    await client.lists.addBooks(9, ["978-0-593-13520-4", " 0593135202 ", "080442957x"]);

    expect(sent()).toHaveLength(1);
    expect(sent()[0]).toMatchObject({
      operationName: "FindEditionsByIsbn",
      variables: { isbns: ["9780593135204", "0593135202", "080442957X"] },
    });
  });

  it("adds exact matches with their edition and reports the rest", async () => {
    const { client, sent } = setup(
      ok({ editions: [edition(5, 100, "9780593135204", "0593135202")] }),
      ok({ b0: { id: 70 } }),
    );
    const result = await client.lists.addBooks(9, ["9780593135204", "071612345678"]);

    expect(result.added).toEqual([{ code: "9780593135204", bookId: 100, editionId: 5, listBookId: 70 }]);
    expect(result.notAdded).toEqual([{ code: "071612345678", reason: "no_exact_edition" }]);
    const insert = sent()[1]!;
    expect(insert.query).toContain("b0: insert_list_book(object: $b0)");
    expect(insert.variables).toEqual({ b0: { list_id: 9, book_id: 100, edition_id: 5 } });
  });

  it("matches ISBN-10 too, and prefers the first edition returned when several share an ISBN", async () => {
    const { client } = setup(
      ok({ editions: [edition(5, 100, "9780593135204", "0593135202"), edition(6, 101, "9780593135204")] }),
      ok({ b0: { id: 70 } }),
    );
    const result = await client.lists.addBooks(9, ["0593135202"]);
    expect(result.added).toEqual([{ code: "0593135202", bookId: 100, editionId: 5, listBookId: 70 }]);
  });

  it("batches adds at most 5 per request", async () => {
    const codes = Array.from({ length: 12 }, (_, i) => `97800000000${String(i).padStart(2, "0")}`);
    const editions = codes.map((c, i) => edition(i + 1, 100 + i, c));
    const batch = (from: number, to: number) =>
      ok(Object.fromEntries(Array.from({ length: to - from }, (_, i) => [`b${i}`, { id: 500 + from + i }])));
    const { client, sent } = setup(ok({ editions }), batch(0, 5), batch(5, 10), batch(10, 12));

    const result = await client.lists.addBooks(9, codes);

    expect(result.added).toHaveLength(12);
    expect(result.added.map((a) => a.listBookId)).toEqual(codes.map((_, i) => 500 + i));
    expect(sent().slice(1).map((r) => Object.keys(r.variables ?? {}).length)).toEqual([5, 5, 2]);
  });

  it("when a batch fails, retries its items one by one to find the failure", async () => {
    // Adds are idempotent on the server, so retrying items that did land is safe.
    const codes = ["9780000000001", "9780000000002", "9780000000003"];
    const { client, sent } = setup(
      ok({ editions: codes.map((c, i) => edition(i + 1, 100 + i, c)) }),
      { status: 200, body: { errors: [{ message: "not a valid json response from webhook", extensions: { code: "unexpected" } }] } },
      ok({ b0: { id: 501 } }),
      { status: 200, body: { errors: [{ message: "not a valid json response from webhook", extensions: { code: "unexpected" } }] } },
      ok({ b0: { id: 503 } }),
    );
    const result = await client.lists.addBooks(9, codes);

    expect(result.added.map((a) => a.code)).toEqual(["9780000000001", "9780000000003"]);
    expect(result.notAdded).toEqual([
      expect.objectContaining({ code: "9780000000002", reason: "failed", error: expect.any(Error) }),
    ]);
    expect(sent()).toHaveLength(5);
  });

  it("reports each input code, including duplicates, in input order", async () => {
    const { client, sent } = setup(ok({ editions: [edition(5, 100, "9780593135204")] }), ok({ b0: { id: 70 } }));
    const result = await client.lists.addBooks(9, ["9780593135204", "978-0593135204"]);

    expect(result.added.map((a) => a.code)).toEqual(["9780593135204", "978-0593135204"]);
    expect(result.added.every((a) => a.listBookId === 70)).toBe(true);
    expect(sent()).toHaveLength(2);
  });

  it("does nothing for an empty list of codes", async () => {
    const { client, sent } = setup();
    expect(await client.lists.addBooks(9, [])).toEqual({ added: [], notAdded: [] });
    expect(sent()).toHaveLength(0);
  });
});
