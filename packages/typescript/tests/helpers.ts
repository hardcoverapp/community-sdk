// Shared helpers for mock-based tests: a client driven by canned responses,
// with the requests it sent available for assertions.
import { HardcoverClient, type HardcoverClientOptions } from "../src/index.ts";
import { MockTransport, type MockResponse } from "../src/testing/index.ts";

export interface SentRequest {
  query: string;
  operationName: string;
  variables: Record<string, unknown>;
}

/** A client answering with `responses`, in order. */
export const setup = (...responses: MockResponse[]) => setupWith({}, ...responses);

/** Like setup, with client options (e.g. an injected clock). */
export function setupWith(options: Partial<HardcoverClientOptions>, ...responses: MockResponse[]) {
  const transport = new MockTransport(responses);
  const client = new HardcoverClient({ token: "hc_pat_test", transport, sleep: async () => {}, ...options });
  const sent = (): SentRequest[] => transport.requests.map((r) => JSON.parse(r.body) as SentRequest);
  return { client, transport, sent };
}

/** A 200 response with `data`. */
export const ok = (data: unknown): MockResponse => ({ status: 200, body: { data } });

/** An action result with an `errors: []` envelope, e.g. envelope("update_goal", "goal", goal). */
export const envelope = (root: string, key: string, value: unknown): MockResponse =>
  ok({ [root]: { id: (value as { id?: unknown } | null)?.id ?? null, errors: [], [key]: value } });

/** The `Me` response. Fields can be overridden per test. */
export const me = (overrides: Record<string, unknown> = {}): MockResponse =>
  ok({ me: [{ id: 42, username: "reader", accountPrivacySettingId: 2, activityPrivacySettingsId: 3, ...overrides }] });
