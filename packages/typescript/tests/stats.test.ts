// How the stats module fetches (language-specific wiring; the numbers are
// pinned in stats-conformance.test.ts).
import { expect, it } from "vitest";
import { HardcoverClient } from "../src/index.ts";
import { fetchStatsData, period, readingStats } from "../src/stats/index.ts";
import { MockTransport, type MockResponse } from "../src/testing/index.ts";

const ok = (data: unknown): MockResponse => ({ status: 200, body: { data } });
const me = ok({ me: [{ id: 42 }] });
const roles = ok({ contributor_roles: [], contributor_role_specializations: [] });

const entry = (id: number) => ({
  id,
  statusId: 3,
  readCount: 1,
  lastReadDate: "2025-05-01",
  rating: null,
  edition: null,
  book: { id, title: `Book ${id}`, slug: `book-${id}`, pages: 100, audioSeconds: null, cachedTags: {}, cachedContributors: [], cachedImage: {} },
  userBookReads: [],
});

const page = (from: number, count: number) => ok({ user_books: Array.from({ length: count }, (_, i) => entry(from + i)) });

it("pages through the library 100 at a time until a short page, then loads roles once", async () => {
  const transport = new MockTransport([me, page(1, 100), page(101, 3), roles]);
  const client = new HardcoverClient({ token: "hc_pat_test", transport });

  const data = await fetchStatsData(client);

  const sent = transport.requests.map((r) => JSON.parse(r.body) as { operationName: string; variables?: { offset?: number } });
  expect(sent.map((r) => r.operationName)).toEqual(["Me", "GetStatsLibrary", "GetStatsLibrary", "GetContributorRoles"]);
  expect(sent.filter((r) => r.operationName === "GetStatsLibrary").map((r) => r.variables?.offset)).toEqual([0, 100]);
  expect(data.library).toHaveLength(103);
});

it("readingStats fetches and computes in one call", async () => {
  const transport = new MockTransport([me, page(1, 2), roles]);
  const client = new HardcoverClient({ token: "hc_pat_test", transport });

  const stats = await readingStats(client, period.month(2025, 5));

  expect(stats.books).toBe(2);
  expect(stats.pages).toBe(200);
});
