// Runs the language-neutral resource cases in shared/conformance/resources
// against this SDK. Each case calls one resource method with JSON arguments,
// serves canned responses, and checks the requests sent and the value
// returned. The format is described in shared/conformance/resources.md.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { Kind, parse, type FragmentDefinitionNode, type SelectionSetNode } from "graphql";
import { describe, expect, it } from "vitest";
import * as sdk from "../src/index.ts";
import { MockTransport, type MockResponse } from "../src/testing/index.ts";

// ---- The case format ----

type Call = { method: string; args?: unknown[] };

type ExpectedRequest = {
  operationName: string;
  variables: Record<string, unknown>;

  /** Only for documents the SDK builds itself; compared with all whitespace removed. */
  query?: string;
};

type Case = Call & {
  id: string;
  calls?: Call[];
  concurrent?: boolean;
  responses: MockResponse[];
  pending?: string[];
  expect: {
    requests: ExpectedRequest[];
    result?: unknown;
    error?: string;
    fields?: Record<string, unknown>;
  };
};

const dir = join(import.meta.dirname, "../../../shared/conformance/resources");

const files = readdirSync(dir)
  .filter((file) => file.endsWith(".json"))
  .sort();

// ---- Canonical responses to TypeScript's camelCase ----

// Cases are written canonical (snake_case, as in shared/operations). The
// TypeScript documents alias each multi-word field to camelCase, so the real
// server would answer with those aliases. This reshapes a canonical response
// the way the server would, by walking the document the SDK sent. Fields
// without a selection set (scalars and JSON columns) are left as they are.

type Fields = Map<string, { key: string; sets: SelectionSetNode[] }>;

type Shape = { root: SelectionSetNode; fragments: Map<string, FragmentDefinitionNode> };

const shapes = new Map<string, Shape | undefined>();

function shapeOf(operationName: string): Shape | undefined {
  if (shapes.has(operationName)) return shapes.get(operationName);

  // Documents the SDK builds at runtime (bulk adds, positions) aren't in the registry.
  const document = (sdk.operations as Record<string, unknown>)[operationName];
  let shape: Shape | undefined;

  if (document) {
    const definitions = parse(String(document)).definitions;
    const fragments = new Map<string, FragmentDefinitionNode>();
    let root: SelectionSetNode | undefined;

    for (const definition of definitions) {
      if (definition.kind === Kind.FRAGMENT_DEFINITION) fragments.set(definition.name.value, definition);
      if (definition.kind === Kind.OPERATION_DEFINITION) root = definition.selectionSet;
    }

    shape = root && { root, fragments };
  }

  shapes.set(operationName, shape);
  return shape;
}

// Every field the selection sets ask for, by canonical name, with the key the
// response uses and the sub-selections to apply to its value.
function collectFields(sets: SelectionSetNode[], fragments: Shape["fragments"], into: Fields = new Map()): Fields {
  for (const set of sets) {
    for (const selection of set.selections) {
      if (selection.kind === Kind.FIELD) {
        const name = selection.name.value;
        const entry = into.get(name) ?? { key: selection.alias?.value ?? name, sets: [] };

        if (selection.selectionSet) entry.sets.push(selection.selectionSet);
        into.set(name, entry);
      } else if (selection.kind === Kind.FRAGMENT_SPREAD) {
        const fragment = fragments.get(selection.name.value);
        if (fragment) collectFields([fragment.selectionSet], fragments, into);
      } else {
        collectFields([selection.selectionSet], fragments, into);
      }
    }
  }

  return into;
}

function reshape(value: unknown, sets: SelectionSetNode[], fragments: Shape["fragments"]): unknown {
  if (Array.isArray(value)) return value.map((item) => reshape(item, sets, fragments));
  if (value === null || typeof value !== "object") return value;

  const fields = collectFields(sets, fragments);
  const out: Record<string, unknown> = {};

  for (const [name, inner] of Object.entries(value)) {
    const field = fields.get(name);

    // Keys the document doesn't select (an envelope's `error`) pass through.
    if (!field) {
      out[name] = inner;
      continue;
    }

    out[field.key] = field.sets.length > 0 ? reshape(inner, field.sets, fragments) : inner;
  }

  return out;
}

/** A mock transport that serves canonical responses as the server would answer this SDK's documents. */
class CanonicalTransport implements sdk.Transport {
  readonly mock: MockTransport;

  constructor(responses: MockResponse[]) {
    this.mock = new MockTransport(responses);
  }

  async send(request: sdk.HttpRequest): Promise<sdk.HttpResponse> {
    const response = await this.mock.send(request);
    const { operationName } = JSON.parse(request.body) as { operationName?: string };
    const shape = operationName ? shapeOf(operationName) : undefined;

    if (!shape) return response;

    const body = JSON.parse(response.body) as { data?: unknown };
    if (body.data) body.data = reshape(body.data, [shape.root], shape.fragments);

    return { ...response, body: JSON.stringify(body) };
  }
}

// ---- Comparing results ----

// Expected results mix API fields (snake_case) and SDK-made fields (camelCase),
// and every language returns them in its own casing. Keys are compared with
// case and underscores ignored, so `has_more`, `hasMore` and `hasmore` match.
const looseKey = (key: string) => key.replaceAll("_", "").toLowerCase();

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && [Object.prototype, null].includes(Object.getPrototypeOf(value));

function looseKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(looseKeys);
  if (!isPlainObject(value)) return value;

  return Object.fromEntries(Object.entries(value).map(([key, inner]) => [looseKey(key), looseKeys(inner)]));
}

/** Matches anything, including null: `{ "$any": true }`. */
const anything = {
  asymmetricMatch: () => true,
  toString: () => "$any",
};

