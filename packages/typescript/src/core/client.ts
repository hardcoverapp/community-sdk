import type { DocumentTypeDecoration } from "@graphql-typed-document-node/core";
import { environments, type Environment } from "../generated/environments.ts";
import { operationInfo, type OperationInfo } from "../operations.ts";
import { fieldCount, requestCost } from "./cost.ts";
import {
  ActionError,
  AuthenticationError,
  GraphQLError,
  HardcoverError,
  InvalidRequestError,
  NetworkError,
  RateLimitError,
  RequestTooLargeError,
  ScopeError,
  ServerError,
  TimeoutError,
  UnsupportedOperationError,
} from "./errors.ts";
import { BooksResource } from "../resources/books.ts";
import { GoalsResource } from "../resources/goals.ts";
import { JournalResource } from "../resources/journal.ts";
import { LibraryResource } from "../resources/library.ts";
import { ListsResource } from "../resources/lists.ts";
import { MeResource } from "../resources/me.ts";
import { ReadsResource } from "../resources/reads.ts";
import { SearchResource } from "../resources/search.ts";
import { VibesResource } from "../resources/vibes.ts";
import type { WithJsonColumns } from "./json-columns.ts";
import { parseRateLimit, type RateLimitState } from "./rate-limit.ts";
import { normalizeToken } from "./token.ts";
import { fetchTransport, TransportFailure, type HttpResponse, type Transport } from "./transport.ts";

export type { Environment };

export interface HardcoverClientOptions {
  /**
   * A personal access token (`hc_pat_...`) or OAuth access token. Whitespace
   * and a pasted `Bearer ` prefix are cleaned up.
   */
  token: string;
  /** Called for problems that don't stop the client, e.g. a deprecated legacy JWT. Defaults to console.warn. */
  onWarning?: (message: string) => void;
  environment?: Environment;
  /** Overrides the GraphQL URL from `environment`. */
  endpoint?: string;
  transport?: Transport;
  /** Retries for 429s, and for queries that hit network, timeout or 5xx failures. */
  maxRetries?: number;
  timeoutMs?: number;
  userAgent?: string;
  onRateLimit?: (state: RateLimitState) => void;
  /** Injectable for tests; defaults to setTimeout. */
  sleep?: (ms: number) => Promise<void>;
  /** Injectable clock for pacing; defaults to the current time. */
  now?: () => Date;
  /**
   * Wait for the burst allowance to refill before sending, when the last
   * response said it's spent, instead of sending and getting a 429.
   * Default true. The daily cap is never waited out.
   */
  pace?: boolean;
  /** Injectable random source (0 ≤ x < 1) for backoff jitter; defaults to Math.random. */
  random?: () => number;
  /**
   * Request planner (spec/03): send concurrent reads from `request()` (and
   * every resource method) as one HTTP request, sized to the burst allowance,
   * with identical reads sent once. Mutations are barriers: they run alone, in
   * the order issued, after everything before them. `graphql()` is never
   * grouped. Default false.
   */
  batch?: boolean;
}

const NETWORK_BACKOFF_MS = [250, 1_000, 4_000];
/**
 * Burst capacity of the smallest tier (free, halved for legacy JWTs). Until
 * the first response brings real numbers, pacing and batching assume this.
 */
const SMALLEST_BURST_CAPACITY = 5;
const SDK_USER_AGENT = "hardcover-sdk-typescript/0.0.0";

type Payload = {
  data?: Record<string, unknown> | null;
  errors?: unknown;
  error?: unknown;
  error_description?: unknown;
  message?: unknown;
  scope?: unknown;
};

/** A read waiting in the planner's queue. Identical reads share one entry. */
interface Queued {
  query: string;
  variables: unknown;
  info: OperationInfo;
  cost: number;
  key: string;
  callers: { resolve: (data: unknown) => void; reject: (error: unknown) => void }[];
}

const noop = () => {};

