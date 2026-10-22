#!/usr/bin/env node
// Checks the package the way an app would see it: packs the tarball, installs
// it into a throwaway project, then imports, requires and type-checks it.
// Run after `pnpm build` (or use `pnpm pack:check`, which builds first).
import { execFileSync } from "node:child_process";
import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const pkg = new URL("..", import.meta.url).pathname;
const work = mkdtempSync(join(tmpdir(), "hardcover-sdk-pack-"));
const run = (cmd, args, cwd = work) => execFileSync(cmd, args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "inherit"] });

const failures = [];
const check = (name, passed) => {
  console.log(`${passed ? "PASS" : "FAIL"}  ${name}`);
  if (!passed) failures.push(name);
};

try {
  // 1. What goes in the tarball.
  run("npm", ["pack", "--pack-destination", work, "--silent"], pkg);
  const tarball = readdirSync(work).find((file) => file.endsWith(".tgz"));
  const files = run("tar", ["-tzf", tarball]).split("\n").filter(Boolean);

  check("tarball has the code and its types", ["dist/index.js", "dist/index.d.ts", "dist/oauth/index.js", "dist/stats/index.js", "dist/testing/index.js"].every((f) => files.includes(`package/${f}`)));
  check("tarball has no source, tests or local files", files.every((f) => /^package\/(dist\/|package\.json$|README\.md$|LICENSE)/.test(f)));

  // Doc comments in the declarations are for people using the package: no
  // spec references, repo paths or build internals. (The schema's own field
  // descriptions in generated/graphql.d.ts come from the API and are fine.)
  const devNote = /spec\/|spec0|shared\/|scripts\/|tests\/|\b[\w-]+\.(?:ts|mjs|json)\b|Hermes|Babel|codegen|Hasura/;
  const declarations = files.filter((f) => f.endsWith(".d.ts") && !/generated\/graphql\.d\.ts$/.test(f));
  const leaks = [];

  run("tar", ["-xzf", tarball]);
  for (const file of declarations) {
    for (const comment of readFileSync(join(work, file), "utf8").match(/\/\*\*[\s\S]*?\*\//g) ?? []) {
      const hit = devNote.exec(comment);
      if (hit) leaks.push(`${file.replace("package/", "")}: "${hit[0]}"`);
    }
  }

  check("declaration comments are for users, not maintainers", leaks.length === 0);
  if (leaks.length) console.error(`  ${[...new Set(leaks)].join("\n  ")}`);

  // 2. Install it the way an app would.
  writeFileSync(join(work, "package.json"), JSON.stringify({ name: "consumer", private: true, type: "module" }));
  run("npm", ["install", "--silent", "--no-audit", "--no-fund", join(work, tarball), "typescript@5"]);

  // 3. ES modules: every entry point loads, and errors are one class across them.
  const esm = run("node", ["--input-type=module", "-e", `
    const sdk = await import("@hardcover/sdk");
    const oauth = await import("@hardcover/sdk/oauth");
    const testing = await import("@hardcover/sdk/testing");
    const stats = await import("@hardcover/sdk/stats");
    console.log(JSON.stringify({
      client: typeof sdk.HardcoverClient, session: typeof oauth.OAuthSession, mock: typeof testing.MockTransport, stats: typeof stats.computeStats,
      sameError: sdk.SignedOutError === oauth.SignedOutError,
    }));`]);
  const e = JSON.parse(esm);
  check("import: every entry point loads", e.client === "function" && e.session === "function" && e.mock === "function" && e.stats === "function");
  check("import: SignedOutError is one class across entry points", e.sameError);

  // 4. CommonJS apps on Node 22.12+ can require() the ES modules directly.
  const cjs = run("node", ["-e", `
    const sdk = require("@hardcover/sdk");
    const oauth = require("@hardcover/sdk/oauth");
    console.log(JSON.stringify({ client: typeof sdk.HardcoverClient, session: typeof oauth.OAuthSession, sameError: sdk.SignedOutError === oauth.SignedOutError }));`]);
  const c = JSON.parse(cjs);
  check("require() of the ES modules works (Node 22.12+)", c.client === "function" && c.session === "function" && c.sameError);

  // 5. Types resolve for each way apps set up TypeScript.
  const source = `
    import { HardcoverClient, operations } from "@hardcover/sdk";
    import { OAuthSession, memoryStore, type TokenSet } from "@hardcover/sdk/oauth";
    import { MockTransport } from "@hardcover/sdk/testing";
    import { computeStats, period, type ReadingStats } from "@hardcover/sdk/stats";
    const session = new OAuthSession({ clientId: "x", store: memoryStore() });
    const hc = new HardcoverClient({ auth: session, transport: new MockTransport([]) });
    export const typed: Promise<{ id: number }> = hc.me.get();
    export const op = operations.Me;
    export type T = TokenSet;
    export const year: ReadingStats = computeStats({ library: [], contributorRoles: { contributor_roles: [], contributor_role_specializations: [] } }, period.year(2025));
  `;
  for (const [mode, resolution, ext] of [["nodenext", "nodenext", "mts"], ["nodenext", "nodenext", "cts"], ["esnext", "bundler", "ts"]]) {
    const file = `consumer-${resolution}.${ext}`;
    writeFileSync(join(work, file), source);
    let ok = true;
    try {
      // No @types/node is installed here, so this also proves the types don't need Node's.
      run("npx", ["tsc", "--noEmit", "--strict", "--skipLibCheck", "false", "--target", "es2022", "--lib", "es2022,dom", "--module", mode, "--moduleResolution", resolution, file]);
    } catch (error) {
      ok = false;
      console.error(String(error.stdout ?? error).trim());
    }
    check(`types: module ${mode}, resolution ${resolution} (.${ext})`, ok);
  }
} finally {
  rmSync(work, { recursive: true, force: true });
}

if (failures.length) {
  console.error(`\n${failures.length} failed`);
  process.exit(1);
}
console.log("\npackage looks right");
