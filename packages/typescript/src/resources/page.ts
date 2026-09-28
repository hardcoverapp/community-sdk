/** One page of a limit/offset list. `hasMore` is a heuristic: a full page means there may be more. */
export interface Page<T> {
  items: T[];
  limit: number;
  offset: number;
  hasMore: boolean;
}

export interface PageOptions {
  limit?: number;
  offset?: number;
}

export function toPage<T>(items: T[], limit: number, offset: number): Page<T> {
  return { items, limit, offset, hasMore: items.length === limit };
}
