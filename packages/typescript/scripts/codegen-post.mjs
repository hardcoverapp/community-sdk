#!/usr/bin/env node
// After graphql-codegen: point the generated documents at the SDK's own
// DocumentTypeDecoration (src/core/decoration.ts), so the package doesn't depend
// on @graphql-typed-document-node/core or `graphql`.
import { readFileSync, writeFileSync } from "node:fs";

const file = new URL("../src/generated/graphql.ts", import.meta.url);
const from = "import type { DocumentTypeDecoration } from '@graphql-typed-document-node/core';";
const to = 'import type { DocumentTypeDecoration } from "../core/decoration.ts";';

const source = readFileSync(file, "utf8");

if (!source.includes(from) && !source.includes(to)) {
  throw new Error("codegen-post: the generated DocumentTypeDecoration import changed; update scripts/codegen-post.mjs");
}

writeFileSync(file, source.replace(from, to));
console.log("graphql.ts → core/decoration.ts");
