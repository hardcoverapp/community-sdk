// The client's view of its rate-limit allowance (spec/03, Pacing and
// Contention backoff). It decides how long a request waits before going out,
// how big a batch can be, and how much jitter a 429 earns. It never sends
// anything itself: the client asks it before and after each request.
import { client as constants } from "../generated/client.ts";
import { parseRateLimit, type RateLimitState } from "./rate-limit.ts";

/**
 * Burst capacity of the smallest tier (free, halved for legacy JWTs). Until
 * the first response brings real numbers, pacing and batching assume this.
 */
export const SMALLEST_BURST_CAPACITY = constants.pacing.smallestBurstCapacity;

export interface AllowanceOptions {
  /** Wait for the allowance before sending (the client's `pace` option). */
  pace: boolean;

  now: () => Date;
  sleep: (ms: number) => Promise<void>;

  /** 0 ≤ x < 1, for contention jitter. */
  random: () => number;

  onRateLimit?: (state: RateLimitState) => void;
}

export class Allowance {
  readonly #options: AllowanceOptions;

  /** The most recent rate-limit headers, and when they arrived (ms from `now`). */
  #state: RateLimitState | undefined;
  #stateAt = 0;

  /** Set after waiting out a 429; the wait already covered the refill. Cleared by the next headers. */
  #waitedOut = false;

  /** The server answered without rate-limit headers, so there's nothing to pace by. */
  #unreported = false;

  /** Cost of requests that have taken their share of the allowance and haven't been answered yet. */
  #reserved = 0;

  /** Requests waiting for the first rate-limit headers (cold start). */
  #waitingForAnswer: (() => void)[] = [];

  /** 429s in a row, and how many of those were contention. */
  #consecutive429 = 0;
  #contended429 = 0;

  constructor(options: AllowanceOptions) {
    this.#options = options;
  }

  /** The most recent rate-limit headers, parsed. */
  get state(): RateLimitState | undefined {
    return this.#state;
  }

  // ---- Before and after each request ----

  /**
   * Takes this request's cost from the allowance, waiting first if it's short.
   * Every request reserves before it goes out and releases when it's answered,
   * so requests sent at the same moment queue behind each other instead of
   * all spending the same remaining units.
   *
   * The check and the reservation happen without yielding in between;
   * otherwise every request sent in the same tick would see the same total.
   */
  async reserve(cost: number): Promise<void> {
    if (!this.#options.pace) {
      this.#reserved += cost;
      return;
    }

    // Cold start: before any response, the client doesn't know its tier.
    // Send up to the smallest tier's burst, then wait for an answer to learn
    // the real numbers (spec/06 #29).
    while (this.#coldAndFull(cost)) {
      await new Promise<void>((wake) => this.#waitingForAnswer.push(wake));
    }

    const waitMs = this.#waitMs(cost);
    this.#reserved += cost;
    if (waitMs <= 0) return;

    try {
      await this.#options.sleep(waitMs);
    } catch (error) {
      this.release(cost);
      throw error;
    }
  }

  /** Gives a request's cost back once it's answered (or failed to send). */
  release(cost: number): void {
    this.#reserved -= cost;

    // Anyone held for the first headers can look again.
    const waiting = this.#waitingForAnswer;
    this.#waitingForAnswer = [];
    for (const wake of waiting) wake();
  }

  /**
   * Reads a response's rate-limit headers. Returns them parsed, or undefined
   * when the response had none.
   */
  update(headers: Record<string, string>): RateLimitState | undefined {
    const state = parseRateLimit(headers);

    if (state) {
      this.#state = state;
      this.#stateAt = this.#options.now().getTime();
      this.#waitedOut = false;
      this.#options.onRateLimit?.(state);
    } else if (!this.#state) {
      this.#unreported = true;
    }

    return state;
  }

  // ---- 429s ----

  /**
   * Did the last headers say there was room for a request of this cost, after
   * what this client's other requests had already reserved? Ask before
   * `update()`, to tell contention from an ordinary 429.
   */
  hadRoomFor(cost: number): boolean {
    const remaining = this.#state?.burst?.remaining;
    if (remaining === undefined || this.#waitedOut) return false;

    const reservedByOthers = this.#reserved - cost;
    return remaining - reservedByOthers >= cost;
  }

  /**
   * Extra wait on top of a 429's Retry-After. A 429 despite headers showing
   * room, or a repeat 429, means another client for this user is spending the
   * shared budget. Full jitter that grows with each contended 429 spreads
   * competing clients out instead of waking them together. Ordinary 429s add
   * nothing.
   */
  contentionJitterMs(hadRoom: boolean): number {
    const contended = hadRoom || this.#consecutive429 > 0;
    this.#consecutive429++;
    if (!contended) return 0;

    this.#contended429++;
    const { baseMs, capMs } = constants.pacing.contentionJitter;

    return this.#options.random() * Math.min(capMs, baseMs * 2 ** this.#contended429);
  }

  /** A 429 was waited out: that wait covered the refill, so don't wait again until new headers. */
  waitedOut(): void {
    this.#waitedOut = true;
  }

  /** A request succeeded: the 429 streak is over. */
  succeeded(): void {
    this.#consecutive429 = 0;
    this.#contended429 = 0;
  }

  // ---- Batching ----

  /**
   * How many units the next array request can carry: the allowance as it
   * stands now, never more than the tier's burst, and always at least one.
   */
  batchRoom(): number {
    const capacity = this.#state?.burst?.limit ?? SMALLEST_BURST_CAPACITY;
    const remaining = this.#remainingNow() ?? capacity;

    return Math.max(1, Math.min(capacity, remaining));
  }

  // ---- Internals ----

  // The last reported allowance plus what has refilled since. Without this, a
  // client that sat idle would keep splitting batches by an old, low number.
  #remainingNow(): number | undefined {
    const burst = this.#state?.burst;
    if (burst?.remaining === undefined) return undefined;
    if (!burst.perMinute) return burst.remaining;

    const elapsedSeconds = (this.#options.now().getTime() - this.#stateAt) / 1_000;
    const refilled = burst.remaining + elapsedSeconds * (burst.perMinute / 60);

    return Math.floor(Math.min(refilled, burst.limit ?? refilled));
  }

  #coldAndFull(cost: number): boolean {
    const cold = !this.#state?.burst && !this.#unreported;
    const somethingInFlight = this.#reserved > 0;
    const wouldExceed = this.#reserved + cost > SMALLEST_BURST_CAPACITY;

    return cold && somethingInFlight && wouldExceed;
  }

  // How long this request waits for the allowance, counting what's already
  // reserved ahead of it: the remaining units minus those, refilled over time.
  #waitMs(cost: number): number {
    const burst = this.#state?.burst;
    if (this.#waitedOut || burst?.remaining === undefined) return 0;

    const available = burst.remaining - this.#reserved;
    const shortfall = cost - available;
    if (shortfall <= 0) return 0;

    // Empty bucket: at least the announced reset. Partial: time to refill the shortfall.
    const perSecond = burst.perMinute ? burst.perMinute / 60 : undefined;
    const refillSeconds = perSecond ? shortfall / perSecond : (burst.resetSeconds ?? 0);
    const resetSeconds = burst.remaining === 0 ? (burst.resetSeconds ?? 0) : 0;
    const waitSeconds = Math.max(resetSeconds, refillSeconds);

    const alreadyPassedMs = this.#options.now().getTime() - this.#stateAt;
    return waitSeconds * 1_000 - alreadyPassedMs;
  }
}
