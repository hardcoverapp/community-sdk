#!/usr/bin/env node
// Bundles tests/hermes/smoke.ts and runs it on a Hermes engine. React Native
// runs code through Babel (@react-native/babel-preset, as Metro does) before
// Hermes sees it, so the bundle gets the same transform: that's what turns
// classes and other syntax into what Hermes accepts.
// Usage: pnpm hermes:smoke                         (syntax check only)
//        HERMES_BIN=/path/to/hermes pnpm hermes:smoke  (plus runtime checks)
// (Hermes CLI builds: https://github.com/facebook/hermes/releases)
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { createRequire } from "node:module";
import { platform } from "node:process";
import { transformSync } from "@babel/core";
import { build } from "esbuild";

// Without HERMES_BIN only the syntax check runs (hermesc ships on npm for
// every platform, so CI can always run that part).
const hermes = process.env.HERMES_BIN;

const out = join(mkdtempSync(join(tmpdir(), "hermes-smoke-")), "smoke.js");
await build({
  entryPoints: [new URL("../tests/hermes/smoke.ts", import.meta.url).pathname],
  bundle: true,
  format: "iife",
  platform: "neutral",
  target: "es2022",
  outfile: out,
  logLevel: "warning",
});

const bundle = readFileSync(out, "utf8");
const transform = (profile) =>
  transformSync(bundle, {
    filename: "smoke.js",
    babelrc: false,
    configFile: false,
    sourceType: "script",
    presets: [["@react-native/babel-preset", { disableImportExportTransform: true, unstable_transformProfile: profile, enableBabelRuntime: false }]],
  }).code;

// 1. Syntax, current Hermes: compile the bundle exactly as React Native ships
//    it ("hermes-stable" leaves in the modern syntax current Hermes supports)
//    with today's hermesc from the hermes-compiler package.
const hermescDir = { darwin: "osx-bin", linux: "linux64-bin", win32: "win64-bin" }[platform];
const hermesc = join(dirname(createRequire(import.meta.url).resolve("hermes-compiler/package.json")), "hermesc", hermescDir, "hermesc");
const stable = out.replace(/\.js$/, ".stable.js");
writeFileSync(stable, transform("hermes-stable"));
execFileSync(hermesc, ["-w", "-emit-binary", "-out", `${stable}.hbc`, stable]);
console.log("PASS  syntax: current hermesc compiles the bundle as React Native ships it");

if (!hermes) {
  console.log("SKIP  runtime: set HERMES_BIN to a Hermes CLI binary to run the smoke checks");
  process.exit(0);
}

// 2. Runtime APIs: "default" lowers everything (classes, private fields) so an
//    older Hermes CLI engine can run it.
writeFileSync(out, transform("default"));

const version = execFileSync(hermes, ["-version"]).toString().match(/Hermes release version: (\S+)/)?.[1] ?? "unknown";
console.log(`Runtime: Hermes CLI ${version}`);
try {
  // -w: the CLI warns that host globals (fetch, console) are undeclared; an app provides them.
  process.stdout.write(execFileSync(hermes, ["-w", out], { encoding: "utf8" }));
} catch (error) {
  process.stdout.write(error.stdout ?? "");
  process.stderr.write(error.stderr ?? "");
  process.exit(1);
}
