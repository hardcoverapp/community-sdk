// Every public resource method documents the scopes it needs, as one
// "Scopes:" line in its doc comment, so editors show them on hover.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { Kind, parse } from "graphql";
import { expect, it } from "vitest";
import { operations } from "../src/index.ts";

const dir = join(import.meta.dirname, "../src/resources");

it("every public resource method has a Scopes: line", () => {
  const missing: string[] = [];
  for (const file of readdirSync(dir).filter((f) => f.endsWith(".ts"))) {
    const source = readFileSync(join(dir, file), "utf8");
    if (!source.includes("export class")) continue;
    const lines = source.slice(source.indexOf("export class")).split("\n");
    lines.forEach((line, i) => {
      // A public method starts at exactly two spaces: `  name(` or `  async name(`.
      const name = /^ {2}(?:async )?([a-z]\w*)\(/.exec(line)?.[1];
      if (!name || name === "constructor") return;
      // Its doc comment is the block that ends on the line just above.
      let doc = "";
      if (lines[i - 1]?.trimEnd().endsWith("*/")) {
        for (let j = i - 1; j >= 0; j--) {
          doc = lines[j] + "\n" + doc;
          if (lines[j]!.includes("/**")) break;
        }
      }
      if (!doc.includes("Scopes:")) missing.push(`${file} ${name}`);
    });
  }
  expect(missing).toEqual([]);
});

// The hand-written Scopes: lines must cover what the server requires. Which
// operations each method sends comes from the shared resource cases; what each
// operation needs comes from the API snapshot (the same data the generated
// `operations` docs use), so a doc can't quietly drift from the server.
it("every resource method's Scopes: line covers what its operations need", () => {
  const capabilityScopes = JSON.parse(
    readFileSync(join(import.meta.dirname, "../../../api-snapshot/capability-scopes.json"), "utf8"),
  ) as Record<string, { read: string[]; write: string[] }>;

  const casesDir = join(import.meta.dirname, "../../../shared/conformance/resources");
  const documented = documentedScopes();
  const problems = new Set<string>();

  for (const file of readdirSync(casesDir).filter((f) => f.endsWith(".json"))) {
    const cases = JSON.parse(readFileSync(join(casesDir, file), "utf8")) as ResourceCase[];

    for (const c of cases) {
      const methods = c.calls ? c.calls.map((call) => call.method) : [c.method];
      const method = methods[methods.length - 1]!;
      const scopes = documented.get(method);
      if (!scopes) continue;

      for (const request of c.expect.requests ?? []) {
        const document = (operations as Record<string, unknown>)[request.operationName];
        if (!document) continue;

        for (const { field, kind } of rootFields(String(document))) {
          const accepted = capabilityScopes[field]?.[kind === "mutation" ? "write" : "read"] ?? [];
          if (accepted.length && !accepted.some((scope) => scopes.has(scope))) {
            problems.add(`${method}: ${request.operationName} needs one of ${accepted.join(", ")}`);
          }
        }
      }
    }
  }

  expect([...problems].sort()).toEqual([]);
});

interface ResourceCase {
  method?: string;
  calls?: { method: string }[];
  expect: { requests?: { operationName: string }[] };
}

// "library.add" → the scopes in its doc comment's Scopes: line.
function documentedScopes(): Map<string, Set<string>> {
  const result = new Map<string, Set<string>>();

  for (const file of readdirSync(dir).filter((f) => f.endsWith(".ts"))) {
    const source = readFileSync(join(dir, file), "utf8");
    const resource = file.replace(/\.ts$/, "");

    // A doc comment followed by a two-space-indented method.
    for (const match of source.matchAll(/\/\*\*([\s\S]*?)\*\/\s*\n {2}(?:async )?([a-z]\w*)\(/g)) {
      const scopesText = match[1]!.split("Scopes:")[1];
      if (!scopesText) continue;

      const scopes = new Set([...scopesText.matchAll(/`((?:read|write):[\w:]+)`/g)].map((m) => m[1]!));
      result.set(`${resource}.${match[2]}`, scopes);
    }
  }

  return result;
}

// The root fields of a document's operation, with the operation's kind.
function rootFields(query: string): { field: string; kind: string }[] {
  const operation = parse(query).definitions.find((d) => d.kind === Kind.OPERATION_DEFINITION);
  if (!operation || operation.kind !== Kind.OPERATION_DEFINITION) return [];

  return operation.selectionSet.selections
    .filter((s) => s.kind === Kind.FIELD)
    .map((s) => ({ field: s.kind === Kind.FIELD ? s.name.value : "", kind: operation.operation }));
}
