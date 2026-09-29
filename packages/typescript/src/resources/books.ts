import type { HardcoverClient } from "../core/client.ts";
import { HardcoverError } from "../core/errors.ts";
import { cleanIsbn } from "../core/isbn.ts";
import type {
  BookDetailFragment,
  BookSummaryFragment,
  EditionSummaryFragment,
  FindEditionsByIsbnQuery,
  TrendingDuration,
} from "../generated/graphql.ts";
import { operations } from "../operations.ts";
import { toPage, type Page, type PageOptions } from "./page.ts";

export type Book = BookDetailFragment;
export type BookSummary = BookSummaryFragment;
export type Edition = EditionSummaryFragment;
export type EditionWithBook = FindEditionsByIsbnQuery["editions"][number];

/** Catalog reads. Requires `read:catalog`. */
export class BooksResource {
  constructor(private readonly client: HardcoverClient) {}

  async get(id: number): Promise<Book | null> {
    const { books_by_pk } = await this.client.request(operations.GetBook, { id });
    return books_by_pk ?? null;
  }

  async getBySlug(slug: string): Promise<Book | null> {
    const { books } = await this.client.request(operations.GetBookBySlug, { slug });
    return books[0] ?? null;
  }

  /** Books in the order you passed their ids; ids that don't exist are skipped. */
  async getMany(ids: number[]): Promise<BookSummary[]> {
    if (ids.length === 0) return [];
    const { books } = await this.client.request(operations.GetBooks, { ids });
    const byId = new Map(books.map((b) => [b.id, b]));
    return ids.map((id) => byId.get(id)).filter((b): b is BookSummary => b !== undefined);
  }

  /** A book's editions, most-read first. */
  async editions(bookId: number, { limit = 25, offset = 0 }: PageOptions = {}): Promise<Page<Edition>> {
    const { editions } = await this.client.request(operations.GetEditionsForBook, { bookId, limit, offset });
    return toPage(editions, limit, offset);
  }

  /**
   * Editions with exactly these ISBN-13s or ISBN-10s (spaces and hyphens are
   * fine), each with its book. For anything fuzzier, use search.books.
   */
  async findByIsbn(isbns: string[]): Promise<EditionWithBook[]> {
    const cleaned = [...new Set(isbns.map(cleanIsbn).filter(Boolean))];
    if (cleaned.length === 0) return [];
    const { editions } = await this.client.request(operations.FindEditionsByIsbn, { isbns: cleaned });
    return editions;
  }

  /** Trending books, in trending order. Two requests: the API returns ids, then the books are fetched. */
  async trending({ duration = "month", limit = 25, offset = 0 }: { duration?: TrendingDuration; limit?: number; offset?: number } = {}): Promise<BookSummary[]> {
    const { books_trending } = await this.client.request(operations.TrendingBookIds, { duration, limit, offset });
    if (!books_trending) throw new HardcoverError("books_trending returned nothing");
    return this.getMany((books_trending.ids ?? []).filter((id): id is number => id !== null));
  }
}
