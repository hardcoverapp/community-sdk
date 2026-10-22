// Small helpers every resource uses, so each resource reads the same way.
import { HardcoverError } from "../core/errors.ts";

// Keep one `Record<keyof Input, string>` map per resource: TypeScript then
// insists every input field has a wire name.
/** Maps idiomatic input to wire fields, sending only fields the caller set. */
export function pickDefined<T extends object>(input: T, wire: Record<keyof T, string>): Record<string, unknown> {
  const out: Record<string, unknown> = {};

  for (const [key, field] of Object.entries(wire) as [keyof T, string][]) {
    if (input[key] !== undefined) out[field] = input[key];
  }

  return out;
}

/**
 * The record a write action returns. Actions wrap it in an envelope, so
 * `ActionRecord<AddUserBookMutation, "insert_user_book", "userBook">` is the
 * user book inside `insert_user_book { userBook }`.
 */
export type ActionRecord<
  Mutation,
  Root extends keyof Mutation,
  Key extends keyof NonNullable<Mutation[Root]>,
> = NonNullable<NonNullable<Mutation[Root]>[Key]>;

// One message style everywhere.
/** Throws when an action returned without the object it should carry. */
export function required<T>(value: T | null | undefined, root: string, noun: string): T {
  if (value === null || value === undefined) {
    throw new HardcoverError(`${root} returned no ${noun}`);
  }

  return value;
}

/** Drops the nulls GraphQL list types allow. */
export function nonNull<T>(values: readonly (T | null)[] | null | undefined): T[] {
  return (values ?? []).filter((value): value is T => value !== null);
}
