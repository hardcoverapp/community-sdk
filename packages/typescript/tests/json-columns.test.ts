// JSON columns (cachedImage, cachedContributors, cachedTags, cachedFeaturedSeries)
// come back typed, with their contents exactly as stored (spec/03).
import { describe, expect, expectTypeOf, it } from "vitest";
import type {
  Book,
  BookSummary,
  CachedContributor,
  CachedFeaturedSeries,
  CachedImage,
  CachedTags,
  LibraryListItem,
} from "../src/index.ts";
import { ok, setup } from "./helpers.ts";

// Shapes as the API returned them for Red Rising (2026-10-20).
const redRising = {
  id: 427473,
  slug: "red-rising",
  title: "Red Rising",
  subtitle: null,
  pages: 382,
  rating: 4.19,
  releaseYear: 2014,
  audioSeconds: null,
  ratingsCount: 8000,
  usersCount: 11581,
  cachedImage: { id: 1889221, url: "https://assets.hardcover.app/editions/26096001/3897005112280259.jpg", color: "#ddd8d7", width: 311, height: 475, color_name: "Silver" },
  cachedContributors: [
    { author: { id: 232665, slug: "pierce-brown", name: "Pierce Brown", image: {} }, contribution: "Author", contributor_role_id: 1, primary: true },
  ],
  cachedFeaturedSeries: {
    id: 3336,
    series: { id: 1033, name: "Red Rising Saga", slug: "red-rising-saga", books_count: 16, primary_books_count: 6 },
    details: "1",
    featured: true,
    position: 1,
    collection: false,
    unreleased: false,
  },
};
// A book with no cover and no series: the columns hold `{}`.
const bare = { ...redRising, id: 3036994, title: "Bare", cachedImage: {}, cachedContributors: [], cachedFeaturedSeries: {} };

describe("JSON columns", () => {
  it("are typed on the public types, wherever they appear", () => {
    expectTypeOf<BookSummary["cachedImage"]>().toEqualTypeOf<CachedImage>();
    expectTypeOf<BookSummary["cachedContributors"]>().toEqualTypeOf<CachedContributor[]>();
    expectTypeOf<BookSummary["cachedFeaturedSeries"]>().toEqualTypeOf<CachedFeaturedSeries>();
    expectTypeOf<Book["cachedTags"]>().toEqualTypeOf<CachedTags>();
    // Nested: a library row's book.
    expectTypeOf<LibraryListItem["book"]["cachedImage"]>().toEqualTypeOf<CachedImage>();
  });

  it("reach callers as stored, including empty columns", async () => {
    const { client } = setup(ok({ books_trending: { ids: [427473, 3036994], error: null } }), ok({ books: [redRising, bare] }));
    const { items } = await client.books.trending({ duration: "week", limit: 2 });
    const [first, second] = items;

    // No casts needed, and the stored keys (color_name, books_count) are untouched.
    expect(first?.cachedFeaturedSeries.series?.name).toBe("Red Rising Saga");
    expect(first?.cachedFeaturedSeries.position).toBe(1);
    expect(first?.cachedImage.color_name).toBe("Silver");
    expect(first?.cachedContributors.find((c) => c.primary)?.author?.name).toBe("Pierce Brown");

    expect(second?.cachedImage.url).toBeUndefined();
    expect(second?.cachedFeaturedSeries.series).toBeUndefined();
  });
});
