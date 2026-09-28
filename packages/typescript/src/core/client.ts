import type { DocumentTypeDecoration } from "@graphql-typed-document-node/core";
import environments from "../../../../shared/environments.json" with { type: "json" };
import { operationInfo, type OperationInfo } from "../operations.ts";
import { requestCost } from "./cost.ts";
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
import { LibraryResource } from "../resources/library.ts";
import { ListsResource } from "../resources/lists.ts";
import { MeResource } from "../resources/me.ts";
import { ReadsResource } from "../resources/reads.ts";
import { parseRateLimit, type RateLimitState } from "./rate-limit.ts";
import { fetchTransport, TransportFailure, type HttpResponse, type Transport } from "./transport.ts";

export type Environment = "prod" | "staging" | "local";

export interface HardcoverClientOptions {
  /** A personal access token (`hc_pat_...`) or OAuth access token. */
  token: string;
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
  /** Injectable clock for date defaults and pacing; defaults to the current time. */
  now?: () => Date;
  /**
   * Wait for the burst allowance to refill before sending, when the last
   * response said it's spent, instead of sending and getting a 429.
   * Default true. The daily cap is never waited out.
   */
  pace?: boolean;
}

const NETWORK_BACKOFF_MS = [250, 1_000, 4_000];
const SDK_USER_AGENT = "hardcover-sdk-typescript/0.0.0";

type Payload = {
  data?: Record<string, unknown> | null;
  errors?: unknown;
  error?: unknown;
  error_description?: unknown;
  message?: unknown;
  scope?: unknown;
};

export class HardcoverClient {
  /** Rate-limit state from the most recent response that carried headers. */
  rateLimit: RateLimitState | undefined;

  readonly endpoint: string;
  readonly now: () => Date;
  readonly me: MeResource;
  readonly library: LibraryResource;
  readonly reads: ReadsResource;
  readonly lists: ListsResource;
  readonly #token: string;
  readonly #transport: Transport;
  readonly #maxRetries: number;
  readonly #userAgent: string;
  readonly #sleep: (ms: number) => Promise<void>;
  readonly #onRateLimit: ((state: RateLimitState) => void) | undefined;
  readonly #pace: boolean;
  /** When `rateLimit` was received, in ms from `now()`. */
  #rateLimitAt = 0;
  /** Set after waiting out a 429; the wait already covered the refill. Cleared by the next headers. */
  #allowanceWaited = false;

  constructor(options: HardcoverClientOptions) {
    this.endpoint = options.endpoint ?? environments[options.environment ?? "prod"].graphql;
    this.#token = options.token;
    this.#transport = options.transport ?? fetchTransport({ timeoutMs: options.timeoutMs });
    this.#maxRetries = options.maxRetries ?? 3;
    this.#userAgent = options.userAgent ? `${options.userAgent} ${SDK_USER_AGENT}` : SDK_USER_AGENT;
    this.#sleep = options.sleep ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));
    this.#onRateLimit = options.onRateLimit;
    this.now = options.now ?? (() => new Date());
    this.#pace = options.pace ?? true;
    this.me = new MeResource(this);
    this.library = new LibraryResource(this);
    this.reads = new ReadsResource(this);
    this.lists = new ListsResource(this);
  }

  /** Runs a generated operation, e.g. `client.request(operations.Me)`. */
  request<TResult, TVariables>(
    document: DocumentTypeDecoration<TResult, TVariables>,
    ...[variables]: TVariables extends Record<string, never> ? [variables?: TVariables] : [variables: TVariables]
  ): Promise<TResult> {
    return this.#execute(String(document), variables, operationInfo(document)) as Promise<TResult>;
  }

  /** Escape hatch: any query the token's scopes allow, with the same auth, retries and errors. */
  graphql<TResult = unknown>(query: string, variables?: Record<string, unknown>): Promise<TResult> {
    return this.#execute(query, variables, operationInfo(query)) as Promise<TResult>;
  }

