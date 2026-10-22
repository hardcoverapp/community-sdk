import type { HardcoverClient } from "../core/client.ts";
import type { WithJsonColumns } from "../core/json-columns.ts";
import type { GetNotificationsQuery } from "../generated/graphql.ts";
import { operations } from "../operations.ts";
import { capped, DEFAULT_LIMIT, toPage, type Page, type PageOptions } from "./page.ts";

/**
 * One in-app notification for the signed-in user: whether it's been `read`,
 * and the `notification` itself (title, description, a link, and who it's
 * about in `notifierUser`).
 */
export type Notification = WithJsonColumns<GetNotificationsQuery["notification_deliveries"][number]>;

/** The signed-in user's in-app notifications, as the site's bell shows them. */
export class NotificationsResource {
  private readonly client: HardcoverClient;

  constructor(client: HardcoverClient) {
    this.client = client;
  }

  /** Newest first. Scopes: `read:me:content`, `read:notifications`. */
  async list({ limit: requested = DEFAULT_LIMIT, offset = 0 }: PageOptions = {}): Promise<Page<Notification>> {
    const limit = capped("notification_deliveries", requested);
    const userId = await this.client.me.id();
    const { notification_deliveries } = await this.client.request(operations.GetNotifications, { userId, limit, offset });

    return toPage(notification_deliveries, limit, offset);
  }

  /** How many are unread: the number on the bell. Scopes: `read:me:content`, `read:notifications`. */
  async unreadCount(): Promise<number> {
    const userId = await this.client.me.id();
    const { notification_deliveries_aggregate } = await this.client.request(operations.CountUnreadNotifications, { userId });

    return notification_deliveries_aggregate.aggregate?.count ?? 0;
  }

  /**
   * Marks notifications read: these (by the `id` from `list`), or every
   * unread one when no ids are given. Returns how many changed; ones already
   * read don't count. Scopes: `read:me:content`, `write:notifications`.
   */
  async markRead(ids?: number[]): Promise<number> {
    const userId = await this.client.me.id();
    const readAt = new Date().toISOString();

    if (ids === undefined) {
      const { update_notification_deliveries } = await this.client.request(operations.MarkAllNotificationsRead, { userId, readAt });
      return update_notification_deliveries?.affectedRows ?? 0;
    }

    if (ids.length === 0) return 0;

    const { update_notification_deliveries } = await this.client.request(operations.MarkNotificationsRead, { userId, ids, readAt });
    return update_notification_deliveries?.affectedRows ?? 0;
  }
}
