// search: a thin pass-through to the search action (the API owns matching),
// plus the local chores every app would repeat: numeric ids, idiomatic keys,
// the total count, and list-style options.
import { describe, expect, it } from "vitest";
import { ActionError, HardcoverClient, SearchType } from "../../src/index.ts";
import { MockTransport, type MockResponse } from "../../src/testing/index.ts";

const bookHit = {
  document: {
    id: "427578",
    title: "Project Hail Mary",
    release_year: 2021,
    users_count: 17048,
    image: { url: "https://assets.hardcover.app/x.jpg", color_name: "Brown", width: 994 },
    contributions: [{ author: { id: 123645, name: "Andy Weir" }, contributor_role_name: "Author" }],
    series_ids: [],
  },
  highlight: {},
  text_match: 123,
};

const envelope = (queryType: string, hits: unknown[], found = hits.length): MockResponse => ({
  status: 200,
  body: {
    data: {
      search: {
        ids: hits.map((h) => Number((h as { document: { id: string } }).document.id)),
        results: { found, hits, page: 1, out_of: 99, search_time_ms: 3 },
        query: "q",
        queryType,
        page: 1,
        perPage: 25,
        error: null,
      },
    },
  },
});

function setup(...responses: MockResponse[]) {
  const transport = new MockTransport(responses);
  const client = new HardcoverClient({ token: "hc_pat_test", transport });
  const sent = () => transport.requests.map((r) => JSON.parse(r.body) as { operationName: string; variables: Record<string, unknown> });
  return { client, sent };
}

describe("search", () => {
  it("passes the query straight through, e.g. a scanned barcode", async () => {
    const { client, sent } = setup(envelope("Book", [bookHit]));
    await client.search.books("978-0-593-13520-4");
    expect(sent()[0]).toMatchObject({ operationName: "Search", variables: { query: "978-0-593-13520-4", queryType: "book" } });
  });

  it("returns hits with numeric ids and idiomatic keys, all the way down", async () => {
    const { client } = setup(envelope("Book", [bookHit], 12));
    const result = await client.search.books("hail mary");

    expect(result.found).toBe(12);
    expect(result.ids).toEqual([427578]);
    const hit = result.hits[0]!;
    expect(hit.id).toBe(427578);
    expect(hit.releaseYear).toBe(2021);
    expect(hit.usersCount).toBe(17048);
    expect(hit.image?.colorName).toBe("Brown");
    expect(hit.contributions?.[0]?.contributorRoleName).toBe("Author");
    expect(hit.contributions?.[0]?.author?.name).toBe("Andy Weir");
  });

  it("maps options, joining list options the way the API expects", async () => {
    const { client, sent } = setup(envelope("Author", []));
    await client.search.authors("weir", {
      page: 2,
      perPage: 5,
      fields: ["name", "name_personal"],
      weights: [3, 1],
      typos: [1, 0],
      sort: "books_count:desc",
      filterBy: "books_count:>5",
    });
    expect(sent()[0]!.variables).toEqual({
      query: "weir",
      queryType: "author",
      page: 2,
      perPage: 5,
      fields: "name,name_personal",
      weights: "3,1",
      typos: "1,0",
      sort: "books_count:desc",
      filterBy: "books_count:>5",
    });
  });

  it("has a method per search type", async () => {
    const methods = ["authors", "books", "characters", "lists", "prompts", "publishers", "series", "users"] as const;
    const { client, sent } = setup(...methods.map((m) => envelope(m, [])));
    for (const m of methods) await client.search[m]("x");
    expect(sent().map((r) => r.variables.queryType)).toEqual(Object.values(SearchType));
  });

  it("raw returns the untouched response for anything the helpers don't cover", async () => {
    const { client, sent } = setup(envelope("Book", [bookHit]));
    const raw = await client.search.raw("x", { type: SearchType.Book });
    expect((raw.results as { hits: { document: { id: string } }[] }).hits[0]!.document.id).toBe("427578");
    expect(sent()[0]!.variables).toMatchObject({ queryType: "book" });
  });

  it("surfaces a search failure as ActionError", async () => {
    const { client } = setup({ status: 200, body: { data: { search: { ids: null, results: null, error: "Not found." } } } });
    await expect(client.search.books("x")).rejects.toThrow(ActionError);
  });
});
