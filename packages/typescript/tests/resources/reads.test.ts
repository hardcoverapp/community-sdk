// Reads: what each method sends and returns is in the shared cases
// (shared/conformance/resources/reads.json). These are the TypeScript details:
// a Date for occurredAt, which error class bad input raises, and the message.
import { describe, expect, it } from "vitest";
import { ok, setup } from "../helpers.ts";

const PRINT = { id: 5, pages: 476, audioSeconds: null, readingFormatId: 1 };

const read = (id: number, over: Record<string, unknown> = {}) => ({
  id, startedAt: "2026-09-01", finishedAt: null, edition: PRINT, ...over,
});

const entry = (userBookReads: unknown[]) => ok({ user_books_by_pk: { id: 7, userBookReads } });
const updated = ok({ update_user_book_read: { id: 2, error: null, userBookRead: read(2) } });

describe("reads.setProgress (TypeScript)", () => {
  it("takes occurredAt as a Date and sends it as an ISO timestamp", async () => {
    const { client, sent } = setup(entry([read(2)]), updated);

    await client.reads.setProgress(7, { pages: 50, occurredAt: new Date("2026-09-24T21:00:00Z") });

    expect(sent()[1]!.variables).toEqual({ id: 2, read: { progress_pages: 50, action_at: "2026-09-24T21:00:00.000Z" } });
  });

  it("raises TypeError for the wrong number of units and RangeError for bad values", async () => {
    const { client, sent } = setup();

    await expect(client.reads.setProgress(7, {} as never)).rejects.toThrow(TypeError);
    await expect(client.reads.setProgress(7, { pages: 1, percent: 1 } as never)).rejects.toThrow(TypeError);
    await expect(client.reads.setProgress(7, { percent: 120 })).rejects.toThrow(RangeError);

    expect(sent()).toHaveLength(0);
  });

  it("says what to do when nothing is being read", async () => {
    const { client } = setup(entry([read(1, { finishedAt: "2026-09-10" })]));

    await expect(client.reads.setProgress(7, { pages: 10 })).rejects.toThrow(/no read in progress/i);
  });
});
