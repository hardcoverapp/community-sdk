// Everything the published package needs must live inside it: an import that
// reaches outside packages/typescript breaks npm installs and Metro bundling.
// Shared data (shared/*.json) is generated into src/generated instead.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { expect, it } from "vitest";

const pkg = resolve(import.meta.dirname, "..");
const src = join(pkg, "src");

const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : path.endsWith(".ts") ? [path] : [];
  });

it("src/ never imports from outside the package", () => {
  const escapes: string[] = [];
  for (const file of walk(src)) {
    for (const [, spec] of readFileSync(file, "utf8").matchAll(/from\s+["'](\.{1,2}\/[^"']+)["']/g)) {
      const target = resolve(dirname(file), spec!);
      if (relative(pkg, target).startsWith("..")) escapes.push(`${relative(pkg, file)} → ${spec}`);
    }
  }
  expect(escapes).toEqual([]);
});
