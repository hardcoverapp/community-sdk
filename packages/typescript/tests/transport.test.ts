import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchTransport, TransportFailure } from "../src/core/transport.ts";

const request = { url: "https://example.test/v1/graphql", headers: {}, body: "{}" };

// A fetch that never answers, and rejects the way real fetch does on abort.
function hangingFetch() {
  return vi.fn((_url: string, init?: RequestInit) => {
    return new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")));
    });
  });
}

describe("fetchTransport", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("times out without AbortSignal.timeout (React Native / Hermes)", async () => {
    vi.stubGlobal("fetch", hangingFetch());
    vi.spyOn(AbortSignal, "timeout").mockImplementation(() => {
      throw new TypeError("AbortSignal.timeout is not a function");
    });

    const failure = await fetchTransport({ timeoutMs: 10 }).send(request).catch((e: unknown) => e);

    expect(failure).toBeInstanceOf(TransportFailure);
    expect((failure as TransportFailure).kind).toBe("timeout");
  });

  it("reports a network failure as kind network", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.reject(new TypeError("Network request failed"))));

    const failure = await fetchTransport().send(request).catch((e: unknown) => e);

    expect(failure).toBeInstanceOf(TransportFailure);
    expect((failure as TransportFailure).kind).toBe("network");
  });

  it("lowercases response header names", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("{}", { status: 200, headers: { "RateLimit-Policy": '"Free";q=60;w=60' } })),
    );

    const response = await fetchTransport().send(request);

    expect(response.headers["ratelimit-policy"]).toBe('"Free";q=60;w=60');
  });
});
