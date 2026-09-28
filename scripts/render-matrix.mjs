#!/usr/bin/env node
// Renders the language matrix from languages.json into README.md between the
// MATRIX markers. Run with --check in CI to fail when the README is stale.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const { features, languages } = JSON.parse(readFileSync(join(root, "languages.json"), "utf8"));
const readmePath = join(root, "README.md");
const readme = readFileSync(readmePath, "utf8");

const SYMBOLS = { done: "✅", partial: "🟡", planned: "⬜", "n/a": "➖" };
const START = "<!-- MATRIX:START -->";
const END = "<!-- MATRIX:END -->";

// spec/05: a resource can't be done without a type-checked usage example.
const missing = [];
for (const l of languages) {
  for (const f of features) {
    if (!f.id.startsWith("res-") || l.support[f.id] !== "done") continue;
    const file = l.examples?.[f.id];
    if (!file || !existsSync(join(root, l.path, file))) {
      missing.push(`${l.name}: "${f.label}" is done but has no example${file ? ` (${file} not found)` : ""}`);
    }
  }
}
if (missing.length) {
  console.error(`Resources marked done need a usage example (languages.json "examples"):\n- ${missing.join("\n- ")}`);
  process.exit(1);
}

const header = `| Feature | ${languages.map((l) => l.name).join(" | ")} |`;
const divider = `|---|${languages.map(() => ":-:").join("|")}|`;

const rows = [];
let group = null;
for (const f of features) {
  if (f.group !== group) {
    group = f.group;
    rows.push(`| **${group}** | ${languages.map(() => "").join(" | ")} |`);
  }
  const cells = languages.map((l) => SYMBOLS[l.support[f.id] ?? "planned"]);
  rows.push(`| ${f.label} | ${cells.join(" | ")} |`);
}

const legend = "✅ done · 🟡 partial · ⬜ planned · ➖ not applicable";
const block = [START, header, divider, ...rows, "", legend, END].join("\n");

const pattern = new RegExp(`${START}[\\s\\S]*?${END}`);
if (!pattern.test(readme)) {
  console.error(`README.md is missing the ${START} / ${END} markers`);
  process.exit(1);
}
const next = readme.replace(pattern, block);

if (process.argv.includes("--check")) {
  if (next !== readme) {
    console.error("README matrix is out of date. Run: node scripts/render-matrix.mjs");
    process.exit(1);
  }
} else {
  writeFileSync(readmePath, next);
}
