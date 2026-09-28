// Header formats come from app/api/app/controllers/api/application_controller.rb.
import { describe, expect, it } from "vitest";
import { parseRateLimit } from "../src/core/rate-limit.ts";

describe("parseRateLimit", () => {
  it("reads the IETF RateLimit and RateLimit-Policy headers", () => {
    const state = parseRateLimit({
      "ratelimit-policy": '"Free";q=60;w=60;burst=10, "daily";q=5000;w=86400',
      ratelimit: '"Free";r=9;t=1, "daily";r=4999;t=86000',
    });

    expect(state).toEqual({
      tier: "Free",
      burst: { limit: 10, perMinute: 60, remaining: 9, resetSeconds: 1 },
      daily: { limit: 5000, remaining: 4999, resetSeconds: 86000 },
    });
  });

  it("handles the tier entry being dropped once the daily cap is spent", () => {
    const state = parseRateLimit({
      "ratelimit-policy": '"Supporter";q=60;w=60;burst=15, "daily";q=50000;w=86400',
      ratelimit: '"daily";r=0;t=40000',
    });

    expect(state?.tier).toBe("Supporter");
    expect(state?.daily).toEqual({ limit: 50000, remaining: 0, resetSeconds: 40000 });
    expect(state?.burst?.remaining).toBeUndefined();
  });

  it("keeps a quoted tier name with a suffix intact", () => {
    const state = parseRateLimit({
      "ratelimit-policy": '"Free (JWT)";q=60;w=60;burst=5, "daily";q=5000;w=86400',
      ratelimit: '"Free (JWT)";r=4;t=1, "daily";r=10;t=100',
    });

    expect(state?.tier).toBe("Free (JWT)");
    expect(state?.burst).toMatchObject({ limit: 5, remaining: 4 });
  });

  it("falls back to legacy X-RateLimit headers", () => {
    const now = 1_800_000_000;
    const state = parseRateLimit(
      {
        "x-ratelimit-limit": "10",
        "x-ratelimit-remaining": "7",
        "x-ratelimit-reset": String(now + 3),
        "x-ratelimit-daily-limit": "5000",
        "x-ratelimit-daily-remaining": "4990",
        "x-ratelimit-daily-reset": String(now + 500),
      },
      now,
    );

    expect(state).toEqual({
      burst: { limit: 10, remaining: 7, resetSeconds: 3 },
      daily: { limit: 5000, remaining: 4990, resetSeconds: 500 },
    });
  });

  it("returns undefined when no rate-limit headers are present", () => {
    expect(parseRateLimit({ "content-type": "application/json" })).toBeUndefined();
  });
});
