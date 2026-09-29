// Every public resource method documents the scopes it needs, as one
// "Scopes:" line in its doc comment, so editors show them on hover.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, it } from "vitest";

const dir = join(import.meta.dirname, "../src/resources");

it("every public resource method has a Scopes: line", () => {
  const missing: string[] = [];
  for (const file of readdirSync(dir).filter((f) => f.endsWith(".ts"))) {
    const source = readFileSync(join(dir, file), "utf8");
    if (!source.includes("export class")) continue;
    const lines = source.slice(source.indexOf("export class")).split("\n");
    lines.forEach((line, i) => {
      // A public method starts at exactly two spaces: `  name(` or `  async name(`.
      const name = /^ {2}(?:async )?([a-z]\w*)\(/.exec(line)?.[1];
      if (!name || name === "constructor") return;
      // Its doc comment is the block that ends on the line just above.
      let doc = "";
      if (lines[i - 1]?.trimEnd().endsWith("*/")) {
        for (let j = i - 1; j >= 0; j--) {
          doc = lines[j] + "\n" + doc;
          if (lines[j]!.includes("/**")) break;
        }
      }
      if (!doc.includes("Scopes:")) missing.push(`${file} ${name}`);
    });
  }
  expect(missing).toEqual([]);
});
