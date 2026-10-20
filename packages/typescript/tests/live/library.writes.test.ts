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
      // The server stamps today in the reader's timezone, which tokens can't
      // read; every zone's today is within a day of UTC's.
      const day = 86_400_000;
      const nearToday = [-day, 0, day].map((offset) => localDate(new Date(Date.now() + offset), "UTC"));
      expect(nearToday).toContain(read.lastReadDate);

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

  it("changes reports an edit, and knownIds reports the removal", async () => {
    const { bookId } = await writeTargetBook(client);
    const journal = await trackJournal(client, bookId);
    // Start from the newest change, so only this test's edits come back.
    let since: string | null = null;
    for (let page = await client.library.changes({ limit: 100 }); ; page = await client.library.changes({ since, limit: 100 })) {
      since = page.cursor;
      if (!page.hasMore) break;
    }

    let entryId: number | undefined;
    try {
      entryId = (await client.library.add(bookId)).id;
      const added = await client.library.changes({ since });
      expect(added.items.map((e) => e.id)).toEqual([entryId]);

      await client.library.remove(entryId);
      const removed = await client.library.changes({ since: added.cursor, knownIds: [entryId] });
      expect(removed.items).toEqual([]);
      expect(removed.removedIds).toEqual([entryId]);
      entryId = undefined;
    } finally {
      if (entryId !== undefined) await client.library.remove(entryId);
      await journal.cleanup();
    }
  });
});
