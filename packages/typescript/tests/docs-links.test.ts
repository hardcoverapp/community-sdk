// Editor tooltips link to the docs for this version of the SDK
// (docs.hardcover.app/sdk/typescript/0.1/...). A new minor version has its own
// docs, so its links must move with it.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { expect, it } from "vitest";
import pkg from "../package.json" with { type: "json" };

const src = join(import.meta.dirname, "../src");
const minor = pkg.version.split(".").slice(0, 2).join(".");

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? files(path) : path.endsWith(".ts") ? [path] : [];
  });
}

it(`links to the SDK docs for this version (${minor})`, () => {
  const wrong = files(src).flatMap((file) =>
    [...readFileSync(file, "utf8").matchAll(/docs\.hardcover\.app\/sdk\/typescript\/([^/]+)\//g)]
      .filter((match) => match[1] !== minor)
      .map((match) => `${file.slice(src.length + 1)}: ${match[0]}`),
  );

  expect(wrong).toEqual([]);
});
