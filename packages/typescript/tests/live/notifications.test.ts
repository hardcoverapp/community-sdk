// Notifications against a real API: read the bell, and mark one already-read
// notification read again (a no-op), so a run never changes what you've seen.
import { expect, it } from "vitest";
import { describeLive, liveClient, target } from "./setup.ts";

describeLive(`notifications (${target})`, () => {
  const client = liveClient();

  it("list, unreadCount, and a no-op markRead", async () => {
    const { items } = await client.notifications.list({ limit: 25 });
    const unread = await client.notifications.unreadCount();

    expect(unread).toBeGreaterThanOrEqual(items.filter((n) => !n.read).length);

    const alreadyRead = items.find((n) => n.read);
    if (alreadyRead) expect(await client.notifications.markRead([alreadyRead.id])).toBe(0);
  });
});
