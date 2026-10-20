// Reading data a real user edits by hand: logging a read from before they used
// Hardcover, fixing its dates, finding it in a year's finished reads, deleting
// it; and marking an edition owned, then not. Runs only under
// `pnpm test:live:writes`; cleans up.
import { expect, it } from "vitest";
import { DatePrecision, UserBookStatus } from "../../src/index.ts";
import { describeLiveWrites, liveClient, target, trackJournal, writeTargetBook } from "./setup.ts";

describeLiveWrites(`reading data: reads by hand and owned editions (${target})`, () => {
  const client = liveClient();

  it("add a past read → fix its dates → finished() finds it → delete", async () => {
    const { bookId, editionId } = await writeTargetBook(client);
    const journal = await trackJournal(client, bookId);

    let entryId: number | undefined;
    try {
      const entry = await client.library.add(bookId, { status: UserBookStatus.Read, editionId, date: "2019-03-15" });
      entryId = entry.id;

      // A read from years ago, finished "sometime in June".
      const logged = await client.reads.add(entryId, {
        startedAt: "2018-06-01",
        finishedAt: "2018-06-30",
        precision: DatePrecision.Month,
      });
      expect(logged.finishedAt).toBe("2018-06-30");
      expect(logged.finishedAtPrecision).toBe(DatePrecision.Month);

      // Only what's set changes.
      const fixed = await client.reads.update(logged.id, { startedAt: "2018-06-03" });
      expect(fixed.startedAt).toBe("2018-06-03");
      expect(fixed.finishedAt).toBe("2018-06-30");

      const { items: in2018 } = await client.reads.finished({ from: "2018-01-01", to: "2018-12-31", limit: 50 });
      const found = in2018.find((read) => read.id === logged.id);
      expect(found?.userBook?.bookId).toBe(bookId);

      await client.reads.delete(logged.id);
      expect((await client.reads.list(entryId)).some((read) => read.id === logged.id)).toBe(false);
    } finally {
      if (entryId !== undefined) await client.library.remove(entryId);
      await journal.cleanup();
    }
  });

  it("markOwned → owned() lists it → unmarkOwned", async () => {
    const { bookId, editionId } = await writeTargetBook(client);
    const journal = await trackJournal(client, bookId);
    const wasOwned = (await client.library.owned({ limit: 100 })).items.some((row) => row.bookId === bookId);

    try {
      const row = await client.library.markOwned(editionId);
      expect(row.bookId).toBe(bookId);
      await client.library.markOwned(editionId); // safe to repeat

      const { items } = await client.library.owned({ limit: 100 });
      expect(items.find((owned) => owned.bookId === bookId)?.edition?.id).toBe(editionId);

      expect(await client.library.unmarkOwned(bookId)).toBe(true);
      expect(await client.library.unmarkOwned(bookId)).toBe(false);
    } finally {
      // Put it back if the account owned it before the test.
      if (wasOwned) await client.library.markOwned(editionId);
      await journal.cleanup();
    }
  });
});
