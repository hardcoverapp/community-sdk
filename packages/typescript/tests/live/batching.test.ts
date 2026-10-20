// The request planner against a real gateway: concurrent reads share one
// array request and each caller gets the same answer an unbatched call gets.
import { expect, it } from "vitest";
import { fetchTransport, GraphQLError, HardcoverClient, type Environment } from "../../src/index.ts";
import { describeLive, liveClient, target, waitForAllowance } from "./setup.ts";

describeLive(`batching (${target})`, () => {
  const plain = liveClient();
  let requests = 0;
  const transport = fetchTransport();
  const batched = new HardcoverClient({
    token: process.env.HARDCOVER_API_KEY!,
    environment: (process.env.HARDCOVER_ENV ?? "staging") as Environment,
    endpoint: process.env.HARDCOVER_API_URL,
    userAgent: "hardcover-sdk-live-tests",
    batch: true,
    transport: { send: (request) => (requests++, transport.send(request)) },
  });

  it("sends concurrent reads as one request with the same results as one at a time", async () => {
    const slug = await plain.books.getBySlug("project-hail-mary");
    const me = await plain.me.get();
    const book = await plain.books.get(427578);

    // The batched client starts without rate-limit headers but shares the
    // user's allowance, which the suite may have spent. A 429 retry would
    // count as a second request.
    await waitForAllowance(3);
    requests = 0;
    const [batchedSlug, batchedMe, batchedBook] = await Promise.all([
      batched.books.getBySlug("project-hail-mary"),
      batched.me.get(),
      batched.books.get(427578),
    ]);

    expect(requests).toBe(1);
    expect(batchedSlug?.id).toBe(slug?.id);
    expect(batchedMe.id).toBe(me.id);
    expect(batchedBook?.title).toBe(book?.title);
  });

  it("de-duplicates identical reads and isolates a failed item", async () => {
    // A bad variable fails only its own item (a read-only error contract check).
    const invalid = "query BadVariable($id: Int!) { books_by_pk(id: $id) { id } }";
    const request = batched.request.bind(batched) as (document: string, variables: unknown) => Promise<unknown>;

    // The previous test's batched request was the last spend, so its headers are the freshest.
    await waitForAllowance(3, batched);
    requests = 0;
    const [a, b, bad] = await Promise.allSettled([
      batched.books.get(427578),
      batched.books.get(427578),
      request(invalid, { id: "not-a-number" }),
    ]);
    expect(requests).toBe(1);
    expect(a.status === "fulfilled" && b.status === "fulfilled" && a.value?.id === b.value?.id).toBe(true);
    expect(bad.status === "rejected" && bad.reason).toBeInstanceOf(GraphQLError);
  });
});
