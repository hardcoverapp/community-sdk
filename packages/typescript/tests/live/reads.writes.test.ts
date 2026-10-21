// The reading scenario from the design discussion, as a real user would do it:
// add a book and start it, update progress days later, finish it, start a
// re-read the next week, then update progress again. The server manages reads
// and writes the journal; this checks both. Runs only under `pnpm test:live:writes`.
import { expect, it } from "vitest";
import { UserBookStatus } from "../../src/index.ts";
import { describeLiveWrites, liveClient, target, trackJournal, writeTargetBook } from "./setup.ts";

const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000);

describeLiveWrites(`reading progress and re-read (${target})`, () => {
  const client = liveClient();

  it("start → progress → finish → re-read → progress", async () => {
    const { bookId, editionId, pages } = await writeTargetBook(client);
    const journal = await trackJournal(client, bookId);

    let entryId: number | undefined;
    try {
      // Day 1: add it and start reading.
      const entry = await client.library.add(bookId, { status: UserBookStatus.CurrentlyReading, editionId });
      entryId = entry.id;
      const firstRead = await client.reads.current(entryId);
      expect(firstRead, "server should start a read").not.toBeNull();

      // Day 4, logged afterward: progress in pages, backdated.
      const loggedFor = daysAgo(3);
      const partial = Math.floor(pages * 0.3);
      const progressed = await client.reads.setProgress(entryId, { pages: partial, occurredAt: loggedFor });
      expect(progressed.id).toBe(firstRead!.id);
      expect(progressed.progressPages).toBe(partial);

      // Day 8: finish it.
      await client.library.setStatus(entryId, UserBookStatus.Read);
      expect(await client.reads.current(entryId), "finishing should close the read").toBeNull();

      // Next week: read it again. The server starts a second read.
      await client.library.setStatus(entryId, UserBookStatus.CurrentlyReading);
      const reread = await client.reads.current(entryId);
      expect(reread?.id).not.toBe(firstRead!.id);

      // Later that day: progress as a percent lands on the re-read, not the finished read.
      const again = await client.reads.setProgress(entryId, { percent: 15 });
      expect(again.id).toBe(reread!.id);
      expect(again.progressPages).toBe(Math.ceil(0.15 * pages));

      const reads = await client.reads.list(entryId);
      expect(reads).toHaveLength(2);
      expect(reads.find((r) => r.id === firstRead!.id)?.finishedAt).toBeTruthy();

      // The server journaled every step; the SDK wrote none of these itself.
      // Starting and finishing journal as read events; status_* events are only for other status changes.
      const added = await journal.added();
      const count = (event: string) => added.filter((j) => j.event === event).length;
      expect(count("user_book_read_started"), "one start per read").toBe(2);
      expect(count("user_book_read_finished")).toBe(1);
      expect(count("progress_updated")).toBeGreaterThanOrEqual(2);
      // The backdated progress entry carries when the reading happened.
      const backdated = added.find((j) => j.event === "progress_updated" && Math.abs(Date.parse(j.actionAt) - loggedFor.getTime()) < 60_000);
      expect(backdated, "progress_updated entry should be backdated via occurredAt").toBeDefined();
    } finally {
      if (entryId !== undefined) await client.library.remove(entryId);
      await journal.cleanup();
    }
  });
});
