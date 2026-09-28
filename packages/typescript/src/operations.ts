// Name-indexed registry over the generated documents. Every operation in
// shared/operations becomes `operations.<Name>`, typed with its result and
// variables. Regenerate with `pnpm codegen`.
import * as generated from "./generated/graphql.ts";

type Generated = typeof generated;
type OperationName = {
  [K in keyof Generated]: K extends `${infer Name}Document` ? Name : never;
}[keyof Generated];

export type Operations = { [Name in OperationName]: Generated[`${Name}Document`] };

export const operations = Object.fromEntries(
  Object.entries(generated)
    .filter(([key]) => key.endsWith("Document"))
    .map(([key, doc]) => [key.slice(0, -"Document".length), doc]),
) as Operations;

export type OperationKind = "query" | "mutation" | "subscription";

export interface OperationInfo {
  name: string | undefined;
  kind: OperationKind;
}

/**
 * Finds the first operation definition in a document. Anonymous `{ ... }`
 * shorthand is a query. Used to decide retry safety and to set operationName.
 */
export function operationInfo(document: unknown): OperationInfo {
  const source = String(document).replace(/#[^\n]*/g, "");
  const match = /(?:^|\})\s*(query|mutation|subscription)\b\s*([_A-Za-z][_0-9A-Za-z]*)?/.exec(source);
  if (match) return { kind: match[1] as OperationKind, name: match[2] };
  return { kind: "query", name: undefined };
}
