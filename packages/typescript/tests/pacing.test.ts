// Proactive pacing. The language-neutral behavior lives in
// shared/conformance/client.json (pacing/*), run by client-conformance.test.ts.
// What's left here is about this SDK's callbacks.
import { expect, it } from "vitest";
import { HardcoverClient, operations } from "../src/index.ts";
import { MockTransport, type MockResponse } from "../src/testing/index.ts";

const POLICY = '"Admin";q=60;w=60;burst=30, "daily";q=50000;w=86400';

const me = (ratelimit: string): MockResponse => ({
  status: 200,
  headers: { ratelimit, "ratelimit-policy": POLICY },
  body: { data: { me: [] } },
});

it("gives the reservation back when the onRateLimit hook throws", async () => {
  const spare = '"Admin";r=1;t=1, "daily";r=900;t=80000';
  const transport = new MockTransport([me(spare), me(spare)]);
  const slept: number[] = [];
  let hookThrows = true;

  const client = new HardcoverClient({
    token: "hc_pat_test",
    transport,
    now: () => new Date(1_000_000),
    sleep: async (ms) => void slept.push(ms),
    onRateLimit: () => {
      if (!hookThrows) return;
      hookThrows = false;
      throw new Error("hook failed");
    },
  });

  await expect(client.request(operations.Me)).rejects.toThrow("hook failed");

  // One unit left and nothing in flight: the next request goes straight out.
  await client.request(operations.Me);
  expect(slept).toEqual([]);
});
