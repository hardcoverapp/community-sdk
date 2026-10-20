// prompts: community questions answered with books. The server owns the rules
// (always public, unique questions, locked questions after 5 answers, journal
// entries); the SDK builds the browse filters, keeps the ranking, sends whole
// objects where the API needs them, and maps "missing" to NotFoundError.
import { describe, expect, it } from "vitest";
import { NotFoundError, PrivacySetting } from "../../src/index.ts";
import { me, ok, setup } from "../helpers.ts";

const prompt = (over: Record<string, unknown> = {}) => ({
  id: 203,
  slug: "whats-your-favorite-cozy-fantasy",
  question: "What's your favorite cozy fantasy?",
  description: "Low stakes, warm hearts.",
  featured: true,
  answersCount: 510,
  booksCount: 60,
  usersCount: 300,
  userId: 7,
  createdAt: "2024-01-01T00:00:00",
  ...over,
});

const book = (id: number) => ({ id, title: `Book ${id}`, cachedImage: {}, cachedContributors: [], cachedFeaturedSeries: {} });

describe("prompts reads", () => {
  it("get and getBySlug return the prompt or null", async () => {
    const { client } = setup(ok({ prompts_by_pk: prompt() }), ok({ prompts: [] }));

    expect(await client.prompts.get(203)).toMatchObject({ question: "What's your favorite cozy fantasy?" });
    expect(await client.prompts.getBySlug("missing")).toBeNull();
  });

  it("list browses most answered first by default", async () => {
    const { client, sent } = setup(ok({ prompts: [prompt()] }));
    await client.prompts.list({ limit: 10 });

    expect(sent()[0]).toMatchObject({
      operationName: "GetPrompts",
      variables: { where: {}, orderBy: [{ answers_count: "desc" }, { id: "desc" }], limit: 10, offset: 0 },
    });
  });

  it("list can show only featured prompts, newest first", async () => {
    const { client, sent } = setup(ok({ prompts: [] }));
    await client.prompts.list({ featured: true, sort: "newest" });

    expect(sent()[0]!.variables).toMatchObject({
      where: { featured: { _eq: true } },
      orderBy: [{ created_at: "desc" }, { id: "desc" }],
    });
  });

  it("mine pages the signed-in user's prompts", async () => {
    const { client, sent } = setup(me(), ok({ prompts: [prompt({ userId: 42 })] }));
    const page = await client.prompts.mine();

    expect(page.items).toHaveLength(1);
    expect(sent()[1]).toMatchObject({ operationName: "GetPromptsForUser", variables: { userId: 42 } });
  });

  it("books keeps the ranking and skips rows whose book is gone", async () => {
    const rows = [
      { answersCount: 40, book: book(1) },
      { answersCount: 12, book: null },
      { answersCount: 9, book: book(2) },
    ];
    const { client } = setup(ok({ prompt_books_summary: rows }));
    const page = await client.prompts.books(203, { limit: 3 });

    expect(page.items.map((row) => [row.book.id, row.answersCount])).toEqual([
      [1, 40],
      [2, 9],
    ]);

    // A full page of rows means there may be more, even though one was skipped.
    expect(page.hasMore).toBe(true);
  });

  it("forBook lists the prompts a book answers, most picked first", async () => {
    const { client, sent } = setup(ok({ prompt_books_summary: [{ answersCount: 40, prompt: prompt() }] }));
    const page = await client.prompts.forBook(1);

    expect(page.items[0]).toMatchObject({ answersCount: 40, prompt: { id: 203 } });
    expect(sent()[0]).toMatchObject({ operationName: "GetPromptsForBook", variables: { bookId: 1 } });
  });

  it("myAnswers looks up the signed-in user's answers to one prompt", async () => {
    const { client, sent } = setup(me(), ok({ prompt_answers: [{ id: 5, promptId: 203, bookId: 1, book: book(1) }] }));
    const answers = await client.prompts.myAnswers(203);

    expect(answers[0]).toMatchObject({ id: 5, book: { id: 1 } });
    expect(sent()[1]!.variables).toEqual({ userId: 42, promptId: 203 });
  });
});

describe("prompts writes", () => {
  const envelope = (root: string, value: unknown) => ok({ [root]: { id: 203, error: null, prompt: value } });

  it("create always asks a public prompt", async () => {
    const { client, sent } = setup(envelope("insert_prompt", prompt()));
    await client.prompts.create({ question: "What's your favorite cozy fantasy?", description: "Low stakes." });

    expect(sent()[0]!.variables).toEqual({
      object: { question: "What's your favorite cozy fantasy?", description: "Low stakes.", privacy_setting_id: PrivacySetting.Public },
    });
  });

  it("update reads the prompt and sends it whole, with the patch applied", async () => {
    const { client, sent } = setup(ok({ prompts_by_pk: prompt() }), envelope("update_prompt", prompt({ description: "New" })));
    await client.prompts.update(203, { description: "New" });

    expect(sent().map((request) => request.operationName)).toEqual(["GetPrompt", "UpdatePrompt"]);
    expect(sent()[1]!.variables).toEqual({
      object: { id: 203, question: "What's your favorite cozy fantasy?", description: "New", privacy_setting_id: 1 },
    });
  });

  it("update and delete throw NotFoundError for a missing prompt", async () => {
    const { client } = setup(ok({ prompts_by_pk: null }), ok({ delete_prompts_by_pk: null }));

    await expect(client.prompts.update(9, { description: "x" })).rejects.toThrow(NotFoundError);
    await expect(client.prompts.delete(9)).rejects.toThrow(NotFoundError);
  });

  it("answer returns the answer and the book's new count", async () => {
    const answer = { id: 5, promptId: 203, bookId: 1, userId: 42, description: "So warm", createdAt: null };
    const { client, sent } = setup(ok({ insert_prompt_answer: { id: 5, promptAnswer: answer, promptBook: { answersCount: 41 } } }));
    const result = await client.prompts.answer(203, 1, { description: "So warm" });

    expect(result).toEqual({ answer, answersCount: 41 });
    expect(sent()[0]!.variables).toEqual({ object: { prompt_id: 203, book_id: 1, description: "So warm" } });
  });

  it("answer sends no description unless one is given", async () => {
    const answer = { id: 5, promptId: 203, bookId: 1, userId: 42, description: null, createdAt: null };
    const { client, sent } = setup(ok({ insert_prompt_answer: { id: 5, promptAnswer: answer, promptBook: null } }));
    const result = await client.prompts.answer(203, 1);

    expect(sent()[0]!.variables).toEqual({ object: { prompt_id: 203, book_id: 1 } });
    expect(result.answersCount).toBe(0);
  });

  it("updateAnswer and deleteAnswer throw NotFoundError for a missing answer", async () => {
    const { client } = setup(ok({ update_prompt_answers_by_pk: null }), ok({ delete_prompt_answer: null }));

    await expect(client.prompts.updateAnswer(5, { description: "x" })).rejects.toThrow(NotFoundError);
    await expect(client.prompts.deleteAnswer(5)).rejects.toThrow(NotFoundError);
  });

  it("unfollow reports whether there was anything to unfollow", async () => {
    const { client } = setup(ok({ delete_followed_prompt: { success: true } }), ok({ delete_followed_prompt: { success: false } }));

    expect(await client.prompts.unfollow(203)).toBe(true);
    expect(await client.prompts.unfollow(203)).toBe(false);
  });
});
