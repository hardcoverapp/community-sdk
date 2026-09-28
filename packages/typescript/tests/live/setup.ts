import { describe } from "vitest";
import { HardcoverClient, operations, type Environment } from "../../src/index.ts";

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

/** Project Hail Mary. Local write tests use it freely; see writeTargetBook. */
export const LOCAL_TEST_BOOK_SLUG = "project-hail-mary";

/**
 * The book a write test works on.
 * Local: Project Hail Mary, with any existing entry removed first (local data is disposable).
 * Remote: the most popular book not already on the shelf, so real data is never touched.
 */
export async function writeTargetBook(client: HardcoverClient): Promise<number> {
  const userId = await client.me.id();
  if (isLocalTarget) {
    const { books } = await client.request(operations.GetBookBySlug, { slug: LOCAL_TEST_BOOK_SLUG });
    const bookId = books[0]!.id;
    const existing = await client.library.forBook(bookId);
    if (existing) await client.library.remove(existing.id);
    return bookId;
  }
  const { books } = await client.graphql<{ books: { id: number }[] }>(
    `query Unshelved($userId: Int!) {
      books(limit: 1, order_by: { users_count: desc },
            where: { _not: { user_books: { user_id: { _eq: $userId } } } }) { id }
    }`,
    { userId },
  );
  return books[0]!.id;
}
