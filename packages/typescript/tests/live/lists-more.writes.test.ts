// A real user ranking a list and sharing it: add books, reorder them, follow
// the list, check members and invites. Inviting needs a second account and the
// list_members feature flag, so it runs only with HARDCOVER_TEST_INVITEE_ID.
// Runs only under `pnpm test:live:writes`; cleans up.
import { expect, it } from "vitest";
import { PrivacySetting } from "../../src/index.ts";
import { describeLiveWrites, liveClient, popularBookIds, target, trackJournal } from "./setup.ts";

describeLiveWrites(`lists: reorder, follow, members (${target})`, () => {
  const client = liveClient();

  it("add books → reorder → follow → members", async () => {
    const bookIds = (await popularBookIds(client)).slice(0, 3);
    const journals = await Promise.all(bookIds.map((bookId) => trackJournal(client, bookId)));

    const list = await client.lists.create({
      name: `sdk-test-ranked-${Date.now()}`,
      privacy: PrivacySetting.Public,
      ranked: true,
    });

    try {
      for (const bookId of bookIds) await client.lists.addBook(list.id, bookId);

      const before = (await client.lists.get(list.id))!.listBooks;
      const reversed = [...before].sort((a, b) => b.id - a.id).map((row) => row.id);

      await client.lists.reorder(list.id, reversed);

      const after = (await client.lists.get(list.id))!.listBooks;
      const positionOf = new Map(after.map((row) => [row.id, row.position]));
      expect(reversed.map((rowId) => positionOf.get(rowId))).toEqual([0, 1, 2]);

      // A partial order is refused before anything changes.
      await expect(client.lists.reorder(list.id, reversed.slice(0, 2))).rejects.toThrow(RangeError);

      await client.lists.follow(list.id);
      expect((await client.lists.followed({ limit: 50 })).items.some((f) => f.list.id === list.id)).toBe(true);
      expect(await client.lists.unfollow(list.id)).toBe(true);

      expect(await client.lists.members(list.id)).toEqual([]);
      expect(Array.isArray(await client.lists.memberships())).toBe(true);

      const invitee = Number(process.env.HARDCOVER_TEST_INVITEE_ID);
      if (invitee) {
        await client.lists.invite(list.id, invitee);
        expect((await client.lists.members(list.id)).map((m) => m.userId)).toEqual([invitee]);
        expect(await client.lists.removeMember(list.id, invitee)).toBe(true);
      }
    } finally {
      await client.lists.delete(list.id);
      for (const journal of journals) await journal.cleanup();
    }
  });
});