export class HardcoverClient {
  /** Rate-limit state from the most recent response that carried headers. Read-only: pacing relies on it. */
  get rateLimit(): RateLimitState | undefined {
    return this.#rateLimit;
  }

  readonly endpoint: string;
  readonly me: MeResource;
  readonly library: LibraryResource;
  readonly reads: ReadsResource;
  readonly lists: ListsResource;
  readonly search: SearchResource;
  readonly books: BooksResource;
  readonly journal: JournalResource;
  readonly goals: GoalsResource;
  readonly vibes: VibesResource;
  readonly #token: string;
  readonly #transport: Transport;
  readonly #maxRetries: number;
  readonly #userAgent: string;
  readonly #sleep: (ms: number) => Promise<void>;
  readonly #random: () => number;
  /** 429s in a row, and how many of those were contention (spec/03 Contention backoff). */
  #consecutive429 = 0;
  #contended429 = 0;
  readonly #onRateLimit: ((state: RateLimitState) => void) | undefined;
  readonly #pace: boolean;
  #rateLimit: RateLimitState | undefined;
  readonly #now: () => Date;
  /** When `rateLimit` was received, in ms from `#now()`. */
  #rateLimitAt = 0;
  /** Set after waiting out a 429; the wait already covered the refill. Cleared by the next headers. */
  #allowanceWaited = false;
  readonly #batch: boolean;
  /** Reads waiting to be sent together; a mutation closes it. */
  #run: Map<string, Queued> | undefined;
  /** Settles once the last mutation has. */
  #barrier: Promise<void> = Promise.resolve();
  /** Sends since the last mutation; the next mutation waits for all of them. */
  readonly #inFlight = new Set<Promise<void>>();

  /** Cost of requests that have taken their share of the allowance and haven't been answered yet. */
  #reserved = 0;
  /** Requests waiting for the first rate-limit headers (cold start). */
  #waitingForAnswer: (() => void)[] = [];
  /** The server answered without rate-limit headers, so there's nothing to pace by. */
  #unreported = false;

  constructor(options: HardcoverClientOptions) {
    this.endpoint = options.endpoint ?? environments[options.environment ?? "prod"].graphql;
    this.#token = normalizeToken(options.token, options.onWarning ?? ((message) => console.warn(message)));
    this.#transport = options.transport ?? fetchTransport({ timeoutMs: options.timeoutMs });
    this.#maxRetries = options.maxRetries ?? 3;
    this.#userAgent = options.userAgent ? `${options.userAgent} ${SDK_USER_AGENT}` : SDK_USER_AGENT;
    this.#sleep = options.sleep ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));
    this.#random = options.random ?? Math.random;
    this.#onRateLimit = options.onRateLimit;
    this.#now = options.now ?? (() => new Date());
    this.#pace = options.pace ?? true;
    this.#batch = options.batch ?? false;
    this.me = new MeResource(this);
    this.library = new LibraryResource(this);
    this.reads = new ReadsResource(this);
    this.lists = new ListsResource(this);
    this.search = new SearchResource(this);
    this.books = new BooksResource(this);
    this.journal = new JournalResource(this);
    this.goals = new GoalsResource(this);
    this.vibes = new VibesResource(this);
  }

