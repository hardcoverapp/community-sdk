// The SDK core runs in Node, browsers and React Native (Hermes). It may only
// use what all three provide: fetch, AbortController, setTimeout, Intl,
// Promise. This fails on anything Node-only, browser-only, or missing from
// Hermes (spec/03 Language notes: React Native).
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { expect, it } from "vitest";

const src = join(import.meta.dirname, "../src");
const FORBIDDEN: [RegExp, string][] = [
  [/\bprocess\./, "Node's process"],
  [/\bBuffer\b/, "Node's Buffer"],
  [/\brequire\(/, "CommonJS require"],
  [/\b__dirname\b|\b__filename\b/, "Node path globals"],
  [/\bsetImmediate\b/, "Node's setImmediate"],
  [/\bstructuredClone\b/, "structuredClone (missing on Hermes)"],
  [/\bAbortSignal\.timeout\b/, "AbortSignal.timeout (missing on some Hermes versions)"],
  [/\bcrypto\./, "WebCrypto (missing on Hermes; OAuth takes pluggable crypto)"],
  // Using the global (`window.x`, `typeof document`), not a variable or property that shares the name.
  [/(?<![.\w$])(window|document|navigator|localStorage|sessionStorage)\s*\.|typeof\s+(window|document|navigator)\b/, "browser-only globals"],
  [/from\s+["']node:/, "Node built-in modules"],
  // React Native's Babel transform turns async code into generators and leaves
  // a stray `yield` when an `await` sits inside an object spread; the app
  // bundle then fails to compile. Await into a variable first.
  [/\.\.\.[^,;}]*\bawait\b/, "`await` inside an object spread (breaks React Native builds)"],
];

const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : path.endsWith(".ts") ? [path] : [];
  });

// Comments may mention these (e.g. why AbortSignal.timeout isn't used).
const stripComments = (code: string) => code.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/[^\n]*/g, "$1");

it("src/ uses only APIs every supported runtime has", () => {
  const found: string[] = [];
  for (const file of walk(src)) {
    const code = stripComments(readFileSync(file, "utf8"));
    for (const [pattern, what] of FORBIDDEN) {
      if (pattern.test(code)) found.push(`${relative(src, file)}: ${what}`);
    }
  }
  expect(found).toEqual([]);
});
