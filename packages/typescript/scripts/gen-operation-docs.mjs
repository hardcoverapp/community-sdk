#!/usr/bin/env node
// Writes src/generated/operations.ts: the `operations` registry, with a doc
// comment on every operation saying what it needs before you call it. Editors
// show it on hover (`operations.Me`), and it ships in the type declarations.
//
// Everything comes from data, so it can't drift from the server:
//   shared/operations/**/*.graphql         the operations (their # comments are for
//                                          maintainers and stay out of the docs)
//   api-snapshot/schema.graphql            types, to find protected columns and arguments
//   api-snapshot/capability-scopes.json    which scopes each root field accepts
//   api-snapshot/capability-field-scopes.json   columns that need their own scope
//   api-snapshot/capabilities.json         scope descriptions (roles) and protected arguments
// Runs as part of `pnpm codegen`.
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  buildSchema,
  concatAST,
  getNamedType,
  isInputObjectType,
  Kind,
  parse,
  TypeInfo,
  typeFromAST,
  visit,
  visitWithTypeInfo,
} from "graphql";

const root = new URL("../../../", import.meta.url).pathname;
const read = (path) => readFileSync(join(root, path), "utf8");
const json = (path) => JSON.parse(read(path));

const schema = buildSchema(read("api-snapshot/schema.graphql"));
const rootScopes = json("api-snapshot/capability-scopes.json");
const columnScopes = json("api-snapshot/capability-field-scopes.json");
const scopeInfo = json("api-snapshot/capabilities.json").scopes;

const describe = Object.fromEntries(scopeInfo.map((s) => [s.scope, s.description ?? ""]));

// Arguments a scope guards wherever they appear (review fields need write:reviews).
const guardedArguments = new Map();
for (const s of scopeInfo) {
  if (s.scope === "all") continue;
  for (const name of s.arguments ?? []) guardedArguments.set(name, s.scope);
}

// Every .graphql file under shared/operations.
const files = [];
const walk = (dir) => {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path);
    else if (name.endsWith(".graphql")) files.push(path);
  }
};
walk(join(root, "shared/operations"));

const sources = files.map((path) => readFileSync(path, "utf8"));
const document = concatAST(sources.map((source) => parse(source)));

const fragments = new Map(
  document.definitions.filter((d) => d.kind === Kind.FRAGMENT_DEFINITION).map((d) => [d.name.value, d]),
);

// What one operation touches: root fields, protected columns, guarded arguments.
function analyze(operation) {
  const rootFields = new Set();
  const columns = new Map(); // "users.email" → scopes
  const argumentsUsed = new Set();

  for (const selection of operation.selectionSet.selections) {
    if (selection.kind === Kind.FIELD) rootFields.add(selection.name.value);
  }

  // Walk the operation and every fragment it spreads. Each walk gets its own
  // TypeInfo, which tracks the parent type of every field it visits.
  const seen = new Set();
  const visitNode = (node) => {
    const typeInfo = new TypeInfo(schema);

    visit(
      node,
      visitWithTypeInfo(typeInfo, {
        Field(field) {
          const parent = typeInfo.getParentType()?.name;
          const scopes = parent && columnScopes[parent]?.[field.name.value]?.read;
          if (scopes) columns.set(`${parent}.${field.name.value}`, scopes);
        },
        Argument(argument) {
          if (guardedArguments.has(argument.name.value)) argumentsUsed.add(argument.name.value);
        },
        ObjectField(field) {
          if (guardedArguments.has(field.name.value)) argumentsUsed.add(field.name.value);
        },
        FragmentSpread(spread) {
          const name = spread.name.value;
          if (seen.has(name) || !fragments.has(name)) return;

          seen.add(name);
          visitNode(fragments.get(name));
        },
      }),
    );
  };
  visitNode(operation);

  // Guarded fields a write could send through a variable's input type (a
  // query's filters and sort keys share the names but carry no review text).
  const reachable = new Set();
  const collect = (type, depth = 0) => {
    const named = getNamedType(type);
    if (!isInputObjectType(named) || depth > 3) return;
    for (const field of Object.values(named.getFields())) {
      if (guardedArguments.has(field.name)) reachable.add(field.name);
      collect(field.type, depth + 1);
    }
  };
  if (operation.operation === "mutation") {
    for (const variable of operation.variableDefinitions ?? []) collect(typeFromAST(schema, variable.type));
  }

  return { rootFields: [...rootFields], columns, argumentsUsed: [...argumentsUsed], reachable: [...reachable] };
}

const code = (s) => `\`${s}\``;
const list = (items) => items.map(code).join(", ");

function docFor(operation) {
  const name = operation.name.value;
  const kind = operation.operation;
  const { rootFields, columns, argumentsUsed, reachable } = analyze(operation);
  const lines = [];

  lines.push(`${kind[0].toUpperCase()}${kind.slice(1)} ${code(name)} on ${list(rootFields)}.`, "");

  // Scopes, grouped when several root fields accept the same set.
  const blocked = [];
  const groups = new Map();
  for (const field of rootFields) {
    const scopes = rootScopes[field]?.[kind === "query" ? "read" : "write"] ?? [];
    if (scopes.length === 0) blocked.push(field);
    else groups.set(scopes.join(" "), [...(groups.get(scopes.join(" ")) ?? []), field]);
  }

  for (const [key, fields] of groups) {
    const scopes = key.split(" ");
    const target = rootFields.length > 1 ? ` (for ${list(fields)})` : "";
    lines.push(scopes.length === 1 ? `Scopes: ${code(scopes[0])}${target}.` : `Scopes: one of ${list(scopes)}${target}.`);

    // A role the token's user must have, when every accepted scope needs one.
    const roles = scopes.map((s) => describe[s]).filter((d) => /requires/i.test(d));
    if (roles.length === scopes.length) lines.push(`Requires a role: ${roles.join("; ")}.`);
  }

  if (blocked.length) {
    lines.push(`Not available to API tokens: the gateway refuses ${list(blocked)} (UnsupportedOperationError).`);
  }

  for (const [column, scopes] of columns) {
    lines.push(`Selecting ${code(column)} also needs one of ${list(scopes)}.`);
  }

  const guarded = [...new Set([...argumentsUsed, ...reachable])].sort();
  if (guarded.length) {
    const scope = guardedArguments.get(guarded[0]);
    lines.push(`Sending ${list(guarded)} also needs ${code(scope)}; leave them out otherwise.`);
  }

  return lines.map((line) => line.replaceAll("*/", "*\\/"));
}

const operations = document.definitions
  .filter((d) => d.kind === Kind.OPERATION_DEFINITION && d.name)
  .sort((a, b) => a.name.value.localeCompare(b.name.value));

let out = `// Generated by scripts/gen-operation-docs.mjs from shared/operations and
// api-snapshot. Do not edit: run \`pnpm codegen\`.
import * as documents from "./graphql.ts";

/**
 * Every operation the SDK knows, typed with its result and variables:
 * \`client.request(operations.Me)\`. Hover one to see the scopes it needs.
 */
export const operations = {
`;

for (const operation of operations) {
  const name = operation.name.value;
  out += "  /**\n" + docFor(operation).map((line) => (line ? `   * ${line}` : "   *")).join("\n") + "\n   */\n";
  out += `  ${name}: documents.${name}Document,\n`;
}

out += "};\n";

writeFileSync(new URL("../src/generated/operations.ts", import.meta.url), out);
console.log(`operations.ts: ${operations.length} documented operations`);
