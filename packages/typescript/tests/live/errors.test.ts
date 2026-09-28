// Error-handling contract: real error responses from the gateway become the
// right SDK errors. Uses HARDCOVER_API_KEY_LIMITED (a token with only
// read:catalog). Nothing is written: the gateway rejects before running.
import { beforeAll, expect, it } from "vitest";
import { operations, ScopeError, UserBookStatus } from "../../src/index.ts";
import { describeLimited, limitedClient, target, waitForAllowance } from "./setup.ts";

describeLimited(`error handling with a limited token (${target})`, () => {
  const client = limitedClient();
  // Same user as the main live client, so the same rate-limit allowance.
  beforeAll(() => waitForAllowance(5));

  it("the limited token works for what it's granted", async () => {
    const { books } = await client.graphql<{ books: { id: number }[] }>("query { books(limit: 1) { id } }");
    expect(books).toHaveLength(1);
  });

  it("a missing scope becomes a ScopeError naming it and the operation", async () => {
    const error = await client.request(operations.GetLibrary, { userId: 1 }).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ScopeError);
    expect((error as ScopeError).missingScopes).toEqual([expect.stringMatching(/^read:library/)]);
    expect((error as ScopeError).operationName).toBe("GetLibrary");
    expect((error as ScopeError).status).toBe(403);
  });

  it("several missing scopes are all listed", async () => {
    const error = await client.library
      .update(1, { status: UserBookStatus.Read, date: "2026-09-01", review: { markdown: "Loved it" } })
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ScopeError);
    const { missingScopes } = error as ScopeError;
    expect(missingScopes.length).toBeGreaterThanOrEqual(2);
    expect(missingScopes).toEqual(expect.arrayContaining([expect.stringMatching(/^write:library/), expect.stringMatching(/^write:reviews/)]));
    expect((error as ScopeError).operationName).toBe("UpdateUserBook");
  });
});
