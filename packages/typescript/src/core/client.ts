import type { DocumentTypeDecoration } from "@graphql-typed-document-node/core";
import { environments, type Environment } from "../generated/environments.ts";
import { operationInfo, type OperationInfo } from "../operations.ts";
import { fieldCount, requestCost } from "./cost.ts";
import {
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
import { Allowance } from "./allowance.ts";
import type { WithJsonColumns } from "./json-columns.ts";
import type { RateLimitState } from "./rate-limit.ts";
import { classify, parseBody, toData, type Payload } from "./responses.ts";
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
const SDK_USER_AGENT = "hardcover-sdk-typescript/0.0.0";

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
    return this.#allowance.state;
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
  /** Rate-limit state, pacing and contention backoff (core/allowance.ts). */
  readonly #allowance: Allowance;
  readonly #batch: boolean;
  /** Reads waiting to be sent together; a mutation closes it. */
  #run: Map<string, Queued> | undefined;
  /** Settles once the last mutation has. */
  #barrier: Promise<void> = Promise.resolve();
  /** Sends since the last mutation; the next mutation waits for all of them. */
  readonly #inFlight = new Set<Promise<void>>();

  constructor(options: HardcoverClientOptions) {
    this.endpoint = options.endpoint ?? environments[options.environment ?? "prod"].graphql;
    this.#token = normalizeToken(options.token, options.onWarning ?? ((message) => console.warn(message)));
    this.#transport = options.transport ?? fetchTransport({ timeoutMs: options.timeoutMs });
    this.#maxRetries = options.maxRetries ?? 3;
    this.#userAgent = options.userAgent ? `${options.userAgent} ${SDK_USER_AGENT}` : SDK_USER_AGENT;
    this.#sleep = options.sleep ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));
    this.#batch = options.batch ?? false;

    this.#allowance = new Allowance({
      pace: options.pace ?? true,
      now: options.now ?? (() => new Date()),
      sleep: this.#sleep,
      random: options.random ?? Math.random,
      onRateLimit: options.onRateLimit,
    });

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
      const room = this.#allowance.batchRoom();
      let cost = pending[0]!.cost;
      let size = 1;
      while (size < pending.length && cost + pending[size]!.cost <= room) cost += pending[size++]!.cost;
      await this.#sendChunk(pending.splice(0, size));
    }
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
      await this.#allowance.reserve(cost);

      try {
        response = await this.#transport.send(request);
      } catch (cause) {
        this.#allowance.release(cost);

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
      const hadRoom = this.#allowance.hadRoomFor(cost);

      let rateLimit: RateLimitState | undefined;
      try {
        rateLimit = this.#allowance.update(response.headers);
      } finally {
        // Release after reading the headers, so waiting requests see the new
        // numbers. In `finally` so a throwing onRateLimit hook can't keep it.
        this.#allowance.release(cost);
      }

      const payload = parseBody(response.body);
      const failure = classify(response, payload, rateLimit, info.name);

      if (failure) {
        if (failure instanceof RateLimitError && failure.window === "burst" && canRetry) {
          await this.#sleep(failure.retryAfterSeconds * 1_000 + this.#allowance.contentionJitterMs(hadRoom));
          this.#allowance.waitedOut();
          continue;
        }
        const transient = failure instanceof ServerError || failure instanceof TimeoutError;
        if (transient && !isMutation && canRetry) {
          await this.#sleep(NETWORK_BACKOFF_MS[Math.min(attempt, NETWORK_BACKOFF_MS.length - 1)]!);
          continue;
        }
        throw failure;
      }

      this.#allowance.succeeded();
      return { status: response.status, payload };
    }
  }
}

interface SendResult {
  status: number;
  payload: Payload | undefined;
}
