// allPages: every item of a paged list, one request per page, stopping at
// the last page. The per-method caps are pinned in the shared conformance
// cases (shared/conformance/resources).
import { describe, expect, it } from "vitest";
import { allPages, type Page } from "../src/index.ts";

// A list of `total` numbered items that pages like the API: at most `cap` per request.
function list(total: number, cap = Infinity) {
  const requests: { limit: number; offset: number }[] = [];

  const fetchPage = async ({ limit, offset }: { limit: number; offset: number }): Promise<Page<number>> => {
    const sent = Math.min(limit, cap);
    requests.push({ limit: sent, offset });

    const items = Array.from({ length: Math.max(0, Math.min(sent, total - offset)) }, (_, i) => offset + i + 1);
    return { items, limit: sent, offset, hasMore: items.length === sent };
  };

  return { fetchPage, requests };
}

async function collect<T>(items: AsyncIterable<T>): Promise<T[]> {
  const all: T[] = [];
  for await (const item of items) all.push(item);
  return all;
}

describe("allPages", () => {
  it("returns every item, one request per page", async () => {
    const { fetchPage, requests } = list(250);

    expect(await collect(allPages(fetchPage))).toEqual(Array.from({ length: 250 }, (_, i) => i + 1));
    expect(requests).toEqual([
      { limit: 100, offset: 0 },
      { limit: 100, offset: 100 },
      { limit: 100, offset: 200 },
    ]);
  });

  it("asks once more after a full last page, and stops on the empty one", async () => {
    const { fetchPage, requests } = list(200);

    expect(await collect(allPages(fetchPage))).toHaveLength(200);
    expect(requests.map((r) => r.offset)).toEqual([0, 100, 200]);
  });

  it("follows the page size a capped list actually used", async () => {
    const { fetchPage, requests } = list(120, 50);

    expect(await collect(allPages(fetchPage, { pageSize: 100 }))).toHaveLength(120);
    expect(requests.map((r) => r.offset)).toEqual([0, 50, 100]);
  });

  it("starts at an offset and takes a page size", async () => {
    const { fetchPage, requests } = list(30);

    expect(await collect(allPages(fetchPage, { pageSize: 10, offset: 10 }))).toEqual(Array.from({ length: 20 }, (_, i) => i + 11));
    expect(requests[0]).toEqual({ limit: 10, offset: 10 });
  });

  it("stops fetching when the loop breaks", async () => {
    const { fetchPage, requests } = list(1000);

    for await (const item of allPages(fetchPage)) if (item === 5) break;

    expect(requests).toHaveLength(1);
  });
});
