// The registry must expose every operation in shared/operations, so resources
// and the conformance runner can look documents up by name.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { walk } from "../../../scripts/lib.mjs";
import { operationInfo, operations } from "../src/operations.ts";

const opsDir = join(import.meta.dirname, "../../../shared/operations");

function sharedOperations(): { name: string; kind: string }[] {
  return walk(opsDir).flatMap((path) =>
    [...readFileSync(path, "utf8").matchAll(/^(query|mutation|subscription)\s+(\w+)/gm)].map((m) => ({ kind: m[1]!, name: m[2]! })),
  );
}

describe("operations registry", () => {
  const shared = sharedOperations();

  it("found the shared operations", () => {
    expect(shared.length).toBeGreaterThan(20);
  });

  it.each(shared)("exposes $kind $name", ({ name, kind }) => {
    const doc = operations[name as keyof typeof operations];
    expect(doc, `${name} missing from registry; run pnpm codegen`).toBeDefined();
    expect(operationInfo(doc)).toEqual({ name, kind });
  });

  it("includes fragment definitions in each document", () => {
    expect(String(operations.Me)).toContain("fragment Me on users");
    expect(String(operations.Me)).toContain("fragment UserProfile on users");
  });
});
