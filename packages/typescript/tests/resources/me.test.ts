// me: the token's user, fetched once per client and shared by resources.
// Request counts and refresh are shared cases (shared/conformance/resources/me.json);
// this checks the TypeScript detail that every caller gets the same object.
import { expect, it } from "vitest";
import { me, setup } from "../helpers.ts";

it("concurrent and later callers share one cached object", async () => {
  const { client, sent } = setup(me());

  const [a, b] = await Promise.all([client.me.get(), client.me.get()]);
  const c = await client.me.get();

  expect(b).toBe(a);
  expect(c).toBe(a);
  expect(sent()).toHaveLength(1);
});
