// Read-only checks against a real API. Safe for any environment.
import { expect, it } from "vitest";
import { operations } from "../../src/index.ts";
import { describeLive, liveClient, target } from "./setup.ts";

describeLive(`live reads (${target})`, () => {
  const client = liveClient();

  it("Me returns the token's user", async () => {
    const { me } = await client.request(operations.Me);

    expect(me).toHaveLength(1);
    expect(me[0]!.id).toBeTypeOf("number");
    expect(me[0]!.username).toBeTruthy();
  });

  it("exposes rate-limit state from the gateway headers", async () => {
    await client.request(operations.Me);

    expect(client.rateLimit?.daily?.limit).toBeGreaterThan(0);
    expect(client.rateLimit?.daily?.remaining).toBeTypeOf("number");
  });

  it("GetBook and GetEditionsForBook resolve a popular book", async () => {
    const { books } = await client.graphql<{ books: { id: number }[] }>(
      "query TopBook { books(limit: 1, order_by: { users_count: desc }) { id } }",
    );
    const bookId = books[0]!.id;

    const { books_by_pk: book } = await client.request(operations.GetBook, { id: bookId });
    const { editions } = await client.request(operations.GetEditionsForBook, { bookId, limit: 3 });

    expect(book?.id).toBe(bookId);
    expect(book?.title).toBeTruthy();
    expect(editions.length).toBeGreaterThan(0);
    expect(editions.every((e) => e.book_id === bookId)).toBe(true);
  });

  it("GetLibrary reads the user's own shelf", async () => {
    const { me } = await client.request(operations.Me);
    const { user_books } = await client.request(operations.GetLibrary, { userId: me[0]!.id, limit: 5 });

    expect(Array.isArray(user_books)).toBe(true);
    for (const ub of user_books) expect(ub.user_id).toBe(me[0]!.id);
  });
});
