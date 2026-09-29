// Live checks that don't belong to any one resource. Every shared query is
// exercised in queries.test.ts; resource flows live in their own files.
import { expect, it } from "vitest";
import { operations } from "../../src/index.ts";
import { describeLive, liveClient, target } from "./setup.ts";

describeLive(`client basics (${target})`, () => {
  const client = liveClient();

  it("exposes rate-limit state from the gateway headers", async () => {
    await client.request(operations.Me);

    expect(client.rateLimit?.daily?.limit).toBeGreaterThan(0);
    expect(client.rateLimit?.daily?.remaining).toBeTypeOf("number");
    expect(client.rateLimit?.burst?.perMinute).toBeGreaterThan(0);
  });
});