  /**
   * Runs a generated operation, e.g. `client.request(operations.Me)`. JSON
   * columns such as `cachedImage` come back typed (core/json-columns.ts).
   */
  request<TResult, TVariables>(
    document: DocumentTypeDecoration<TResult, TVariables>,
    ...[variables]: TVariables extends Record<string, never> ? [variables?: TVariables] : [variables: TVariables]
  ): Promise<WithJsonColumns<TResult>> {
    type Result = Promise<WithJsonColumns<TResult>>;
    const query = String(document);
    const info = operationInfo(document);
    if (!this.#batch) return this.#execute(query, variables, info) as Result;
    if (info.kind === "mutation") return this.#afterEverything(() => this.#execute(query, variables, info)) as Result;
    return this.#enqueueRead(query, variables, info) as Result;
  }

  /** Escape hatch: any query the token's scopes allow, with the same auth, retries and errors. */
  graphql<TResult = unknown>(query: string, variables?: Record<string, unknown>): Promise<TResult> {
    const info = operationInfo(query);
    if (!this.#batch) return this.#execute(query, variables, info) as Promise<TResult>;
    if (info.kind === "mutation") return this.#afterEverything(() => this.#execute(query, variables, info)) as Promise<TResult>;
    return this.#afterBarrier(() => this.#execute(query, variables, info)) as Promise<TResult>;
  }

  // ---- Request planner (spec/03) ----

  // A mutation waits for everything issued before it and holds back everything
  // issued after it, so nothing is grouped, reordered or de-duplicated across it.
  #afterEverything(send: () => Promise<unknown>): Promise<unknown> {
    this.#run = undefined;
    const before = Promise.all([this.#barrier, ...this.#inFlight]);
    this.#inFlight.clear();
    const result = before.then(send);
    this.#barrier = result.then(noop, noop);
    return result;
  }

  #afterBarrier(send: () => Promise<unknown>): Promise<unknown> {
    const result = this.#barrier.then(send);
    this.#track(result);
    return result;
  }

  #track(sent: Promise<unknown>): void {
    const settled = sent.then(noop, noop);
    this.#inFlight.add(settled);
    void settled.then(() => this.#inFlight.delete(settled));
  }

  #enqueueRead(query: string, variables: unknown, info: OperationInfo): Promise<unknown> {
    return new Promise((resolve, reject) => {
      if (!this.#run) {
        const run = new Map<string, Queued>();
        this.#run = run;
        // One macrotask after the barrier, so reads issued after a few awaits still join.
        this.#track(
          this.#barrier
            .then(() => new Promise((tick) => setTimeout(tick, 0)))
            .then(() => {
              if (this.#run === run) this.#run = undefined;
              return this.#sendRun([...run.values()]);
            }),
        );
      }
      const key = `${query}\u0000${JSON.stringify(variables ?? null)}`;
      const queued = this.#run.get(key);
      if (queued) queued.callers.push({ resolve, reject });
      else this.#run.set(key, { query, variables, info, cost: fieldCount(query), key, callers: [{ resolve, reject }] });
    });
  }

  // Sends a run of reads in requests sized to the allowance, one after another
  // so each is paced by the headers of the last. Settles every caller; never throws.
  async #sendRun(pending: Queued[]): Promise<void> {
    while (pending.length > 0) {
      const room = this.#batchRoom();
      let cost = pending[0]!.cost;
      let size = 1;
      while (size < pending.length && cost + pending[size]!.cost <= room) cost += pending[size++]!.cost;
      await this.#sendChunk(pending.splice(0, size));
    }
  }

