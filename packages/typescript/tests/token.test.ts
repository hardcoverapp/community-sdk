// Token checks at construction (spec/03 principle 7): fix what the SDK can
// fix, refuse clearly only when it genuinely can't proceed. The server stays
// the authority on whether a token is valid.
import { describe, expect, it } from "vitest";
import { HardcoverClient, operations } from "../src/index.ts";
import { MockTransport } from "../src/testing/index.ts";

const ME_OK = { status: 200, body: { data: { me: [] } } };

async function sentAuthorization(token: string, onWarning?: (message: string) => void) {
  const transport = new MockTransport([ME_OK]);
  const client = new HardcoverClient({ token, transport, onWarning });
  await client.request(operations.Me);
  return transport.requests[0]!.headers.authorization;
}

describe("tokens the SDK can fix", () => {
  it("trims whitespace and newlines from a pasted token", async () => {
    expect(await sentAuthorization("  hc_pat_abc123\n")).toBe("Bearer hc_pat_abc123");
  });

  it("drops a pasted Bearer prefix, any case", async () => {
    expect(await sentAuthorization("Bearer hc_pat_abc123")).toBe("Bearer hc_pat_abc123");
    expect(await sentAuthorization("bearer   hc_pat_abc123")).toBe("Bearer hc_pat_abc123");
  });

  it("sends unknown token formats as they are (the server decides)", async () => {
    const warnings: string[] = [];
    expect(await sentAuthorization("hc_newtype_xyz", (m) => warnings.push(m))).toBe("Bearer hc_newtype_xyz");
    expect(warnings).toEqual([]);
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
});

describe("tokens the SDK can't use", () => {
  it.for([
    ["missing", undefined],
    ["empty", ""],
    ["whitespace only", "  \n"],
    ["only a Bearer prefix", "Bearer "],
  ] as const)("%s → a clear TypeError before any request", ([, token]) => {
    expect(() => new HardcoverClient({ token: token as unknown as string, transport: new MockTransport([]) })).toThrow(
      /token is missing/i,
    );
  });

  it("a refresh token, saying what to use instead", () => {
    expect(() => new HardcoverClient({ token: "hc_rt_abc", transport: new MockTransport([]) })).toThrow(
      /refresh token.*access token/i,
    );
  });

  it("an authorization code, saying what to use instead", () => {
    expect(() => new HardcoverClient({ token: "hc_ac_abc", transport: new MockTransport([]) })).toThrow(
      /authorization code.*exchange/i,
    );
  });
});
