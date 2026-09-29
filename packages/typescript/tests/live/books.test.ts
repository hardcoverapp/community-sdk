// Catalog reads through the books resource, against a real API.
import { expect, it } from "vitest";
import { describeLive, liveClient, target } from "./setup.ts";

describeLive(`books (${target})`, () => {
  const client = liveClient();

  it("get, getBySlug and getMany agree, and getMany keeps order", async () => {
    const bySlug = await client.books.getBySlug("project-hail-mary");
    expect(bySlug?.title).toBe("Project Hail Mary");
    const byId = await client.books.get(bySlug!.id);
    expect(byId?.id).toBe(bySlug!.id);
    expect(byId?.contributions.some((c) => c.author?.name === "Andy Weir")).toBe(true);

    const trending = await client.books.trending({ limit: 3 });
    const ids = [bySlug!.id, ...trending.map((b) => b.id)].reverse();
    expect((await client.books.getMany(ids)).map((b) => b.id)).toEqual(ids);
  });

  it("editions and findByIsbn find the same edition", async () => {
    const { items } = await client.books.editions((await client.books.getBySlug("project-hail-mary"))!.id, { limit: 10 });
    const edition = items.find((e) => e.isbn13)!;
    const found = await client.books.findByIsbn([` ${edition.isbn13!.slice(0, 3)}-${edition.isbn13!.slice(3)} `]);
    expect(found.map((e) => e.id)).toContain(edition.id);
    expect(found[0]?.book.title).toBe("Project Hail Mary");
  });

  it("trending returns books", async () => {
    const books = await client.books.trending({ duration: "all", limit: 5 });
    expect(books.length).toBeGreaterThan(0);
    expect(books[0]?.title).toBeTruthy();
  });
});
