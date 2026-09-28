import type { HardcoverClient } from "../core/client.ts";
import { localDate } from "../core/dates.ts";
import { HardcoverError } from "../core/errors.ts";
import { UserBookStatus, type PrivacySetting } from "../generated/enums.ts";
import type {
  AddUserBookMutation,
  GetLibraryQuery,
  GetUserBookForBookQuery,
  GetUserBookQuery,
} from "../generated/graphql.ts";
import { operations } from "../operations.ts";
import { toPage, type Page, type PageOptions } from "./page.ts";

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
}

const WIRE: Record<Exclude<keyof LibraryEntryPatch, "review">, string> = {
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

function toWire(patch: LibraryEntryPatch): Record<string, unknown> {
  const wire: Record<string, unknown> = {};
  for (const [key, field] of Object.entries(WIRE)) {
    const value = patch[key as keyof typeof WIRE];
    if (value !== undefined) wire[field] = value;
  }
  for (const [key, field] of Object.entries(REVIEW_WIRE)) {
    const value = patch.review?.[key as keyof typeof REVIEW_WIRE];
    if (value !== undefined) wire[field] = value;
  }
  return wire;
}

function unwrap<T>(entry: T | null | undefined, action: string): T {
  if (!entry) throw new HardcoverError(`${action} returned no library entry`);
  return entry;
}

/** The signed-in user's library ("user books"). */
export class LibraryResource {
  constructor(private readonly client: HardcoverClient) {}

  /** Requires `read:library`. One request plus a cached `me` lookup. */
  async list({ status, limit = 25, offset = 0 }: PageOptions & { status?: UserBookStatus | UserBookStatus[] } = {}): Promise<Page<LibraryListItem>> {
    const userId = await this.client.me.id();
    const statusIds = status === undefined ? undefined : Array.isArray(status) ? status : [status];
    const { user_books } = await this.client.request(operations.GetLibrary, {
      userId,
      limit,
      offset,
      ...(statusIds && { statusIds }),
    });
    return toPage(user_books, limit, offset);
  }

  /** Requires `read:library`. */
  async count({ status }: { status?: UserBookStatus | UserBookStatus[] } = {}): Promise<number> {
    const userId = await this.client.me.id();
    const statusIds = status === undefined ? undefined : Array.isArray(status) ? status : [status];
    const { user_books_aggregate } = await this.client.request(operations.CountLibrary, {
      userId,
      ...(statusIds && { statusIds }),
    });
    return user_books_aggregate.aggregate?.count ?? 0;
  }

  /** The entry for a book, or null if it isn't in the library. Requires `read:library`. */
  async forBook(bookId: number): Promise<LibraryEntryForBook | null> {
    const userId = await this.client.me.id();
    const { user_books } = await this.client.request(operations.GetUserBookForBook, { userId, bookId });
    return user_books[0] ?? null;
  }

  /** Requires `read:library`. */
  async get(id: number): Promise<LibraryEntryWithBook | null> {
    const { user_books_by_pk } = await this.client.request(operations.GetUserBook, { id });
    return user_books_by_pk ?? null;
  }

  /** Adds a book (Want to Read unless `status` says otherwise). Requires `write:library`. */
  async add(bookId: number, options: LibraryEntryPatch = {}): Promise<LibraryEntry> {
    const patch = await this.#withDefaults({ status: UserBookStatus.WantToRead, ...options });
    const { insert_user_book } = await this.client.request(operations.AddUserBook, {
      object: { book_id: bookId, ...toWire(patch) },
    });
    return unwrap(insert_user_book?.userBook, "insert_user_book");
  }

  /** Requires `write:library` (plus `write:reviews` for review fields). */
  async update(id: number, patch: LibraryEntryPatch): Promise<LibraryEntry> {
    const { update_user_book } = await this.client.request(operations.UpdateUserBook, {
      id,
      object: toWire(await this.#withDefaults(patch)),
    });
    return unwrap(update_user_book?.userBook, "update_user_book");
  }

  setStatus(id: number, status: UserBookStatus, { date }: { date?: string } = {}): Promise<LibraryEntry> {
    return this.update(id, { status, ...(date !== undefined && { date }) });
  }

  rate(id: number, rating: number | null): Promise<LibraryEntry> {
    return this.update(id, { rating });
  }

  /** Requires `write:library`. */
  async remove(id: number): Promise<void> {
    await this.client.request(operations.RemoveUserBook, { id });
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
