#!/usr/bin/env node
// Builds the published package into dist/: ES modules plus type declarations.
// One file per source module, not a bundle, so `@hardcover/sdk` and
// `@hardcover/sdk/oauth` share one copy of the core and its error classes
// (instanceof works across entry points).
import { execFileSync } from "node:child_process";
import { readdirSync, rmSync } from "node:fs";
import { join, relative } from "node:path";

const dist = new URL("../dist/", import.meta.url);
const tsc = (...args) => execFileSync("tsc", ["-p", "tsconfig.build.json", ...args], { stdio: "inherit" });

rmSync(dist, { recursive: true, force: true });

// Two passes: JavaScript without comments (nobody reads them at runtime), then
// type declarations with every doc comment (editors show them: scopes, roles,
// what each method does).
tsc("--removeComments", "--declaration", "false");
tsc("--emitDeclarationOnly");

// Ship only the type declarations an app can reach from an entry point.
// Internal modules (pacing, batching, response parsing) keep their
// JavaScript but not their declarations, which no app would ever open.
pruneDeclarations(dist);

console.log("built dist/");

function pruneDeclarations(dir) {
  const root = dir.pathname;
  const entries = ["index.d.ts", "oauth/index.d.ts", "stats/index.d.ts", "testing/index.d.ts"];

  // TypeScript lists every file the entry points pull in.
  const listed = execFileSync(
    "tsc",
    ["--ignoreConfig", "--listFilesOnly", "--skipLibCheck", "--module", "nodenext", "--target", "es2022", "--lib", "es2022,dom", ...entries],
    { cwd: root, encoding: "utf8" },
  );
  const reachable = new Set(listed.split("\n").filter((path) => path.startsWith(root)).map((path) => relative(root, path)));

  for (const file of readdirSync(root, { recursive: true })) {
    if (file.endsWith(".d.ts") && !reachable.has(file)) rmSync(join(root, file));
  }
}
