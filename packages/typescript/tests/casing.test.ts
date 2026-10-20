// Field casing follows each language's convention (spec/03-sdk-design.md#casing).
// For TypeScript, the shared operations are rewritten with camelCase aliases
// before codegen, so the server returns camelCase keys and types match.
import { describe, expect, it } from "vitest";
import { caseOperations } from "../../../scripts/case-operations.mjs";
import type { GetLibraryQuery } from "../src/index.ts";
import { operations } from "../src/operations.ts";

describe("caseOperations (camel)", () => {
  const camel = (source: string) => caseOperations(source, "camel").replace(/\s+/g, " ").trim();

  it("aliases nested snake_case fields", () => {
    expect(camel("query Q { books { id release_year cached_image } }")).toContain(
      "books { id releaseYear: release_year cachedImage: cached_image }",
    );
  });

  it("leaves operation root fields canonical", () => {
    const out = camel("mutation M { insert_user_book(object: {}) { id user_book { book_id } } }");
    expect(out).toMatch(/\{ insert_user_book\(/);
    expect(out).toContain("userBook: user_book { bookId: book_id }");
  });

  it("aliases fields inside fragments, which are never roots", () => {
    expect(camel("fragment F on books { users_count }")).toContain("usersCount: users_count");
  });

  it("keeps existing aliases, single-word fields and __typename untouched", () => {
    const out = camel("query Q { books { mine: users_count title __typename } }");
    expect(out).toContain("mine: users_count");
    expect(out).toContain("title __typename");
  });

  it("does not touch arguments or input object keys", () => {
    const out = camel("query Q { user_books(where: { user_id: { _eq: 1 } }, order_by: { updated_at: desc }) { id } }");
    expect(out).toContain("where: { user_id: { _eq: 1 } }");
    expect(out).toContain("order_by: { updated_at: desc }");
  });

  it("handles digits in field names", () => {
    expect(camel("query Q { editions { isbn_13 isbn_10 } }")).toContain("isbn13: isbn_13 isbn10: isbn_10");
  });

  it("is the identity for snake case (Python)", () => {
    const source = "query Q { books { release_year } }";
    expect(caseOperations(source, "snake").replace(/\s+/g, " ")).toContain("books { release_year }");
  });
});

describe("generated TypeScript operations", () => {
  it("send camelCase aliases on the wire", () => {
    const doc = String(operations.GetLibrary);
    expect(doc).toContain("bookId: book_id");
    expect(doc).toContain("userBookReads: user_book_reads");
    expect(doc).toMatch(/\{\s*user_books\(/);
  });

  it("produce camelCase result types", () => {
    // Compile-time check: these property accesses only type-check if codegen
    // produced camelCase fields. The runtime assertion keeps vitest honest.
    const sample: GetLibraryQuery["user_books"][number]["book"] = {
      id: 1, slug: null, title: null, subtitle: null, releaseYear: null, pages: null,
      audioSeconds: null, rating: null, ratingsCount: 0, usersCount: 0, cachedImage: null, cachedContributors: null,
      cachedFeaturedSeries: null,
    };
    expect(sample.releaseYear).toBeNull();
  });
});
