// A Supporter making a vibe: create it with signals, read it back, see whether
// its books exist yet, add to it, delete it. Runs only under
// `pnpm test:live:writes`; always deletes the vibe.
import { expect, it } from "vitest";
import { PrivacySetting, VibeAxiom, VibeGenre, VibeSignalType, VibeType } from "../../src/index.ts";
import { describeLiveWrites, liveClient, target } from "./setup.ts";

describeLiveWrites(`vibes (${target})`, () => {
  const client = liveClient();

  it("create → get → books → add → delete", async () => {
    const created = await client.vibes.create({
      title: `sdk-test ${Date.now()}`,
      description: "Cozy, clever, small-town mysteries",
      privacy: PrivacySetting.Private,
      signals: [
        { type: VibeSignalType.Genre, value: VibeGenre.Mystery, weight: 4 },
        { type: VibeSignalType.Axiom, value: VibeAxiom.Realistic, weight: 2 },
        { type: VibeSignalType.Semantic, text: "small towns, tea, no gore", weight: 3 },
        { type: VibeSignalType.Popularity, weight: -1 },
      ],
    });
    try {
      expect(created).toMatchObject({ vibeType: VibeType.Custom, privacySettingId: PrivacySetting.Private });

      const fetched = await client.vibes.get(created.id);
      expect(fetched?.title).toBe(created.title);
      expect((await client.vibes.mine({ limit: 50 })).items.map((v) => v.id)).toContain(created.id);

      // Results come from the site; through the API alone they're pending.
      const books = await client.vibes.books(created.id);
      console.info(`[live] new vibe books: ${books.items.length}, resultsPending: ${books.resultsPending}, generatedAt: ${books.generatedAt}`);
      if (books.resultsPending) expect(books.items).toEqual([]);

      const updated = await client.vibes.update(created.id, {
        description: "Cozy mysteries, no thrillers",
        addSignals: [{ type: VibeSignalType.Genre, value: VibeGenre.Thriller, weight: -3 }],
        addExclusions: [{ type: "book", id: 427578 }],
      });
      expect(updated.description).toBe("Cozy mysteries, no thrillers");
    } finally {
      await client.vibes.delete(created.id);
    }
    expect(await client.vibes.get(created.id)).toBeNull();
  });
});
