// Request planner (spec/03): with `batch: true`, concurrent reads share one
// HTTP request as a JSON array. Mutations are barriers: nothing is grouped,
// reordered or de-duplicated across them. Behavior matches the gateway, probed
// on 2026-10-07: per-item results, cost is the sum of fields, and scope,
// unknown-operation and over-capacity checks reject the whole array.
import { describe, expect, it } from "vitest";
import { GraphQLError, HardcoverClient, operations, RateLimitError } from "../src/index.ts";
import { MockTransport, type MockResponse } from "../src/testing/index.ts";

type Item = { query: string; operationName?: string; variables?: Record<string, unknown> };

const POLICY = '"Free";q=60;w=60;burst=10, "daily";q=5000;w=86400';
const headers = (remaining: number) => ({ "ratelimit-policy": POLICY, ratelimit: `"Free";r=${remaining};t=0, "daily";r=4000;t=80000` });

const vibe = (id: number) => ({ data: { vibes_by_pk: { id } } });
const meData = { data: { me: [{ id: 42 }] } };
const batch = (...items: unknown[]): MockResponse => ({ status: 200, body: items });

function setup(responses: MockResponse[], options: { batch?: boolean } = { batch: true }) {
  const transport = new MockTransport(responses);
  const slept: number[] = [];
  const client = new HardcoverClient({
    token: "hc_pat_test",
    transport,
    sleep: async (ms) => void slept.push(ms),
    random: () => 0,
    now: () => new Date(0),
    ...options,
  });
  const sent = () => transport.requests.map((r) => JSON.parse(r.body) as Item | Item[]);
  const names = () => sent().map((body) => (Array.isArray(body) ? body.map((i) => i.operationName) : body.operationName));
  return { client, sent, names, slept };
}

describe("grouping reads", () => {
  it("sends concurrent reads as one array request and resolves each caller with its own result", async () => {
    const { client, names } = setup([batch(vibe(1), meData, vibe(2))]);

    const [a, me, b] = await Promise.all([
      client.request(operations.GetVibe, { id: 1 }),
      client.request(operations.Me),
      client.request(operations.GetVibe, { id: 2 }),
    ]);

    expect(names()).toEqual([["GetVibe", "Me", "GetVibe"]]);
    expect(a.vibes_by_pk?.id).toBe(1);
    expect(me.me[0]?.id).toBe(42);
    expect(b.vibes_by_pk?.id).toBe(2);
  });

  it("is off by default", async () => {
    const { client, names } = setup([{ status: 200, body: vibe(1) }, { status: 200, body: meData }], {});
    await Promise.all([client.request(operations.GetVibe, { id: 1 }), client.request(operations.Me)]);
    expect(names()).toEqual(["GetVibe", "Me"]);
  });

  it("sends a lone read as a plain request, not an array of one", async () => {
    const { client, sent } = setup([{ status: 200, body: meData }]);
    await client.request(operations.Me);
    expect(Array.isArray(sent()[0])).toBe(false);
  });

  it("de-duplicates identical reads: one item, every caller gets the result", async () => {
    const { client, sent } = setup([batch(vibe(1), meData)]);
    const results = await Promise.all([
      client.request(operations.GetVibe, { id: 1 }),
      client.request(operations.Me),
      client.request(operations.GetVibe, { id: 1 }),
    ]);
    expect(sent()[0]).toHaveLength(2);
    expect(results[0]).toEqual(results[2]);
  });

  it("never batches the raw graphql() escape hatch", async () => {
    const { client, names } = setup([{ status: 200, body: { data: { me: [] } } }, { status: 200, body: meData }]);
    await Promise.all([client.graphql("query Raw { me { id } }"), client.request(operations.Me)]);
    expect(names()).toEqual(["Raw", "Me"]);
  });
});

describe("sizing", () => {
  it("splits reads into requests no larger than the burst capacity", async () => {
    // First response teaches the capacity (10); the next 12 one-field reads fit 10 + 2.
    const { client, sent } = setup([
      { status: 200, headers: headers(10), body: meData },
      { status: 200, headers: headers(10), body: Array.from({ length: 10 }, (_, i) => vibe(i)) },
      { status: 200, headers: headers(8), body: [vibe(10), vibe(11)] },
    ]);
    await client.request(operations.Me);
    await Promise.all(Array.from({ length: 12 }, (_, id) => client.request(operations.GetVibe, { id })));
    expect(sent().slice(1).map((b) => (b as Item[]).length)).toEqual([10, 2]);
  });

  it("sizes to the smallest tier's capacity (5) before any headers arrive", async () => {
    const { client, sent } = setup([batch(...Array.from({ length: 5 }, (_, i) => vibe(i))), batch(vibe(5), vibe(6))]);
    await Promise.all(Array.from({ length: 7 }, (_, id) => client.request(operations.GetVibe, { id })));
    expect(sent().map((b) => (b as Item[]).length)).toEqual([5, 2]);
  });

  it("sizes to the remaining allowance, so part of the work goes out without waiting", async () => {
    const { client, sent, slept } = setup([
      { status: 200, headers: headers(2), body: meData },
      { status: 200, headers: headers(0), body: [vibe(1), vibe(2)] },
      { status: 200, headers: headers(0), body: vibe(3) },
    ]);
    await client.request(operations.Me);
    await Promise.all([1, 2, 3].map((id) => client.request(operations.GetVibe, { id })));
    expect(sent().slice(1).map((b) => (Array.isArray(b) ? b.length : 1))).toEqual([2, 1]);
    expect(slept).toEqual([1_000]); // one unit refills at 60/min
  });
});

