// search: what it sends and returns is in the shared cases
// (shared/conformance/resources/search.json), which compare keys loosely so
// every language can use its own casing. This pins TypeScript's casing: hit
// documents come back camelCase all the way down, while raw stays untouched.
import { expect, it } from "vitest";
import { ok, setup } from "../helpers.ts";

const document = {
  id: "427578",
  release_year: 2021,
  image: { color_name: "Brown" },
  contributions: [{ author: { name: "Andy Weir" }, contributor_role_name: "Author" }],
};

const response = ok({
  search: { ids: [427578], results: { found: 1, hits: [{ document }] }, page: 1, perPage: 25, error: null },
});

it("camelCases hit keys at every depth", async () => {
  const { client } = setup(response);
  const hit = (await client.search.books("hail mary")).hits[0]!;

  expect(hit.releaseYear).toBe(2021);
  expect(hit.image?.colorName).toBe("Brown");
  expect(hit.contributions?.[0]?.contributorRoleName).toBe("Author");
  expect(hit).not.toHaveProperty("release_year");
});

it("leaves raw results in the index's own keys", async () => {
  const { client } = setup(response);
  const raw = await client.search.raw("hail mary");

  expect((raw.results as { hits: { document: unknown }[] }).hits[0]!.document).toEqual(document);
});
