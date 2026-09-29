// Mirrors the gateway's request weighting: one unit per top-level field
// (app/api/app/services/graphql_query_limit.rb), with a minimum of 1 per
// request ([total_fields, 1].max in api/app/controllers/api/application_controller.rb).
// Introspection and the allowlisted insert_reading_journal add nothing, but a
// request made only of them still costs 1. Used only to pace requests,
// so a small scanner is enough; no GraphQL parser ships in the SDK.
const FREE = new Set(["__schema", "__type", "__typename", "insert_reading_journal"]);

// Blank out comments and string literals so their contents can't be mistaken for syntax.
function stripNoise(query: string): string {
  return query
    .replace(/"""[\s\S]*?"""/g, (m) => " ".repeat(m.length))
    .replace(/"(?:\\.|[^"\\])*"/g, (m) => " ".repeat(m.length))
    .replace(/#[^\n]*/g, (m) => " ".repeat(m.length));
}

export function requestCost(query: string): number {
  const src = stripNoise(query);
  let i = 0;

  // Skip fragment definitions; the operation is the first query/mutation/subscription or bare "{".
  const skipBlock = () => {
    while (i < src.length && src[i] !== "{") i++;
    let depth = 0;
    for (; i < src.length; i++) {
      if (src[i] === "{") depth++;
      else if (src[i] === "}" && --depth === 0) return void i++;
    }
  };
  for (;;) {
    const rest = src.slice(i);
    const m = /\S/.exec(rest);
    if (!m) return 1; // nothing parseable still costs 1 at the gateway
    i += m.index;
    if (src.startsWith("fragment", i)) skipBlock();
    else break;
  }

  // Find the operation's selection set (skipping variable definitions in parens).
  let parens = 0;
  for (; i < src.length; i++) {
    if (src[i] === "(") parens++;
    else if (src[i] === ")") parens--;
    else if (src[i] === "{" && parens === 0) break;
  }

  let braces = 0;
  parens = 0;
  let cost = 0;
  let prevSignificant = "";
  for (; i < src.length; i++) {
    const ch = src[i]!;
    if (ch === "(") parens++;
    else if (ch === ")") parens--;
    else if (parens === 0 && ch === "{") braces++;
    else if (parens === 0 && ch === "}") {
      if (--braces === 0) break;
    } else if (braces === 1 && parens === 0 && /[_A-Za-z]/.test(ch)) {
      const name = /^[_A-Za-z][_0-9A-Za-z]*/.exec(src.slice(i))![0];
      const after = src.slice(i + name.length).trimStart()[0];
      const isAlias = after === ":";
      const isDirective = prevSignificant === "@";
      const isSpread = src.slice(0, i).trimEnd().endsWith("...");
      if (!isAlias && !isDirective && name !== "on" && (isSpread || !FREE.has(name))) cost++;
      i += name.length - 1;
      prevSignificant = name;
      continue;
    }
    if (!/\s/.test(ch)) prevSignificant = ch;
  }
  return Math.max(cost, 1);
}
