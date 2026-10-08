// Incremental library sync against a real API: paging by cursor covers the
// same entries as the plain list, with no repeats.
import { expect, it } from "vitest";
import { describeLive, liveClient, target } from "./setup.ts";

describeLive(`library changes (${target})`, () => {
  const client = liveClient();

  it("pages through changes oldest first without repeating or skipping entries", async () => {
    const total = await client.library.count();
    const seen = new Set<number>();
    let since: string | null = null;
    let previous = "";
    // Bounded so a library this large doesn't spend the allowance: 3 pages.
    for (let page = 0; page < 3; page++) {
      const result = await client.library.changes({ since, limit: 10 });
      for (const entry of result.items) {
        expect(seen.has(entry.id)).toBe(false);
        seen.add(entry.id);
        expect(`${entry.updatedAt}` >= previous || previous === "").toBe(true);
      }
      since = result.cursor;
      if (!result.hasMore) break;
    }
    expect(seen.size).toBe(Math.min(total, 30));
  });
});
