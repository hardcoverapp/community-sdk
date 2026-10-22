// Keeps shared/catalog.json honest. The catalog describes every public SDK
// method as data (the playground, the docs site's explorer and other SDKs'
// snippets read it), so it has to match the code: the same methods, params in
// the same order, the same option fields and scopes, and examples the SDK
// actually accepts.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import * as sdk from "../src/index.ts";
import * as stats from "../src/stats/index.ts";
import type { HttpRequest, HttpResponse } from "../src/index.ts";
import { MockTransport } from "../src/testing/index.ts";

// ---- The catalog ----

interface Field {
  name: string;
  kind: string;
  label?: string;
  required?: boolean;
  nullable?: boolean;
  example?: unknown;
  /** A read-only lookup that finds an example in the reader's own account. */
  exampleFrom?: { method: string; args: unknown[]; pick: string };
  hint?: string;
  enum?: string;
  values?: string[];
  itemKind?: string;
  fields?: Field[];
}

interface Method {
  name: string;
  summary: string;
  scopes: string[];
  writes: boolean;
  destructive: boolean;
  returns: string;
  params: Field[];
}

interface Resource {
  name: string;
  call?: "function";
  module?: string;
  methods: Method[];
}

const root = join(import.meta.dirname, "../../..");
const src = join(import.meta.dirname, "../src");

const catalog = JSON.parse(readFileSync(join(root, "shared/catalog.json"), "utf8")) as { resources: Resource[] };

// Every method once, as "library.add".
const entries = catalog.resources.flatMap((resource) =>
  resource.methods.map((method) => ({ resource, method, id: `${resource.name}.${method.name}` })),
);

// The functions the stats entry point exposes as a catalog resource.
const statsFunctions: Record<string, (...args: never[]) => unknown> = { readingStats: stats.readingStats };

const KINDS = ["number", "text", "longText", "lines", "date", "datetime", "boolean", "enum", "literal", "options", "json", "period"];

// Every field, nested ones included, with where it lives.
function allFields(fields: Field[], at: string): { field: Field; at: string }[] {
  return fields.flatMap((field) => [{ field, at: `${at} ${field.name}` }, ...allFields(field.fields ?? [], `${at} ${field.name}`)]);
}

// ---- The client's public methods ----

function clientMethods(): string[] {
  const client = new sdk.HardcoverClient({ token: "hc_pat_test", transport: new MockTransport([]) });
  const names: string[] = [];

  for (const [resourceName, resource] of Object.entries(client)) {
    if (!resource || typeof resource !== "object" || !resource.constructor.name.endsWith("Resource")) continue;

    const prototype = Object.getPrototypeOf(resource) as Record<string, unknown>;

    for (const name of Object.getOwnPropertyNames(prototype)) {
      if (name !== "constructor" && typeof prototype[name] === "function") names.push(`${resourceName}.${name}`);
    }
  }

  return names;
}

