import type { CodegenConfig } from "@graphql-codegen/cli";

// Types come from the shared operations and the frozen snapshot, never from
// the live API. See spec/03-sdk-design.md#principles.
const config: CodegenConfig = {
  schema: "../../api-snapshot/schema.graphql",
  // Shared operations rewritten with camelCase aliases (pnpm codegen does this first).
  documents: ".operations/**/*.graphql",
  generates: {
    "src/generated/graphql.ts": {
      plugins: ["typescript-operations", "typed-document-node"],
      config: {
        documentMode: "string",
        enumsAsTypes: true,
        avoidOptionals: { field: true, inputValue: false, object: false },
        scalars: {
          bigint: "number",
          citext: "string",
          date: "string",
          float8: "number",
          jsonb: "unknown",
          numeric: "number",
          smallint: "number",
          timestamp: "string",
          timestamptz: "string",
        },
      },
    },
  },
};

export default config;
