// Helpers shared by the repo scripts (and the tests that check the same files).
import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";

/** Every file under `dir` whose name ends with `extension`, recursively. */
export function walk(dir, extension = ".graphql") {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path, extension) : path.endsWith(extension) ? [path] : [];
  });
}
