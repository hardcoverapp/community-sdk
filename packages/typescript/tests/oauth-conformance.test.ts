// Runs the language-neutral OAuth cases in shared/conformance/oauth.json.
// Responses are queued per endpoint (graphql, token, revoke, device), so
// cases don't depend on the order concurrent requests happen to go out.
import type { DocumentTypeDecoration } from "../src/core/decoration.ts";
import { describe, expect, it } from "vitest";
import cases from "../../../shared/conformance/oauth.json" with { type: "json" };
import * as sdk from "../src/index.ts";
import { base64url, codeChallenge, sha256 } from "../src/oauth/pkce.ts";
import { parseTokenResponse } from "../src/oauth/tokens.ts";
import {
  createAuthorization,
  memoryStore,
  OAuthSession,
  parseRedirect,
  type RandomSource,
  type TokenSet,
  type TokenStore,
} from "../src/oauth/index.ts";
import { TransportFailure, type HttpRequest, type HttpResponse, type Transport } from "../src/core/transport.ts";
import type { MockResponse } from "../src/testing/index.ts";

type Endpoint = "graphql" | "token" | "revoke" | "device";
type Responses = Partial<Record<Endpoint, MockResponse[]>>;
type Forms = Partial<Record<Endpoint, Record<string, string>[]>>;
type Result = "ok" | { error: string; fields?: Record<string, unknown> };

const { now: NOW, clientId } = cases;

// Zero bytes, so generated verifiers and state are predictable.
const zeroRandom: RandomSource = { getRandomValues: (bytes) => bytes.fill(0) };

class RoutingTransport implements Transport {
  readonly sent: { endpoint: Endpoint; request: HttpRequest }[] = [];
  readonly #queues: Responses;

  constructor(responses: Responses) {
    this.#queues = structuredClone(responses);
  }

  async send(request: HttpRequest): Promise<HttpResponse> {
    const endpoint = endpointOf(request.url);
    this.sent.push({ endpoint, request });

    const next = this.#queues[endpoint]?.shift();
    if (!next) throw new Error(`No ${endpoint} response queued`);

    if ("network" in next) throw new TransportFailure("network", `mock ${next.network}`);

    const body = typeof next.body === "string" ? next.body : JSON.stringify(next.body);
    return { status: next.status, headers: next.headers ?? {}, body };
  }

  bearers(): string[] {
    return this.sent
      .filter((s) => s.endpoint === "graphql")
      .map((s) => s.request.headers.authorization!.replace(/^Bearer /, ""));
  }

  forms(endpoint: Endpoint): Record<string, string>[] {
    return this.sent
      .filter((s) => s.endpoint === endpoint)
      .map((s) => Object.fromEntries(new URLSearchParams(s.request.body)));
  }
}

function endpointOf(url: string): Endpoint {
  if (url.endsWith("/graphql")) return "graphql";
  if (url.endsWith("/oauth2/token")) return "token";
  if (url.endsWith("/oauth2/revoke")) return "revoke";
  if (url.endsWith("/oauth2/device")) return "device";
  throw new Error(`Unexpected URL ${url}`);
}

// A fake clock that each sleep moves forward.
function fakeClock() {
  let time = NOW;
  const slept: number[] = [];

  return {
    slept,
    now: () => new Date(time),
    sleep: async (ms: number) => {
      slept.push(ms / 1_000);
      time += ms;
    },
  };
}

// The first read returns `first`; every later read returns `later`, as if
// another process wrote between them.
function changingStore(first: TokenSet | null, later: TokenSet | null): TokenStore & { current: () => TokenSet | null } {
  let reads = 0;
  let tokens = first;

  return {
    current: () => tokens,
    async get() {
      reads++;
      if (reads === 2) tokens = later;
      return tokens;
    },
    async set(next) {
      tokens = next;
    },
  };
}

async function settle(run: () => Promise<unknown>): Promise<{ ok: true } | { ok: false; error: unknown }> {
  try {
    await run();
    return { ok: true };
  } catch (error) {
    return { ok: false, error };
  }
}

function expectResult(outcome: Awaited<ReturnType<typeof settle>>, result: Result) {
  if (result === "ok") {
    if (!outcome.ok) throw outcome.error;
    return;
  }

  expect(outcome.ok).toBe(false);
  if (outcome.ok) return;

  const ErrorClass = (sdk as unknown as Record<string, new (...args: never[]) => Error>)[result.error]!;
  expect(outcome.error).toBeInstanceOf(ErrorClass);

  for (const [field, value] of Object.entries(result.fields ?? {})) {
    expect((outcome.error as unknown as Record<string, unknown>)[field], field).toEqual(value);
  }
}

