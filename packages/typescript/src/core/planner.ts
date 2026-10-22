// The request planner (spec/03), used when the client's `batch` option is on.
// Concurrent reads share one HTTP request as a JSON array, identical reads are
// sent once, and mutations are barriers: nothing is grouped, reordered or
// de-duplicated across them.
import { client as constants } from "../generated/client.ts";
import type { OperationInfo } from "../operations.ts";
import { fieldCount } from "./cost.ts";
import {
  HardcoverError,
  InvalidRequestError,
  RequestTooLargeError,
  ScopeError,
  UnsupportedOperationError,
} from "./errors.ts";
import { toData, type Payload, type SendResult } from "./responses.ts";

/** What the planner needs from the client. */
export interface PlannerSender {
  /** Sends one operation on its own and returns its data. */
  execute(query: string, variables: unknown, info: OperationInfo): Promise<unknown>;

  /** Sends a JSON array of read operations, paced and retried like any read. */
  sendArray(body: string, cost: number, operationName: string): Promise<SendResult>;

  /** How many units the next array request can carry. */
  batchRoom(): number;
}

/** A read waiting in the queue. Identical reads share one entry. */
interface Queued {
  query: string;
  variables: unknown;
  info: OperationInfo;
  cost: number;
  callers: { resolve: (data: unknown) => void; reject: (error: unknown) => void }[];
}

const noop = () => {};

export class RequestPlanner {
  readonly #sender: PlannerSender;

  /** Reads waiting to be sent together; a mutation closes it. */
  #run: Map<string, Queued> | undefined;

  /** Settles once the last mutation has. */
  #barrier: Promise<void> = Promise.resolve();

  /** Sends since the last mutation; the next mutation waits for all of them. */
  readonly #inFlight = new Set<Promise<void>>();

  constructor(sender: PlannerSender) {
    this.#sender = sender;
  }

  /**
   * A mutation waits for everything issued before it and holds back
   * everything issued after it.
   */
  mutation(send: () => Promise<unknown>): Promise<unknown> {
    // Reads issued after this mutation start a new run.
    this.#run = undefined;

    const before = Promise.all([this.#barrier, ...this.#inFlight]);
    this.#inFlight.clear();

    const result = before.then(send);
    this.#barrier = result.then(noop, noop);

    return result;
  }

  /** A read that is never grouped (`graphql()`), but still respects mutation barriers. */
  ungrouped(send: () => Promise<unknown>): Promise<unknown> {
    const result = this.#barrier.then(send);
    this.#track(result);

    return result;
  }

  /** A read that joins the current run, or starts one. */
  read(query: string, variables: unknown, info: OperationInfo): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const run = this.#run ?? this.#startRun();
      const caller = { resolve, reject };

      // Identical reads (same query and variables) are sent once and share the answer.
      const key = `${query}\u0000${JSON.stringify(variables ?? null)}`;
      const queued = run.get(key);

      if (queued) {
        queued.callers.push(caller);
      } else {
        run.set(key, { query, variables, info, cost: fieldCount(query), callers: [caller] });
      }
    });
  }

  // ---- Internals ----

  #startRun(): Map<string, Queued> {
    const run = new Map<string, Queued>();
    this.#run = run;

    // One macrotask after the barrier, so reads issued after a few awaits still join.
    const nextTick = () => new Promise((tick) => setTimeout(tick, 0));

    const sent = this.#barrier.then(nextTick).then(() => {
      if (this.#run === run) this.#run = undefined;
      return this.#sendRun([...run.values()]);
    });

    this.#track(sent);
    return run;
  }

  #track(sent: Promise<unknown>): void {
    const settled = sent.then(noop, noop);
    this.#inFlight.add(settled);

    void settled.then(() => this.#inFlight.delete(settled));
  }

  // Sends a run of reads in requests sized to the allowance, one after another
  // so each is paced by the headers of the last. Settles every caller; never throws.
  async #sendRun(pending: Queued[]): Promise<void> {
    while (pending.length > 0) {
      const room = this.#sender.batchRoom();

      // Take reads from the front while they fit; always at least one.
      let cost = pending[0]!.cost;
      let size = 1;
      while (size < pending.length && cost + pending[size]!.cost <= room) {
        cost += pending[size]!.cost;
        size++;
      }

      await this.#sendChunk(pending.splice(0, size));
    }
  }

  async #sendChunk(chunk: Queued[]): Promise<void> {
    if (chunk.length === 1) return this.#sendAlone(chunk[0]!);

    const operationName = chunk.map((item) => item.info.name ?? "anonymous").join(", ");
    const body = JSON.stringify(chunk.map(({ query, variables, info }) => ({ query, variables, operationName: info.name })));
    const cost = Math.max(chunk.reduce((sum, item) => sum + item.cost, 0), constants.cost.minimum);

    let response: SendResult;
    try {
      response = await this.#sender.sendArray(body, cost, operationName);
    } catch (error) {
      // The gateway checks scopes, operation names and size for the whole
      // array. Alone, each item gets its own answer.
      if (rejectsWholeArray(error)) {
        for (const item of chunk) await this.#sendAlone(item);
      } else {
        for (const item of chunk) rejectAll(item, error);
      }
      return;
    }

    const items: unknown = response.payload;
    if (!Array.isArray(items) || items.length !== chunk.length) {
      const error = new HardcoverError("Batch response didn't match the request", { status: response.status, operationName });
      for (const item of chunk) rejectAll(item, error);
      return;
    }

    // Each item has its own answer: data, or its own error.
    chunk.forEach((item, i) => {
      const raw: unknown = items[i];
      const payload = raw && typeof raw === "object" ? (raw as Payload) : undefined;

      try {
        resolveAll(item, toData(payload, response.status, item.info.name));
      } catch (error) {
        rejectAll(item, error);
      }
    });
  }

  #sendAlone(item: Queued): Promise<void> {
    return this.#sender.execute(item.query, item.variables, item.info).then(
      (data) => resolveAll(item, data),
      (error: unknown) => rejectAll(item, error),
    );
  }
}

function rejectsWholeArray(error: unknown): boolean {
  return (
    error instanceof ScopeError ||
    error instanceof UnsupportedOperationError ||
    error instanceof InvalidRequestError ||
    error instanceof RequestTooLargeError
  );
}

function resolveAll(item: Queued, data: unknown): void {
  for (const caller of item.callers) caller.resolve(data);
}

function rejectAll(item: Queued, error: unknown): void {
  for (const caller of item.callers) caller.reject(error);
}
