// Every search type through the search resource, with an ordinary query.
// Environments without a search index skip rather than fail.
import { expect, it } from "vitest";
import { ActionError, SearchType } from "../../src/index.ts";
import { describeLive, liveClient, target } from "./setup.ts";

const methods = {
  [SearchType.Author]: "authors",
  [SearchType.Book]: "books",
  [SearchType.Character]: "characters",
  [SearchType.List]: "lists",
  [SearchType.Prompt]: "prompts",
  [SearchType.Publisher]: "publishers",
  [SearchType.Series]: "series",
  [SearchType.User]: "users",
} as const;

describeLive(`search by type (${target})`, () => {
  const client = liveClient();

  it.for(Object.entries(methods))("%s", async ([type, method], { skip }) => {
    try {
      const result = await client.search[method]("the", { perPage: 3 });
      expect(result.hits.length).toBeGreaterThan(0);
      expect(result.found).toBeGreaterThanOrEqual(result.hits.length);
      const hit = result.hits[0]!;
      // Ids come back numeric, matching `ids` and the rest of the API.
      expect(hit.id).toBeTypeOf("number");
      expect(result.ids).toContain(hit.id);
      // Keys are idiomatic: no snake_case survives.
      expect(Object.keys(hit).filter((k) => k.includes("_"))).toEqual([]);
    } catch (error) {
      if (error instanceof ActionError && error.messages.includes("Not found.")) skip(`no ${type} index on this environment`);
      throw error;
    }
  });

  it("finds a book by a scanned ISBN, as typed by a scanner", async () => {
    const { hits } = await client.search.books("978-0-593-13520-4");
    expect(hits[0]?.title).toBe("Project Hail Mary");
  });
});
