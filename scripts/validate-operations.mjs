#!/usr/bin/env node
// Validates every document in shared/operations against api-snapshot/schema.graphql.
// This is the offline half of the contract tests (spec/04-testing.md).
import { readFileSync } from "node:fs";
import { join, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { buildSchema, parse, validate, concatAST } from "graphql";
import { walk } from "./lib.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
// Usage: validate-operations.mjs [--dir <operations dir>] [schema.graphql]
const dirFlag = process.argv.indexOf("--dir");
const opsDir = dirFlag === -1 ? join(root, "shared/operations") : process.argv[dirFlag + 1];
const positional = process.argv.slice(2).filter((a, i, all) => a !== "--dir" && all[i - 1] !== "--dir");
const schemaPath = positional[0] ?? join(root, "api-snapshot/schema.graphql");
const schema = buildSchema(readFileSync(schemaPath, "utf8"));


const files = walk(opsDir);
const doc = concatAST(files.map((f) => parse(readFileSync(f, "utf8"))));
const errors = validate(schema, doc);

const ops = doc.definitions.filter((d) => d.kind === "OperationDefinition");
const frags = doc.definitions.filter((d) => d.kind === "FragmentDefinition");
if (errors.length) {
  for (const e of errors) console.error(`- ${e.message}`);
  console.error(`\n${errors.length} error(s) against ${relative(root, schemaPath)}`);
  process.exit(1);
}
console.log(`${ops.length} operations, ${frags.length} fragments valid against ${relative(root, schemaPath)} (${relative(root, opsDir) || "."})`);