describe("catalog", () => {
  it("lists every public resource method on the client, and nothing else", () => {
    const fromClient = [...clientMethods(), ...Object.keys(statsFunctions).map((name) => `stats.${name}`)];

    expect(entries.map((entry) => entry.id).sort()).toEqual(fromClient.sort());
  });

  it("names a function for every method", () => {
    const client = new sdk.HardcoverClient({ token: "hc_pat_test", transport: new MockTransport([]) });
    const missing: string[] = [];

    for (const { resource, method, id } of entries) {
      const fn = resource.call === "function" ? statsFunctions[method.name] : resourceOf(client, resource.name)?.[method.name];
      if (typeof fn !== "function") missing.push(id);
    }

    expect(missing).toEqual([]);
  });

  it("has every method the shared resource conformance cases call", () => {
    const casesDir = join(root, "shared/conformance/resources");
    const known = new Set(entries.map((entry) => entry.id));
    const missing = new Set<string>();

    for (const file of readdirSync(casesDir).filter((f) => f.endsWith(".json"))) {
      const cases = JSON.parse(readFileSync(join(casesDir, file), "utf8")) as { method?: string; calls?: { method: string }[] }[];

      for (const c of cases) {
        for (const name of c.calls ? c.calls.map((call) => call.method) : [c.method!]) {
          if (!known.has(name)) missing.add(name);
        }
      }
    }

    expect([...missing]).toEqual([]);
  });

  it("describes every field with a known kind and what that kind needs", () => {
    const problems: string[] = [];

    for (const { method, id } of entries) {
      for (const { field, at } of allFields(method.params, id)) {
        if (!KINDS.includes(field.kind)) problems.push(`${at}: unknown kind ${field.kind}`);
        if (field.kind !== "options" && !field.label) problems.push(`${at}: no label`);
        if (field.kind === "enum" && !field.enum) problems.push(`${at}: enum without an enum name`);
        if (field.kind === "literal" && !field.values?.length) problems.push(`${at}: literal without values`);
        if (field.kind === "lines" && field.itemKind !== "number" && field.itemKind !== "text") problems.push(`${at}: lines without itemKind`);
        if (field.kind === "options" && !field.fields?.length) problems.push(`${at}: options without fields`);
      }
    }

    expect(problems).toEqual([]);
  });

  it("looks examples up only with real, read-only methods", () => {
    const problems: string[] = [];
    const byId = new Map(entries.map((entry) => [entry.id, entry.method]));

    for (const { method, id } of entries) {
      for (const { field, at } of allFields(method.params, id)) {
        const lookup = field.exampleFrom;
        if (!lookup) continue;

        const target = byId.get(lookup.method);
        if (!target) problems.push(`${at}: exampleFrom calls unknown ${lookup.method}`);
        else if (target.writes) problems.push(`${at}: exampleFrom calls ${lookup.method}, which writes`);
        if (typeof lookup.pick !== "string") problems.push(`${at}: exampleFrom has no pick`);
      }
    }

    expect(problems).toEqual([]);
  });

  it("gives every required input an example or a way to look one up", () => {
    const missing: string[] = [];

    for (const { method, id } of entries) {
      for (const { field, at } of allFields(method.params, id)) {
        if (field.required && field.kind !== "options" && field.example === undefined && !field.exampleFrom) missing.push(at);
      }
    }

    expect(missing).toEqual([]);
  });

  it("uses real SDK enums, with member keys for examples and values", () => {
    const problems: string[] = [];

    for (const { method, id } of entries) {
      for (const { field, at } of allFields(method.params, id)) {
        if (field.kind !== "enum") continue;

        const enumObject = (sdk as unknown as Record<string, unknown>)[field.enum!];
        if (!enumObject || typeof enumObject !== "object") {
          problems.push(`${at}: no SDK enum ${field.enum}`);
          continue;
        }

        const keys = Object.keys(enumObject);
        for (const key of [...(field.values ?? []), ...(field.example === undefined ? [] : [field.example])]) {
          if (!keys.includes(String(key))) problems.push(`${at}: ${String(key)} isn't a ${field.enum} member key`);
        }
      }
    }

    expect(problems).toEqual([]);
  });

  it("matches each method's Scopes: doc line", () => {
    const documented = documentedScopes();
    const problems: string[] = [];

    for (const { method, id } of entries) {
      const scopes = documented.get(id);

      if (!scopes) problems.push(`${id}: no Scopes: line found`);
      else if ([...method.scopes].sort().join(" ") !== [...scopes].sort().join(" ")) {
        problems.push(`${id}: catalog [${method.scopes.join(", ")}], docs [${[...scopes].join(", ")}]`);
      }
    }

    expect(problems).toEqual([]);
  });

  it("matches each method's arity: no missing params, nothing required past the JS length", () => {
    const client = new sdk.HardcoverClient({ token: "hc_pat_test", transport: new MockTransport([]) });
    const problems: string[] = [];

    for (const { resource, method, id } of entries) {
      const isFunction = resource.call === "function";
      const fn = (isFunction ? statsFunctions[method.name] : resourceOf(client, resource.name)?.[method.name]) as (...args: unknown[]) => unknown;

      // Function.length counts params before the first one with a default.
      // Stats functions take the client first, which the catalog leaves out.
      const length = fn.length - (isFunction ? 1 : 0);

      if (method.params.length < length) problems.push(`${id}: the function takes ${length} params, the catalog lists ${method.params.length}`);

      method.params.slice(length).forEach((param) => {
        if (param.required) problems.push(`${id}: ${param.name} is required but has a default or is optional`);
      });
    }

    expect(problems).toEqual([]);
  });

  it("matches each method's TypeScript signature: param names, order, option fields", () => {
    const types = typeDeclarations();
    const problems: string[] = [];

    for (const { resource, method, id } of entries) {
      const signature = sourceSignature(resource.name, method.name);
      if (!signature) {
        problems.push(`${id}: signature not found`);
        continue;
      }

      if (signature.length !== method.params.length) {
        problems.push(`${id}: the code takes ${signature.length} params, the catalog lists ${method.params.length}`);
        continue;
      }

      signature.forEach((param, i) => {
        const field = method.params[i]!;
        const at = `${id} param ${i + 1}`;

        // Destructured params have no name in the code; the catalog calls them options.
        if (param.name && param.name !== field.name) problems.push(`${at}: named ${param.name} in the code, ${field.name} in the catalog`);
        if (param.optional === Boolean(field.required)) problems.push(`${at}: required is ${field.required}, the code says ${!param.optional}`);

        if (field.kind === "options") problems.push(...compareFields(field.fields ?? [], param.type, types, at));
        else if (!param.name) problems.push(`${at}: destructured in the code, so it should be kind "options"`);
      });
    }

    expect(problems).toEqual([]);
  });
});

