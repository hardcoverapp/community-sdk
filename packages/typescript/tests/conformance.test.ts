// Runs the language-neutral cases in shared/conformance against this SDK.
// These cases define parity across languages; see spec/04-testing.md.
import type { DocumentTypeDecoration } from "../src/core/decoration.ts";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import cases from "../../../shared/conformance/cases.json" with { type: "json" };
import errorSpec from "../../../shared/errors.json" with { type: "json" };
import * as sdk from "../src/index.ts";
import { MockTransport, type MockResponse } from "../src/testing/index.ts";

type Call = { op: string; variables?: Record<string, unknown>; query?: string };
type Case = {
  id: string;
  call?: Call;
  calls?: Call[];
  random?: number;
  client?: { maxRetries?: number };
  responses: MockResponse[];
  pending?: string[];
  expect: {
    requests: number;
    sleptSeconds?: number[];
    result: "ok" | { error: string; fields?: Record<string, unknown> };
    rateLimit?: Record<string, unknown>;
  };
};

// Reads "errors[0].code" style paths off an error instance.
function readPath(target: unknown, path: string): unknown {
  return path
    .split(/\.|\[(\d+)\]/)
    .filter(Boolean)
    .reduce<unknown>((value, key) => (value == null ? undefined : (value as Record<string, unknown>)[key]), target);
}

describe("conformance", () => {
  for (const c of cases as Case[]) {
    const test = c.pending?.includes("typescript") ? it.skip : it;

    test(c.id, async () => {
      const transport = new MockTransport(c.responses);
      const slept: number[] = [];
      const client = new sdk.HardcoverClient({
        token: "hc_pat_conformance",
        transport,
        sleep: async (ms) => {
          slept.push(ms / 1000);
        },
        ...(c.random !== undefined && { random: () => c.random! }),
        ...c.client,
      });

      const send = (call: Call) =>
        call.op === "raw"
          ? client.graphql(call.query!, call.variables)
          : client.request(sdk.operations[call.op as keyof typeof sdk.operations] as DocumentTypeDecoration<unknown, unknown>, call.variables);
      const calls = c.calls ?? [c.call!];
      for (const earlier of calls.slice(0, -1)) await send(earlier);
      const run = send(calls[calls.length - 1]!);

      const outcome = await run.then(
        (data) => ({ ok: true as const, data }),
        (error: unknown) => ({ ok: false as const, error }),
      );

      expect(transport.requests).toHaveLength(c.expect.requests);

      if (c.expect.sleptSeconds) {
        expect(slept).toEqual(c.expect.sleptSeconds);
      }

      if (c.expect.result === "ok") {
        expect(outcome.ok ? "ok" : outcome.error).toBe("ok");
      } else {
        const { error: name, fields = {} } = c.expect.result;
        expect(outcome.ok, "expected the call to fail").toBe(false);
        const error = (outcome as { error: unknown }).error;
        const ErrorClass = (sdk as unknown as Record<string, new () => Error>)[name];
        expect(ErrorClass, `${name} is not exported`).toBeTypeOf("function");
        expect(error).toBeInstanceOf(ErrorClass);
        expect(error).toBeInstanceOf(sdk.HardcoverError);
        for (const [path, value] of Object.entries(fields)) {
          expect(readPath(error, path), path).toEqual(value);
        }
      }

      if (c.expect.rateLimit) {
        expect(client.rateLimit).toMatchObject(c.expect.rateLimit);
      }
    });
  }
});

describe("error taxonomy", () => {
  // The properties each error adds, read from errors.ts, are the ones errors.json
  // lists, so every language exposes the same fields.
  const source = readFileSync(join(import.meta.dirname, "../src/core/errors.ts"), "utf8");

  function ownFields(name: string): string[] {
    const body = source.split(new RegExp(`^export class ${name} extends \\w+ \\{`, "m"))[1]?.split(/^\}/m)[0] ?? "";
    return [...body.matchAll(/^ {2}readonly (\w+)/gm)].map((match) => match[1]!);
  }

  it("HardcoverError carries the base fields", () => {
    const own = source.split(/^export class HardcoverError extends Error \{/m)[1]?.split(/^\}/m)[0] ?? "";
    expect([...own.matchAll(/^ {2}readonly (\w+)/gm)].map((m) => m[1])).toEqual(["status", ...errorSpec.baseFields.filter((f) => f !== "status")]);
  });

  it.each(errorSpec.errors.map((e) => [e.name, e.fields ?? []] as const))("%s adds exactly the fields errors.json lists", (name, fields) => {
    expect(ownFields(name)).toEqual(fields);
  });

  it.each(errorSpec.errors.map((e) => [e.name, e.parent] as const))("exports %s extending %s", (name, parent) => {
    const exported = sdk as unknown as Record<string, new (...args: never[]) => Error>;
    expect(exported[name], `${name} is not exported`).toBeTypeOf("function");
    expect(exported[name]!.prototype).toBeInstanceOf(exported[parent]!);
  });
});