  #batchRoom(): number {
    const burst = this.#rateLimit?.burst;
    const capacity = burst?.limit ?? SMALLEST_BURST_CAPACITY;
    return Math.max(1, Math.min(capacity, burst?.remaining ?? capacity));
  }

  async #sendChunk(chunk: Queued[]): Promise<void> {
    const resolve = (item: Queued, data: unknown) => item.callers.forEach((caller) => caller.resolve(data));
    const reject = (item: Queued, error: unknown) => item.callers.forEach((caller) => caller.reject(error));
    const sendAlone = (item: Queued) =>
      this.#execute(item.query, item.variables, item.info).then(
        (data) => resolve(item, data),
        (error: unknown) => reject(item, error),
      );
    if (chunk.length === 1) return sendAlone(chunk[0]!);

    const operationName = chunk.map((item) => item.info.name ?? "anonymous").join(", ");
    const body = JSON.stringify(chunk.map(({ query, variables, info }) => ({ query, variables, operationName: info.name })));
    const cost = Math.max(chunk.reduce((sum, item) => sum + item.cost, 0), 1);
    let response: SendResult;
    try {
      response = await this.#send(body, cost, false, operationName);
    } catch (error) {
      // The gateway checks scopes, operation names and size for the whole
      // array. Alone, each item gets its own answer.
      const wholeArray =
        error instanceof ScopeError ||
        error instanceof UnsupportedOperationError ||
        error instanceof InvalidRequestError ||
        error instanceof RequestTooLargeError;
      if (wholeArray) for (const item of chunk) await sendAlone(item);
      else for (const item of chunk) reject(item, error);
      return;
    }

    const items: unknown = response.payload;
    if (!Array.isArray(items) || items.length !== chunk.length) {
      const error = new HardcoverError("Batch response didn't match the request", { status: response.status, operationName });
      for (const item of chunk) reject(item, error);
      return;
    }
    chunk.forEach((item, i) => {
      const payload: unknown = items[i];
      try {
        resolve(item, toData(payload && typeof payload === "object" ? (payload as Payload) : undefined, response.status, item.info.name));
      } catch (error) {
        reject(item, error);
      }
    });
  }

  async #execute(query: string, variables: unknown, info: OperationInfo): Promise<unknown> {
    const body = JSON.stringify({ query, variables, operationName: info.name });
    const { status, payload } = await this.#send(body, requestCost(query), info.kind === "mutation", info.name);
    return toData(payload, status, info.name);
  }

  // Sends with pacing and retries; returns the parsed body of a 2xx response or
  // throws the classified failure.
  async #send(body: string, cost: number, isMutation: boolean, operationName: string | undefined): Promise<SendResult> {
    const info = { name: operationName };
    const request = {
      url: this.endpoint,
      headers: {
        authorization: `Bearer ${this.#token}`,
        "content-type": "application/json",
        accept: "application/json",
        "user-agent": this.#userAgent,
      },
      body,
    };

    for (let attempt = 0; ; attempt++) {
      const canRetry = attempt < this.#maxRetries;
      let response: HttpResponse;
      await this.#reserve(cost);

      try {
        response = await this.#transport.send(request);
      } catch (cause) {
        this.#release(cost);

        // Only a TransportFailure means the request may not have reached the
        // server. Anything else is a bug in a custom or mock transport:
        // surface it immediately instead of retrying it as a network blip.
        if (!(cause instanceof TransportFailure)) throw cause;
        // Never replay a mutation that may have landed. Mirrors the app's
        // UserBookService/verifyThenOfferRetry.ts.
        if (!isMutation && canRetry) {
          await this.#sleep(NETWORK_BACKOFF_MS[Math.min(attempt, NETWORK_BACKOFF_MS.length - 1)]!);
          continue;
        }
        const message = cause instanceof Error ? cause.message : String(cause);
        if (cause.kind === "timeout") {
          throw new TimeoutError(`Request timed out: ${message}`, isMutation, { cause, operationName: info.name });
        }
        throw new NetworkError(`Network failure: ${message}`, isMutation, { cause, operationName: info.name });
      }

      // What this client believed before this response, to tell contention from an ordinary 429.
      const hadRoom = this.#hadRoomFor(cost);
      let rateLimit: RateLimitState | undefined;
      try {
        rateLimit = parseRateLimit(response.headers);
        if (rateLimit) {
          this.#rateLimit = rateLimit;
          this.#rateLimitAt = this.#now().getTime();
          this.#allowanceWaited = false;
          this.#onRateLimit?.(rateLimit);
        } else if (!this.#rateLimit) {
          this.#unreported = true;
        }
      } finally {
        // Release after reading the headers, so waiting requests see the new
        // numbers. In `finally` so a throwing onRateLimit hook can't keep it.
        this.#release(cost);
      }

      const payload = parseBody(response.body);
      const failure = classify(response, payload, rateLimit, info.name);

      if (failure) {
        if (failure instanceof RateLimitError && failure.window === "burst" && canRetry) {
          await this.#sleep(failure.retryAfterSeconds * 1_000 + this.#contentionJitterMs(hadRoom));
          this.#allowanceWaited = true;
          continue;
        }
        const transient = failure instanceof ServerError || failure instanceof TimeoutError;
        if (transient && !isMutation && canRetry) {
          await this.#sleep(NETWORK_BACKOFF_MS[Math.min(attempt, NETWORK_BACKOFF_MS.length - 1)]!);
          continue;
        }
        throw failure;
      }

      this.#consecutive429 = 0;
      this.#contended429 = 0;
      return { status: response.status, payload };
    }
  }
  // Did the last headers say there was room for a request of this cost,
  // after what this client's other requests had already reserved?
  #hadRoomFor(cost: number): boolean {
    const remaining = this.#rateLimit?.burst?.remaining;
    if (remaining === undefined || this.#allowanceWaited) return false;

    const reservedByOthers = this.#reserved - cost;
    return remaining - reservedByOthers >= cost;
  }

  // Contention backoff (spec/03): a 429 despite headers showing room, or a
  // repeat 429, means another client for this user is spending the shared
  // budget. Add full jitter that grows with each contended 429, so competing
  // clients spread out instead of waking together. Ordinary 429s add nothing.
  #contentionJitterMs(hadRoom: boolean): number {
    const contended = hadRoom || this.#consecutive429 > 0;
    this.#consecutive429++;
    if (!contended) return 0;
    this.#contended429++;
    return this.#random() * Math.min(30_000, 1_000 * 2 ** this.#contended429);
  }

  // Pacing (spec/03). Every request takes its cost from the allowance before
  // it goes out and gives it back when it's answered, so requests sent at the
  // same moment queue behind each other instead of all spending the same
  // remaining units. Uses only headers the gateway sends; a 429 is still
  // handled (and retried) if pacing is off or another client shares the token.
  //
  // The check and the reservation happen without yielding in between;
  // otherwise every request sent in the same tick would see the same total.
  async #reserve(cost: number): Promise<void> {
    if (!this.#pace) {
      this.#reserved += cost;
      return;
    }

    // Cold start: before any response, the client doesn't know its tier.
    // Send up to the smallest tier's burst, then wait for an answer to learn
    // the real numbers (spec/06 #29).
    while (this.#coldAndFull(cost)) {
      await new Promise<void>((wake) => this.#waitingForAnswer.push(wake));
    }

    const waitMs = this.#allowanceWaitMs(cost);
    this.#reserved += cost;
    if (waitMs <= 0) return;

    try {
      await this.#sleep(waitMs);
    } catch (error) {
      this.#release(cost);
      throw error;
    }
  }

  #release(cost: number): void {
    this.#reserved -= cost;

    // Anyone held for the first headers can look again.
    const waiting = this.#waitingForAnswer;
    this.#waitingForAnswer = [];
    for (const wake of waiting) wake();
  }

  #coldAndFull(cost: number): boolean {
    const cold = !this.#rateLimit?.burst && !this.#unreported;
    const somethingInFlight = this.#reserved > 0;
    const wouldExceed = this.#reserved + cost > SMALLEST_BURST_CAPACITY;

    return cold && somethingInFlight && wouldExceed;
  }

  // How long this request waits for the allowance, counting what's already
  // reserved ahead of it: the remaining units minus those, refilled over time.
  #allowanceWaitMs(cost: number): number {
    const burst = this.#rateLimit?.burst;
    if (this.#allowanceWaited || burst?.remaining === undefined) return 0;

    const available = burst.remaining - this.#reserved;
    const shortfall = cost - available;
    if (shortfall <= 0) return 0;

    // Empty bucket: at least the announced reset. Partial: time to refill the shortfall.
    const perSecond = burst.perMinute ? burst.perMinute / 60 : undefined;
    const refillSeconds = perSecond ? shortfall / perSecond : (burst.resetSeconds ?? 0);
    const resetSeconds = burst.remaining === 0 ? (burst.resetSeconds ?? 0) : 0;
    const waitSeconds = Math.max(resetSeconds, refillSeconds);

    const alreadyPassedMs = this.#now().getTime() - this.#rateLimitAt;
    return waitSeconds * 1_000 - alreadyPassedMs;
  }
}