// ---- Calling every method with its examples ----

// Answers every request with an empty success; `Me` gets a user, so methods
// that look up the reader first go on to their own request.
class AnswersEverything extends MockTransport {
  constructor() {
    super([]);
  }

  async send(request: HttpRequest): Promise<HttpResponse> {
    this.requests.push(request);

    const { operationName } = JSON.parse(request.body) as { operationName?: string };
    const data = operationName === "Me" ? { me: [{ id: 42, username: "reader", activityPrivacySettingsId: 3 }] } : {};

    return { status: 200, headers: {}, body: JSON.stringify({ data }) };
  }
}

describe("catalog examples", () => {
  for (const { resource, method, id } of entries) {
    const args = exampleArgs(method.params);

    it.skipIf(args === undefined)(`${id} accepts its example arguments`, async () => {
      const transport = new AnswersEverything();
      const client = new sdk.HardcoverClient({ token: "hc_pat_test", transport, sleep: async () => {} });

      const call = resource.call === "function"
        ? () => (statsFunctions[method.name] as (...a: unknown[]) => unknown)(client, ...args!)
        : () => (resourceOf(client, resource.name)![method.name] as (...a: unknown[]) => unknown).apply(resourceOf(client, resource.name), args!);

      try {
        await call();
      } catch (error) {
        // The mock's empty answers break plenty of responses, and that's fine.
        // An argument error before anything was sent means the example is wrong.
        const argumentError = error instanceof TypeError || error instanceof RangeError;
        if (argumentError && transport.requests.length === 0) throw error;
      }
    });
  }
});

/**
 * Arguments from the catalog's examples, by the same rules the playground
 * uses. Undefined when a required param has no example (it needs the
 * reader's own ids).
 */
function exampleArgs(params: Field[]): unknown[] | undefined {
  const args: unknown[] = [];

  for (const param of params) {
    const value = exampleValue(param);
    if (value === undefined && param.required) return undefined;

    args.push(value);
  }

  while (args.length > 0 && args[args.length - 1] === undefined) args.pop();

  return args;
}

function exampleValue(field: Field): unknown {
  // Only the fields that have examples; a required options param is passed even when empty.
  if (field.kind === "options") {
    const object: Record<string, unknown> = {};

    for (const inner of field.fields ?? []) {
      const value = exampleValue(inner);
      if (value === undefined && inner.required) return undefined;
      if (value !== undefined) object[inner.name] = value;
    }

    return Object.keys(object).length === 0 && !field.required ? undefined : object;
  }

  if (field.example === undefined) return field.nullable ? null : undefined;

  switch (field.kind) {
    // Member keys in the catalog, member values in the call.
    case "enum":
      return (sdk as unknown as Record<string, Record<string, unknown>>)[field.enum!]![String(field.example)];

    case "datetime":
      return new Date(String(field.example));

    case "period": {
      const { kind, year, month, from, to } = field.example as { kind: string; year?: number; month?: number; from?: string; to?: string };

      if (kind === "year") return stats.period.year(year!);
      if (kind === "month") return stats.period.month(year!, month!);
      if (kind === "custom") return stats.period.custom(from!, to!);
      return stats.period.life();
    }

    default:
      return field.example;
  }
}

