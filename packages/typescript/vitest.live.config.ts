import { existsSync } from "node:fs";
import { defineConfig } from "vitest/config";

// Live tests hit a real API (spec/04-testing.md#layer-3-live-integration).
// Values come from the environment, or from the repo's gitignored .env;
// variables already set in the shell win.
const envFile = new URL("../../.env", import.meta.url);
if (existsSync(envFile)) process.loadEnvFile(envFile);

// `pnpm test:live` runs reads. `pnpm test:live:writes` (--mode writes) also runs
// tests that change data as a real user would. Both opt-ins are set here, never
// from .env, so nothing turns live calls or writes on implicitly.
export default defineConfig(({ mode }) => ({
  test: {
    include: ["tests/live/**/*.test.ts"],
    env: { HARDCOVER_LIVE: "1", HARDCOVER_LIVE_WRITES: mode === "writes" ? "1" : "0" },
    fileParallelism: false,
    testTimeout: 30_000,
  },
}));
