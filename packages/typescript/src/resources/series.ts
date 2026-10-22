import type { HardcoverClient } from "../core/client.ts";
import type { WithJsonColumns } from "../core/json-columns.ts";
import type { GetSeriesBooksQuery, SeriesDetailFragment } from "../generated/graphql.ts";
import { operations } from "../operations.ts";
import { capped, toPage, type Page, type PageOptions } from "./page.ts";

/**
 * A series. `canonicalId` is set when this series was merged into another:
 * follow it to the record the site shows.
 */
export type Series = WithJsonColumns<SeriesDetailFragment>;

/**
 * One entry in a series: a book at a position. A series can hold more than
 * one book per position (translations, other editions), plus box sets and
 * split volumes.
 * - `position`: the number, e.g. 1, or 4.1 for part of a split volume; null
 *   for entries without one.
 * - `details`: the position as written, e.g. "1" or "1-3".
 * - `compilation`: a box set or omnibus covering several positions.
 * - `featured`: marked by librarians as a main entry (a position can have
 *   more than one, e.g. a translation).
 */
export type SeriesEntry = WithJsonColumns<GetSeriesBooksQuery["book_series"][number]>;

/** Series and their books. Catalog reads need `read:catalog`. */
export class SeriesResource {
  private readonly client: HardcoverClient;

  constructor(client: HardcoverClient) {
    this.client = client;
  }

  /** Scopes: `read:catalog`. */
  async get(id: number): Promise<Series | null> {
    const { series_by_pk } = await this.client.request(operations.GetSeries, { id });

    return series_by_pk ?? null;
  }

  /** Scopes: `read:catalog`. */
  async getBySlug(slug: string): Promise<Series | null> {
    const { series } = await this.client.request(operations.GetSeriesBySlug, { slug });

    return series[0] ?? null;
  }

  /**
   * Every entry in the series, in position order; entries without a position
   * (box sets, mostly) come last. Within a position, the most-read book is
   * first. For a reading order like the site's, skip `compilation` entries and
   * keep the first entry at each position.
   * Pages hold 50 by default, so most series fit on one.
   * Scopes: `read:catalog`.
   */
  async books(seriesId: number, { limit: requested = 50, offset = 0 }: PageOptions = {}): Promise<Page<SeriesEntry>> {
    const limit = capped("book_series", requested);
    const { book_series } = await this.client.request(operations.GetSeriesBooks, { seriesId, limit, offset });

    return toPage(book_series, limit, offset);
  }
}
