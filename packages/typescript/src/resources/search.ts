import type { HardcoverClient } from "../core/client.ts";
import { SearchType } from "../generated/enums.ts";
import type { SearchQuery } from "../generated/graphql.ts";
import { operations } from "../operations.ts";
import { nonNull, required } from "./shared.ts";
import type {
  AuthorHit, BookHit, CharacterHit, ListHit, PromptHit, PublisherHit, SeriesHit, UserHit,
} from "./search-types.ts";
import type { WithJsonColumns } from "../core/json-columns.ts";

export interface SearchOptions {
  page?: number;
  perPage?: number;
  /** Index fields to search, e.g. ["title", "author_names"]. Pair with weights/typos. */
  fields?: string[] | string;
  /** One weight per field, or one for all. */
  weights?: number[] | string;
  /** Typo tolerance per field, or one for all. */
  typos?: number[] | string;
  /** Typesense sort, e.g. "users_count:desc". */
  sort?: string;
  /** Typesense filter, e.g. "release_year:>2000". */
  filterBy?: string;
}

export interface SearchResults<T> {
  hits: T[];
  ids: number[];
  /** Total matches across all pages. */
  found: number;
  page: number;
  perPage: number;
}

export type RawSearch = WithJsonColumns<NonNullable<SearchQuery["search"]>>;

const list = (value: (string | number)[] | string | undefined) =>
  Array.isArray(value) ? value.join(",") : value;

const toCamel = (key: string) => key.replace(/_([a-z0-9])/g, (_, c: string) => c.toUpperCase());

// Search documents come from the index: snake_case keys and string ids. Their
// keys are index field names, never user content, so converting them all is
// safe (spec/03 Casing).
function camelizeKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(camelizeKeys);
  if (value === null || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value).map(([k, v]) => [toCamel(k), camelizeKeys(v)]));
}

function toHit<T>(document: unknown): T {
  const hit = camelizeKeys(document) as Record<string, unknown>;
  if (typeof hit.id === "string" && /^\d+$/.test(hit.id)) hit.id = Number(hit.id);
  return hit as T;
}

/**
 * Search passes your query straight to the API, which owns matching (titles,
 * authors, ISBNs from a scanner, and whatever it learns next). The SDK only
 * tidies the response. One search per request.
 */
export class SearchResource {
  private readonly client: HardcoverClient;

  constructor(client: HardcoverClient) {
    this.client = client;
  }

  /** Scopes: `read:catalog`. */
  books(query: string, options?: SearchOptions): Promise<SearchResults<BookHit>> {
    return this.#typed<BookHit>(query, SearchType.Book, options);
  }

  /** Scopes: `read:catalog`. */
  authors(query: string, options?: SearchOptions): Promise<SearchResults<AuthorHit>> {
    return this.#typed<AuthorHit>(query, SearchType.Author, options);
  }

  /** Scopes: `read:catalog`. */
  series(query: string, options?: SearchOptions): Promise<SearchResults<SeriesHit>> {
    return this.#typed<SeriesHit>(query, SearchType.Series, options);
  }

  /** Scopes: `read:catalog`. */
  characters(query: string, options?: SearchOptions): Promise<SearchResults<CharacterHit>> {
    return this.#typed<CharacterHit>(query, SearchType.Character, options);
  }

  /** Scopes: `read:catalog`. */
  lists(query: string, options?: SearchOptions): Promise<SearchResults<ListHit>> {
    return this.#typed<ListHit>(query, SearchType.List, options);
  }

  /** Scopes: `read:catalog`. */
  prompts(query: string, options?: SearchOptions): Promise<SearchResults<PromptHit>> {
    return this.#typed<PromptHit>(query, SearchType.Prompt, options);
  }

  /** Scopes: `read:catalog`. */
  publishers(query: string, options?: SearchOptions): Promise<SearchResults<PublisherHit>> {
    return this.#typed<PublisherHit>(query, SearchType.Publisher, options);
  }

  /** Scopes: `read:catalog`. */
  users(query: string, options?: SearchOptions): Promise<SearchResults<UserHit>> {
    return this.#typed<UserHit>(query, SearchType.User, options);
  }


  /** The untouched API response, including Typesense's raw `results`. Scopes: `read:catalog`. */
  async raw(query: string, { type = SearchType.Book, ...options }: SearchOptions & { type?: SearchType } = {}): Promise<RawSearch> {
    const { search } = await this.client.request(operations.Search, {
      query,
      queryType: type,
      ...(options.page !== undefined && { page: options.page }),
      ...(options.perPage !== undefined && { perPage: options.perPage }),
      ...(options.fields !== undefined && { fields: list(options.fields) }),
      ...(options.weights !== undefined && { weights: list(options.weights) }),
      ...(options.typos !== undefined && { typos: list(options.typos) }),
      ...(options.sort !== undefined && { sort: options.sort }),
      ...(options.filterBy !== undefined && { filterBy: options.filterBy }),
    });
    return required(search, "search", "result");
  }

  async #typed<T>(query: string, type: SearchType, options?: SearchOptions): Promise<SearchResults<T>> {
    const search = await this.raw(query, { ...options, type });
    const results = (search.results ?? {}) as { hits?: { document: unknown }[]; found?: number };
    return {
      hits: (results.hits ?? []).map((h) => toHit<T>(h.document)),
      ids: nonNull(search.ids),
      found: results.found ?? 0,
      page: search.page ?? options?.page ?? 1,
      perPage: search.perPage ?? options?.perPage ?? 25,
    };
  }
}
