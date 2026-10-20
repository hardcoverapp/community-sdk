import type { HardcoverClient } from "../core/client.ts";
import { cleanIsbn } from "../core/isbn.ts";
import type {
  BookDetailFragment,
  BookSummaryFragment,
  EditionSummaryFragment,
  FindEditionsByIsbnQuery,
  TrendingDuration,
} from "../generated/graphql.ts";
import { operations } from "../operations.ts";
import { DEFAULT_LIMIT, toPage, type Page, type PageOptions } from "./page.ts";
import { nonNull, required } from "./shared.ts";

export type Book = BookDetailFragment;
export type BookSummary = BookSummaryFragment;
export type Edition = EditionSummaryFragment;
export type EditionWithBook = FindEditionsByIsbnQuery["editions"][number];

/** The most ids `books_trending` returns per call (spec/01 row caps). */
const TRENDING_MAX = 100;

/** Catalog reads. */
export class BooksResource {
  private readonly client: HardcoverClient;

  constructor(client: HardcoverClient) {
    this.client = client;
  }

  /** Scopes: `read:catalog`. */
  async get(id: number): Promise<Book | null> {
    const { books_by_pk } = await this.client.request(operations.GetBook, { id });
    return books_by_pk ?? null;
  }

  /** Scopes: `read:catalog`. */
  async getBySlug(slug: string): Promise<Book | null> {
    const { books } = await this.client.request(operations.GetBookBySlug, { slug });
    return books[0] ?? null;
  }

  /**
   * Books in the order you passed their ids; ids that don't exist are skipped.
   * Scopes: `read:catalog`.
   */
  async getMany(ids: number[]): Promise<BookSummary[]> {
    if (ids.length === 0) return [];
    const { books } = await this.client.request(operations.GetBooks, { ids });
    const byId = new Map(books.map((b) => [b.id, b]));
    return ids.map((id) => byId.get(id)).filter((b): b is BookSummary => b !== undefined);
  }

  /** A book's editions, most-read first. Scopes: `read:catalog`. */
  async editions(bookId: number, { limit = DEFAULT_LIMIT, offset = 0 }: PageOptions = {}): Promise<Page<Edition>> {
    const { editions } = await this.client.request(operations.GetEditionsForBook, { bookId, limit, offset });
    return toPage(editions, limit, offset);
  }

  /**
   * Editions with exactly these ISBN-13s or ISBN-10s (spaces and hyphens are
   * fine), each with its book. For anything fuzzier, use search.books.
   * Scopes: `read:catalog`.
   */
  async findByIsbn(isbns: string[]): Promise<EditionWithBook[]> {
    const cleaned = [...new Set(isbns.map(cleanIsbn).filter(Boolean))];
    if (cleaned.length === 0) return [];
    const { editions } = await this.client.request(operations.FindEditionsByIsbn, { isbns: cleaned });
    return editions;
  }

  /**
   * Books first released between `from` and `to` (inclusive, `YYYY-MM-DD`), most readers first.
   * Uses each book's own release date, so a reissue or translation of an older book isn't included.
   * Scopes: `read:catalog`.
   */
  async released({ from, to, limit = DEFAULT_LIMIT, offset = 0 }: PageOptions & { from: string; to: string }): Promise<Page<BookSummary>> {
    const { books } = await this.client.request(operations.ReleasedBooks, { from, to, limit, offset });
    return toPage(books, limit, offset);
  }

  /**
   * Trending books, in trending order. Two requests: the API returns ids, then the books are fetched.
   * The API returns at most 100 ids per call, so `limit` is capped there; page on with `offset`.
   * Scopes: `read:catalog`.
   */
  async trending({ duration = "month", limit: requested = DEFAULT_LIMIT, offset = 0 }: PageOptions & { duration?: TrendingDuration } = {}): Promise<Page<BookSummary>> {
    // Asking for more than the cap would return 100 ids and wrongly report hasMore: false.
    const limit = Math.min(requested, TRENDING_MAX);
    const { books_trending } = await this.client.request(operations.TrendingBookIds, { duration, limit, offset });
    const ids = nonNull(required(books_trending, "books_trending", "result").ids);
    const books = await this.getMany(ids);
    // hasMore follows the id page, even if a few of those books no longer exist.
    // (No `await` inside the spread: React Native's Babel transform mishandles it.)
    return { ...toPage(books, limit, offset), hasMore: ids.length === limit };
  }
}
