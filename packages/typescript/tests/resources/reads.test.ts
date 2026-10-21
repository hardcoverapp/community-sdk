// Reads (a user book's reading sessions) and progress. The server starts and
// finishes reads on status changes and writes journal entries itself; the SDK
// only has to target the right read and send the right units.
import { describe, expect, it } from "vitest";
import { HardcoverError, NotFoundError } from "../../src/index.ts";
import { setup } from "../helpers.ts";

const PRINT = { id: 5, pages: 476, audioSeconds: null, readingFormatId: 1 };
const AUDIO = { id: 6, pages: null, audioSeconds: 36_000, readingFormatId: 2 };

const read = (id: number, over: Record<string, unknown> = {}) => ({
  id, userBookId: 7, editionId: 5, startedAt: "2026-09-01", finishedAt: null, finishedAtPrecision: null,
  pausedAt: null, progress: 0, progressPages: null, progressSeconds: null, edition: PRINT, ...over,
});

// Read #1 finished, read #2 (a re-read) open.
const REREAD = [read(2, { startedAt: "2026-09-20" }), read(1, { finishedAt: "2026-09-10", progress: 100 })];

const entry = (userBookReads: unknown[]) => ({
  status: 200,
  body: { data: { user_books_by_pk: { id: 7, bookId: 100, statusId: 2, userBookReads } } },
});
const updated = (over: Record<string, unknown> = {}) => ({
  status: 200,
  body: { data: { update_user_book_read: { id: 2, error: null, userBookRead: read(2, over) } } },
});


describe("reads.list / current", () => {
  it("current is the open read: started, not finished, newest", async () => {
    const { client } = setup(entry(REREAD));
    expect((await client.reads.current(7))?.id).toBe(2);
  });

  it("current is null when every read is finished", async () => {
    const { client } = setup(entry([read(1, { finishedAt: "2026-09-10" })]));
    expect(await client.reads.current(7)).toBeNull();
  });

  it("list of a missing library entry is a NotFoundError", async () => {
    const { client } = setup({ status: 200, body: { data: { user_books_by_pk: null } } });
    await expect(client.reads.list(7)).rejects.toThrow(NotFoundError);
  });

  it("list returns all reads for the entry", async () => {
    const { client } = setup(entry(REREAD));
    expect((await client.reads.list(7)).map((r) => r.id)).toEqual([2, 1]);
  });
});

describe("reads.setProgress", () => {
  it("updates the open read, never a finished one", async () => {
    const { client, sent } = setup(entry(REREAD), updated({ progressPages: 142 }));
    const result = await client.reads.setProgress(7, { pages: 142 });

    expect(result.progressPages).toBe(142);
    expect(sent().map((r) => r.operationName)).toEqual(["GetUserBook", "UpdateUserBookRead"]);
    expect(sent()[1]!.variables).toEqual({ id: 2, read: { progress_pages: 142 } });
  });

  it("converts percent to pages for print and ebook editions", async () => {
    const { client, sent } = setup(entry(REREAD), updated());
    await client.reads.setProgress(7, { percent: 15 });
    // ceil(15 / 100 * 476), the app's own formula
    expect(sent()[1]!.variables).toEqual({ id: 2, read: { progress_pages: 72 } });
  });

  it("converts percent to seconds for audiobooks", async () => {
    const { client, sent } = setup(entry([read(3, { edition: AUDIO })]), updated());
    await client.reads.setProgress(7, { percent: 50 });
    expect(sent()[1]!.variables).toEqual({ id: 3, read: { progress_seconds: 18_000 } });
  });

  it("sends seconds as given", async () => {
    const { client, sent } = setup(entry([read(3, { edition: AUDIO })]), updated());
    await client.reads.setProgress(7, { seconds: 5_400 });
    expect(sent()[1]!.variables).toEqual({ id: 3, read: { progress_seconds: 5_400 } });
  });

  it("occurredAt backdates the change, as a Date or an ISO string", async () => {
    const { client, sent } = setup(entry(REREAD), updated(), entry(REREAD), updated());
    await client.reads.setProgress(7, { pages: 50, occurredAt: new Date("2026-09-24T21:00:00Z") });
    await client.reads.setProgress(7, { pages: 60, occurredAt: "2026-09-25T09:00:00-06:00" });

    expect(sent()[1]!.variables).toEqual({ id: 2, read: { progress_pages: 50, action_at: "2026-09-24T21:00:00.000Z" } });
    expect(sent()[3]!.variables).toEqual({ id: 2, read: { progress_pages: 60, action_at: "2026-09-25T09:00:00-06:00" } });
  });

  it("fails clearly when nothing is being read, without writing", async () => {
    const { client, sent } = setup(entry([read(1, { finishedAt: "2026-09-10" })]));
    await expect(client.reads.setProgress(7, { pages: 10 })).rejects.toThrow(HardcoverError);
    await expect(
      setup(entry([read(1, { finishedAt: "2026-09-10" })])).client.reads.setProgress(7, { pages: 10 }),
    ).rejects.toThrow(/no read in progress/i);
    expect(sent()).toHaveLength(1);
  });

  it("rejects bad input before sending anything", async () => {
    const { client, sent } = setup(entry([read(4, { edition: { ...PRINT, pages: null } })]));
    await expect(client.reads.setProgress(7, { percent: 20 })).rejects.toThrow(RangeError);
    await expect(client.reads.setProgress(7, { percent: 120 })).rejects.toThrow(RangeError);
    await expect(client.reads.setProgress(7, { pages: -1 })).rejects.toThrow(RangeError);
    await expect(client.reads.setProgress(7, {} as never)).rejects.toThrow(TypeError);
    await expect(client.reads.setProgress(7, { pages: 1, percent: 1 } as never)).rejects.toThrow(TypeError);
    expect(sent().map((r) => r.operationName).filter((n) => n !== "GetUserBook")).toEqual([]);
  });
});
