// Small helpers every resource uses, so each resource reads the same way.
import { HardcoverError } from "../core/errors.ts";

/**
 * Maps idiomatic input to wire fields, sending only fields the caller set.
 * Keep one `Record<keyof Input, string>` map per resource: TypeScript then
 * insists every input field has a wire name.
 */
export function pickDefined<T extends object>(input: T, wire: Record<keyof T, string>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, field] of Object.entries(wire) as [keyof T, string][]) {
    if (input[key] !== undefined) out[field] = input[key];
  }
  return out;
}

/** An action returned without the object it should carry. One message style everywhere. */
export function required<T>(value: T | null | undefined, root: string, noun: string): T {
  if (value === null || value === undefined) throw new HardcoverError(`${root} returned no ${noun}`);
  return value;
}

/** Drops the nulls GraphQL list types allow. */
export const nonNull = <T>(values: readonly (T | null)[] | null | undefined): T[] =>
  (values ?? []).filter((v): v is T => v !== null);
