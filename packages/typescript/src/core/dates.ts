/**
 * A calendar date (YYYY-MM-DD) as seen in `timeZone`. The API stores user
 * dates like `user_date` as local dates, not UTC. Uses Intl, which Hermes
 * supports, so this runs in React Native.
 *
 * Built from formatToParts rather than a locale's formatted string, so the
 * result never depends on how a runtime's locale data orders or separates
 * date fields.
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
