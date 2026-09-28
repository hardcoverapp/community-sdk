// Proactive pacing: when the last response said the burst allowance is spent,
// wait for the refill before sending, instead of sending and getting a 429.
import { expect, it } from "vitest";
import { HardcoverClient, operations } from "../src/index.ts";
import { MockTransport, type MockResponse } from "../src/testing/index.ts";

const me = (ratelimit?: string): MockResponse => ({
  status: 200,
  headers: ratelimit ? { ratelimit, "ratelimit-policy": '"Admin";q=60;w=60;burst=30, "daily";q=50000;w=86400' } : ({} as Record<string, string>),
  body: { data: { me: [] } },
});

function setup(responses: MockResponse[], clock: { now: number }) {
  const slept: number[] = [];
  const transport = new MockTransport(responses);
  const client = new HardcoverClient({
    token: "hc_pat_test",
    transport,
    now: () => new Date(clock.now),
    sleep: async (ms) => {
      slept.push(ms);
      clock.now += ms;
    },
  });
  return { client, transport, slept };
}

it("waits out a spent burst before the next request", async () => {
  const clock = { now: 1_000_000 };
  const { client, transport, slept } = setup([me('"Admin";r=0;t=3, "daily";r=900;t=80000'), me()], clock);

  await client.request(operations.Me);
  await client.request(operations.Me);

  expect(slept).toEqual([3_000]);
  expect(transport.requests).toHaveLength(2);
});

it("only waits for the part of the reset that hasn't already passed", async () => {
  const clock = { now: 1_000_000 };
  const { client, slept } = setup([me('"Admin";r=0;t=3, "daily";r=900;t=80000'), me()], clock);

  await client.request(operations.Me);
  clock.now += 2_000; // the app did other work for 2s
  await client.request(operations.Me);

  expect(slept).toEqual([1_000]);
});

it("does not wait while allowance remains", async () => {
  const clock = { now: 1_000_000 };
  const { client, slept } = setup([me('"Admin";r=5;t=1, "daily";r=900;t=80000'), me()], clock);

  await client.request(operations.Me);
  await client.request(operations.Me);

  expect(slept).toEqual([]);
});

it("can be turned off", async () => {
  const clock = { now: 1_000_000 };
  const transport = new MockTransport([me('"Admin";r=0;t=3, "daily";r=900;t=80000'), me()]);
  const slept: number[] = [];
  const client = new HardcoverClient({
    token: "hc_pat_test", transport, pace: false,
    now: () => new Date(clock.now), sleep: async (ms) => void slept.push(ms),
  });

  await client.request(operations.Me);
  await client.request(operations.Me);
  expect(slept).toEqual([]);
});

it("waits when the allowance is below the next request's cost", async () => {
  const clock = { now: 1_000_000 };
  // 1 left, refilling at 60/min = 1/s; a 3-field request needs 2 more.
  const transport = new MockTransport([me('"Admin";r=1;t=1, "daily";r=900;t=80000'), { status: 200, body: { data: {} } }]);
  const slept: number[] = [];
  const client = new HardcoverClient({
    token: "hc_pat_test", transport,
    now: () => new Date(clock.now), sleep: async (ms) => { slept.push(ms); clock.now += ms; },
  });

  await client.request(operations.Me);
  await client.graphql("query { a: me { id } b: me { id } c: me { id } }");
  expect(slept).toEqual([2_000]);
});
