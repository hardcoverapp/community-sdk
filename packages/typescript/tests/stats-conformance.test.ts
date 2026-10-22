// Runs the language-neutral stats cases in shared/conformance/stats.json.
// Library rows arrive in the API's snake_case; this SDK's queries alias them
// to camelCase, so the runner does the same rename (JSON columns keep their
// stored keys, as the API returns them).
import { describe, expect, it } from "vitest";
import doc from "../../../shared/conformance/stats.json" with { type: "json" };
import { computeStats, period, type StatsData, type StatsPeriod } from "../src/stats/index.ts";

type Json = null | boolean | number | string | Json[] | { [key: string]: Json };

const camel = (key: string) => key.replace(/_([a-z0-9])/g, (_, c: string) => c.toUpperCase());

// snake_case keys to camelCase, leaving JSON columns (cached_*) untouched.
function toSdkShape(value: Json): Json {
  if (Array.isArray(value)) return value.map(toSdkShape);
  if (!value || typeof value !== "object") return value;

  return Object.fromEntries(
    Object.entries(value).map(([key, inner]) => [camel(key), key.startsWith("cached_") ? inner : toSdkShape(inner)]),
  );
}

// Compares only what `expected` lists; keys match ignoring case and
// underscores, numbers within 1e-9.
function expectMatch(actual: unknown, expected: Json, path = "result"): void {
  if (typeof expected === "number") {
    expect(typeof actual, path).toBe("number");
    expect(Math.abs((actual as number) - expected), `${path}: ${actual} vs ${expected}`).toBeLessThan(1e-9);
    return;
  }

  if (Array.isArray(expected)) {
    expect(Array.isArray(actual), path).toBe(true);
    expect((actual as unknown[]).length, `${path}.length`).toBe(expected.length);
    expected.forEach((item, i) => expectMatch((actual as unknown[])[i], item, `${path}[${i}]`));
    return;
  }

  if (expected && typeof expected === "object") {
    const normalize = (key: string) => key.replace(/_/g, "").toLowerCase();
    const byKey = new Map(Object.entries(actual as object).map(([key, value]) => [normalize(key), value]));

    for (const [key, value] of Object.entries(expected)) {
      expect(byKey.has(normalize(key)), `${path}.${key} is missing`).toBe(true);
      expectMatch(byKey.get(normalize(key)), value, `${path}.${key}`);
    }
    return;
  }

  expect(actual, path).toEqual(expected);
}

describe("stats conformance", () => {
  for (const c of doc.cases) {
    it(c.id, () => {
      const data = {
        library: toSdkShape(c.library as Json),
        // Root fields keep the API's names; only the fields inside are aliased.
        contributorRoles: Object.fromEntries(
          Object.entries(c.contributorRoles).map(([root, rows]) => [root, toSdkShape(rows as Json)]),
        ),
      } as unknown as StatsData;

      const result = computeStats(data, c.period as StatsPeriod);

      expectMatch(result, c.expect as unknown as Json);
    });
  }
});

describe("stats conformance: periods", () => {
  type Call = { kind: string; year?: number; month?: number; from?: string; to?: string; now?: string; timeZone?: string };

  const build = (call: Call): StatsPeriod => {
    const today = { now: new Date(call.now ?? 0), timeZone: call.timeZone };

    switch (call.kind) {
      case "year": return period.year(call.year!);
      case "month": return period.month(call.year!, call.month!);
      case "custom": return period.custom(call.from!, call.to!);
      case "thisYear": return period.thisYear(today);
      case "thisMonth": return period.thisMonth(today);
      default: return period.life();
    }
  };

  for (const p of doc.periods) {
    it(p.name, () => {
      if ("error" in p.out) {
        expect(() => build(p.call as Call)).toThrow(RangeError);
        return;
      }

      expect(build(p.call as Call)).toEqual(p.out);
    });
  }
});
