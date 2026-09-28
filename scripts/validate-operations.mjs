#!/usr/bin/env node
// Validates every document in shared/operations against api-snapshot/schema.graphql.
// This is the offline half of the contract tests (spec/04-testing.md).
// Usage: node scripts/validate-operations.mjs [path/to/schema.graphql]
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { buildSchema, parse, validate, concatAST } from "graphql";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const schemaPath = process.argv[2] ?? join(root, "api-snapshot/schema.graphql");
const schema = buildSchema(readFileSync(schemaPath, "utf8"));

const walk = (dir) =>
  readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : p.endsWith(".graphql") ? [p] : [];
  });

const files = walk(join(root, "shared/operations"));
const doc = concatAST(files.map((f) => parse(readFileSync(f, "utf8"))));
const errors = validate(schema, doc);

const ops = doc.definitions.filter((d) => d.kind === "OperationDefinition");
const frags = doc.definitions.filter((d) => d.kind === "FragmentDefinition");
if (errors.length) {
  for (const e of errors) console.error(`- ${e.message}`);
  console.error(`\n${errors.length} error(s) against ${relative(root, schemaPath)}`);
  process.exit(1);
}
console.log(`${ops.length} operations, ${frags.length} fragments valid against ${relative(root, schemaPath)}`);
