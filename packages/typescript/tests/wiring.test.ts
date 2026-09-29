// Adding a resource touches client.ts (import, field, constructor) and
// index.ts (export). This catches a resource that was exported but never
// wired onto the client, or wired but never exported.
import { expect, it } from "vitest";
import * as sdk from "../src/index.ts";

it("every exported resource is on the client, and every client resource is exported", () => {
  const client = new sdk.HardcoverClient({ token: "hc_pat_test" });
  const exported = Object.entries(sdk).filter(([name, value]) => name.endsWith("Resource") && typeof value === "function");
  const onClient = Object.values(client).filter((v) => v && typeof v === "object" && v.constructor.name.endsWith("Resource"));

  expect(exported.length).toBeGreaterThan(0);
  for (const [name, Resource] of exported) {
    expect(onClient.some((instance) => instance instanceof (Resource as new (...a: never[]) => unknown)), `${name} is exported but not on the client`).toBe(true);
  }
  for (const instance of onClient) {
    expect(exported.map(([name]) => name), `${instance.constructor.name} is on the client but not exported`).toContain(instance.constructor.name);
  }
});
