import { describe, expect, it, vi } from "vitest";
import { localDate } from "../src/core/dates.ts";

describe("localDate", () => {
  const at = new Date("2026-09-29T02:30:00Z");

  it("uses the calendar date in the given timezone", () => {
    expect(localDate(at, "America/Denver")).toBe("2026-09-28");
    expect(localDate(at, "Asia/Tokyo")).toBe("2026-09-29");
    expect(localDate(at, "UTC")).toBe("2026-09-29");
  });

  it("zero-pads month and day", () => {
    expect(localDate(new Date("2026-01-05T12:00:00Z"), "UTC")).toBe("2026-01-05");
  });

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
