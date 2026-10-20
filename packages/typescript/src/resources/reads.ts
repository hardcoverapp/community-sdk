import type { HardcoverClient } from "../core/client.ts";
import { toActionAt, type OccurredAt } from "../core/dates.ts";
import { HardcoverError, NotFoundError } from "../core/errors.ts";
import { required } from "./shared.ts";
import { ReadingFormat } from "../generated/enums.ts";
import type { UpdateUserBookReadMutation, UserBookReadFragment } from "../generated/graphql.ts";
import { operations } from "../operations.ts";
import type { WithJsonColumns } from "../core/json-columns.ts";

export type Read = WithJsonColumns<UserBookReadFragment>;
export type UpdatedRead = WithJsonColumns<NonNullable<NonNullable<UpdateUserBookReadMutation["update_user_book_read"]>["userBookRead"]>>;

/** Exactly one unit. Percent is converted with the read's edition: pages for print/ebook, seconds for audio. */
export type ProgressInput = ({ pages: number } | { seconds: number } | { percent: number }) & {
  /** When the reading happened, if not now. Backdates the journal entry the server writes. */
  occurredAt?: OccurredAt;
};

// The server's rule (UserBookService#open_user_book_read): started, not finished, newest.
function openRead(reads: Read[]): Read | null {
  return (
    reads
      .filter((r) => r.startedAt && !r.finishedAt)
      .sort((a, b) => b.id - a.id)[0] ?? null
  );
}

function assertCount(value: number, unit: string): void {
  if (!Number.isInteger(value) || value < 0) throw new RangeError(`${unit} must be a whole number of 0 or more (got ${value})`);
}

// Checks that need no request, so bad input fails before anything is sent.
function assertProgressInput(input: ProgressInput): void {
  const units = (["pages", "seconds", "percent"] as const).filter((unit) => unit in input);
  if (units.length !== 1) throw new TypeError("Pass exactly one of pages, seconds or percent");
  if ("pages" in input) assertCount(input.pages, "pages");
  if ("seconds" in input) assertCount(input.seconds, "seconds");
  if ("percent" in input && (!Number.isFinite(input.percent) || input.percent < 0 || input.percent > 100)) {
    throw new RangeError(`percent must be 0 to 100 (got ${input.percent})`);
  }
}

// Same math as the app (components/progress/.../progressMath.ts): ceil(pct / 100 * total).
function progressFields(read: Read, input: ProgressInput): Record<string, number> {
  if ("pages" in input) return { progress_pages: input.pages };
  if ("seconds" in input) return { progress_seconds: input.seconds };

  const { percent } = input;
  const edition = read.edition;
  if (edition?.readingFormatId === ReadingFormat.Audiobook) {
    if (!edition.audioSeconds) throw new RangeError("This read's audiobook edition has no length; pass seconds instead of percent");
    return { progress_seconds: Math.ceil((percent / 100) * edition.audioSeconds) };
  }
  if (!edition?.pages) throw new RangeError("This read's edition has no page count; pass pages instead of percent");
  return { progress_pages: Math.ceil((percent / 100) * edition.pages) };
}

/**
 * Reading sessions for a library entry. The server starts a read when status
 * becomes Currently Reading (a new one on a re-read) and finishes it on Read,
 * and it journals every change itself. Don't also write journal entries for these.
 */
export class ReadsResource {
  private readonly client: HardcoverClient;

  constructor(client: HardcoverClient) {
    this.client = client;
  }

  /** All reads for a library entry, newest first. Scopes: `read:library`. */
  async list(userBookId: number): Promise<Read[]> {
    const { user_books_by_pk } = await this.client.request(operations.GetUserBook, { id: userBookId });
    if (!user_books_by_pk) throw new NotFoundError("library entry", userBookId);
    return user_books_by_pk.userBookReads;
  }

  /** The read in progress (started, not finished), or null. Scopes: `read:library`. */
  async current(userBookId: number): Promise<Read | null> {
    return openRead(await this.list(userBookId));
  }

  /**
   * Records progress on the read in progress. Always looks up the current read
   * (one extra request) so a re-read never lands on a finished read.
   * Progress of 100% finishes the read and marks the book Read on the server.
   * Scopes: `read:library`, `write:library`.
   */
  async setProgress(userBookId: number, input: ProgressInput): Promise<UpdatedRead> {
    assertProgressInput(input);
    const read = await this.current(userBookId);
    if (!read) {
      throw new HardcoverError(
        `No read in progress for library entry ${userBookId}. Set its status to Currently Reading first.`,
      );
    }
    const fields = progressFields(read, input);
    const { update_user_book_read } = await this.client.request(operations.UpdateUserBookRead, {
      id: read.id,
      read: { ...fields, ...(input.occurredAt !== undefined && { action_at: toActionAt(input.occurredAt) }) },
    });
    return required(update_user_book_read?.userBookRead, "update_user_book_read", "read");
  }
}
