// Runs the language-neutral pure function vectors in
// shared/conformance/vectors.json. Each case is an input and the output every
// SDK must produce for it; errors are {"error": "<kind>"}.
import { describe, expect, it } from "vitest";
import vectors from "../../../shared/conformance/vectors.json" with { type: "json" };
import { auth } from "../src/generated/auth.ts";
import { requestCost } from "../src/core/cost.ts";
import { localDate } from "../src/core/dates.ts";
import { cleanIsbn } from "../src/core/isbn.ts";
import { parseRateLimit } from "../src/core/rate-limit.ts";
import { normalizeToken } from "../src/core/token.ts";
import { goalProgress } from "../src/resources/goals.ts";
import { decodeCursor, encodeCursor } from "../src/resources/library.ts";

// In the vectors a missing key and null both mean "absent". Round-tripping
// through JSON drops TypeScript's undefined fields so the shapes line up.
const asJson = (value: unknown) => (value === undefined ? null : JSON.parse(JSON.stringify(value)));

// Numbers from division (goal progress) compare within a small tolerance.
const TOLERANCE = 1e-9;

describe("rateLimit", () => {
  it.for(vectors.rateLimit.cases)("$name", ({ in: input, out }) => {
    const { headers, now } = input as unknown as { headers: Record<string, string>; now?: number };

    expect(asJson(parseRateLimit(headers, now))).toEqual(out);
  });
});

describe("requestCost", () => {
  it.for(vectors.requestCost.cases)("$name", ({ in: query, out }) => {
    expect(requestCost(query)).toBe(out);
  });
});

describe("token", () => {
  // Each refusal names the auth.json rule by prefix; the runner checks the
  // thrown message is that rule's message, so messages stay shared too.
  const ruleFor = (prefix: string) => auth.tokens.prefixes.find((rule) => rule.prefix === prefix)!;

  it.for(vectors.token.cases)("$name", ({ in: raw, out }) => {
    const warnings: string[] = [];
    const expected = out as { token?: string; warning?: string; error?: string; prefix?: string };

    if (expected.error === "missingToken") {
      expect(() => normalizeToken(raw, () => {})).toThrow(new TypeError(auth.tokens.missingMessage));
      return;
    }

    if (expected.error === "refusedToken") {
      expect(() => normalizeToken(raw, () => {})).toThrow(new TypeError(ruleFor(expected.prefix!).message));
      return;
    }

    expect(normalizeToken(raw, (message) => warnings.push(message))).toBe(expected.token);

    const expectedWarnings = expected.warning ? [ruleFor(expected.warning).message] : [];
    expect(warnings).toEqual(expectedWarnings);
  });
});

describe("isbn", () => {
  it.for(vectors.isbn.cases)("$name", ({ in: code, out }) => {
    expect(cleanIsbn(code)).toBe(out);
  });
});

describe("localDate", () => {
  it.for(vectors.localDate.cases)("$name", ({ in: input, out }) => {
    expect(localDate(new Date(input.instant), input.timeZone)).toBe(out);
  });
});

describe("goalProgress", () => {
  it.for(vectors.goalProgress.cases)("$name", ({ in: goal, out }) => {
    const progress = goalProgress(goal);

    expect(progress.target).toBe(out.target);
    expect(Math.abs(progress.current - out.current)).toBeLessThan(TOLERANCE);
    expect(Math.abs(progress.percent - out.percent)).toBeLessThan(TOLERANCE);
  });
});

describe("libraryCursor", () => {
  it.for(vectors.libraryCursor.encode)("encode: $name", ({ in: row, out }) => {
    expect(encodeCursor(row)).toBe(out);
  });

  it.for(vectors.libraryCursor.decode)("decode: $name", ({ in: cursor, out }) => {
    // invalidCursor maps to RangeError, TypeScript's argument-out-of-range error.
    if ("error" in out) {
      expect(out.error).toBe("invalidCursor");
      expect(() => decodeCursor(cursor)).toThrow(RangeError);
      return;
    }

    expect(decodeCursor(cursor)).toEqual(out);
  });
});