// ---- Reading the source ----

function resourceOf(client: sdk.HardcoverClient, name: string): Record<string, unknown> | undefined {
  return (client as unknown as Record<string, Record<string, unknown>>)[name];
}

// "library.add" → the scopes in its doc comment's Scopes: line (as in scopes-docs.test.ts).
function documentedScopes(): Map<string, Set<string>> {
  const result = new Map<string, Set<string>>();

  const sources = [
    ...readdirSync(join(src, "resources"))
      .filter((file) => file.endsWith(".ts"))
      .map((file) => ({ resource: file.replace(/\.ts$/, ""), path: join(src, "resources", file) })),
    { resource: "stats", path: join(src, "stats/fetch.ts") },
  ];

  for (const { resource, path } of sources) {
    const source = readFileSync(path, "utf8");

    // A doc comment followed by a two-space-indented method, or an exported function.
    for (const match of source.matchAll(/\/\*\*([\s\S]*?)\*\/\s*\n(?: {2}(?:async )?|export (?:async )?function )([a-z]\w*)\(/g)) {
      const scopesText = match[1]!.split("Scopes:")[1];
      if (scopesText === undefined) continue;

      // Parentheses hold notes, e.g. "(any `read:me` scope works)", not more scopes.
      const withoutNotes = scopesText.replace(/\([^)]*\)/g, "");

      const scopes = new Set([...withoutNotes.matchAll(/`((?:read|write):[\w:]+)`/g)].map((m) => m[1]!));
      result.set(`${resource}.${match[2]}`, scopes);
    }
  }

  return result;
}

interface SourceParam {
  /** Undefined for a destructured param. */
  name?: string;
  optional: boolean;
  type: string;
}

// A method's params, from its one-line signature in src/resources/<resource>.ts.
function sourceSignature(resource: string, method: string): SourceParam[] | undefined {
  const isStats = resource === "stats";
  const source = readFileSync(join(src, isStats ? "stats/fetch.ts" : `resources/${resource}.ts`), "utf8");

  const start = isStats ? `export async function ${method}(` : null;
  const line = source
    .split("\n")
    .find((l) => (start ? l.startsWith(start) : new RegExp(`^ {2}(?:async )?${method}\\(`).test(l)));
  if (!line) return undefined;

  const inner = line.slice(line.indexOf("(") + 1, closingParen(line, line.indexOf("(")));
  const params = splitTopLevel(inner, ",").map(parseParam);

  // Stats functions take the client first; the catalog leaves it out.
  return isStats ? params.slice(1) : params;
}

function closingParen(text: string, open: number): number {
  let depth = 0;

  for (let i = open; i < text.length; i++) {
    if (text[i] === "(") depth++;
    if (text[i] === ")" && --depth === 0) return i;
  }

  return text.length;
}

// Splits on a separator that isn't inside (), {}, [] or <>.
function splitTopLevel(text: string, separator: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let current = "";

  for (let i = 0; i < text.length; i++) {
    const char = text[i]!;

    if ("({[<".includes(char)) depth++;
    if (")}]>".includes(char) && text[i - 1] !== "=") depth--;

    if (depth === 0 && text.startsWith(separator, i)) {
      parts.push(current);
      current = "";
      i += separator.length - 1;
      continue;
    }

    current += char;
  }

  return [...parts, current].map((part) => part.trim()).filter(Boolean);
}

// `name?: Type`, `name: Type = default`, or `{ a, b = 1 }: Type = {}`.
function parseParam(text: string): SourceParam {
  const [declaration, defaultValue] = splitTopLevel(text, " = ");
  const [left, type] = splitTopLevel(declaration!, ":");

  const destructured = left!.startsWith("{");
  const name = destructured ? undefined : left!.replace(/\?$/, "");
  const optional = defaultValue !== undefined || left!.endsWith("?");

  return { name, optional, type: type ?? "" };
}

