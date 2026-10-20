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

// Concurrency (spec/06 #29). Requests sent at the same moment share one
// allowance, so each one reserves its cost before it goes out.

/** A transport that holds every request until the test answers it. */
function heldTransport() {
  const held: { body: string; answer: (response: MockResponse) => void }[] = [];
  const transport = {
    send: (request: { body: string }) =>
      new Promise<{ status: number; headers: Record<string, string>; body: string }>((resolve) => {
        held.push({
          body: request.body,
          answer: (response) => {
            const r = response as { status: number; headers?: Record<string, string>; body: unknown };
            resolve({ status: r.status, headers: r.headers ?? {}, body: JSON.stringify(r.body) });
          },
        });
      }),
  };
  return { transport, held };
}

const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

it("sends a cold burst only up to the smallest tier's capacity, then paces from the first headers", async () => {
  const { transport, held } = heldTransport();
  const client = new HardcoverClient({ token: "hc_pat_test", transport, sleep: async () => {} });

  const calls = Array.from({ length: 12 }, () => client.request(operations.Me));
  await tick();

  // No headers yet: 5 out (free tier over a legacy JWT), the rest wait for an answer.
  expect(held).toHaveLength(5);

  // The first answer says there's plenty of room, so the rest go out together.
  held[0]!.answer(me('"Admin";r=29;t=0, "daily";r=900;t=80000'));
  await tick();
  expect(held).toHaveLength(12);

  for (const request of held.slice(1)) request.answer(me('"Admin";r=20;t=0, "daily";r=900;t=80000'));
  await Promise.all(calls);
});

it("queues concurrent requests behind each other when the allowance is short", async () => {
  const responses = [me('"Admin";r=2;t=1, "daily";r=900;t=80000'), ...Array.from({ length: 5 }, () => me())];
  const transport = new MockTransport(responses);

  // The clock stands still: all five decide how long to wait at the same moment.
  const slept: number[] = [];
  const client = new HardcoverClient({
    token: "hc_pat_test",
    transport,
    now: () => new Date(1_000_000),
    sleep: async (ms) => void slept.push(ms),
  });
  await client.request(operations.Me);

  // 2 left, refilling at 1 per second: two go now, the next three wait 1, 2 and 3 seconds.
  await Promise.all(Array.from({ length: 5 }, () => client.request(operations.Me)));
  expect(slept).toEqual([1_000, 2_000, 3_000]);
});

it("doesn't hold anything back when the server sends no rate-limit headers", async () => {
  const { transport, held } = heldTransport();
  const client = new HardcoverClient({ token: "hc_pat_test", transport, sleep: async () => {} });

  const calls = Array.from({ length: 8 }, () => client.request(operations.Me));
  await tick();
  held[0]!.answer(me());
  await tick();
  expect(held).toHaveLength(8);

  for (const request of held.slice(1)) request.answer(me());
  await Promise.all(calls);
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
