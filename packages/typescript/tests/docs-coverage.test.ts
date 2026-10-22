// What developers see on hover must exist: every resource on the client, every
// resource class, and every error type and field carries a doc comment.
// (The Scopes: lines are checked in scopes-docs.test.ts.)
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, it } from "vitest";

const src = join(import.meta.dirname, "../src");
const read = (path: string) => readFileSync(join(src, path), "utf8");

// Lines matching `pattern` whose previous line doesn't end a doc comment.
function undocumented(source: string, pattern: RegExp): string[] {
  const lines = source.split("\n");

  return lines
    .map((line, i) => ({ line, above: lines[i - 1] ?? "" }))
    .filter(({ line, above }) => pattern.test(line) && !above.trim().endsWith("*/"))
    .map(({ line }) => line.trim());
}

it("every public property on HardcoverClient has a doc comment", () => {
  const source = read("core/client.ts");
  const body = source.slice(source.indexOf("export class HardcoverClient"));

  expect(undocumented(body, /^ {2}readonly [a-z]\w*:/)).toEqual([]);
});

it("every resource class has a doc comment", () => {
  const missing = readdirSync(join(src, "resources"))
    .filter((file) => file.endsWith(".ts"))
    .flatMap((file) => undocumented(read(`resources/${file}`), /^export class /).map((line) => `${file}: ${line}`));

  expect(missing).toEqual([]);
});

it("every error type and field has a doc comment", () => {
  const source = read("core/errors.ts");

  expect(undocumented(source, /^export (class|interface|type) |^ {2}readonly \w+:|^ {2}\w+\??: [A-Za-z]/)).toEqual([]);
});
