import { defineConfig } from "vite";

// Use the SDK's source directly (its "@hardcover/source" export condition),
// so changes show up without building the package.
export default defineConfig({
  resolve: { conditions: ["@hardcover/source"] },
});