interface SendResult {
  status: number;
  payload: Payload | undefined;
}

// One operation's result: its data, or the GraphQL or action error it reported.
function toData(payload: Payload | undefined, status: number, operationName: string | undefined): Record<string, unknown> {
  if (!payload) throw new HardcoverError("Response was not valid JSON", { status, operationName });
  if (Array.isArray(payload.errors) && payload.errors.length > 0) {
    throw new GraphQLError(payload.errors.map(toErrorDetail), payload.data ?? null, { status, operationName });
  }
  const data = payload.data ?? {};
  assertNoActionErrors(data, operationName);
  return data;
}

function parseBody(body: string): Payload | undefined {
  try {
    const parsed: unknown = JSON.parse(body);
    return parsed && typeof parsed === "object" ? (parsed as Payload) : undefined;
  } catch {
    return undefined;
  }
}

function str(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

// Maps non-2xx responses onto the shared taxonomy (shared/errors.json).
function classify(
  response: HttpResponse,
  payload: Payload | undefined,
  rateLimit: RateLimitState | undefined,
  operationName: string | undefined,
): HardcoverError | undefined {
  const { status } = response;
  if (status >= 200 && status < 300) return undefined;

  const code = str(payload?.error);
  const firstError = Array.isArray(payload?.errors) ? str(payload.errors[0]) : undefined;
  const message = str(payload?.error_description) ?? str(payload?.message) ?? code ?? firstError ?? `HTTP ${status}`;
  const options = { status, operationName };

  if (status === 401) return new AuthenticationError(message, options);

  if (status === 403) {
    // `scope` lists every missing scope, space-separated (graphql_controller.rb).
    if (code === "insufficient_scope") {
      return new ScopeError(message, (str(payload?.scope) ?? "").split(/\s+/).filter(Boolean), options);
    }
    if (code === "unsupported_operation") return new UnsupportedOperationError(message, options);
    if (code === "top_level_limit_exceeded" || firstError === "request_exceeds_capacity") {
      return new RequestTooLargeError(message, options);
    }
    return new HardcoverError(message, options);
  }

  if (status === 400) return new InvalidRequestError(message, options);
  if (status === 408) return new TimeoutError(message, false, options);

  if (status === 429) {
    const dailySpent = rateLimit?.daily?.remaining === 0;
    const window = dailySpent ? "daily" : "burst";
    const bucket = dailySpent ? rateLimit?.daily : rateLimit?.burst;
    const retryAfter = Number(response.headers["retry-after"]);
    const retryAfterSeconds = Number.isFinite(retryAfter) && retryAfter >= 0 ? retryAfter : (bucket?.resetSeconds ?? 1);
    return new RateLimitError(message, retryAfterSeconds, window, bucket?.limit, bucket?.remaining, options);
  }

  if (status >= 500) return new ServerError(message, options);
  return new HardcoverError(message, options);
}

function toErrorDetail(raw: unknown) {
  const e = (raw ?? {}) as { message?: unknown; extensions?: { path?: unknown; code?: unknown } };
  return {
    message: str(e.message) ?? "Unknown GraphQL error",
    path: str(e.extensions?.path),
    code: str(e.extensions?.code),
  };
}

// Hasura actions report failures inside `data` with HTTP 200, as either
// `error: String` or `errors: [String]`.
function assertNoActionErrors(data: Record<string, unknown>, operationName: string | undefined): void {
  for (const [field, value] of Object.entries(data)) {
    if (!value || typeof value !== "object" || Array.isArray(value)) continue;
    const envelope = value as { error?: unknown; errors?: unknown };
    const messages: string[] = [];
    if (typeof envelope.error === "string" && envelope.error) messages.push(envelope.error);
    if (Array.isArray(envelope.errors)) messages.push(...envelope.errors.map(String));
    if (messages.length > 0) throw new ActionError(field, messages, data, { operationName });
  }
}
