// Notifications: the in-app bell. Marking read uses the bulk form scoped to the
// user's own unread deliveries (the per-row form is blocked for tokens).
import { describe, expect, it } from "vitest";
import { me, ok, setup } from "../helpers.ts";

describe("notifications", () => {
  it("list pages the signed-in user's notifications", async () => {
    const delivery = { id: 501, read: false, notification: { id: 9, title: "Sam liked your review" } };
    const { client, sent } = setup(me(), ok({ notification_deliveries: [delivery] }));

    expect((await client.notifications.list({ limit: 10 })).items).toEqual([delivery]);
    expect(sent()[1]!.variables).toEqual({ userId: 42, limit: 10, offset: 0 });
  });

  it("unreadCount is the aggregate, 0 when empty", async () => {
    const { client } = setup(me(), ok({ notification_deliveries_aggregate: { aggregate: { count: 3 } } }));

    expect(await client.notifications.unreadCount()).toBe(3);
  });

  it("markRead with ids marks just those; without ids, every unread one", async () => {
    const { client, sent } = setup(
      me(),
      ok({ update_notification_deliveries: { affectedRows: 2 } }),
      ok({ update_notification_deliveries: { affectedRows: 5 } }),
    );

    expect(await client.notifications.markRead([501, 502])).toBe(2);
    expect(await client.notifications.markRead()).toBe(5);

    expect(sent()[1]).toMatchObject({ operationName: "MarkNotificationsRead", variables: { userId: 42, ids: [501, 502] } });
    expect(sent()[2]!.operationName).toBe("MarkAllNotificationsRead");
    expect(typeof sent()[2]!.variables.readAt).toBe("string");
  });

  it("markRead with an empty list sends nothing", async () => {
    const { client, sent } = setup(me());

    expect(await client.notifications.markRead([])).toBe(0);
    expect(sent()).toHaveLength(1);
  });
});
