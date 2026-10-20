import type { DocumentTypeDecoration } from "@graphql-typed-document-node/core";
import { environments, type Environment } from "../generated/environments.ts";
import { operationInfo, type OperationInfo } from "../operations.ts";
import { ActivitiesResource } from "../resources/activities.ts";
import { AuthorsResource } from "../resources/authors.ts";
import { BooksResource } from "../resources/books.ts";
import { GoalsResource } from "../resources/goals.ts";
import { JournalResource } from "../resources/journal.ts";
import { LibraryResource } from "../resources/library.ts";
import { LikesResource } from "../resources/likes.ts";
import { ListsResource } from "../resources/lists.ts";
import { MeResource } from "../resources/me.ts";
import { NotificationsResource } from "../resources/notifications.ts";
import { PromptsResource } from "../resources/prompts.ts";
import { ReadsResource } from "../resources/reads.ts";
import { SearchResource } from "../resources/search.ts";
import { SeriesResource } from "../resources/series.ts";
import { UsersResource } from "../resources/users.ts";
import { VibesResource } from "../resources/vibes.ts";
import { Allowance } from "./allowance.ts";
import { requestCost } from "./cost.ts";
import { NetworkError, RateLimitError, ServerError, TimeoutError } from "./errors.ts";
import type { WithJsonColumns } from "./json-columns.ts";
import { RequestPlanner } from "./planner.ts";
import type { RateLimitState } from "./rate-limit.ts";
import { classify, parseBody, toData, type SendResult } from "./responses.ts";
import { normalizeToken } from "./token.ts";
import { fetchTransport, TransportFailure, type HttpRequest, type HttpResponse, type Transport } from "./transport.ts";

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

/** Waits between retries of a network, timeout or 5xx failure. */
const NETWORK_BACKOFF_MS = [250, 1_000, 4_000];

const SDK_USER_AGENT = "hardcover-sdk-typescript/0.0.0";

function networkBackoffMs(attempt: number): number {
  return NETWORK_BACKOFF_MS[Math.min(attempt, NETWORK_BACKOFF_MS.length - 1)]!;
}

/**
 * The Hardcover API client. Resources (`library`, `books`, …) cover what apps
 * usually need; `request()` runs any generated operation and `graphql()` any
 * query. Every call shares the same auth, pacing, retries and errors.
 */
export class HardcoverClient {
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
  readonly prompts: PromptsResource;
  readonly authors: AuthorsResource;
  readonly series: SeriesResource;
  readonly users: UsersResource;
  readonly likes: LikesResource;
  readonly activities: ActivitiesResource;
  readonly notifications: NotificationsResource;

  readonly #token: string;
  readonly #transport: Transport;
  readonly #maxRetries: number;
  readonly #userAgent: string;
  readonly #sleep: (ms: number) => Promise<void>;

  /** Rate-limit state, pacing and contention backoff (core/allowance.ts). */
  readonly #allowance: Allowance;

  /** Batching, when the `batch` option is on (core/planner.ts). */
  readonly #planner: RequestPlanner | undefined;

