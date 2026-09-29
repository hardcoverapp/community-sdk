// Runs the SDK core on a real Hermes engine (React Native's JavaScript engine),
// with no network: every request goes through MockTransport. Bundled and run
// by scripts/hermes-smoke.mjs. Prints one line per check and a summary.
import {
  ActionError, GoalMetric, goalProgress, HardcoverClient, localDate, NotFoundError,
  operations, ScopeError, UserBookStatus,
} from "../../src/index.ts";
import { MockTransport, type MockResponse } from "../../src/testing/index.ts";

declare const print: ((...args: unknown[]) => void) | undefined;
const log = (line: string) => (typeof print === "function" ? print(line) : console.log(line));

const ok = (data: unknown): MockResponse => ({ status: 200, body: { data } });
const client = (...responses: MockResponse[]) =>
  new HardcoverClient({ token: " Bearer hc_pat_smoke\n", transport: new MockTransport(responses), sleep: async () => {} });

const results: { name: string; status: "PASS" | "FAIL" | "SKIP"; detail?: string }[] = [];
async function check(name: string, run: () => Promise<void> | void, skipIf?: () => string | undefined) {
  const skip = skipIf?.();
  if (skip) return void results.push({ name, status: "SKIP", detail: skip });
  try {
    await run();
    results.push({ name, status: "PASS" });
  } catch (error) {
    results.push({ name, status: "FAIL", detail: error instanceof Error ? `${error.name}: ${error.message}` : String(error) });
  }
}
function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const hasIntlTimeZones = () => {
  try {
    return typeof Intl !== "undefined" && new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Tokyo" }).formatToParts(new Date()).length > 0;
  } catch {
    return false;
  }
};

