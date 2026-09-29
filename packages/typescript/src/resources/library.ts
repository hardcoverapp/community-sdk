import type { HardcoverClient } from "../core/client.ts";
import { localDate, toActionAt, type OccurredAt } from "../core/dates.ts";
import { NotFoundError } from "../core/errors.ts";
import { UserBookStatus, type PrivacySetting } from "../generated/enums.ts";
import type {
  AddUserBookMutation,
  GetLibraryQuery,
  GetUserBookForBookQuery,
  GetUserBookQuery,
} from "../generated/graphql.ts";
import { operations } from "../operations.ts";
import { DEFAULT_LIMIT, toPage, type Page, type PageOptions } from "./page.ts";
import { pickDefined, required } from "./shared.ts";

export type LibraryEntry = NonNullable<NonNullable<AddUserBookMutation["insert_user_book"]>["userBook"]>;
export type LibraryListItem = GetLibraryQuery["user_books"][number];
export type LibraryEntryWithBook = NonNullable<GetUserBookQuery["user_books_by_pk"]>;
export type LibraryEntryForBook = GetUserBookForBookQuery["user_books"][number];

/**
 * Changes to a library entry. Only fields you set are sent, which matters:
 * any review field needs the `write:reviews` scope, so a plain status change
 * must never include them.
 */
export interface LibraryEntryPatch {
  status?: UserBookStatus;
  /** Date for the status change (YYYY-MM-DD, local). Defaults to today when status is Read. */
  date?: string;
  startDate?: string;
  /** 0.5 to 5 in half steps; null clears it. */
  rating?: number | null;
  privacy?: PrivacySetting;
  editionId?: number | null;
  notes?: string | null;
  readCount?: number;
  recommendedBy?: string | null;
  recommendedFor?: string | null;
  /** Needs `write:reviews`. */
  review?: { markdown?: string | null; hasSpoilers?: boolean; reviewedAt?: string | null };
  /** When this happened, if not now. Backdates the journal entry the server writes. */
  occurredAt?: OccurredAt;
}

const WIRE: Record<Exclude<keyof LibraryEntryPatch, "review" | "occurredAt">, string> = {
  status: "status_id",
  date: "user_date",
  startDate: "user_start_date",
  rating: "rating",
  privacy: "privacy_setting_id",
  editionId: "edition_id",
  notes: "private_notes",
  readCount: "read_count",
  recommendedBy: "recommended_by",
  recommendedFor: "recommended_for",
};

const REVIEW_WIRE = { markdown: "review_markdown", hasSpoilers: "review_has_spoilers", reviewedAt: "reviewed_at" } as const;

export function assertRating(rating: number | null | undefined): void {
  if (rating === null || rating === undefined) return;
  if (!Number.isFinite(rating) || rating < 0.5 || rating > 5 || !Number.isInteger(rating * 2)) {
    throw new RangeError(`Rating must be 0.5 to 5 in steps of 0.5, or null to clear it (got ${rating})`);
  }
}

function toWire({ review, occurredAt, ...fields }: LibraryEntryPatch): Record<string, unknown> {
  return {
    ...pickDefined(fields, WIRE),
    ...(review && pickDefined(review, REVIEW_WIRE)),
    ...(occurredAt !== undefined && { action_at: toActionAt(occurredAt) }),
  };
}

/** One status or several, as the operations' `statusIds` list; undefined keeps the operation's default. */
const statusIds = (status: UserBookStatus | UserBookStatus[] | undefined): { statusIds?: UserBookStatus[] } =>
  status === undefined ? {} : { statusIds: Array.isArray(status) ? status : [status] };

/** The signed-in user's library ("user books"). */
export class LibraryResource {
  constructor(private readonly client: HardcoverClient) {}

  /** One request plus a cached `me` lookup. Scopes: `read:me`, `read:library`. */
  async list({ status, limit = DEFAULT_LIMIT, offset = 0 }: PageOptions & { status?: UserBookStatus | UserBookStatus[] } = {}): Promise<Page<LibraryListItem>> {
    const userId = await this.client.me.id();
    const { user_books } = await this.client.request(operations.GetLibrary, { userId, limit, offset, ...statusIds(status) });
    return toPage(user_books, limit, offset);
  }

  /**
   * Scopes: `read:me`, `read:library`.
   */
  async count({ status }: { status?: UserBookStatus | UserBookStatus[] } = {}): Promise<number> {
    const userId = await this.client.me.id();
    const { user_books_aggregate } = await this.client.request(operations.CountLibrary, { userId, ...statusIds(status) });
    return user_books_aggregate.aggregate?.count ?? 0;
  }

  /**
   * The entry for a book, or null if it isn't in the library.
   * Scopes: `read:me`, `read:library`.
   */
  async forBook(bookId: number): Promise<LibraryEntryForBook | null> {
    const userId = await this.client.me.id();
    const { user_books } = await this.client.request(operations.GetUserBookForBook, { userId, bookId });
    return user_books[0] ?? null;
  }

  /**
   * Scopes: `read:library`.
   */
  async get(id: number): Promise<LibraryEntryWithBook | null> {
    const { user_books_by_pk } = await this.client.request(operations.GetUserBook, { id });
    return user_books_by_pk ?? null;
  }

  /**
   * Adds a book (Want to Read unless `status` says otherwise).
   * Scopes: `write:library`, `read:me` (only when marking Read without a date).
   */
  async add(bookId: number, options: LibraryEntryPatch = {}): Promise<LibraryEntry> {
    const patch = await this.#withDefaults({ status: UserBookStatus.WantToRead, ...options });
    const { insert_user_book } = await this.client.request(operations.AddUserBook, {
      object: { book_id: bookId, ...toWire(patch) },
    });
    return required(insert_user_book?.userBook, "insert_user_book", "library entry");
  }

  /**
   * Scopes: `write:library`, `write:reviews` (review fields), `read:me` (only when marking Read without a date).
   */
  async update(id: number, patch: LibraryEntryPatch): Promise<LibraryEntry> {
    const { update_user_book } = await this.client.request(operations.UpdateUserBook, {
      id,
      object: toWire(await this.#withDefaults(patch)),
    });
    return required(update_user_book?.userBook, "update_user_book", "library entry");
  }

  /**
   * The server manages reads from status: Currently Reading starts a read (a
   * new one on a re-read), Read finishes it. It also writes the journal entries.
   * Scopes: `write:library`, `read:me` (only when marking Read without a date).
   */
  setStatus(
    id: number,
    status: UserBookStatus,
    { date, occurredAt }: { date?: string; occurredAt?: OccurredAt } = {},
  ): Promise<LibraryEntry> {
    return this.update(id, { status, ...(date !== undefined && { date }), ...(occurredAt !== undefined && { occurredAt }) });
  }

  /** Scopes: `write:library`. */
  rate(id: number, rating: number | null): Promise<LibraryEntry> {
    return this.update(id, { rating });
  }

  /**
   * Scopes: `write:library`.
   */
  async remove(id: number): Promise<void> {
    const { delete_user_book } = await this.client.request(operations.RemoveUserBook, { id });
    if (!delete_user_book?.id) throw new NotFoundError("library entry", id);
  }

  // Validates, and mirrors the app: marking Read without a date records today
  // in the user's timezone (app: services/UserBookService/useUserBookService.ts).
  async #withDefaults(patch: LibraryEntryPatch): Promise<LibraryEntryPatch> {
    assertRating(patch.rating);
    if (patch.status !== UserBookStatus.Read || patch.date !== undefined) return patch;
    const { timezone } = await this.client.me.get();
    return { ...patch, date: localDate(this.client.now(), timezone) };
  }
}
