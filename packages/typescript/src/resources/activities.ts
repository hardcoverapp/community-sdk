import type { HardcoverClient } from "../core/client.ts";
import { NotFoundError } from "../core/errors.ts";
import type { WithJsonColumns } from "../core/json-columns.ts";
import type { ActivityFragment } from "../generated/graphql.ts";
import { operations } from "../operations.ts";
import { DEFAULT_LIMIT, toPage, type Page, type PageOptions } from "./page.ts";

/**
 * An entry in an activity feed. `event` says what happened (e.g. a status
 * change or a review) and `data` holds the details the site shows; its shape
 * depends on the event, so it isn't typed.
 */
export type Activity = WithJsonColumns<ActivityFragment>;

/** Activity feeds: what readers did, as the site shows it. */
export class ActivitiesResource {
  private readonly client: HardcoverClient;

  constructor(client: HardcoverClient) {
    this.client = client;
  }

  /** A reader's activity, newest first. Scopes: `read:social`. */
  async forUser(userId: number, { limit = DEFAULT_LIMIT, offset = 0 }: PageOptions = {}): Promise<Page<Activity>> {
    const { activities } = await this.client.request(operations.GetActivitiesForUser, { userId, limit, offset });

    return toPage(activities, limit, offset);
  }

  /** Activity about a book, newest first. Scopes: `read:social`. */
  async forBook(bookId: number, { limit = DEFAULT_LIMIT, offset = 0 }: PageOptions = {}): Promise<Page<Activity>> {
    const { activities } = await this.client.request(operations.GetActivitiesForBook, { bookId, limit, offset });

    return toPage(activities, limit, offset);
  }

  /** Activity from the people the signed-in user follows, newest first. Scopes: `read:me:content`, `read:social`. */
  async following({ limit = DEFAULT_LIMIT, offset = 0 }: PageOptions = {}): Promise<Page<Activity>> {
    const userId = await this.client.me.id();
    const { activities } = await this.client.request(operations.GetFollowingActivities, { userId, limit, offset });

    return toPage(activities, limit, offset);
  }

  /** Deletes one of your own activity entries. Scopes: `write:social`. */
  async delete(id: number): Promise<void> {
    const { delete_activities_by_pk } = await this.client.request(operations.DeleteActivity, { id });

    if (!delete_activities_by_pk) throw new NotFoundError("activity", id);
  }
}
