import { expect, it } from "vitest";
import { HardcoverClient, operations, type Transport } from "../src/index.ts";

it("surfaces a transport bug immediately instead of retrying it as a network failure", async () => {
  let calls = 0;
  const slept: number[] = [];
  const broken: Transport = {
    async send() {
      calls++;
      throw new Error("mock queue exhausted");
    },
  };
  const client = new HardcoverClient({ token: "hc_pat_test", transport: broken, sleep: async (ms) => void slept.push(ms) });

  await expect(client.request(operations.Me)).rejects.toThrow("mock queue exhausted");
  expect(calls).toBe(1);
  expect(slept).toEqual([]);
});
