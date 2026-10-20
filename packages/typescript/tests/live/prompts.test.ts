// Prompts, read-only: browse the popular ones, open one, see its ranked books,
// and go from a book back to the prompts it answers.
import { expect, it } from "vitest";
import { describeLive, liveClient, target } from "./setup.ts";

describeLive(`prompts: browse and read (${target})`, () => {
  const client = liveClient();

  it("list → getBySlug → books → forBook", async ({ skip }) => {
    const { items: popular } = await client.prompts.list({ limit: 5 });
    if (popular.length === 0) skip("no prompts on this environment");

    // Most answered first.
    const counts = popular.map((prompt) => prompt.answersCount);
    expect(counts).toEqual([...counts].sort((a, b) => b - a));

    const top = popular[0]!;
    expect((await client.prompts.getBySlug(top.slug))?.id).toBe(top.id);
    expect((await client.prompts.get(top.id))?.question).toBe(top.question);

    const { items: books } = await client.prompts.books(top.id, { limit: 5 });
    expect(books.length).toBeGreaterThan(0);

    // The site's ranking: most picked first.
    const picks = books.map((row) => row.answersCount);
    expect(picks).toEqual([...picks].sort((a, b) => b - a));

    // The top book answers this prompt, among others.
    const { items: forBook } = await client.prompts.forBook(books[0]!.book.id, { limit: 50 });
    expect(forBook.some((row) => row.prompt.id === top.id)).toBe(true);
  });

  it("featured only", async () => {
    const { items } = await client.prompts.list({ featured: true, limit: 5 });

    for (const prompt of items) expect(prompt.featured).toBe(true);
  });

  it("the signed-in user's prompts, follows and answers", async () => {
    const mine = await client.prompts.mine({ limit: 5 });
    const following = await client.prompts.following({ limit: 5 });

    expect(Array.isArray(mine.items)).toBe(true);
    expect(Array.isArray(following.items)).toBe(true);

    const { items: popular } = await client.prompts.list({ limit: 1 });
    if (popular[0]) expect(Array.isArray(await client.prompts.myAnswers(popular[0].id))).toBe(true);
  });
});