describe("oauth conformance: vectors", () => {
  const hex = (bytes: Uint8Array) => [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
  const fromHex = (text: string) => new Uint8Array((text.match(/../g) ?? []).map((pair) => parseInt(pair, 16)));
  const ascii = (text: string) => new Uint8Array([...text].map((c) => c.charCodeAt(0)));

  for (const v of cases.vectors.sha256) {
    it(`sha256 ${JSON.stringify(v.input.slice(0, 12))}`, () => expect(hex(sha256(ascii(v.input)))).toBe(v.hex));
  }

  for (const v of cases.vectors.base64url) {
    it(`base64url ${v.hex || "(empty)"}`, () => expect(base64url(fromHex(v.hex))).toBe(v.out));
  }

  for (const v of cases.vectors.pkce) {
    it(`pkce ${v.source}`, () => expect(codeChallenge(v.verifier)).toBe(v.challenge));
  }
});

describe("oauth conformance: authorize", () => {
  for (const c of cases.authorize) {
    it(c.id, () => {
      const build = () =>
        createAuthorization({ clientId, random: zeroRandom }, { scopes: c.scopes, redirectUri: c.redirectUri });

      if ("argumentError" in c.expect) {
        expect(build).toThrow(TypeError);
        return;
      }

      const attempt = build();
      const [base, query] = attempt.url.split("?");

      expect(base).toBe(c.expect.base);
      expect(Object.fromEntries(new URLSearchParams(query))).toEqual(c.expect.params);
      if ("codeVerifier" in c.expect) expect(attempt.codeVerifier).toBe(c.expect.codeVerifier);
      if ("issuer" in c.expect) expect(attempt.issuer).toBe(c.expect.issuer);
    });
  }
});

describe("oauth conformance: redirects", () => {
  for (const c of cases.redirects) {
    it(c.id, () => {
      const parse = () => parseRedirect(c.url, c.attempt);

      if ("code" in c.expect && !("error" in c.expect)) {
        expect(parse()).toBe(c.expect.code);
        return;
      }

      expect(parse).toThrow(sdk.OAuthError);
      try {
        parse();
      } catch (error) {
        expect((error as sdk.OAuthError).code).toBe(c.expect.code);
      }
    });
  }
});

describe("oauth conformance: token responses", () => {
  for (const c of cases.tokenResponses) {
    it(c.id, () => {
      const parse = () => parseTokenResponse(c.body, new Date(NOW));

      if ("tokens" in c.expect) {
        expect(parse()).toEqual(c.expect.tokens);
        return;
      }

      expect(parse).toThrow(sdk.OAuthError);
    });
  }
});

describe("oauth conformance: device", () => {
  for (const c of cases.device) {
    it(c.id, async () => {
      const transport = new RoutingTransport(c.responses as Responses);
      const clock = fakeClock();
      const store = memoryStore();
      const session = new OAuthSession({ clientId, store, transport, now: clock.now, sleep: clock.sleep });

      let userCode: string | undefined;
      const outcome = await settle(() =>
        session.signInWithDevice({ scopes: c.scopes, onCode: (device) => (userCode = device.userCode) }),
      );

      expectResult(outcome, c.expect.result as Result);
      expect(clock.slept).toEqual(c.expect.sleptSeconds);
      expect(await store.get()).toEqual(c.expect.stored);

      if ("userCode" in c.expect) expect(userCode).toBe(c.expect.userCode);

      for (const [endpoint, forms] of Object.entries(("forms" in c.expect ? c.expect.forms : {}) as Forms)) {
        expect(transport.forms(endpoint as Endpoint)).toEqual(forms);
      }
    });
  }
});

describe("oauth conformance: sessions", () => {
  for (const c of cases.sessions) {
    it(c.id, async () => {
      const stored = c.stored as TokenSet | null;
      const later = "storeAfterFirstRead" in c ? (c.storeAfterFirstRead as TokenSet) : stored;

      const transport = new RoutingTransport(c.responses as Responses);
      const clock = fakeClock();
      const store = changingStore(stored, later);
      const signedOut: string[] = [];

      const session = new OAuthSession({
        clientId,
        store,
        transport,
        now: clock.now,
        sleep: clock.sleep,
        onSignedOut: (reason) => signedOut.push(reason),
      });
      const client = new sdk.HardcoverClient({ auth: session, transport, now: clock.now, sleep: clock.sleep });

      type Call = { op?: string; variables?: Record<string, unknown>; session?: string; resource?: string };
      const run = (call: Call) => {
        if (call.session === "signOut") return session.signOut();
        if (call.resource === "me.get") return client.me.get();

        const document = sdk.operations[call.op as keyof typeof sdk.operations];
        return client.request(document as DocumentTypeDecoration<unknown, unknown>, call.variables);
      };

      const calls = c.calls as Call[];
      const outcome = await settle(async () => {
        if ("concurrent" in c && c.concurrent) {
          await Promise.all(calls.map(run));
        } else {
          for (const call of calls) await run(call);
        }
      });

      const e = c.expect as {
        result: Result;
        bearers?: string[];
        bearersUnordered?: string[];
        forms?: Forms;
        stored?: TokenSet | null | "unchanged";
        signedOut?: string[];
      };

      expectResult(outcome, e.result);

      if (e.bearers) expect(transport.bearers()).toEqual(e.bearers);
      if (e.bearersUnordered) expect(transport.bearers().sort()).toEqual([...e.bearersUnordered].sort());

      for (const [endpoint, forms] of Object.entries(e.forms ?? {})) {
        expect(transport.forms(endpoint as Endpoint)).toEqual(forms);
      }

      if (e.stored !== undefined) expect(store.current()).toEqual(e.stored === "unchanged" ? stored : e.stored);
      if (e.signedOut) expect(signedOut).toEqual(e.signedOut);
    });
  }
});
