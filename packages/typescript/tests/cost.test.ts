// The gateway charges one unit per top-level field. The client counts the same
// way to pace itself. The counting rules are pinned in
// shared/conformance/vectors.json (requestCost); this checks the real
// generated documents, whose camelCase aliases are TypeScript's own.
import { describe, expect, it } from "vitest";
import { requestCost } from "../src/core/cost.ts";
import { operations } from "../src/index.ts";

describe("requestCost", () => {
  it("counts one for a generated single-root operation, however deep", () => {
    expect(requestCost(String(operations.GetLibrary))).toBe(1);
    expect(requestCost(String(operations.GetBook))).toBe(1);
  });
});
