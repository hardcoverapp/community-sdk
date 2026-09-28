import { describe } from "vitest";
import { HardcoverClient, type Environment } from "../../src/index.ts";

const token = process.env.HARDCOVER_API_KEY;
// Only `pnpm test:live` sets HARDCOVER_LIVE. A key in .env or the shell is just
// a credential: it never turns live calls on by itself, so an IDE or a bare
// `vitest` run over these files stays offline.
const enabled = process.env.HARDCOVER_LIVE === "1";
const environment = (process.env.HARDCOVER_ENV ?? "staging") as Environment;

/** Runs only under `pnpm test:live` with HARDCOVER_API_KEY set; skipped otherwise. */
export const describeLive = enabled && token ? describe : describe.skip;

/** Mutating tests also need HARDCOVER_LIVE_WRITES=1, and prod needs HARDCOVER_I_MEAN_PROD=1. */
export const writesAllowed =
  process.env.HARDCOVER_LIVE_WRITES === "1" && (environment !== "prod" || process.env.HARDCOVER_I_MEAN_PROD === "1");

export function liveClient(): HardcoverClient {
  return new HardcoverClient({
    token: token!,
    environment,
    endpoint: process.env.HARDCOVER_API_URL,
    userAgent: "hardcover-sdk-live-tests",
  });
}

export const target = process.env.HARDCOVER_API_URL ?? environment;