type FieldTypes = Map<string, { optional: boolean; type: string }>;

// Every `export interface X` and `export type X = {` in the SDK's sources, with
// their fields (two-space indented lines) and what they extend.
function typeDeclarations(): Map<string, FieldTypes> {
  const files = [
    ...readdirSync(join(src, "resources")).map((file) => join(src, "resources", file)),
    join(src, "generated/graphql.ts"),
  ];

  const declared = new Map<string, { body: string; extends: string[] }>();

  for (const file of files.filter((f) => f.endsWith(".ts"))) {
    const source = readFileSync(file, "utf8");

    for (const match of source.matchAll(/^export (?:interface (\w+)(?: extends ([\w, ]+))? \{|type (\w+) = \{)\n([\s\S]*?)\n\};?$/gm)) {
      // The resources' own types come first; a generated wire type of the same name (ListInput) doesn't replace them.
      const name = match[1] ?? match[3]!;
      if (!declared.has(name)) declared.set(name, { body: match[4]!, extends: match[2]?.split(",").map((s) => s.trim()) ?? [] });
    }
  }

  const resolve = (name: string): FieldTypes => {
    const declaration = declared.get(name);
    const fields: FieldTypes = new Map();
    if (!declaration) return fields;

    for (const parent of declaration.extends) for (const [key, value] of resolve(parent)) fields.set(key, value);

    for (const line of declaration.body.split("\n")) {
      const field = /^ {2}(\w+)(\?)?: (.+?);?$/.exec(line);
      if (field) fields.set(field[1]!, { optional: field[2] === "?", type: field[3]! });
    }

    return fields;
  };

  return new Map([...declared.keys()].map((name) => [name, resolve(name)]));
}

// The fields a param type names: `Opts`, `Partial<Opts>`, `A & { name: string }`, `{ refresh?: boolean }`.
function fieldsOfType(type: string, types: Map<string, FieldTypes>): FieldTypes | undefined {
  const fields: FieldTypes = new Map();

  for (const part of splitTopLevel(type, "&")) {
    const partial = /^Partial<(\w+)>$/.exec(part);
    const named = partial?.[1] ?? (/^\w+$/.test(part) ? part : undefined);

    if (named) {
      const declared = types.get(named);
      if (!declared) return undefined;

      for (const [key, value] of declared) fields.set(key, { ...value, optional: value.optional || Boolean(partial) });
      continue;
    }

    // An inline object type.
    if (!part.startsWith("{")) return undefined;

    for (const member of splitTopLevel(part.slice(1, -1), ";").flatMap((m) => splitTopLevel(m, ","))) {
      const field = /^(\w+)(\?)?: (.+)$/.exec(member.trim());
      if (field) fields.set(field[1]!, { optional: field[2] === "?", type: field[3]! });
    }
  }

  return fields;
}

function compareFields(catalogFields: Field[], type: string, types: Map<string, FieldTypes>, at: string): string[] {
  const code = fieldsOfType(type, types);
  if (!code) return [`${at}: can't read the fields of ${type}`];

  const problems: string[] = [];
  const catalogNames = catalogFields.map((field) => field.name).sort();
  const codeNames = [...code.keys()].sort();

  if (catalogNames.join(",") !== codeNames.join(",")) {
    problems.push(`${at}: fields [${catalogNames.join(", ")}] in the catalog, [${codeNames.join(", ")}] in ${type}`);
  }

  for (const field of catalogFields) {
    const inCode = code.get(field.name);
    if (!inCode) continue;

    if (inCode.optional === Boolean(field.required)) problems.push(`${at}.${field.name}: required is ${field.required}, ${type} says ${!inCode.optional}`);

    // Nested options: compare their fields too (the type minus `| null` and `| undefined`).
    if (field.kind === "options") {
      const nested = inCode.type.split("|").map((t) => t.trim()).find((t) => t !== "null" && t !== "undefined")!;
      problems.push(...compareFields(field.fields ?? [], nested, types, `${at}.${field.name}`));
    }
  }

  return problems;
}