  constructor(options: HardcoverClientOptions) {
    this.endpoint = options.endpoint ?? environments[options.environment ?? "prod"].graphql;
    this.#token = normalizeToken(options.token, options.onWarning ?? ((message) => console.warn(message)));
    this.#transport = options.transport ?? fetchTransport({ timeoutMs: options.timeoutMs });
    this.#maxRetries = options.maxRetries ?? 3;
    this.#userAgent = options.userAgent ? `${options.userAgent} ${SDK_USER_AGENT}` : SDK_USER_AGENT;
    this.#sleep = options.sleep ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));

    this.#allowance = new Allowance({
      pace: options.pace ?? true,
      now: options.now ?? (() => new Date()),
      sleep: this.#sleep,
      random: options.random ?? Math.random,
      onRateLimit: options.onRateLimit,
    });

    if (options.batch) {
      this.#planner = new RequestPlanner({
        execute: (query, variables, info) => this.#execute(query, variables, info),
        sendArray: (body, cost, operationName) => this.#send(body, cost, false, operationName),
        batchRoom: () => this.#allowance.batchRoom(),
      });
    }

    this.me = new MeResource(this);
    this.library = new LibraryResource(this);
    this.reads = new ReadsResource(this);
    this.lists = new ListsResource(this);
    this.search = new SearchResource(this);
    this.books = new BooksResource(this);
    this.journal = new JournalResource(this);
    this.goals = new GoalsResource(this);
    this.vibes = new VibesResource(this);
    this.prompts = new PromptsResource(this);
    this.authors = new AuthorsResource(this);
    this.series = new SeriesResource(this);
    this.users = new UsersResource(this);
    this.likes = new LikesResource(this);
    this.activities = new ActivitiesResource(this);
    this.notifications = new NotificationsResource(this);
  }

  /** Rate-limit state from the most recent response that carried headers. Read-only: pacing relies on it. */
  get rateLimit(): RateLimitState | undefined {
    return this.#allowance.state;
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
    const send = () => this.#execute(query, variables, info);

    if (!this.#planner) return send() as Result;
    if (info.kind === "mutation") return this.#planner.mutation(send) as Result;

    return this.#planner.read(query, variables, info) as Result;
  }

  /** Escape hatch: any query the token's scopes allow, with the same auth, retries and errors. */
  graphql<TResult = unknown>(query: string, variables?: Record<string, unknown>): Promise<TResult> {
    const info = operationInfo(query);
    const send = () => this.#execute(query, variables, info);

    if (!this.#planner) return send() as Promise<TResult>;
    if (info.kind === "mutation") return this.#planner.mutation(send) as Promise<TResult>;

    return this.#planner.ungrouped(send) as Promise<TResult>;
  }

  // One operation on its own, unwrapped to its data.
  async #execute(query: string, variables: unknown, info: OperationInfo): Promise<unknown> {
    const body = JSON.stringify({ query, variables, operationName: info.name });
    const isMutation = info.kind === "mutation";

    const { status, payload } = await this.#send(body, requestCost(query), isMutation, info.name);

    return toData(payload, status, info.name);
  }

  // Sends with pacing and retries; returns the parsed body of a 2xx response or
  // throws the classified failure.
  async #send(body: string, cost: number, isMutation: boolean, operationName: string | undefined): Promise<SendResult> {
    const request = this.#httpRequest(body);

    for (let attempt = 0; ; attempt++) {
      const canRetry = attempt < this.#maxRetries;

      await this.#allowance.reserve(cost);

      let response: HttpResponse;
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
          await this.#sleep(networkBackoffMs(attempt));
          continue;
        }

        throw networkError(cause, isMutation, operationName);
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
      const failure = classify(response, payload, rateLimit, operationName);

      if (!failure) {
        this.#allowance.succeeded();
        return { status: response.status, payload };
      }

      // A burst 429: wait it out (plus jitter if another client is competing), then retry.
      if (failure instanceof RateLimitError && failure.window === "burst" && canRetry) {
        await this.#sleep(failure.retryAfterSeconds * 1_000 + this.#allowance.contentionJitterMs(hadRoom));
        this.#allowance.waitedOut();
        continue;
      }

      // A 5xx or timeout: retry reads, never mutations.
      const transient = failure instanceof ServerError || failure instanceof TimeoutError;
      if (transient && !isMutation && canRetry) {
        await this.#sleep(networkBackoffMs(attempt));
        continue;
      }

      throw failure;
    }
  }

  #httpRequest(body: string): HttpRequest {
    return {
      url: this.endpoint,
      headers: {
        authorization: `Bearer ${this.#token}`,
        "content-type": "application/json",
        accept: "application/json",
        "user-agent": this.#userAgent,
      },
      body,
    };
  }
}

function networkError(cause: TransportFailure, isMutation: boolean, operationName: string | undefined): Error {
  const message = cause instanceof Error ? cause.message : String(cause);
  const options = { cause, operationName };

  if (cause.kind === "timeout") {
    return new TimeoutError(`Request timed out: ${message}`, isMutation, options);
  }

  return new NetworkError(`Network failure: ${message}`, isMutation, options);
}
