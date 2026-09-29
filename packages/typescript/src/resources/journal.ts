import type { HardcoverClient } from "../core/client.ts";
import { JournalEvent, type PrivacySetting } from "../generated/enums.ts";
import type { JournalEntryFragment, ReadingJournalCreateType } from "../generated/graphql.ts";
import { operations } from "../operations.ts";
import { DEFAULT_LIMIT, toPage, type Page, type PageOptions } from "./page.ts";
import { nonNull, pickDefined, required } from "./shared.ts";

export type JournalEntry = JournalEntryFragment;

export interface JournalTag {
  tag: string;
  /** e.g. "Tag", "Genre", "Mood", "Content Warning". */
  category: string;
  spoiler: boolean;
}

export interface JournalEntryInput {
  /** Defaults to a note. See JournalEvent for which events the server already writes for you. */
  event?: JournalEvent;
  entry?: string | null;
  /** Defaults to the user's account privacy setting. */
  privacy?: PrivacySetting;
  editionId?: number | null;
  /** The day it happened (YYYY-MM-DD, local). Journal dates are days, not timestamps. */
  date?: string;
  tags?: JournalTag[];
  metadata?: Record<string, unknown>;
}

const WIRE: Record<keyof JournalEntryInput, string> = {
  event: "event",
  entry: "entry",
  privacy: "privacy_setting_id",
  editionId: "edition_id",
  date: "action_at",
  tags: "tags",
  metadata: "metadata",
};


/**
 * The reading journal: everything the API allows. The server already journals
 * status changes, reads, progress, ratings, reviews and list adds when you use
 * library, reads and lists, so most apps only write notes and quotes here.
 * Writing those other events yourself duplicates them (see JournalEvent).
 */
export class JournalResource {
  constructor(private readonly client: HardcoverClient) {}

  /** The signed-in user's entries for a book, newest first. Scopes: `read:me`, `read:journal`. */
  async forBook(bookId: number, { limit = DEFAULT_LIMIT, offset = 0 }: PageOptions = {}): Promise<Page<JournalEntry>> {
    const userId = await this.client.me.id();
    const { reading_journals } = await this.client.request(operations.GetJournalForBook, { userId, bookId, limit, offset });
    return toPage(reading_journals, limit, offset);
  }

  /**
   * Adds an entry (a note unless `event` says otherwise).
   * Scopes: `write:library`, `read:me` (only when privacy isn't given).
   */
  async add(bookId: number, input: JournalEntryInput = {}): Promise<JournalEntry> {
    // The API requires a privacy setting; default to the user's own account setting.
    const privacy = input.privacy ?? ((await this.client.me.get()).accountPrivacySettingId as PrivacySetting);
    const object = {
      book_id: bookId,
      ...pickDefined({ event: JournalEvent.Note, ...input, privacy, tags: input.tags ?? [] }, WIRE),
    } as ReadingJournalCreateType;
    const { insert_reading_journal } = await this.client.request(operations.AddJournalEntry, { object });
    return required(insert_reading_journal?.readingJournal, "insert_reading_journal", "journal entry");
  }

  /** Sends only the fields you set. Scopes: `write:library`. */
  async update(id: number, patch: JournalEntryInput): Promise<JournalEntry> {
    const { update_reading_journal } = await this.client.request(operations.UpdateJournalEntry, { id, object: pickDefined(patch, WIRE) });
    return required(update_reading_journal?.readingJournal, "update_reading_journal", "journal entry");
  }

  /**
   * Scopes: `write:library`.
   */
  async delete(id: number): Promise<void> {
    await this.client.request(operations.DeleteJournalEntry, { id });
  }

  /**
   * Removes every entry the user has for a book, including the ones the
   * server wrote. Returns the removed ids.
   * Scopes: `write:library`.
   */
  async clearForBook(bookId: number): Promise<number[]> {
    const { delete_reading_journals_for_book } = await this.client.request(operations.ClearJournalForBook, { bookId });
    return nonNull(delete_reading_journals_for_book?.ids);
  }
}