async function main() {
  await check("client: token cleanup and a request", async () => {
    const c = client(ok({ me: [{ id: 1, username: "reader", timezone: "UTC" }] }));
    const me = await c.me.get();
    assert(me.username === "reader", "me.get returned the user");
  });

  await check("errors: 403 scope → ScopeError with missingScopes", async () => {
    const c = client({ status: 403, body: { error: "insufficient_scope", error_description: "Missing", scope: "write:library write:reviews" } });
    const error = await c.request(operations.Me).catch((e: unknown) => e);
    assert(error instanceof ScopeError, `expected ScopeError, got ${String(error)}`);
    assert(error.missingScopes.join(",") === "write:library,write:reviews", "missingScopes split");
    assert(error.operationName === "Me", "operationName set");
  });

  await check("errors: action envelope → ActionError; subclasses keep instanceof", async () => {
    const c = client(ok({ insert_list: { id: null, errors: ["Name can't be blank"], list: null } }));
    const error = await c.lists.create({ name: "" }).catch((e: unknown) => e);
    assert(error instanceof ActionError && error.messages[0] === "Name can't be blank", "ActionError with messages");
    assert(new NotFoundError("goal", 9) instanceof Error, "NotFoundError is an Error");
  });

  await check("reads: percent → pages on the open read", async () => {
    const reads = [
      { id: 2, startedAt: "2026-09-20", finishedAt: null, edition: { id: 5, pages: 476, audioSeconds: null, readingFormatId: 1 } },
      { id: 1, startedAt: "2026-09-01", finishedAt: "2026-09-10", edition: { id: 5, pages: 476, audioSeconds: null, readingFormatId: 1 } },
    ];
    const transport = new MockTransport([
      ok({ user_books_by_pk: { id: 7, userBookReads: reads } }),
      ok({ update_user_book_read: { id: 2, error: null, userBookRead: { id: 2 } } }),
    ]);
    const c = new HardcoverClient({ token: "hc_pat_smoke", transport });
    await c.reads.setProgress(7, { percent: 15 });
    const sent = JSON.parse(transport.requests[1]!.body) as { variables: { id: number; read: { progress_pages: number } } };
    assert(sent.variables.id === 2 && sent.variables.read.progress_pages === 72, "72 pages on read 2");
  });

  await check("lists: bulk add batches and reports misses", async () => {
    const c = client(
      ok({ editions: [{ id: 5, bookId: 100, isbn13: "9780593135204", isbn10: null }] }),
      ok({ b0: { id: 70 } }),
    );
    const result = await c.lists.addBooks(9, ["978-0-593-13520-4", "071612345678"]);
    assert(result.added[0]?.listBookId === 70 && result.notAdded[0]?.reason === "no_exact_edition", "added one, reported one");
  });

  await check("search: numeric ids and camelCase keys", async () => {
    const c = client(ok({ search: { ids: [7], results: { found: 1, hits: [{ document: { id: "7", release_year: 2021, image: { color_name: "Brown" } } }] }, page: 1, perPage: 25, error: null } }));
    const { hits } = await c.search.books("x");
    const hit = hits[0] as unknown as { id: number; releaseYear: number; image: { colorName: string } };
    assert(hit.id === 7 && hit.releaseYear === 2021 && hit.image.colorName === "Brown", "tidied hit");
  });

  await check("pacing: waits out a spent burst before sending", async () => {
    let now = 1_000_000;
    const slept: number[] = [];
    const headers = { ratelimit: '"Free";r=0;t=3, "daily";r=900;t=80000', "ratelimit-policy": '"Free";q=60;w=60;burst=10, "daily";q=5000;w=86400' };
    const c = new HardcoverClient({
      token: "hc_pat_smoke",
      transport: new MockTransport([{ status: 200, headers, body: { data: { me: [] } } }, ok({ me: [] })]),
      now: () => new Date(now),
      sleep: async (ms) => { slept.push(ms); now += ms; },
    });
    await c.request(operations.Me);
    await c.request(operations.Me);
    assert(slept.join() === "3000", `slept ${slept.join()}`);
  });

  await check("goals: hour goals compare in hours", () => {
    const p = goalProgress({ metric: GoalMetric.Hour, goal: 14, progress: 73_837 });
    assert(Math.abs(p.current - 20.51) < 0.01, `current ${p.current}`);
  });

  await check(
    "dates: localDate in the user's timezone (Intl)",
    () => {
      const at = new Date("2026-09-29T02:30:00Z");
      assert(localDate(at, "America/Denver") === "2026-09-28", "Denver is still Sep 28");
      assert(localDate(at, "Asia/Tokyo") === "2026-09-29", "Tokyo is Sep 29");
    },
    () => (hasIntlTimeZones() ? undefined : "this Hermes build has no Intl time zones (devices get them from iOS/Android)"),
  );

  await check(
    "library: marking Read defaults the date (needs Intl)",
    async () => {
      const transport = new MockTransport([
        ok({ me: [{ id: 1, username: "r", timezone: "America/Denver" }] }),
        ok({ insert_user_book: { id: 7, error: null, userBook: { id: 7 } } }),
      ]);
      const c = new HardcoverClient({ token: "hc_pat_smoke", transport, now: () => new Date("2026-09-29T02:30:00Z") });
      await c.library.add(100, { status: UserBookStatus.Read });
      const sent = JSON.parse(transport.requests[1]!.body) as { variables: { object: { user_date: string } } };
      assert(sent.variables.object.user_date === "2026-09-28", `user_date ${sent.variables.object.user_date}`);
    },
    () => (hasIntlTimeZones() ? undefined : "this Hermes build has no Intl time zones"),
  );

  for (const r of results) log(`${r.status}  ${r.name}${r.detail ? `  (${r.detail})` : ""}`);
  const count = (s: string) => results.filter((r) => r.status === s).length;
  log(`\n${count("PASS")} passed, ${count("FAIL")} failed, ${count("SKIP")} skipped`);
  if (count("FAIL") > 0) throw new Error("Hermes smoke failed");
}

main().catch((error: unknown) => {
  log(`SMOKE ERROR: ${error instanceof Error ? error.message : String(error)}`);
  throw error;
});
