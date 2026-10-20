import type { HardcoverClient } from "../core/client.ts";
import { HardcoverError, NotFoundError } from "../core/errors.ts";
import { cleanIsbn } from "../core/isbn.ts";
import type { WithJsonColumns } from "../core/json-columns.ts";
import type { PrivacySetting } from "../generated/enums.ts";
import type { AddBookToListMutation, GetListQuery, ListSummaryFragment } from "../generated/graphql.ts";
import { operations } from "../operations.ts";
import { DEFAULT_LIMIT, toPage, type Page, type PageOptions } from "./page.ts";
import { pickDefined, required, type ActionRecord } from "./shared.ts";

export type List = WithJsonColumns<ListSummaryFragment>;
export type ListWithBooks = WithJsonColumns<NonNullable<GetListQuery["lists_by_pk"]>>;
export type ListBookRow = WithJsonColumns<ActionRecord<AddBookToListMutation, "insert_list_book", "listBook">>;

export interface ListInput {
  name?: string;
  description?: string | null;
  privacy?: PrivacySetting;
  ranked?: boolean;
  defaultView?: string;
  featuredProfile?: boolean;
  url?: string | null;
}

const LIST_WIRE: Record<keyof ListInput, string> = {
  name: "name",
  description: "description",
  privacy: "privacy_setting_id",
  ranked: "ranked",
  defaultView: "default_view",
  featuredProfile: "featured_profile",
  url: "url",
};

export interface AddBookOptions {
  /** The exact edition. Without it, the list shows the book's default edition. */
  editionId?: number;

  /** Position on a ranked list. */
  position?: number;
}

/** A scanned code that was added, with the exact edition it identifies. */
export interface AddedBook {
  code: string;
  bookId: number;
  editionId: number;
  listBookId: number;
}

/**
 * A scanned code that wasn't added.
 * - `no_exact_edition`: no edition has this ISBN. UPCs always land here; the
 *   API stores no UPCs.
 * - `failed`: the add itself errored; `error` says why. Safe to retry.
 */
export type NotAddedBook =
  | { code: string; reason: "no_exact_edition" }
  | { code: string; reason: "failed"; error: Error };

export interface AddBooksResult {
  added: AddedBook[];
  notAdded: NotAddedBook[];
}

/** The API allows 5 top-level fields per request (spec/01 Limits). */
const BATCH_SIZE = 5;

/** A cleaned code with the edition it matched, waiting to be added. */
type Match = { key: string; bookId: number; editionId: number };

/** What happened to one match: its new list row, or why it failed. */
type Outcome = { listBookId: number } | { error: Error };

export class ListsResource {
  private readonly client: HardcoverClient;

  constructor(client: HardcoverClient) {
    this.client = client;
  }

  /** The signed-in user's lists. Scopes: `read:me`, `read:lists`. */
  async mine(options: PageOptions = {}): Promise<Page<List>> {
    return this.forUser(await this.client.me.id(), options);
  }

  /**
   * Scopes: `read:lists`.
   */
  async forUser(userId: number, { limit = DEFAULT_LIMIT, offset = 0 }: PageOptions = {}): Promise<Page<List>> {
    const { lists } = await this.client.request(operations.GetListsForUser, { userId, limit, offset });

    return toPage(lists, limit, offset);
  }

  /** A list with a page of its books, or null. Scopes: `read:lists`. */
  async get(id: number, { limit = 50, offset = 0 }: PageOptions = {}): Promise<ListWithBooks | null> {
    const { lists_by_pk } = await this.client.request(operations.GetList, { id, limit, offset });

    return lists_by_pk ?? null;
  }

  /**
   * Scopes: `write:lists`.
   */
  async create(input: ListInput & { name: string }): Promise<List> {
    const object = pickDefined(input, LIST_WIRE);
    const { insert_list } = await this.client.request(operations.CreateList, { object });

    return required(insert_list?.list, "insert_list", "list");
  }

  /** Sends only the fields you set. Scopes: `write:lists`. */
  async update(id: number, patch: ListInput): Promise<List> {
    const object = pickDefined(patch, LIST_WIRE);
    const { update_list } = await this.client.request(operations.UpdateList, { id, object });

    return required(update_list?.list, "update_list", "list");
  }

  /**
   * Scopes: `write:lists`.
   */
  async delete(id: number): Promise<void> {
    const { delete_list } = await this.client.request(operations.DeleteList, { id });

    if (!delete_list?.success) throw new NotFoundError("list", id);
  }

  /**
   * Adds a book. Adding a book that's already on the list returns the existing
   * row unchanged, so this is safe to repeat.
   * Scopes: `write:lists`.
   */
  async addBook(listId: number, bookId: number, { editionId, position }: AddBookOptions = {}): Promise<ListBookRow> {
    const object = {
      list_id: listId,
      book_id: bookId,
      ...(editionId !== undefined && { edition_id: editionId }),
      ...(position !== undefined && { position }),
    };

    const { insert_list_book } = await this.client.request(operations.AddBookToList, { object });

    return required(insert_list_book?.listBook, "insert_list_book", "list book");
  }

