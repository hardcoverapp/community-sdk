// Every search type a user can pick, with an ordinary query. Environments
// without a search index skip rather than fail (see queries.test.ts).
import { expect, it } from "vitest";
import enums from "../../../../shared/enums.json" with { type: "json" };
import { ActionError, operations } from "../../src/index.ts";
import { describeLive, liveClient, target } from "./setup.ts";

describeLive(`search by type (${target})`, () => {
  const client = liveClient();

  it.for(enums.SearchType.values.map((v) => v.id))("%s", async (queryType, { skip }) => {
    try {
      const { search } = await client.request(operations.Search, { query: "the", queryType, perPage: 3 });
      expect(search?.error ?? null).toBeNull();
      expect(search?.ids?.length).toBeGreaterThan(0);
      expect(search?.queryType?.toLowerCase()).toBe(queryType);
    } catch (error) {
      if (error instanceof ActionError && error.messages.includes("Not found.")) skip(`no ${queryType} index on this environment`);
      throw error;
    }
  });
});
