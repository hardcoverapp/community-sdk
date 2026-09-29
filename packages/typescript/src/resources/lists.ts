import type { HardcoverClient } from "../core/client.ts";
import { HardcoverError } from "../core/errors.ts";
import { cleanIsbn } from "../core/isbn.ts";
import type { PrivacySetting } from "../generated/enums.ts";
import type { AddBookToListMutation, GetListQuery, ListSummaryFragment } from "../generated/graphql.ts";
import { operations } from "../operations.ts";
import { toPage, type Page, type PageOptions } from "./page.ts";

export type List = ListSummaryFragment;
export type ListWithBooks = NonNullable<GetListQuery["lists_by_pk"]>;
export type ListBookRow = NonNullable<NonNullable<AddBookToListMutation["insert_list_book"]>["listBook"]>;

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

function listToWire(input: ListInput): Record<string, unknown> {
  const wire: Record<string, unknown> = {};
  for (const [key, field] of Object.entries(LIST_WIRE)) {
    const value = input[key as keyof ListInput];
    if (value !== undefined) wire[field] = value;
  }
  return wire;
}

export interface AddBooksResult {
  /** Codes added with the exact edition they identify. */
  added: { code: string; bookId: number; editionId: number; listBookId: number }[];
  /**
   * `no_exact_edition`: no edition has this ISBN (UPCs always land here; the
   * API stores no UPCs). `failed`: the add itself errored; `error` says why.
   */
  notAdded: ({ code: string; reason: "no_exact_edition" } | { code: string; reason: "failed"; error: Error })[];
}

/** The API allows 5 top-level fields per request (spec/01 Limits). */
const BATCH_SIZE = 5;


type Pending = { key: string; bookId: number; editionId: number };

export class ListsResource {
  constructor(private readonly client: HardcoverClient) {}

  /** The signed-in user's lists. Requires `read:lists`. */
  async mine(options: PageOptions = {}): Promise<Page<List>> {
    return this.forUser(await this.client.me.id(), options);
  }

  /** Requires `read:lists`; you only see lists their privacy allows. */
  async forUser(userId: number, { limit = 25, offset = 0 }: PageOptions = {}): Promise<Page<List>> {
    const { lists } = await this.client.request(operations.GetListsForUser, { userId, limit, offset });
    return toPage(lists, limit, offset);
  }

  /** A list with a page of its books, or null. Requires `read:lists`. */
  async get(id: number, { limit = 50, offset = 0 }: PageOptions = {}): Promise<ListWithBooks | null> {
    const { lists_by_pk } = await this.client.request(operations.GetList, { id, limit, offset });
    return lists_by_pk ?? null;
  }

  /** Requires `write:lists`. */
  async create(input: ListInput & { name: string }): Promise<List> {
    const { insert_list } = await this.client.request(operations.CreateList, { object: listToWire(input) });
    if (!insert_list?.list) throw new HardcoverError("insert_list returned no list");
    return insert_list.list;
  }

  /** Sends only the fields you set. Requires `write:lists`. */
  async update(id: number, patch: ListInput): Promise<List> {
    const { update_list } = await this.client.request(operations.UpdateList, { id, object: listToWire(patch) });
    if (!update_list?.list) throw new HardcoverError("update_list returned no list");
    return update_list.list;
  }

  /** Requires `write:lists`. */
  async delete(id: number): Promise<void> {
    const { delete_list } = await this.client.request(operations.DeleteList, { id });
    if (!delete_list?.success) throw new HardcoverError(`List ${id} was not deleted`);
  }

  /**
   * Adds a book. Adding a book that's already on the list returns the existing
   * row unchanged, so this is safe to repeat. Requires `write:lists`.
   */
  async addBook(listId: number, bookId: number, { editionId, position }: { editionId?: number; position?: number } = {}): Promise<ListBookRow> {
    const { insert_list_book } = await this.client.request(operations.AddBookToList, {
      object: {
        list_id: listId,
        book_id: bookId,
        ...(editionId !== undefined && { edition_id: editionId }),
        ...(position !== undefined && { position }),
      },
    });
    if (!insert_list_book?.listBook) throw new HardcoverError("insert_list_book returned no row");
    return insert_list_book.listBook;
  }

  /**
   * Removes a book. Returns false if it wasn't on the list. Two requests: the
   * API deletes by list_books row id, so the row is looked up first.
   * Requires `write:lists`.
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
   * Requires `read:catalog` and `write:lists`.
   */
  async addBooks(listId: number, codes: string[]): Promise<AddBooksResult> {
    const keys = [...new Set(codes.map(cleanIsbn).filter(Boolean))];
    if (keys.length === 0) return { added: [], notAdded: [] };

    const { editions } = await this.client.request(operations.FindEditionsByIsbn, { isbns: keys });
    const pending: Pending[] = [];
    for (const key of keys) {
      // Editions come back most-read first, so the first match is the stable choice.
      const edition = editions.find((e) => e.isbn13 === key || e.isbn10 === key);
      if (edition) pending.push({ key, bookId: edition.bookId, editionId: edition.id });
    }

    const outcomes = new Map<string, { listBookId: number } | { error: Error }>();
    for (let i = 0; i < pending.length; i += BATCH_SIZE) {
      const batch = pending.slice(i, i + BATCH_SIZE);
      try {
        const ids = await this.#insertBatch(listId, batch);
        batch.forEach((item, j) => outcomes.set(item.key, { listBookId: ids[j]! }));
      } catch (error) {
        if (!(error instanceof HardcoverError)) throw error;
        // One failure makes the server drop the whole response, although items
        // before it were added. Adds are idempotent, so retry each item alone
        // to learn exactly which one failed.
        for (const item of batch) {
          try {
            outcomes.set(item.key, { listBookId: (await this.#insertBatch(listId, [item]))[0]! });
          } catch (itemError) {
            if (!(itemError instanceof HardcoverError)) throw itemError;
            outcomes.set(item.key, { error: itemError });
          }
        }
      }
    }

    const result: AddBooksResult = { added: [], notAdded: [] };
    const byKey = new Map(pending.map((p) => [p.key, p]));
    for (const code of codes) {
      const key = cleanIsbn(code);
      const match = byKey.get(key);
      const outcome = outcomes.get(key);
      if (!match || !outcome) result.notAdded.push({ code, reason: "no_exact_edition" });
      else if ("error" in outcome) result.notAdded.push({ code, reason: "failed", error: outcome.error });
      else result.added.push({ code, bookId: match.bookId, editionId: match.editionId, listBookId: outcome.listBookId });
    }
    return result;
  }

  // Several insert_list_book calls in one request, aliased b0..bN.
  async #insertBatch(listId: number, items: Pending[]): Promise<number[]> {
    const vars = items.map((_, i) => `$b${i}: ListBookInput!`).join(", ");
    const fields = items.map((_, i) => `b${i}: insert_list_book(object: $b${i}) { id }`).join("\n  ");
    const variables = Object.fromEntries(
      items.map((item, i) => [`b${i}`, { list_id: listId, book_id: item.bookId, edition_id: item.editionId }]),
    );
    const data = await this.client.graphql<Record<string, { id: number | null } | null>>(
      `mutation AddBooksToList(${vars}) {\n  ${fields}\n}`,
      variables,
    );
    return items.map((_, i) => {
      const id = data[`b${i}`]?.id;
      if (!id) throw new HardcoverError("insert_list_book returned no row");
      return id;
    });
  }
}
