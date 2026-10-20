// Catalog lookups beyond books: authors, series, a single edition, and books
// other services know by their own ids. Read-only, `read:catalog`.
import { describe, expect, it } from "vitest";
import { Platform } from "../../src/index.ts";
import { ok, setup } from "../helpers.ts";

const book = (id: number) => ({ id, title: `Book ${id}`, cachedImage: {}, cachedContributors: [], cachedFeaturedSeries: {} });

describe("authors", () => {
  it("get and getBySlug return the author or null", async () => {
    const author = { id: 232665, slug: "pierce-brown", name: "Pierce Brown", canonicalId: null };
    const { client } = setup(ok({ authors_by_pk: author }), ok({ authors: [] }));

    expect(await client.authors.get(232665)).toMatchObject({ name: "Pierce Brown" });
    expect(await client.authors.getBySlug("nobody")).toBeNull();
  });

  it("books pages the author's books, most readers first", async () => {
    const { client, sent } = setup(ok({ books: [book(1), book(2)] }));
    const page = await client.authors.books(232665, { limit: 2 });

    expect(page).toMatchObject({ limit: 2, offset: 0, hasMore: true });
    expect(sent()[0]).toMatchObject({ operationName: "GetAuthorBooks", variables: { authorId: 232665, limit: 2, offset: 0 } });
  });

  it("series lists the author's series", async () => {
    const { client, sent } = setup(ok({ series: [{ id: 1033, name: "Red Rising Saga" }] }));

    expect(await client.authors.series(232665)).toEqual([{ id: 1033, name: "Red Rising Saga" }]);
    expect(sent()[0]!.variables).toEqual({ authorId: 232665 });
  });
});

describe("series", () => {
  it("get and getBySlug return the series or null", async () => {
    const { client } = setup(ok({ series_by_pk: { id: 1033, name: "Red Rising Saga" } }), ok({ series: [] }));

    expect(await client.series.get(1033)).toMatchObject({ name: "Red Rising Saga" });
    expect(await client.series.getBySlug("nothing")).toBeNull();
  });

  it("books returns every entry, 50 to a page by default", async () => {
    const entries = [
      { position: 1, details: "1", compilation: false, featured: true, book: book(1) },
      { position: null, details: "1-3", compilation: true, featured: true, book: book(9) },
    ];
    const { client, sent } = setup(ok({ book_series: entries }));
    const page = await client.series.books(1033);

    expect(page.items).toHaveLength(2);
    expect(page.hasMore).toBe(false);
    expect(sent()[0]!.variables).toEqual({ seriesId: 1033, limit: 50, offset: 0 });
  });
});

describe("books: single edition and external ids", () => {
  it("edition returns the edition with its book, or null", async () => {
    const edition = { id: 26096001, bookId: 427473, isbn13: "9780345539786", book: book(427473) };
    const { client } = setup(ok({ editions_by_pk: edition }), ok({ editions_by_pk: null }));

    expect(await client.books.edition(26096001)).toMatchObject({ bookId: 427473, book: { id: 427473 } });
    expect(await client.books.edition(1)).toBeNull();
  });

  it("findByExternalIds sends cleaned, de-duplicated string ids for the platform", async () => {
    const match = { externalId: "15839976", editionId: null, book: book(427473) };
    const { client, sent } = setup(ok({ book_mappings: [match] }));
    const matches = await client.books.findByExternalIds(Platform.Goodreads, [15839976, " 15839976 ", "", "999"]);

    expect(matches).toEqual([match]);
    expect(sent()[0]!.variables).toEqual({ platformId: 1, externalIds: ["15839976", "999"] });
  });

  it("findByExternalIds sends nothing for an empty list", async () => {
    const { client, sent } = setup();

    expect(await client.books.findByExternalIds(Platform.OpenLibrary, [" "])).toEqual([]);
    expect(sent()).toHaveLength(0);
  });
});
