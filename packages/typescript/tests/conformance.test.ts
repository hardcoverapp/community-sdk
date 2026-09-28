// Runs the language-neutral cases in shared/conformance against this SDK.
// These cases define parity across languages; see spec/04-testing.md.
import type { DocumentTypeDecoration } from "@graphql-typed-document-node/core";
import { describe, expect, it } from "vitest";
import cases from "../../../shared/conformance/cases.json" with { type: "json" };
import errorSpec from "../../../shared/errors.json" with { type: "json" };
import * as sdk from "../src/index.ts";
import { MockTransport, type MockResponse } from "../src/testing/index.ts";

type Case = {
  id: string;
  call: { op: string; variables?: Record<string, unknown>; query?: string };
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
        ...c.client,
      });

      const run =
        c.call.op === "raw"
          ? client.graphql(c.call.query!, c.call.variables)
          : client.request(
              sdk.operations[c.call.op as keyof typeof sdk.operations] as DocumentTypeDecoration<unknown, unknown>,
              c.call.variables,
            );

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
  it.each(errorSpec.errors.map((e) => [e.name, e.parent] as const))("exports %s extending %s", (name, parent) => {
    const exported = sdk as unknown as Record<string, new (...args: never[]) => Error>;
    expect(exported[name], `${name} is not exported`).toBeTypeOf("function");
    expect(exported[name]!.prototype).toBeInstanceOf(exported[parent]!);
  });
});
