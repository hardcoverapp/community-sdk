import { defineConfig } from "vitest/config";

export default defineConfig({
  // Run against src/, not dist/ (the package's "@hardcover/source" export condition).
  resolve: { conditions: ["@hardcover/source"] },
  test: {
    include: ["tests/**/*.test.ts"],
    exclude: ["tests/live/**"],
  },
});
