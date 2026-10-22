// Token checks at construction (spec/03 principle 7): fix what the SDK can
// fix, refuse clearly only when it genuinely can't proceed. The server stays
// the authority on whether a token is valid.
//
// The cleanup and prefix rules are pinned in shared/conformance/vectors.json
// (token). These check the client wiring: the cleaned token is what's sent,
// a warning goes to onWarning once, and a refusal is a TypeError before any request.
import { describe, expect, it } from "vitest";
import { HardcoverClient, operations } from "../src/index.ts";
import { MockTransport } from "../src/testing/index.ts";

const ME_OK = { status: 200, body: { data: { me: [] } } };

describe("the client's token", () => {
  it("sends the cleaned token", async () => {
    const transport = new MockTransport([ME_OK]);
    const client = new HardcoverClient({ token: "  Bearer hc_pat_abc123\n", transport });
    await client.request(operations.Me);

    expect(transport.requests[0]!.headers.authorization).toBe("Bearer hc_pat_abc123");
  });

  it("allows a legacy JWT, warning once that it's deprecated", async () => {
    const warnings: string[] = [];
    const transport = new MockTransport([ME_OK, ME_OK]);
    const client = new HardcoverClient({ token: "eyJhbGciOiJIUzI1NiJ9.e30.x", transport, onWarning: (m) => warnings.push(m) });
    await client.request(operations.Me);
    await client.request(operations.Me);

    expect(transport.requests[0]!.headers.authorization).toBe("Bearer eyJhbGciOiJIUzI1NiJ9.e30.x");
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toMatch(/legacy JWT.*deprecated.*personal access token/i);
  });

  it("refuses a missing token with a TypeError before any request", () => {
    const transport = new MockTransport([]);

    expect(() => new HardcoverClient({ token: undefined as unknown as string, transport })).toThrow(TypeError);
    expect(transport.requests).toHaveLength(0);
  });

  it("refuses a refresh token with a TypeError before any request", () => {
    const transport = new MockTransport([]);

    expect(() => new HardcoverClient({ token: "hc_rt_abc", transport })).toThrow(TypeError);
    expect(transport.requests).toHaveLength(0);
  });
});
