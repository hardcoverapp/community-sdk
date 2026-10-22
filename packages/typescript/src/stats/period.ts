// Stats periods: life, or an inclusive range of local calendar dates.
// Read dates are calendar dates (no time of day), so a period needs no time
// zone; only "this year" and "this month" ask for one, to know today's date.
import { localDate } from "../core/dates.ts";

/** A span of reading to compute stats over. */
export type StatsPeriod =
  | { kind: "life" }
  | {
      kind: "year" | "month" | "custom";
      /** First day, inclusive (YYYY-MM-DD). */
      from: string;
      /** Last day, inclusive (YYYY-MM-DD). */
      to: string;
    };

/** Where "today" is, for `thisYear` and `thisMonth`. */
export interface TodayOptions {
  /** An IANA zone such as "America/Chicago". Defaults to the device's zone. */
  timeZone?: string;
  /** For tests. Defaults to now. */
  now?: Date;
}

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const pad = (n: number) => String(n).padStart(2, "0");

// The last day of a month, from day 0 of the next one.
const lastDay = (year: number, month: number) => new Date(Date.UTC(year, month, 0)).getUTCDate();

/** Builders for the periods `computeStats` and `readingStats` take. */
export const period = {
  /** Everything, including reads with no finish date. */
  life(): StatsPeriod {
    return { kind: "life" };
  },

  /** January 1 through December 31. */
  year(year: number): StatsPeriod {
    requireInteger(year, "year");

    return { kind: "year", from: `${year}-01-01`, to: `${year}-12-31` };
  },

  /** A calendar month; `month` is 1 for January through 12 for December. */
  month(year: number, month: number): StatsPeriod {
    requireInteger(year, "year");
    if (!Number.isInteger(month) || month < 1 || month > 12) {
      throw new RangeError(`month must be 1 to 12, got ${month}`);
    }

    return { kind: "month", from: `${year}-${pad(month)}-01`, to: `${year}-${pad(month)}-${pad(lastDay(year, month))}` };
  },

  /** Any range of days, both ends included (YYYY-MM-DD). */
  custom(from: string, to: string): StatsPeriod {
    if (!DATE.test(from) || !DATE.test(to)) throw new RangeError("from and to must be dates like 2025-03-01");
    if (from > to) throw new RangeError(`from (${from}) is after to (${to})`);

    return { kind: "custom", from, to };
  },

  /** The current year in the reader's time zone. */
  thisYear({ timeZone, now = new Date() }: TodayOptions = {}): StatsPeriod {
    return period.year(Number(localDate(now, timeZone).slice(0, 4)));
  },

  /** The current month in the reader's time zone. */
  thisMonth({ timeZone, now = new Date() }: TodayOptions = {}): StatsPeriod {
    const today = localDate(now, timeZone);

    return period.month(Number(today.slice(0, 4)), Number(today.slice(5, 7)));
  },
};

function requireInteger(value: number, name: string): void {
  if (!Number.isInteger(value)) throw new RangeError(`${name} must be a whole number, got ${value}`);
}
