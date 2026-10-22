// Uses Intl, which Hermes supports, so this runs in React Native. Built from
// formatToParts rather than a locale's formatted string, so the result never
// depends on how a runtime's locale data orders or separates date fields.
/**
 * A calendar date (YYYY-MM-DD) as seen in `timeZone` (an IANA name such as
 * "America/Chicago"; the runtime's own zone when left out). The API stores
 * user dates like `user_date` as local dates, not UTC, so use this to fill
 * them in. Works in React Native.
 */
export function localDate(at: Date, timeZone?: string | null): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timeZone ?? undefined,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(at);
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

/** When something actually happened, as the API's `action_at` timestamp. */
export type OccurredAt = Date | string;

export function toActionAt(occurredAt: OccurredAt): string {
  if (typeof occurredAt === "string") return occurredAt;
  if (Number.isNaN(occurredAt.getTime())) throw new RangeError("occurredAt is an invalid Date");
  return occurredAt.toISOString();
}
