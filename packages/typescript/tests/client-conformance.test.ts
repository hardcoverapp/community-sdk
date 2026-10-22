// Runs the language-neutral client cases in shared/conformance/client.json:
// pacing, batching (the request planner) and retries, over time and with
// calls issued together. See shared/conformance/client.md for the format.
import type { DocumentTypeDecoration } from "../src/core/decoration.ts";
import { describe, expect, it } from "vitest";
import cases from "../../../shared/conformance/client.json" with { type: "json" };
import * as sdk from "../src/index.ts";
import type { HttpRequest, HttpResponse, Transport } from "../src/core/transport.ts";
import { MockTransport, type MockResponse } from "../src/testing/index.ts";

type Call = { op: string; variables?: Record<string, unknown>; query?: string };
type Step = Call | { together: Call[] } | { advanceSeconds: number };
type Result = "ok" | { data: unknown } | { error: string; fields?: Record<string, unknown> };

/** One request as the case names it: an operation name (null when anonymous), or a list of them for an array. */
type SentRequest = string | null | (string | null)[];

type Case = {
  id: string;
  client?: { batch?: boolean; pace?: boolean; maxRetries?: number };
  random?: number;
  transport?: "held";
  steps: Step[];
  responses: MockResponse[];
  expect: {
    requests?: SentRequest[];
    requestsUnordered?: SentRequest[];
    sleptSeconds?: number[];
    inFlight?: number[];
    results?: Result[];
  };
};

type Outcome = { ok: true; data: unknown } | { ok: false; error: unknown };

// ---- Fake clock ----

// Each sleep records its length and returns at once. When it returns, time
// jumps to when that sleep would have ended, never backwards. Sleeps that
// start together therefore overlap, as real timers do: waits of 1, 2 and 3
// seconds started at once end 3 seconds later, not 6.
function fakeClock() {
  let time = 1_000_000;
  const slept: number[] = [];

  return {
    slept,
    now: () => new Date(time),
    advance: (seconds: number) => {
      time += seconds * 1_000;
    },
    sleep: async (ms: number) => {
      const wakeAt = time + ms;
      slept.push(ms / 1_000);

      await Promise.resolve();
      time = Math.max(time, wakeAt);
    },
  };
}

// ---- Held transport: requests wait until the runner answers them ----

class HeldTransport implements Transport {
  readonly requests: HttpRequest[] = [];
  readonly held: ((response: HttpResponse) => void)[] = [];

  send(request: HttpRequest): Promise<HttpResponse> {
    this.requests.push(request);
    return new Promise((resolve) => this.held.push(resolve));
  }
}

// Lets the client do everything it can without a new answer: send, sleep,
// group reads. A few macrotasks covers the planner's one-tick wait.
async function settle(): Promise<void> {
  for (let i = 0; i < 5; i++) await new Promise((resolve) => setTimeout(resolve, 0));
}

function toHttpResponse(response: MockResponse): HttpResponse {
  if ("network" in response) throw new Error("A held case can't serve a network failure");

  const body = typeof response.body === "string" ? response.body : JSON.stringify(response.body);
  return { status: response.status, headers: response.headers ?? {}, body };
}

// ---- Reading what was sent ----

type Body = { operationName?: string };

function sentAs(request: HttpRequest): SentRequest {
  const body = JSON.parse(request.body) as Body | Body[];

  if (Array.isArray(body)) return body.map((item) => item.operationName ?? null);
  return body.operationName ?? null;
}

const sortKey = (request: SentRequest) => JSON.stringify(request);

// ---- Checking each call's outcome ----

function expectResult(outcome: Outcome, result: Result, label: string) {
  if (result === "ok") {
    expect(outcome.ok ? "ok" : outcome.error, label).toBe("ok");
    return;
  }

  if ("data" in result) {
    expect(outcome.ok ? outcome.data : outcome.error, label).toEqual(result.data);
    return;
  }

  expect(outcome.ok, `${label} should fail`).toBe(false);
  const error = (outcome as { error: unknown }).error;

  const ErrorClass = (sdk as unknown as Record<string, new () => Error>)[result.error];
  expect(ErrorClass, `${result.error} is not exported`).toBeTypeOf("function");
  expect(error, label).toBeInstanceOf(ErrorClass);

  for (const [field, value] of Object.entries(result.fields ?? {})) {
    expect((error as Record<string, unknown>)[field], `${label} ${field}`).toEqual(value);
  }
}

// ---- The runner ----

describe("client conformance", () => {
  for (const c of cases as Case[]) {
    it(c.id, async () => {
      const clock = fakeClock();
      const held = c.transport === "held" ? new HeldTransport() : undefined;
      const transport = held ?? new MockTransport(c.responses);

      const client = new sdk.HardcoverClient({
        token: "hc_pat_conformance",
        transport,
        now: clock.now,
        sleep: clock.sleep,
        ...(c.random !== undefined && { random: () => c.random! }),
        ...c.client,
      });

      const send = (call: Call): Promise<unknown> => {
        if (call.op === "raw") return client.graphql(call.query!, call.variables);

        const document = sdk.operations[call.op as keyof typeof sdk.operations];
        return client.request(document as DocumentTypeDecoration<unknown, unknown>, call.variables);
      };

      const outcome = (call: Call): Promise<Outcome> =>
        send(call).then(
          (data) => ({ ok: true as const, data }),
          (error: unknown) => ({ ok: false as const, error }),
        );

      // Steps run in order. Calls in a `together` step are all issued before
      // any of them is awaited.
      const outcomes: Outcome[] = [];
      const runSteps = async () => {
        for (const step of c.steps) {
          if ("advanceSeconds" in step) {
            clock.advance(step.advanceSeconds);
          } else if ("together" in step) {
            outcomes.push(...(await Promise.all(step.together.map(outcome))));
          } else {
            outcomes.push(await outcome(step));
          }
        }
      };

      // A held transport answers one request at a time, oldest first, once
      // the client has settled, and records how many were waiting each time.
      const inFlight: number[] = [];
      if (held) {
        let done = false;
        const running = runSteps().finally(() => (done = true));
        const responses = [...c.responses];

        for (;;) {
          await settle();
          if (held.held.length === 0) break;

          inFlight.push(held.held.length);
          held.held.shift()!(toHttpResponse(responses.shift()!));
        }

        await running;
        expect(done, "calls still waiting with nothing in flight").toBe(true);
      } else {
        await runSteps();
      }

      // What went out.
      const sent = transport.requests.map(sentAs);

      if (c.expect.requests) expect(sent).toEqual(c.expect.requests);

      if (c.expect.requestsUnordered) {
        const sorted = (list: SentRequest[]) => [...list].sort((a, b) => sortKey(a).localeCompare(sortKey(b)));
        expect(sorted(sent)).toEqual(sorted(c.expect.requestsUnordered));
      }

      // Waits and concurrency.
      if (c.expect.sleptSeconds) expect(clock.slept).toEqual(c.expect.sleptSeconds);
      if (c.expect.inFlight) expect(inFlight).toEqual(c.expect.inFlight);

      // Each call's outcome, in issue order. Without `results`, every call succeeds.
      const results = c.expect.results ?? outcomes.map((): Result => "ok");
      expect(outcomes).toHaveLength(results.length);
      results.forEach((result, i) => expectResult(outcomes[i]!, result, `call ${i + 1}`));
    });
  }
});
