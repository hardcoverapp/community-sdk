// Catalog lookups against a real API: from a popular book to its author, the
// author's books and series, the series' entries, an edition by id, and back
// from an external id. Read-only.
import { expect, it } from "vitest";
import { Platform } from "../../src/index.ts";
import { describeLive, liveClient, target } from "./setup.ts";

describeLive(`catalog: authors, series, editions, external ids (${target})`, () => {
  const client = liveClient();

  it("author → books → series → entries", async ({ skip }) => {
    const book = await client.books.getBySlug("red-rising");
    if (!book) skip("red-rising isn't on this environment");

    const authorId = book!.contributions.find((c) => c.author)?.author?.id;
    const author = await client.authors.get(authorId!);
    expect(author?.name).toBeTruthy();
    expect((await client.authors.getBySlug(author!.slug!))?.id).toBe(author!.id);

    const { items: books } = await client.authors.books(author!.id, { limit: 10 });
    expect(books.some((b) => b.id === book!.id)).toBe(true);

    // Most readers first.
    const readers = books.map((b) => b.usersCount);
    expect(readers).toEqual([...readers].sort((a, b) => b - a));

    // Each book once, even with more than one credit.
    expect(new Set(books.map((b) => b.id)).size).toBe(books.length);

    const series = await client.authors.series(author!.id);
    const saga = series.find((s) => s.slug === "red-rising-saga");
    expect(saga).toBeTruthy();

    const { items: entries } = await client.series.books(saga!.id);
    const positions = entries.map((e) => e.position).filter((p): p is number => p !== null);
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
    expect(entries.some((e) => e.book?.id === book!.id)).toBe(true);
  });

  it("an edition by id", async () => {
    const { items } = await client.books.editions(427473, { limit: 1 });
    const edition = await client.books.edition(items[0]!.id);

    expect(edition?.book.id).toBe(427473);
  });

  it("a book by its Goodreads id", async ({ skip }) => {
    // Red Rising on Goodreads.
    const matches = await client.books.findByExternalIds(Platform.Goodreads, ["15839976"]);
    if (matches.length === 0) skip("no Goodreads mapping for Red Rising on this environment");

    expect(matches.some((m) => m.book.slug === "red-rising")).toBe(true);
  });
});
