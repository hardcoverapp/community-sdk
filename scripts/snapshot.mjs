#!/usr/bin/env node
// Snapshot refresh and drift check (spec/04 Layer 2).
//
// Fetches a live schema (introspection) and /capabilities, converts them with
// the docs site's own converters (run from a scratch directory, so the docs
// repo is never modified), then reports what changed against api-snapshot/:
// breaking and dangerous schema changes, additions, scope-map changes, and
// whether shared/operations still validate. With --write, updates api-snapshot.
//
//   node scripts/snapshot.mjs [--env local|staging|prod] [--url <graphql url>] [--write]
//
// Token: HARDCOVER_API_KEY (environment or the repo's .env). Converters:
// HARDCOVER_DOCS_DIR (default ../docs next to this repo).
import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildSchema,
  concatAST,
  findBreakingChanges,
  findDangerousChanges,
  getIntrospectionQuery,
  isObjectType,
  isInputObjectType,
  parse,
  validate,
} from "graphql";
import { walk } from "./lib.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const arg = (flag) => {
  const i = process.argv.indexOf(flag);
  return i === -1 ? undefined : process.argv[i + 1];
};
const write = process.argv.includes("--write");
const envName = arg("--env") ?? "local";

if (existsSync(join(root, ".env"))) process.loadEnvFile(join(root, ".env"));
const token = process.env.HARDCOVER_API_KEY;
if (!token) {
  console.error("Set HARDCOVER_API_KEY (environment or .env).");
  process.exit(1);
}

const environments = JSON.parse(readFileSync(join(root, "shared/environments.json"), "utf8"));
const env = environments[envName];
if (!env && !arg("--url")) {
  console.error(`Unknown --env ${envName}; use local, staging, prod or --url.`);
  process.exit(1);
}
const graphqlUrl = arg("--url") ?? env.graphql;
const capabilitiesUrl = arg("--url") ? new URL("/capabilities", graphqlUrl).href : env.capabilities;

const docsDir = process.env.HARDCOVER_DOCS_DIR ?? join(root, "../docs");
const converters = join(docsDir, "scripts/schema-tools");
if (!existsSync(join(converters, "convert-schema.js"))) {
  console.error(`Docs converters not found at ${converters}; set HARDCOVER_DOCS_DIR.`);
  process.exit(1);
}

// 1. Fetch.
const work = mkdtempSync(join(tmpdir(), "hardcover-snapshot-"));
const introspection = await fetch(graphqlUrl, {
  method: "POST",
  headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
  body: JSON.stringify({ query: getIntrospectionQuery({ descriptions: true }) }),
}).then((r) => r.json());
if (!introspection.data) {
  console.error("Introspection failed:", JSON.stringify(introspection).slice(0, 300));
  process.exit(1);
}
writeFileSync(join(work, "schema.json"), JSON.stringify(introspection));
const capabilities = await fetch(capabilitiesUrl).then((r) => {
  if (!r.ok) throw new Error(`${capabilitiesUrl}: HTTP ${r.status}`);
  return r.json();
});
writeFileSync(join(work, "capabilities.json"), JSON.stringify(capabilities, null, 2));

// 2. Convert with the docs site's converters (they read and write in cwd).
for (const script of ["convert-schema.js", "extract-capability-scopes.js", "extract-capability-field-scopes.js"]) {
  execFileSync(process.execPath, [join(converters, script)], { cwd: work, stdio: ["ignore", "ignore", "inherit"] });
}

// 3. Compare.
const snapshotDir = join(root, "api-snapshot");
const oldSchema = buildSchema(readFileSync(join(snapshotDir, "schema.graphql"), "utf8"));
const newSchema = buildSchema(readFileSync(join(work, "schema.graphql"), "utf8"));

// Rebuilding a schema from introspection drops the built-in directive
// definitions; those "removals" are noise, not API changes.
const BUILTIN_DIRECTIVES = /^Directive @(deprecated|specifiedBy|oneOf|include|skip) was removed/;
const breaking = findBreakingChanges(oldSchema, newSchema).filter((c) => !BUILTIN_DIRECTIVES.test(c.description));
const dangerous = findDangerousChanges(oldSchema, newSchema);

const fieldsOf = (schema) => {
  const out = new Set();
  for (const type of Object.values(schema.getTypeMap())) {
    if (type.name.startsWith("__")) continue;
    if (isObjectType(type) || isInputObjectType(type)) for (const f of Object.keys(type.getFields())) out.add(`${type.name}.${f}`);
  }
  return out;
};
const oldFields = fieldsOf(oldSchema);
const added = [...fieldsOf(newSchema)].filter((f) => !oldFields.has(f)).sort();

const oldScopes = JSON.parse(readFileSync(join(snapshotDir, "capability-scopes.json"), "utf8"));
const newScopes = JSON.parse(readFileSync(join(work, "capability-scopes.json"), "utf8"));
const scopeChanges = [...new Set([...Object.keys(oldScopes), ...Object.keys(newScopes)])]
  .filter((op) => JSON.stringify(oldScopes[op]) !== JSON.stringify(newScopes[op]))
  .map((op) => `${op}: ${JSON.stringify(oldScopes[op] ?? null)} → ${JSON.stringify(newScopes[op] ?? null)}`)
  .sort();

const operationsDoc = concatAST(walk(join(root, "shared/operations")).map((f) => parse(readFileSync(f, "utf8"))));
const operationErrors = validate(newSchema, operationsDoc).map((e) => e.message);

// 4. Report.
const list = (title, items, limit = 40) => {
  console.log(`\n${title} (${items.length})`);
  for (const item of items.slice(0, limit)) console.log(`  - ${item}`);
  if (items.length > limit) console.log(`  … ${items.length - limit} more`);
};
console.log(`Compared ${relative(root, snapshotDir)}/ with ${graphqlUrl}`);
list("Breaking changes (warning unless an SDK operation fails below)", breaking.map((c) => c.description));
list("Dangerous changes", dangerous.map((c) => c.description), 15);
list("Added fields", added);
list("Scope map changes", scopeChanges);
list("shared/operations errors against the live schema", operationErrors);

if (write) {
  for (const file of ["schema.graphql", "capabilities.json", "capability-scopes.json", "capability-field-scopes.json"]) {
    copyFileSync(join(work, file), join(snapshotDir, file));
  }
  writeFileSync(
    join(snapshotDir, "source.json"),
    JSON.stringify({ graphql: graphqlUrl, capabilities: capabilitiesUrl, fetchedAt: new Date().toISOString() }, null, 2) + "\n",
  );
  console.log(`\nWrote api-snapshot/ (see api-snapshot/source.json). Run pnpm codegen and the tests next.`);
}

// Fails only on drift that reaches SDK users: an SDK operation no longer
// validates, or the scopes it needs changed. Other breaking changes (e.g.
// fields the SDK doesn't use, Hasura version differences between
// environments) are reported above as warnings.
if (!write && (operationErrors.length > 0 || scopeChanges.length > 0)) process.exitCode = 1;
