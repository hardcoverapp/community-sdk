import { client as constants } from "../generated/client.ts";

/**
 * One page of a limit/offset list. `hasMore` is a heuristic: a full page means
 * there may be more. `limit` is the page size the request used, which is lower
 * than the one you asked for when that's over the API's cap for the list.
 */
export interface Page<T> {
  items: T[];
  limit: number;
  offset: number;
  hasMore: boolean;
}

/** Page size when none is given. */
export const DEFAULT_LIMIT = constants.pages.defaultLimit;

export interface PageOptions {
  limit?: number;
  offset?: number;
}

/** A query the API caps, by its GraphQL name. */
export type CappedQuery = keyof typeof constants.limits.rowCaps;

/**
 * The page size to ask for: the one requested, or the API's cap for the query
 * when that's lower. The API cuts a larger limit to the cap without an error,
 * so asking for more would return a short page that looks like the last one.
 */
export function capped(query: CappedQuery, requested: number): number {
  return Math.min(requested, constants.limits.rowCaps[query]);
}

export function toPage<T>(items: T[], limit: number, offset: number): Page<T> {
  return { items, limit, offset, hasMore: items.length === limit };
}

/**
 * Every item of a paged list, fetching one page at a time as you iterate.
 * Stops after the last page, or as soon as you break out of the loop.
 *
 * ```ts
 * for await (const book of allPages((page) => hc.authors.books(authorId, page))) {
 *   console.log(book.title);
 * }
 * ```
 *
 * `pageSize` is how many to ask for per request (100 by default); a list with a
 * lower cap uses its cap.
 */
export async function* allPages<T>(
  fetchPage: (page: { limit: number; offset: number }) => Promise<Page<T>>,
  { pageSize = 100, offset = 0 }: { pageSize?: number; offset?: number } = {},
): AsyncGenerator<T, void, undefined> {
  let next = offset;

  while (true) {
    const page = await fetchPage({ limit: pageSize, offset: next });
    yield* page.items;

    // The page's own limit, not pageSize: a capped list may have used less.
    if (!page.hasMore || page.limit <= 0) return;
    next += page.limit;
  }
}