  async #execute(query: string, variables: unknown, info: OperationInfo): Promise<unknown> {
    const isMutation = info.kind === "mutation";
    const cost = requestCost(query);
    const request = {
      url: this.endpoint,
      headers: {
        authorization: `Bearer ${this.#token}`,
        "content-type": "application/json",
        accept: "application/json",
        "user-agent": this.#userAgent,
      },
      body: JSON.stringify({ query, variables, operationName: info.name }),
    };

    for (let attempt = 0; ; attempt++) {
      const canRetry = attempt < this.#maxRetries;
      let response: HttpResponse;
      await this.#waitForAllowance(cost);

      try {
        response = await this.#transport.send(request);
      } catch (cause) {
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
          throw new TimeoutError(`Request timed out: ${message}`, isMutation, { cause });
        }
        throw new NetworkError(`Network failure: ${message}`, isMutation, { cause });
      }

      const rateLimit = parseRateLimit(response.headers);
      if (rateLimit) {
        this.rateLimit = rateLimit;
        this.#rateLimitAt = this.now().getTime();
        this.#allowanceWaited = false;
        this.#onRateLimit?.(rateLimit);
      }

      const payload = parseBody(response.body);
      const failure = classify(response, payload, rateLimit);

      if (failure) {
        if (failure instanceof RateLimitError && failure.window === "burst" && canRetry) {
          await this.#sleep(failure.retryAfterSeconds * 1_000);
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

      if (!payload) {
        throw new HardcoverError("Response was not valid JSON", { status: response.status });
      }
      if (Array.isArray(payload.errors) && payload.errors.length > 0) {
        throw new GraphQLError(payload.errors.map(toErrorDetail), payload.data ?? null, { status: response.status });
      }

      const data = payload.data ?? {};
      assertNoActionErrors(data);
      return data;
    }
  }
  // Pacing: if the last response left less burst allowance than this request
  // costs, sleep until enough has refilled, minus time already passed. Uses
  // only headers the gateway sends; a 429 is still handled (and retried) if
  // pacing is off or another client shares the token.
  async #waitForAllowance(cost: number): Promise<void> {
    const burst = this.rateLimit?.burst;
    if (!this.#pace || this.#allowanceWaited || burst?.remaining === undefined) return;
    const shortfall = cost - burst.remaining;
    if (shortfall <= 0) return;
    const perSecond = burst.perMinute ? burst.perMinute / 60 : undefined;
    // Empty bucket: at least the announced reset. Partial: time to refill the shortfall.
    const waitSeconds = Math.max(
      burst.remaining === 0 ? (burst.resetSeconds ?? 0) : 0,
      perSecond ? shortfall / perSecond : (burst.resetSeconds ?? 0),
    );
    const waitMs = waitSeconds * 1_000 - (this.now().getTime() - this.#rateLimitAt);
    if (waitMs > 0) await this.#sleep(waitMs);
  }
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
): HardcoverError | undefined {
  const { status } = response;
  if (status >= 200 && status < 300) return undefined;

  const code = str(payload?.error);
  const firstError = Array.isArray(payload?.errors) ? str(payload.errors[0]) : undefined;
  const message = str(payload?.error_description) ?? str(payload?.message) ?? code ?? firstError ?? `HTTP ${status}`;
  const options = { status };

  if (status === 401) return new AuthenticationError(message, options);

  if (status === 403) {
    if (code === "insufficient_scope") return new ScopeError(message, str(payload?.scope), options);
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
function assertNoActionErrors(data: Record<string, unknown>): void {
  for (const [field, value] of Object.entries(data)) {
    if (!value || typeof value !== "object" || Array.isArray(value)) continue;
    const envelope = value as { error?: unknown; errors?: unknown };
    const messages: string[] = [];
    if (typeof envelope.error === "string" && envelope.error) messages.push(envelope.error);
    if (Array.isArray(envelope.errors)) messages.push(...envelope.errors.map(String));
    if (messages.length > 0) throw new ActionError(field, messages, data);
  }
}
