// Request planner (spec/03). The language-neutral behavior lives in
// shared/conformance/client.json (batching/*), run by client-conformance.test.ts.
// What's left here depends on how this SDK schedules work.
import { expect, it } from "vitest";
import { HardcoverClient, operations } from "../src/index.ts";
import { MockTransport } from "../src/testing/index.ts";

it("sends a raw graphql() query ahead of reads waiting to be grouped", async () => {
  // Grouped reads wait one macrotask to collect company; the raw query
  // doesn't wait. The shared case only checks that it isn't grouped.
  const transport = new MockTransport([
    { status: 200, body: { data: { me: [] } } },
    { status: 200, body: { data: { me: [{ id: 42 }] } } },
  ]);
  const client = new HardcoverClient({ token: "hc_pat_test", transport, batch: true, sleep: async () => {} });

  await Promise.all([client.graphql("query Raw { me { id } }"), client.request(operations.Me)]);

  const names = transport.requests.map((r) => (JSON.parse(r.body) as { operationName?: string }).operationName);
  expect(names).toEqual(["Raw", "Me"]);
});
