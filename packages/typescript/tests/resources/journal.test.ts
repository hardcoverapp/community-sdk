// journal: everything the API allows. Apps usually write notes and quotes;
// the server journals status, progress, ratings and reviews itself, which the
// JournalEvent doc comments point out. No SDK-side restrictions.
import { describe, expect, it } from "vitest";
import { ActionError, JournalEvent, PrivacySetting } from "../../src/index.ts";
import { me, ok, setup } from "../helpers.ts";

const ME = me();
const created = (entry: Record<string, unknown>) => ok({ insert_reading_journal: { id: entry.id, errors: null, readingJournal: entry } });


describe("journal.add", () => {
  it("defaults to a note, no tags, and the reader's activity privacy (not the account's)", async () => {
    const { client, sent } = setup(ME, created({ id: 5, event: "note", entry: "Rocky!" }));
    const entry = await client.journal.add(100, { entry: "Rocky!" });

    expect(entry).toMatchObject({ id: 5, event: "note" });
    expect(sent().map((r) => r.operationName)).toEqual(["Me", "AddJournalEntry"]);
    expect(sent()[1]!.variables).toEqual({
      object: { book_id: 100, event: "note", entry: "Rocky!", privacy_setting_id: 3, tags: [] },
    });
  });

  it("maps every option, and skips the user lookup when privacy is given", async () => {
    const { client, sent } = setup(created({ id: 6 }));
    await client.journal.add(100, {
      event: JournalEvent.Quote,
      entry: "Fist my bump.",
      privacy: PrivacySetting.Private,
      editionId: 5,
      date: "2026-09-24",
      tags: [{ tag: "Rocky", category: "Tag", spoiler: false }],
      metadata: { page: 212 },
    });

    expect(sent()).toHaveLength(1);
    expect(sent()[0]!.variables).toEqual({
      object: {
        book_id: 100, event: "quote", entry: "Fist my bump.", privacy_setting_id: 3, edition_id: 5,
        action_at: "2026-09-24", tags: [{ tag: "Rocky", category: "Tag", spoiler: false }], metadata: { page: 212 },
      },
    });
  });

  it("allows any event the API accepts", async () => {
    const { client, sent } = setup(created({ id: 7 }));
    await client.journal.add(100, { event: JournalEvent.ProgressUpdated, privacy: PrivacySetting.Public });
    expect((sent()[0]!.variables.object as { event: string }).event).toBe("progress_updated");
  });

  it("surfaces validation errors from the envelope", async () => {
    const { client } = setup(ok({ insert_reading_journal: { id: null, errors: ["Book must exist"], readingJournal: null } }));
    await expect(client.journal.add(-1, { privacy: PrivacySetting.Public })).rejects.toThrow(ActionError);
  });
});

describe("journal reads and changes", () => {
  it("forBook pages the signed-in user's entries for a book", async () => {
    const { client, sent } = setup(ME, ok({ reading_journals: [{ id: 1 }, { id: 2 }] }));
    const page = await client.journal.forBook(100, { limit: 2 });
    expect(page).toEqual({ items: [{ id: 1 }, { id: 2 }], limit: 2, offset: 0, hasMore: true });
    expect(sent()[1]).toMatchObject({ operationName: "GetJournalForBook", variables: { userId: 42, bookId: 100, limit: 2, offset: 0 } });
  });

  it("update sends only the fields in the patch", async () => {
    const { client, sent } = setup(ok({ update_reading_journal: { id: 5, errors: [], readingJournal: { id: 5, entry: "Edited" } } }));
    const entry = await client.journal.update(5, { entry: "Edited" });
    expect(entry.entry).toBe("Edited");
    expect(sent()[0]!.variables).toEqual({ id: 5, object: { entry: "Edited" } });
  });

  it("delete removes one entry", async () => {
    const { client, sent } = setup(ok({ delete_reading_journal: { id: 5 } }));
    await expect(client.journal.delete(5)).resolves.toBeUndefined();
    expect(sent()[0]).toMatchObject({ operationName: "DeleteJournalEntry", variables: { id: 5 } });
  });

  it("clearForBook removes all of a book's entries and returns their ids", async () => {
    const { client, sent } = setup(ok({ delete_reading_journals_for_book: { ids: [1, 2, 3] } }));
    expect(await client.journal.clearForBook(100)).toEqual([1, 2, 3]);
    expect(sent()[0]).toMatchObject({ operationName: "ClearJournalForBook", variables: { bookId: 100 } });
  });
});
