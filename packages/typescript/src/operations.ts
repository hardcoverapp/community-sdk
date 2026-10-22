// Name-indexed registry over the generated documents. Every operation in
// shared/operations becomes `operations.<Name>`, typed with its result and
// variables. Regenerate with `pnpm codegen`.
import { operations } from "./generated/operations.ts";

// Generated with a doc comment per operation (scopes, roles, protected
// fields), so editors show what each one needs: scripts/gen-operation-docs.mjs.
export { operations };

export type Operations = typeof operations;

export type OperationKind = "query" | "mutation" | "subscription";

export interface OperationInfo {
  name: string | undefined;
  kind: OperationKind;
}

// The client uses this to decide retry safety and to set operationName.
/**
 * The kind and name of the first operation in a GraphQL document. Anonymous
 * `{ ... }` shorthand is a query.
 */
export function operationInfo(document: unknown): OperationInfo {
  const source = String(document).replace(/#[^\n]*/g, "");
  const match = /(?:^|\})\s*(query|mutation|subscription)\b\s*([_A-Za-z][_0-9A-Za-z]*)?/.exec(source);
  if (match) return { kind: match[1] as OperationKind, name: match[2] };
  return { kind: "query", name: undefined };
}
