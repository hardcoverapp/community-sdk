import { existsSync } from "node:fs";
import { defineConfig } from "vitest/config";

// Live tests hit a real API (spec/04-testing.md#layer-3-live-integration).
// Values come from the environment, or from the repo's gitignored .env;
// variables already set in the shell win.
const envFile = new URL("../../.env", import.meta.url);
if (existsSync(envFile)) process.loadEnvFile(envFile);

export default defineConfig({
  test: {
    include: ["tests/live/**/*.test.ts"],
    // The explicit opt-in. tests/live/setup.ts skips everything without it.
    env: { HARDCOVER_LIVE: "1" },
    fileParallelism: false,
    testTimeout: 30_000,
  },
});