describe("mutation barriers", () => {
  it("keeps issue order: reads before a mutation, the mutation alone, then reads after it", async () => {
    const { client, names } = setup([
      batch(vibe(1), meData),
      { status: 200, body: { data: { delete_vibe: { success: true } } } },
      batch(vibe(1), meData),
    ]);
    await Promise.all([
      client.request(operations.GetVibe, { id: 1 }),
      client.request(operations.Me),
      client.request(operations.DeleteVibe, { id: 1 }),
      client.request(operations.GetVibe, { id: 1 }),
      client.request(operations.Me),
    ]);
    expect(names()).toEqual([["GetVibe", "Me"], "DeleteVibe", ["GetVibe", "Me"]]);
  });

  it("doesn't de-duplicate a read across a mutation: the second read sees the write", async () => {
    const { client, names } = setup([
      { status: 200, body: vibe(1) },
      { status: 200, body: { data: { delete_vibe: { success: true } } } },
      { status: 200, body: { data: { vibes_by_pk: null } } },
    ]);
    const [before, , after] = await Promise.all([
      client.request(operations.GetVibe, { id: 1 }),
      client.request(operations.DeleteVibe, { id: 1 }),
      client.request(operations.GetVibe, { id: 1 }),
    ]);
    expect(names()).toEqual(["GetVibe", "DeleteVibe", "GetVibe"]);
    expect(before.vibes_by_pk?.id).toBe(1);
    expect(after.vibes_by_pk).toBeNull();
  });

  it("runs the mutation even when a read before it failed", async () => {
    const { client, names } = setup([
      { status: 200, body: { errors: [{ message: "boom" }] } },
      { status: 200, body: { data: { delete_vibe: { success: true } } } },
    ]);
    const [read, write] = await Promise.allSettled([
      client.request(operations.GetVibe, { id: 1 }),
      client.request(operations.DeleteVibe, { id: 1 }),
    ]);
    expect(read.status).toBe("rejected");
    expect(write.status).toBe("fulfilled");
    expect(names()).toEqual(["GetVibe", "DeleteVibe"]);
  });
});

describe("failures", () => {
  it("rejects only the item that failed; the others resolve", async () => {
    const { client } = setup([batch(vibe(1), { errors: [{ message: "invalid input syntax" }] }, meData)]);
    const [a, b, c] = await Promise.allSettled([
      client.request(operations.GetVibe, { id: 1 }),
      client.request(operations.GetVibe, { id: 2 }),
      client.request(operations.Me),
    ]);
    expect(a.status).toBe("fulfilled");
    expect(b.status === "rejected" && b.reason).toBeInstanceOf(GraphQLError);
    expect((b as PromiseRejectedResult).reason.operationName).toBe("GetVibe");
    expect(c.status).toBe("fulfilled");
  });

  it("retries the whole array after a burst 429", async () => {
    const { client, sent } = setup([
      { status: 429, headers: { ...headers(0), "retry-after": "2" }, body: { error: "Too Many Requests" } },
      batch(vibe(1), meData),
    ]);
    await Promise.all([client.request(operations.GetVibe, { id: 1 }), client.request(operations.Me)]);
    expect(sent()).toHaveLength(2);
    expect(sent()[1]).toHaveLength(2);
  });

  it("retries the whole array of reads after a network failure", async () => {
    const { client, sent } = setup([{ network: "reset" }, batch(vibe(1), meData)]);
    await Promise.all([client.request(operations.GetVibe, { id: 1 }), client.request(operations.Me)]);
    expect(sent()).toHaveLength(2);
  });

  it("sends items alone when the gateway rejects the whole array, so each gets its own answer", async () => {
    // A missing scope on one item 403s the array; alone, the others succeed.
    const { client, names } = setup([
      { status: 403, body: { error: "insufficient_scope", error_description: "Missing scopes: lists:read", scope: "lists:read" } },
      { status: 200, body: vibe(1) },
      { status: 403, body: { error: "insufficient_scope", error_description: "Missing scopes: lists:read", scope: "lists:read" } },
    ]);
    const [a, b] = await Promise.allSettled([
      client.request(operations.GetVibe, { id: 1 }),
      client.request(operations.Me),
    ]);
    expect(names()).toEqual([["GetVibe", "Me"], "GetVibe", "Me"]);
    expect(a.status).toBe("fulfilled");
    expect(b.status).toBe("rejected");
  });

  it("rejects every item with a daily-cap 429 (it can't be waited out)", async () => {
    const { client } = setup([
      {
        status: 429,
        headers: { "ratelimit-policy": POLICY, ratelimit: '"daily";r=0;t=5000', "retry-after": "5000" },
        body: { error: "Too Many Requests" },
      },
    ]);
    const results = await Promise.allSettled([client.request(operations.GetVibe, { id: 1 }), client.request(operations.Me)]);
    for (const r of results) expect(r.status === "rejected" && r.reason).toBeInstanceOf(RateLimitError);
  });

  it("rejects every item when the response isn't an array of matching length", async () => {
    const { client } = setup([batch(vibe(1))]);
    const results = await Promise.allSettled([client.request(operations.GetVibe, { id: 1 }), client.request(operations.Me)]);
    expect(results.map((r) => r.status)).toEqual(["rejected", "rejected"]);
  });
});
