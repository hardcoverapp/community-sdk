// vibes: book-recommendation lists. The server owns the rules (Supporter-only
// creation, custom-only metadata and delete) and the recommendations; the SDK
// maps idiomatic signals onto the API's nested attributes and is honest about
// results that haven't been generated yet.
import { describe, expect, it } from "vitest";
import { ActionError, NotFoundError, PrivacySetting, VibeGenre, VibeSignalType } from "../../src/index.ts";
import { me, ok, setup } from "../helpers.ts";

const vibe = (over: Record<string, unknown> = {}) => ({
  id: 9, slug: "cozy", title: "Cozy mysteries", description: null, vibeType: 0, resultType: 0, privacySettingId: 3,
  featured: false, likesCount: 0, userId: 42, createdAt: "2026-10-07T00:00:00", updatedAt: "2026-10-07T00:00:00",
  booksGeneratedAt: null, ...over,
});
const envelope = (root: string, value: unknown) => ok({ [root]: { id: 9, errors: [], vibe: value } });

describe("vibes reads", () => {
  it("mine pages the signed-in user's vibes", async () => {
    const { client, sent } = setup(me(), ok({ vibes: [vibe()] }));
    const page = await client.vibes.mine({ limit: 10 });
    expect(page).toMatchObject({ items: [{ id: 9 }], limit: 10, offset: 0, hasMore: false });
    expect(sent()[1]).toMatchObject({ operationName: "GetVibesForUser", variables: { userId: 42, limit: 10, offset: 0 } });
  });

  it("get returns the vibe or null", async () => {
    const { client } = setup(ok({ vibes_by_pk: vibe() }), ok({ vibes_by_pk: null }));
    expect(await client.vibes.get(9)).toMatchObject({ title: "Cozy mysteries" });
    expect(await client.vibes.get(10)).toBeNull();
  });
});

describe("vibes.books", () => {
  const ids = (cachedBookIds: unknown, over: Record<string, unknown> = {}) =>
    ok({ vibes_by_pk: { id: 9, updatedAt: "2026-10-07T00:00:00", booksGeneratedAt: "2026-10-07T01:00:00", cachedBookIds, ...over } });

  it("returns the cached results as books, in ranked order, a page at a time", async () => {
    const { client, sent } = setup(ids([30, 10, 20, 40]), ok({ books: [{ id: 10 }, { id: 20 }, { id: 30 }] }));
    const page = await client.vibes.books(9, { limit: 3 });

    expect(page.items.map((b) => b.id)).toEqual([30, 10, 20]);
    expect(page).toMatchObject({ limit: 3, offset: 0, hasMore: true, resultsPending: false, generatedAt: "2026-10-07T01:00:00" });
    expect(sent()[1]).toMatchObject({ operationName: "GetBooks", variables: { ids: [30, 10, 20] } });
  });

  it("says results are pending when the site hasn't generated them, instead of an unexplained empty list", async () => {
    const { client, sent } = setup(ids([], { booksGeneratedAt: null }));
    const page = await client.vibes.books(9);
    expect(page).toMatchObject({ items: [], hasMore: false, resultsPending: true, generatedAt: null });
    expect(sent()).toHaveLength(1);
  });

  it("marks results pending when the vibe changed after they were generated", async () => {
    const { client } = setup(ids([10], { updatedAt: "2026-10-07T02:00:00", booksGeneratedAt: "2026-10-07T01:00:00" }), ok({ books: [{ id: 10 }] }));
    const page = await client.vibes.books(9);
    expect(page.resultsPending).toBe(true);
    expect(page.items).toHaveLength(1);
  });

  it("is a NotFoundError for a vibe that doesn't exist", async () => {
    const { client } = setup(ok({ vibes_by_pk: null }));
    await expect(client.vibes.books(9)).rejects.toThrow(NotFoundError);
  });
});

describe("vibes writes", () => {
  it("create maps idiomatic signals and exclusions onto the API's nested attributes", async () => {
    const { client, sent } = setup(envelope("insert_vibe", vibe()));
    await client.vibes.create({
      title: "Cozy mysteries",
      privacy: PrivacySetting.Private,
      signals: [
        { type: VibeSignalType.Genre, value: VibeGenre.Mystery, weight: 4 },
        { type: VibeSignalType.Book, id: 427578, weight: 2 },
        { type: VibeSignalType.Semantic, text: "small towns, tea, no gore", weight: 3 },
        { type: VibeSignalType.Popularity, weight: -2 },
      ],
      exclusions: [{ type: "author", id: 123 }],
      dynamicSignals: [{ category: "recent_rated_books", count: 5, minRating: 4.5, weight: 3 }],
    });

    expect(sent()[0]).toMatchObject({ operationName: "CreateVibe" });
    expect(sent()[0]!.variables).toEqual({
      object: {
        title: "Cozy mysteries",
        privacy_setting_id: 3,
        vibe_signals_attributes: [
          { signal_type: "genre", value: "mystery", weight: 4 },
          { signal_type: "book", value: "427578", weight: 2 },
          { signal_type: "semantic", value: "small towns, tea, no gore", weight: 3 },
          { signal_type: "popularity", weight: -2 },
        ],
        vibe_exclusions_attributes: [{ excluded_type: "Author", excluded_id: 123 }],
        dynamic_signals: [{ category: "recent_rated_books", count: 5, min_rating: 4.5, weight: 3 }],
      },
    });
  });

  it("accepts taxonomy values the SDK doesn't know yet (the server decides)", async () => {
    const { client, sent } = setup(envelope("insert_vibe", vibe()));
    await client.vibes.create({ title: "New", signals: [{ type: VibeSignalType.Genre, value: "solarpunk", weight: 1 }] });
    expect((sent()[0]!.variables.object as { vibe_signals_attributes: { value: string }[] }).vibe_signals_attributes[0]!.value).toBe("solarpunk");
  });

  it("update adds signals and exclusions and sends only what changed", async () => {
    const { client, sent } = setup(envelope("update_vibe", vibe()));
    await client.vibes.update(9, { addExclusions: [{ type: "book", id: 5 }] });
    expect(sent()[0]!.variables).toEqual({ id: 9, object: { vibe_exclusions_attributes: [{ excluded_type: "Book", excluded_id: 5 }] } });
  });

  it("surfaces the server's Supporter rule as an ActionError", async () => {
    const { client } = setup(ok({ insert_vibe: { id: null, errors: ["Creating vibes is a Supporter feature."], vibe: null } }));
    const error = await client.vibes.create({ title: "x" }).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ActionError);
    expect((error as ActionError).messages).toEqual(["Creating vibes is a Supporter feature."]);
  });

  it("delete is a NotFoundError when the server reports no success", async () => {
    const { client } = setup(ok({ delete_vibe: { success: true } }), ok({ delete_vibe: { success: false } }));
    await expect(client.vibes.delete(9)).resolves.toBeUndefined();
    await expect(client.vibes.delete(9)).rejects.toThrow(NotFoundError);
  });
});