/** A JSON type, for values the SDK computes at run time: `{ "$type": "string" }`. */
const ofType = (type: string) => ({
  asymmetricMatch: (actual: unknown) => typeof actual === type,
  toString: () => `$type ${type}`,
});

/** An error of a named class: `{ "$error": "GraphQLError" }`. */
const errorNamed = (name: string) => ({
  asymmetricMatch: (actual: unknown) => actual instanceof errorClass(name),
  toString: () => `$error ${name}`,
});

// Turns the case's `$` matchers into vitest asymmetric matchers.
function withMatchers(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(withMatchers);
  if (!isPlainObject(value)) return value;

  if ("$any" in value) return anything;
  if ("$type" in value) return ofType(value.$type as string);
  if ("$error" in value) return errorNamed(value.$error as string);
  if ("$approx" in value) return expect.closeTo(value.$approx as number, (value.digits as number | undefined) ?? 2);

  return Object.fromEntries(Object.entries(value).map(([key, inner]) => [key, withMatchers(inner)]));
}

function errorClass(name: string): new (...args: never[]) => Error {
  const ErrorClass = (sdk as unknown as Record<string, new (...args: never[]) => Error>)[name];
  if (typeof ErrorClass !== "function") throw new Error(`${name} is not exported`);

  return ErrorClass;
}

// Reads "errors[0].code" style paths off an error instance.
function readPath(target: unknown, path: string): unknown {
  return path
    .split(/\.|\[(\d+)\]/)
    .filter(Boolean)
    .reduce<unknown>((value, key) => (value == null ? undefined : (value as Record<string, unknown>)[key]), target);
}

// ---- Calling methods ----

// "library.add" is client.library.add; a name without a dot is an exported
// function, like goalProgress. TypeScript uses the canonical camelCase as is.
function invoke(client: sdk.HardcoverClient, { method, args = [] }: Call): Promise<unknown> {
  const [resource, name] = method.includes(".") ? method.split(".") : [undefined, method];
  const target = (resource ? (client as unknown as Record<string, unknown>)[resource] : sdk) as Record<string, unknown>;
  const fn = target?.[name!];

  if (typeof fn !== "function") throw new Error(`No method ${method}`);

  // Wrapped so a synchronous throw (bad arguments) is a rejection like the rest.
  return Promise.resolve().then(() => (fn as (...a: unknown[]) => unknown).apply(target, args));
}

async function run(client: sdk.HardcoverClient, c: Case): Promise<unknown> {
  const calls = c.calls ?? [c];

  if (c.concurrent) {
    const results = await Promise.all(calls.map((call) => invoke(client, call)));
    return results[results.length - 1];
  }

  // Earlier calls set the stage (e.g. fill the cached user); the last one is checked.
  for (const call of calls.slice(0, -1)) await invoke(client, call);
  return invoke(client, calls[calls.length - 1]!);
}

// ---- The runner ----

// Every case id is unique, so a failure names exactly one case.
it("case ids are unique", () => {
  const ids = files.flatMap((file) => (JSON.parse(readFileSync(join(dir, file), "utf8")) as Case[]).map((c) => c.id));
  expect(ids.filter((id, i) => ids.indexOf(id) !== i)).toEqual([]);
});

for (const file of files) {
  const cases = JSON.parse(readFileSync(join(dir, file), "utf8")) as Case[];

  describe(`resources/${file}`, () => {
    for (const c of cases) {
      const test = c.pending?.includes("typescript") ? it.skip : it;

      test(c.id, async () => {
        const transport = new CanonicalTransport(c.responses);
        const client = new sdk.HardcoverClient({ token: "hc_pat_conformance", transport, sleep: async () => {} });

        const outcome = await run(client, c).then(
          (value) => ({ ok: true as const, value }),
          (error: unknown) => ({ ok: false as const, error }),
        );

        // What was sent: operation and exact variables, plus the document when the case pins it.
        const sent = transport.mock.requests.map((request, i) => {
          const body = JSON.parse(request.body) as { operationName?: string; variables?: Record<string, unknown>; query: string };
          const wantsQuery = c.expect.requests[i]?.query !== undefined;

          return {
            operationName: body.operationName,
            variables: body.variables ?? {},
            ...(wantsQuery && { query: body.query.replace(/\s+/g, "") }),
          };
        });

        const expectedRequests = c.expect.requests.map((request) => ({
          ...request,
          variables: withMatchers(request.variables),
          ...(request.query !== undefined && { query: request.query.replace(/\s+/g, "") }),
        }));

        // A failure that wasn't expected is shown as itself, not as a request mismatch.
        if (!outcome.ok && !c.expect.error) throw outcome.error;

        expect(sent).toEqual(expectedRequests);

        if (c.expect.error) {
          expect(outcome.ok, "expected the call to fail").toBe(false);
          const error = (outcome as { error: unknown }).error;

          // ArgumentError is the language's own "bad argument" error, raised before sending.
          if (c.expect.error === "ArgumentError") {
            expect(error instanceof RangeError || error instanceof TypeError, String(error)).toBe(true);
          } else {
            expect(error).toBeInstanceOf(errorClass(c.expect.error));
            expect(error).toBeInstanceOf(sdk.HardcoverError);
          }

          for (const [path, value] of Object.entries(c.expect.fields ?? {})) {
            expect(readPath(error, path), path).toEqual(value);
          }

          return;
        }

        if ("result" in c.expect) {
          const value = (outcome as { value: unknown }).value;
          expect(looseKeys(value ?? null)).toEqual(withMatchers(looseKeys(c.expect.result)));
        }
      });
    }
  });
}
