// me: the token's user, fetched once per client and shared by resources.
import { describe, expect, it } from "vitest";
import { me, setup } from "../helpers.ts";

const ME = me();

describe("me", () => {
  it("fetches once and caches, including concurrent callers", async () => {
    const { client, sent } = setup(ME);
    const [a, b] = await Promise.all([client.me.get(), client.me.get()]);
    const c = await client.me.get();
    expect(a.username).toBe("reader");
    expect(b).toBe(a);
    expect(c).toBe(a);
    expect(sent()).toHaveLength(1);
  });

  it("refetches on request", async () => {
    const { client, sent } = setup(ME, ME);
    await client.me.get();
    await client.me.get({ refresh: true });
    expect(sent()).toHaveLength(2);
  });
});
