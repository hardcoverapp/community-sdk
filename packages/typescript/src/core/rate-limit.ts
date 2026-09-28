// Parses the gateway's rate-limit headers. Formats are defined in
// app/api/app/controllers/api/application_controller.rb:
//   RateLimit-Policy: "<Tier>";q=60;w=60;burst=10, "daily";q=5000;w=86400
//   RateLimit:        "<Tier>";r=9;t=1, "daily";r=4999;t=86000
// Once the daily cap is spent, the tier entry is dropped from RateLimit.

export interface RateLimitState {
  tier?: string;
  burst?: { limit?: number; perMinute?: number; remaining?: number; resetSeconds?: number };
  daily?: { limit?: number; remaining?: number; resetSeconds?: number };
}

const DAILY = "daily";

interface ListItem {
  name: string;
  params: Record<string, number>;
}

// Minimal structured-field list parser: `"name";k=v;k=v, "name";k=v`.
function parseList(header: string): ListItem[] {
  const items: ListItem[] = [];
  for (const match of header.matchAll(/"([^"]*)"((?:\s*;\s*[a-z]+=[^;,]*)*)/gi)) {
    const params: Record<string, number> = {};
    for (const [, key, value] of match[2]!.matchAll(/;\s*([a-z]+)=([^;,]*)/gi)) {
      const n = Number(value!.trim());
      if (Number.isFinite(n)) params[key!.toLowerCase()] = n;
    }
    items.push({ name: match[1]!, params });
  }
  return items;
}

function num(value: string | undefined): number | undefined {
  if (value === undefined) return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

export function parseRateLimit(
  headers: Record<string, string>,
  nowSeconds = Math.floor(Date.now() / 1000),
): RateLimitState | undefined {
  const policy = headers["ratelimit-policy"];
  const current = headers["ratelimit"];

  if (policy !== undefined || current !== undefined) {
    const state: RateLimitState = {};
    for (const { name, params } of parseList(policy ?? "")) {
      if (name === DAILY) {
        state.daily = { ...state.daily, limit: params.q };
      } else {
        state.tier = name;
        state.burst = { ...state.burst, limit: params.burst, perMinute: params.q };
      }
    }
    for (const { name, params } of parseList(current ?? "")) {
      if (name === DAILY) {
        state.daily = { ...state.daily, remaining: params.r, resetSeconds: params.t };
      } else {
        state.tier ??= name;
        state.burst = { ...state.burst, remaining: params.r, resetSeconds: params.t };
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
