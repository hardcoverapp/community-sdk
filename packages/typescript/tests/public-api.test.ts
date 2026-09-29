// spec/03 principle 6: state users shouldn't write isn't writable, and
// internals aren't exported. Changing any of this is a deliberate API change.
import { expect, it } from "vitest";
import * as sdk from "../src/index.ts";
import { setup } from "./helpers.ts";

it("rateLimit can be read but not written", async () => {
  const { client } = setup({
    status: 200,
    headers: { ratelimit: '"Free";r=9;t=1, "daily";r=4999;t=86000' },
    body: { data: { me: [] } },
  });
  await client.request(sdk.operations.Me);
  expect(client.rateLimit?.burst?.remaining).toBe(9);
  expect(() => {
    (client as unknown as { rateLimit: unknown }).rateLimit = undefined;
  }).toThrow(TypeError);
});

it("the injected clock isn't a public property", () => {
  const { client } = setup();
  expect("now" in client).toBe(false);
});

it("internals aren't exported", () => {
  for (const name of ["operationInfo", "parseRateLimit", "assertRating", "requestCost", "pickDefined", "required", "nonNull"]) {
    expect(sdk, `${name} should not be public`).not.toHaveProperty(name);
  }
});
