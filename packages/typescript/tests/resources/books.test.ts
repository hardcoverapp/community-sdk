// books: catalog reads. Pass-through, plus the chores every app repeats:
// results in the order you asked for, and trending as books rather than ids.
import { describe, expect, it } from "vitest";
import { ok, setup } from "../helpers.ts";

const book = (id: number) => ({ id, title: `Book ${id}` });


describe("books", () => {
  it("get returns the book or null", async () => {
    const { client, sent } = setup(ok({ books_by_pk: book(7) }), ok({ books_by_pk: null }));
    expect(await client.books.get(7)).toMatchObject({ id: 7 });
    expect(await client.books.get(8)).toBeNull();
    expect(sent()[0]).toMatchObject({ operationName: "GetBook", variables: { id: 7 } });
  });

  it("getBySlug returns the book or null", async () => {
    const { client, sent } = setup(ok({ books: [book(7)] }), ok({ books: [] }));
    expect(await client.books.getBySlug("project-hail-mary")).toMatchObject({ id: 7 });
    expect(await client.books.getBySlug("nope")).toBeNull();
    expect(sent()[0]).toMatchObject({ operationName: "GetBookBySlug", variables: { slug: "project-hail-mary" } });
  });

  it("getMany keeps the order you asked for and skips ids that don't exist", async () => {
    const { client, sent } = setup(ok({ books: [book(3), book(1)] }));
    const books = await client.books.getMany([1, 2, 3]);
    expect(books.map((b) => b.id)).toEqual([1, 3]);
    expect(sent()[0]).toMatchObject({ operationName: "GetBooks", variables: { ids: [1, 2, 3] } });
  });

  it("getMany with no ids makes no request", async () => {
    const { client, sent } = setup();
    expect(await client.books.getMany([])).toEqual([]);
    expect(sent()).toHaveLength(0);
  });

  it("editions pages a book's editions", async () => {
    const { client, sent } = setup(ok({ editions: [{ id: 5 }, { id: 6 }] }));
    const page = await client.books.editions(7, { limit: 2 });
    expect(page).toEqual({ items: [{ id: 5 }, { id: 6 }], limit: 2, offset: 0, hasMore: true });
    expect(sent()[0]).toMatchObject({ operationName: "GetEditionsForBook", variables: { bookId: 7, limit: 2, offset: 0 } });
  });

  it("findByIsbn matches exactly and returns editions with their book", async () => {
    const { client, sent } = setup(ok({ editions: [{ id: 5, isbn13: "9780593135204", book: book(7) }] }));
    const editions = await client.books.findByIsbn(["978-0-593-13520-4"]);
    expect(editions[0]).toMatchObject({ id: 5, book: { id: 7 } });
    expect(sent()[0]!.variables).toEqual({ isbns: ["9780593135204"] });
  });

  it("trending returns books in trending order (ids, then the books)", async () => {
    const { client, sent } = setup(
      ok({ books_trending: { ids: [9, 4, 6], error: null } }),
      ok({ books: [book(4), book(6), book(9)] }),
    );
    const page = await client.books.trending({ duration: "week", limit: 3 });
    expect(page.items.map((b) => b.id)).toEqual([9, 4, 6]);
    expect(page).toMatchObject({ limit: 3, offset: 0, hasMore: true });
    expect(sent().map((r) => r.operationName)).toEqual(["TrendingBookIds", "GetBooks"]);
    expect(sent()[0]!.variables).toEqual({ duration: "week", limit: 3, offset: 0 });
  });
});
