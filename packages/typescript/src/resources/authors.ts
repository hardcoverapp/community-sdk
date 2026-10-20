import type { HardcoverClient } from "../core/client.ts";
import type { WithJsonColumns } from "../core/json-columns.ts";
import type { AuthorDetailFragment, SeriesSummaryFragment } from "../generated/graphql.ts";
import { operations } from "../operations.ts";
import type { BookSummary } from "./books.ts";
import { DEFAULT_LIMIT, toPage, type Page, type PageOptions } from "./page.ts";

/**
 * An author. `canonicalId` is set when this author was merged into another:
 * follow it to the record the site shows.
 */
export type Author = WithJsonColumns<AuthorDetailFragment>;

/** A series, as listed on an author's page. */
export type SeriesSummary = WithJsonColumns<SeriesSummaryFragment>;

/** Authors and their books. Catalog reads need `read:catalog`. */
export class AuthorsResource {
  private readonly client: HardcoverClient;

  constructor(client: HardcoverClient) {
    this.client = client;
  }

  /** Scopes: `read:catalog`. */
  async get(id: number): Promise<Author | null> {
    const { authors_by_pk } = await this.client.request(operations.GetAuthor, { id });

    return authors_by_pk ?? null;
  }

  /** Scopes: `read:catalog`. */
  async getBySlug(slug: string): Promise<Author | null> {
    const { authors } = await this.client.request(operations.GetAuthorBySlug, { slug });

    return authors[0] ?? null;
  }

  /**
   * Books the author has a credit on (writing, narrating, illustrating, …),
   * most readers first. Each book appears once.
   * Scopes: `read:catalog`.
   */
  async books(authorId: number, { limit = DEFAULT_LIMIT, offset = 0 }: PageOptions = {}): Promise<Page<BookSummary>> {
    const { books } = await this.client.request(operations.GetAuthorBooks, { authorId, limit, offset });

    return toPage(books, limit, offset);
  }

  /** Series with at least one of the author's books, by name. Scopes: `read:catalog`. */
  async series(authorId: number): Promise<SeriesSummary[]> {
    const { series } = await this.client.request(operations.GetAuthorSeries, { authorId });

    return series;
  }
}
