// The localDate rules are pinned in shared/conformance/vectors.json. This
// checks a runtime detail: the result never comes from Intl's locale format.
import { describe, expect, it, vi } from "vitest";
import { localDate } from "../src/core/dates.ts";

describe("localDate", () => {
  const at = new Date("2026-09-29T02:30:00Z");

  it("does not depend on the runtime locale's date format", () => {
    // Simulate a runtime whose formatted dates are US-style. `format` is a getter.
    // The DOM lib types it as a method, so cast to its runtime shape.
    const proto = Intl.DateTimeFormat.prototype as unknown as { format: unknown };
    const spy = vi.spyOn(proto, "format", "get").mockReturnValue(() => "09/28/2026");
    try {
      expect(localDate(at, "America/Denver")).toBe("2026-09-28");
    } finally {
      spy.mockRestore();
    }
  });
});