  /**
   * Removes a book. Returns false if it wasn't on the list. Two requests: the
   * API deletes by list_books row id, so the row is looked up first.
   * Scopes: `read:lists`, `write:lists`.
   */
  async removeBook(listId: number, bookId: number): Promise<boolean> {
    const { list_books } = await this.client.request(operations.FindListBook, { listId, bookId });

    const row = list_books[0];
    if (!row) return false;

    await this.client.request(operations.RemoveListBook, { id: row.id });
    return true;
  }

  /**
   * Bulk add by ISBN, e.g. from a shelf of barcode scans. Exact matches only:
   * every code is looked up against ISBN-13 and ISBN-10 in one request, exact
   * editions are added in batches, and anything else is reported, never
   * guessed. Search for the leftovers yourself if you want fuzzy matching.
   * Scopes: `read:catalog`, `write:lists`.
   */
  async addBooks(listId: number, codes: string[]): Promise<AddBooksResult> {
    const keys = [...new Set(codes.map(cleanIsbn).filter(Boolean))];
    if (keys.length === 0) return { added: [], notAdded: [] };

    const matches = await this.#matchEditions(keys);
    const outcomes = await this.#addInBatches(listId, matches);

    return report(codes, matches, outcomes);
  }

  // One lookup for every code; codes with no exact edition simply don't match.
  async #matchEditions(keys: string[]): Promise<Match[]> {
    const { editions } = await this.client.request(operations.FindEditionsByIsbn, { isbns: keys });
    const matches: Match[] = [];

    for (const key of keys) {
      // Editions come back most-read first, so the first match is the stable choice.
      const edition = editions.find((e) => e.isbn13 === key || e.isbn10 === key);
      if (edition) matches.push({ key, bookId: edition.bookId, editionId: edition.id });
    }

    return matches;
  }

  async #addInBatches(listId: number, matches: Match[]): Promise<Map<string, Outcome>> {
    const outcomes = new Map<string, Outcome>();

    for (let i = 0; i < matches.length; i += BATCH_SIZE) {
      const batch = matches.slice(i, i + BATCH_SIZE);

      try {
        const ids = await this.#insertBatch(listId, batch);
        batch.forEach((item, j) => outcomes.set(item.key, { listBookId: ids[j]! }));
      } catch (error) {
        if (!(error instanceof HardcoverError)) throw error;

        // One failure makes the server drop the whole response, although items
        // before it were added. Adds are idempotent, so retry each item alone
        // to learn exactly which one failed.
        for (const item of batch) {
          outcomes.set(item.key, await this.#insertOne(listId, item));
        }
      }
    }

    return outcomes;
  }

  async #insertOne(listId: number, item: Match): Promise<Outcome> {
    try {
      const [listBookId] = await this.#insertBatch(listId, [item]);
      return { listBookId: listBookId! };
    } catch (error) {
      if (!(error instanceof HardcoverError)) throw error;
      return { error };
    }
  }

  // Several insert_list_book calls in one request, aliased b0..bN.
  async #insertBatch(listId: number, items: Match[]): Promise<number[]> {
    const vars = items.map((_, i) => `$b${i}: ListBookInput!`).join(", ");
    const fields = items.map((_, i) => `b${i}: insert_list_book(object: $b${i}) { id }`).join("\n  ");
    const query = `mutation AddBooksToList(${vars}) {\n  ${fields}\n}`;

    const variables = Object.fromEntries(
      items.map((item, i) => [`b${i}`, { list_id: listId, book_id: item.bookId, edition_id: item.editionId }]),
    );

    const data = await this.client.graphql<Record<string, { id: number | null } | null>>(query, variables);

    return items.map((_, i) => required(data[`b${i}`]?.id, "insert_list_book", "list book"));
  }
}

// The result in the caller's order, under the codes as they were given.
function report(codes: string[], matches: Match[], outcomes: Map<string, Outcome>): AddBooksResult {
  const result: AddBooksResult = { added: [], notAdded: [] };
  const matchByKey = new Map(matches.map((match) => [match.key, match]));

  for (const code of codes) {
    const key = cleanIsbn(code);
    const match = matchByKey.get(key);
    const outcome = outcomes.get(key);

    if (!match || !outcome) {
      result.notAdded.push({ code, reason: "no_exact_edition" });
    } else if ("error" in outcome) {
      result.notAdded.push({ code, reason: "failed", error: outcome.error });
    } else {
      result.added.push({ code, bookId: match.bookId, editionId: match.editionId, listBookId: outcome.listBookId });
    }
  }

  return result;
}
