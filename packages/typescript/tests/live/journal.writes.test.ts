// A real user's journal: a note and a quote about a book, an edit, a removal.
// Runs only under `pnpm test:live:writes`; cleans up. clearForBook deletes
// every entry for a book (real ones too), so it only runs against local.
import { expect, it } from "vitest";
import { JournalEvent, PrivacySetting } from "../../src/index.ts";
import { describeLiveWrites, isLocalTarget, liveClient, target, trackJournal, writeTargetBook } from "./setup.ts";

describeLiveWrites(`journal (${target})`, () => {
  const client = liveClient();

  it("note → quote with tag and date → edit → remove", async () => {
    const { bookId } = await writeTargetBook(client);
    const journal = await trackJournal(client, bookId);
    try {
      const me = await client.me.get();
      const note = await client.journal.add(bookId, { entry: "The Rocky chapters are the best part." });
      expect(note).toMatchObject({ event: JournalEvent.Note, bookId, privacySettingId: me.accountPrivacySettingId });

      const quote = await client.journal.add(bookId, {
        event: JournalEvent.Quote,
        entry: "Fist my bump.",
        privacy: PrivacySetting.Private,
        date: "2026-09-24",
        tags: [{ tag: "Rocky", category: "Tag", spoiler: false }],
      });
      expect(quote).toMatchObject({ event: JournalEvent.Quote, privacySettingId: PrivacySetting.Private });
      expect(quote.actionAt.startsWith("2026-09-24")).toBe(true);

      const edited = await client.journal.update(note.id, { entry: "Rocky is the best part." });
      expect(edited.entry).toBe("Rocky is the best part.");

      await client.journal.delete(note.id);
      const { items } = await client.journal.forBook(bookId, { limit: 50 });
      expect(items.map((j) => j.id)).not.toContain(note.id);
      expect(items.map((j) => j.id)).toContain(quote.id);

      if (isLocalTarget) {
        const cleared = await client.journal.clearForBook(bookId);
        expect(cleared).toContain(quote.id);
        expect((await client.journal.forBook(bookId)).items).toEqual([]);
      }
    } finally {
      await journal.cleanup();
    }
  });
});
