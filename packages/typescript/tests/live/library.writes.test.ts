// A real user's library flow: shelve a book, start it, finish it, rate it,
// take it back off. Runs only under `pnpm test:live:writes` and always cleans up.
// Target book rules (local vs remote) live in setup.ts writeTargetBook.
import { expect, it } from "vitest";
import { localDate, UserBookStatus } from "../../src/index.ts";
import { describeLiveWrites, liveClient, target, trackJournal, writeTargetBook } from "./setup.ts";

describeLiveWrites(`library writes (${target})`, () => {
  const client = liveClient();

  it("add → reading → read → rate → remove", async () => {
    const userId = await client.me.id();
    const { bookId } = await writeTargetBook(client);
    const journal = await trackJournal(client, bookId);
    expect(await client.library.forBook(bookId)).toBeNull();

    let entryId: number | undefined;
    try {
      const added = await client.library.add(bookId);
      entryId = added.id;
      expect(added).toMatchObject({ bookId, userId, statusId: UserBookStatus.WantToRead });

      const reading = await client.library.setStatus(entryId, UserBookStatus.CurrentlyReading);
      expect(reading.statusId).toBe(UserBookStatus.CurrentlyReading);

      const read = await client.library.setStatus(entryId, UserBookStatus.Read);
      expect(read.statusId).toBe(UserBookStatus.Read);
      const { timezone } = await client.me.get();
      expect(read.lastReadDate).toBe(localDate(new Date(), timezone));

      const rated = await client.library.rate(entryId, 4.5);
      expect(rated.rating).toBe(4.5);

      const found = await client.library.forBook(bookId);
      expect(found?.id).toBe(entryId);
    } finally {
      if (entryId !== undefined) await client.library.remove(entryId);
      await journal.cleanup();
    }

    expect(await client.library.forBook(bookId)).toBeNull();
  });
});
