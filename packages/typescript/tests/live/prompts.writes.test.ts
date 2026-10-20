// A real user asking a prompt and answering it: ask, answer with a book (twice:
// it's idempotent), explain the pick, follow, edit, take the answer back,
// delete. Runs only under `pnpm test:live:writes`; cleans up.
import { expect, it } from "vitest";
import { describeLiveWrites, liveClient, popularBookIds, target, trackJournal } from "./setup.ts";

/** Polls until `check` passes, for up to `timeoutMs`. Returns whether it did. */
async function waitFor(check: () => Promise<boolean>, timeoutMs = 15_000): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    if (await check()) return true;
    await new Promise((resolve) => setTimeout(resolve, 1_000));
  }

  return false;
}

describeLiveWrites(`prompts: ask and answer (${target})`, () => {
  const client = liveClient();

  it("create → answer → updateAnswer → follow → update → deleteAnswer → delete", async () => {
    const [bookId] = await popularBookIds(client);
    const journal = await trackJournal(client, bookId!);

    const prompt = await client.prompts.create({
      question: `sdk-test ${Date.now()}: a book that surprised you?`,
      description: "Created by the SDK live tests; deleted at the end.",
    });

    try {
      expect(prompt.question).toMatch(/^sdk-test/);
      expect((await client.prompts.mine({ limit: 10 })).items.some((p) => p.id === prompt.id)).toBe(true);

      // Answering twice with the same book keeps one answer.
      const first = await client.prompts.answer(prompt.id, bookId!, { description: "Didn't see it coming." });
      const again = await client.prompts.answer(prompt.id, bookId!);
      expect(again.answer.id).toBe(first.answer.id);
      expect(first.answersCount).toBeGreaterThanOrEqual(1);

      // The server journals the answer from a background job; wait for it so
      // cleanup can find it (and so this checks the journaling happens).
      const journaled = await waitFor(async () => (await journal.added()).length > 0);
      expect(journaled).toBe(true);

      const { items: ranked } = await client.prompts.books(prompt.id);
      expect(ranked.map((row) => row.book.id)).toEqual([bookId]);

      const edited = await client.prompts.updateAnswer(first.answer.id, { description: "Still thinking about it." });
      expect(edited.description).toBe("Still thinking about it.");

      const mine = await client.prompts.myAnswers(prompt.id);
      expect(mine.map((answer) => answer.id)).toEqual([first.answer.id]);

      await client.prompts.follow(prompt.id);
      await client.prompts.follow(prompt.id); // safe to repeat
      expect((await client.prompts.following({ limit: 50 })).items.some((f) => f.prompt.id === prompt.id)).toBe(true);
      expect(await client.prompts.unfollow(prompt.id)).toBe(true);

      const updated = await client.prompts.update(prompt.id, { description: "Edited by the SDK live tests." });
      expect(updated.description).toBe("Edited by the SDK live tests.");
      expect(updated.question).toBe(prompt.question);

      await client.prompts.deleteAnswer(first.answer.id);
      expect(await client.prompts.myAnswers(prompt.id)).toEqual([]);
    } finally {
      await client.prompts.delete(prompt.id);
      await journal.cleanup();
    }

    expect(await client.prompts.get(prompt.id)).toBeNull();
  });
});
