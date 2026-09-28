import { describe } from "vitest";
import { ActionError, HardcoverClient, operations, ReadingFormat, type Environment } from "../../src/index.ts";

const token = process.env.HARDCOVER_API_KEY;
// Only `pnpm test:live` sets HARDCOVER_LIVE. A key in .env or the shell is just
// a credential: it never turns live calls on by itself, so an IDE or a bare
// `vitest` run over these files stays offline.
const enabled = process.env.HARDCOVER_LIVE === "1";
const environment = (process.env.HARDCOVER_ENV ?? "staging") as Environment;

/** Runs only under `pnpm test:live` with HARDCOVER_API_KEY set; skipped otherwise. */
export const describeLive = enabled && token ? describe : describe.skip;

/**
 * Local data is disposable; remote data (staging, prod) is not. Writes run only
 * under `pnpm test:live:writes`, and against a remote target only with
 * HARDCOVER_ALLOW_REMOTE_WRITES=1 as well.
 */
export const isLocalTarget =
  process.env.HARDCOVER_API_URL !== undefined
    ? /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:|\/)/.test(process.env.HARDCOVER_API_URL)
    : environment === "local";

export const writesAllowed =
  process.env.HARDCOVER_LIVE_WRITES === "1" && (isLocalTarget || process.env.HARDCOVER_ALLOW_REMOTE_WRITES === "1");

/** Like describeLive, but only under `pnpm test:live:writes`. */
export const describeLiveWrites = enabled && token && writesAllowed ? describe : describe.skip;

export function liveClient(): HardcoverClient {
  return new HardcoverClient({
    token: token!,
    environment,
    endpoint: process.env.HARDCOVER_API_URL,
    userAgent: "hardcover-sdk-live-tests",
  });
}

export const target = process.env.HARDCOVER_API_URL ?? environment;

export interface WriteTarget {
  bookId: number;
  title: string | null;
  /** A print or ebook edition with a page count, so percent progress is testable. */
  editionId: number;
  pages: number;
}

async function printEdition(client: HardcoverClient, bookId: number) {
  const { editions } = await client.request(operations.GetEditionsForBook, { bookId, limit: 25 });
  return editions.find((e) => e.pages && e.pages > 0 && e.readingFormatId !== ReadingFormat.Audiobook) ?? null;
}

async function popularBookIds(client: HardcoverClient): Promise<number[]> {
  try {
    // Dogfoods search: a random page of the most popular books in the index.
    const page = 1 + Math.floor(Math.random() * 8);
    const { search } = await client.request(operations.Search, { query: "*", queryType: "book", perPage: 25, page });
    if (search?.ids?.length) return search.ids.filter((id): id is number => id !== null);
  } catch (error) {
    if (!(error instanceof ActionError)) throw error;
  }
  // No search index (e.g. a fresh restore): fall back to the catalog.
  const { books } = await client.graphql<{ books: { id: number }[] }>(
    "query Popular { books(limit: 200, order_by: { users_count: desc }) { id } }",
  );
  return books.map((b) => b.id);
}

/**
 * The book a write test works on: random from the popular books in the search
 * index, so runs cover varied books. The choice is logged; set
 * HARDCOVER_TEST_BOOK_ID to repeat a run with the same book.
 *   Local: any popular book; an existing entry is removed first (local data is disposable).
 *   Remote: only books not already on the shelf, so real data is never touched.
 */
export async function writeTargetBook(client: HardcoverClient): Promise<WriteTarget> {
  const pinned = process.env.HARDCOVER_TEST_BOOK_ID ? Number(process.env.HARDCOVER_TEST_BOOK_ID) : undefined;
  const candidates = pinned ? [pinned] : (await popularBookIds(client)).sort(() => Math.random() - 0.5);

  for (const bookId of candidates.slice(0, 15)) {
    const existing = await client.library.forBook(bookId);
    if (existing && !isLocalTarget) continue;
    const edition = await printEdition(client, bookId);
    if (!edition) continue;
    if (existing) await client.library.remove(existing.id);

    const { books } = await client.request(operations.GetBooks, { ids: [bookId] });
    const title = books[0]?.title ?? null;
    console.info(`[live] write target: book ${bookId} "${title}" edition ${edition.id} (${edition.pages} pages). Repeat with HARDCOVER_TEST_BOOK_ID=${bookId}`);
    return { bookId, title, editionId: edition.id, pages: edition.pages! };
  }
  throw new Error(pinned ? `Book ${pinned} is unusable as a write target (on the remote shelf, or no print edition with pages)` : "No usable write target among popular books");
}

/**
 * Snapshot a book's journal before a write test. The server journals status,
 * progress and rating changes itself, so every write test must delete the
 * entries it caused; remote data has to end up exactly as it started.
 */
export async function trackJournal(client: HardcoverClient, bookId: number) {
  const userId = await client.me.id();
  const entries = async () =>
    (await client.request(operations.GetJournalForBook, { userId, bookId, limit: 100 })).reading_journals;
  const before = new Set((await entries()).map((j) => j.id));
  return {
    /** Entries created since the snapshot. */
    added: async () => (await entries()).filter((j) => !before.has(j.id)),
    /** Deletes every entry created since the snapshot. */
    cleanup: async () => {
      for (const entry of await entries()) {
        if (!before.has(entry.id)) await client.request(operations.DeleteJournalEntry, { id: entry.id });
      }
    },
  };
}
