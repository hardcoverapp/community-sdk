// TS enums are generated from shared/enums.json so ids never drift.
import { describe, expect, it } from "vitest";
import enums from "../../../shared/enums.json" with { type: "json" };
import * as sdk from "../src/index.ts";

const pascal = (key: string) => key.toLowerCase().replace(/(^|_)([a-z])/g, (_, __, c: string) => c.toUpperCase());
type EnumSpec = { values: { id: number | string; key: string }[] };
const withValues = Object.entries(enums as Record<string, unknown>).filter(
  (entry): entry is [string, EnumSpec] => typeof entry[1] === "object" && entry[1] !== null && "values" in entry[1],
);

describe("generated enums", () => {
  it.for(withValues.flatMap(([name, spec]) => spec.values.map((v) => [name, pascal(v.key), v.id] as const)))(
    "%s.%s = %s",
    ([name, member, id]) => {
      const exported = (sdk as unknown as Record<string, Record<string, unknown>>)[name];
      expect(exported, `${name} not exported`).toBeTypeOf("object");
      expect(exported![member]).toBe(id);
    },
  );

  it("reads well at call sites", () => {
    expect(sdk.UserBookStatus.WantToRead).toBe(1);
    expect(sdk.PrivacySetting.Private).toBe(3);
    expect(sdk.SearchType.Series).toBe("series");
  });
});
