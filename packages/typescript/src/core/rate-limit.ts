// Parses the gateway's rate-limit headers:
//   RateLimit-Policy: "<Tier>";q=60;w=60;burst=10, "daily";q=5000;w=86400
//   RateLimit:        "<Tier>";r=9;t=1, "daily";r=4999;t=86000
// Once the daily cap is spent, the tier entry is dropped from RateLimit.

export interface RateLimitState {
  tier?: string;
  burst?: { limit?: number; perMinute?: number; remaining?: number; resetSeconds?: number };
  daily?: { limit?: number; remaining?: number; resetSeconds?: number };
}

const DAILY = "daily";

type Params = Record<string, number>;

function splitUnquoted(text: string, sep: string): string[] {
  const parts: string[] = [];
  let start = 0;
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '"') quoted = !quoted;
    else if (text[i] === sep && !quoted) {
      parts.push(text.slice(start, i));
      start = i + 1;
    }
  }
  parts.push(text.slice(start));
  return parts;
}

// The server only emits `"name";k=v;k=v, "name";k=v` with non-negative integer values, so splitting is enough.
function parseList(header: string | undefined): Map<string, Params> {
  const items = new Map<string, Params>();

  for (const item of splitUnquoted(header ?? "", ",")) {
    const [rawName = "", ...pairs] = splitUnquoted(item, ";");
    const name = rawName.trim().replace(/^"|"$/g, "");
    if (!name) continue;

    const params: Params = {};
    for (const pair of pairs) {
      const [key = "", value] = pair.split("=").map((s) => s.trim());
      const n = num(value);
      if (key && n !== undefined) params[key.toLowerCase()] = n;
    }

    items.set(name, params);
  }
  return items;
}

// Non-negative safe integers only
function num(value: string | undefined): number | undefined {
  if (value === undefined || !/^\d+$/.test(value)) return undefined;
  const n = Number(value);
  return Number.isSafeInteger(n) ? n : undefined;
}

export function parseRateLimit(
  headers: Record<string, string>,
  nowSeconds = Math.floor(Date.now() / 1000),
): RateLimitState | undefined {
  const policy = parseList(headers["ratelimit-policy"]);
  const current = parseList(headers["ratelimit"]);

  if (policy.size || current.size) {
    const state: RateLimitState = {};
    for (const name of new Set([...policy.keys(), ...current.keys()])) {
      const policyValues = policy.get(name) ?? {};
      const currentValues = current.get(name) ?? {};

      if (name === DAILY) {
        state.daily = {
          limit: policyValues.q,
          remaining: currentValues.r,
          resetSeconds: currentValues.t,
        };
      } else {
        const minuteWindow = (policyValues.w ?? 60) / 60;

        state.tier = name;
        state.burst = {
          limit: policyValues.burst,
          perMinute: policyValues.q ? policyValues.q / minuteWindow : undefined,
          remaining: currentValues.r,
          resetSeconds: currentValues.t,
        };
      }
    }
    return state;
  }

  const limit = num(headers["x-ratelimit-limit"]);
  const dailyLimit = num(headers["x-ratelimit-daily-limit"]);
  if (limit === undefined && dailyLimit === undefined) return undefined;

  const resetIn = (epoch: number | undefined) => (epoch === undefined ? undefined : Math.max(0, epoch - nowSeconds));
  return {
    burst: {
      limit,
      remaining: num(headers["x-ratelimit-remaining"]),
      resetSeconds: resetIn(num(headers["x-ratelimit-reset"])),
    },
    daily: {
      limit: dailyLimit,
      remaining: num(headers["x-ratelimit-daily-remaining"]),
      resetSeconds: resetIn(num(headers["x-ratelimit-daily-reset"])),
    },
  };
}
