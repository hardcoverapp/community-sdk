// Public test helpers. SDK users can drive a real HardcoverClient with canned
// responses: `new HardcoverClient({ token: "test", transport: new MockTransport([...]) })`.
import { TransportFailure, type HttpRequest, type HttpResponse, type Transport } from "../core/transport.ts";

export type MockResponse =
  | { status: number; headers?: Record<string, string>; body: unknown }
  | { network: "reset" | "timeout" | (string & {}) };

export class MockTransport implements Transport {
  /** Every request the client sent, in order. */
  readonly requests: HttpRequest[] = [];
  readonly #queue: MockResponse[];

  constructor(responses: MockResponse[]) {
    this.#queue = [...responses];
  }

  async send(request: HttpRequest): Promise<HttpResponse> {
    this.requests.push(request);
    const next = this.#queue.shift();
    if (!next) {
      const { operationName } = JSON.parse(request.body) as { operationName?: string };
      throw new Error(`MockTransport: no response queued for request #${this.requests.length} (${operationName ?? "anonymous"})`);
    }

    if ("network" in next) {
      throw new TransportFailure(next.network === "timeout" ? "timeout" : "network", `mock ${next.network}`);
    }

    const headers: Record<string, string> = {};
    for (const [key, value] of Object.entries(next.headers ?? {})) headers[key.toLowerCase()] = value;
    const body = typeof next.body === "string" ? next.body : JSON.stringify(next.body);
    return { status: next.status, headers, body };
  }
}
