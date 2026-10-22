// Every public SDK method, read from the shared catalog (shared/catalog.json),
// plus the one generic way the page calls them. The catalog is plain data, so
// the docs site and other SDKs read the same description of each method.
import * as sdk from "@hardcover/sdk";
import type { HardcoverClient } from "@hardcover/sdk";
import { period, readingStats, type StatsPeriod } from "@hardcover/sdk/stats";
import catalogFile from "../../../shared/catalog.json";

// ---------- the catalog's shape ----------

export type Kind =
  | "number"
  | "text"
  | "longText"
  | "lines"
  | "date"
  | "datetime"
  | "boolean"
  | "enum"
  | "literal"
  | "options"
  | "json"
  | "period";

/** One positional param, or one field of an options object. */
export interface Field {
  name: string;
  kind: Kind;
  label?: string;
  required?: boolean;
  example?: unknown;
  hint?: string;

  /** An empty value is passed as null (e.g. to clear a rating). */
  nullable?: boolean;

  /** enum: the SDK enum's name, e.g. "UserBookStatus". */
  enum?: string;

  /** enum: the member keys allowed (all when left out). literal: the accepted strings. */
  values?: string[];

  /** lines: what each line is. */
  itemKind?: "number" | "text";

  /** options: the object's fields. */
  fields?: Field[];
}

export interface Method {
  name: string;
  summary: string;
  scopes: string[];

  /** Changes data on the server. Shown as a text badge. */
  writes: boolean;

  /** Deletes something; the page asks for confirmation first. */
  destructive: boolean;

  returns: string;
  params: Field[];
}

export interface Resource {
  name: string;
  summary: string;

  /** "function": the methods are functions from `module`, called with the client first. */
  call?: "function";
  module?: string;

  methods: Method[];
}

export const catalog: Resource[] = (catalogFile as unknown as { resources: Resource[] }).resources;

// ---------- enums ----------

type EnumObject = Record<string, string | number>;

/** The SDK's enum object by name, e.g. "UserBookStatus" → UserBookStatus. */
export function sdkEnum(name: string): EnumObject {
  const value = (sdk as unknown as Record<string, unknown>)[name];

  if (!value || typeof value !== "object") throw new Error(`The SDK has no enum named ${name}`);
  return value as EnumObject;
}

/** The member keys a field offers, in the enum's own order. */
export function enumKeys(field: Field): string[] {
  return field.values ?? Object.keys(sdkEnum(field.enum!));
}

// ---------- form values to call arguments ----------

/**
 * Reads what the form holds for one input, by its path ("options.status").
 * Empty string means not set.
 */
export type Reader = (path: string) => string;

/**
 * The method's arguments, positional and in order. An options param becomes an
 * object of only the fields that were set; unset trailing params are left out,
 * as someone writing the call by hand would.
 */
export function buildArgs(params: Field[], read: Reader): unknown[] {
  const args = params.map((param) => valueOf(param, param.name, read));

  while (args.length > 0 && args[args.length - 1] === undefined) args.pop();

  return args;
}

function valueOf(field: Field, path: string, read: Reader): unknown {
  if (field.kind === "options") return optionsOf(field, path, read);
  if (field.kind === "period") return periodOf(path, read);

  const raw = read(path).trim();
  if (raw === "") return field.nullable ? null : undefined;

  switch (field.kind) {
    case "number":
      return Number(raw);

    case "boolean":
      return raw === "true";

    // The form holds the member key; the SDK takes the member's value.
    case "enum":
      return sdkEnum(field.enum!)[raw];

    case "lines": {
      const items = raw.split("\n").map((line) => line.trim()).filter(Boolean);
      return field.itemKind === "number" ? items.map(Number) : items;
    }

    case "datetime":
      return new Date(raw);

    case "json":
      return JSON.parse(raw);

    // text, longText, date, literal: the string as typed.
    default:
      return raw;
  }
}

// Only the fields that were set. A required options param is passed even
// when empty; an optional one is left out.
function optionsOf(field: Field, path: string, read: Reader): Record<string, unknown> | undefined {
  const object: Record<string, unknown> = {};

  for (const inner of field.fields ?? []) {
    const value = valueOf(inner, `${path}.${inner.name}`, read);
    if (value !== undefined) object[inner.name] = value;
  }

  const empty = Object.keys(object).length === 0;
  return empty && !field.required ? undefined : object;
}

// A stats period, built with the stats module's own helpers.
function periodOf(path: string, read: Reader): StatsPeriod {
  const kind = read(`${path}.kind`);
  const year = Number(read(`${path}.year`));

  if (kind === "year") return period.year(year);
  if (kind === "month") return period.month(year, Number(read(`${path}.month`)));
  if (kind === "custom") return period.custom(read(`${path}.from`), read(`${path}.to`));

  return period.life();
}

// ---------- calling ----------

// Resources that are functions rather than client properties, by name.
const functions: Record<string, Record<string, (client: HardcoverClient, ...args: unknown[]) => Promise<unknown>>> = {
  stats: { readingStats: readingStats as (client: HardcoverClient, ...args: unknown[]) => Promise<unknown> },
};

/** Calls one method exactly as an app would: `client.library.add(...args)`. */
export async function callMethod(client: HardcoverClient, resource: Resource, method: Method, args: unknown[]): Promise<unknown> {
  if (resource.call === "function") {
    const fn = functions[resource.name]?.[method.name];
    if (!fn) throw new Error(`No function for ${resource.name}.${method.name}`);

    return fn(client, ...args);
  }

  const target = (client as unknown as Record<string, Record<string, unknown>>)[resource.name]!;
  const fn = target[method.name] as (...args: unknown[]) => Promise<unknown>;

  return fn.apply(target, args);
}

// ---------- examples as form values ----------

/** A field's example as the text its input starts with. */
export function exampleText(field: Field): string {
  const example = field.example;
  if (example === undefined || example === null) return "";

  if (field.kind === "lines" && Array.isArray(example)) return example.join("\n");
  if (field.kind === "json") return JSON.stringify(example, null, 2);

  return String(example);
}
