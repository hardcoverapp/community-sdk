import type { HardcoverClient } from "../core/client.ts";
import { NotFoundError } from "../core/errors.ts";
import type { WithJsonColumns } from "../core/json-columns.ts";
import { GoalMetric, type PrivacySetting } from "../generated/enums.ts";
import type { GoalConditionInput, GoalFragment, GoalInput } from "../generated/graphql.ts";
import { operations } from "../operations.ts";
import { required } from "./shared.ts";

export type Goal = WithJsonColumns<GoalFragment>;

export interface GoalFields {
  metric: GoalMetric;

  /** The target, in the metric's unit (hours for hour goals). */
  goal: number;

  description: string;

  /** YYYY-MM-DD */
  startDate: string;

  /** YYYY-MM-DD */
  endDate: string;

  privacy?: PrivacySetting | null;

  /** Optional filters, e.g. { readingFormatId: ReadingFormat.Audiobook }. */
  conditions?: GoalConditionInput;

  archived?: boolean;
}

/** Where a goal stands, in the goal's own unit. */
export interface GoalProgress {
  current: number;
  target: number;

  /** 0 when the target is 0. Can pass 100 once the goal is beaten. */
  percent: number;
}

function toWire(fields: GoalFields): GoalInput {
  return {
    metric: fields.metric,
    goal: fields.goal,
    description: fields.description,
    start_date: fields.startDate,
    end_date: fields.endDate,
    conditions: fields.conditions ?? {},
    ...(fields.privacy !== undefined && { privacy_setting_id: fields.privacy }),
    ...(fields.archived !== undefined && { archived: fields.archived }),
  };
}

function fromGoal(goal: Goal): GoalFields {
  return {
    metric: goal.metric as GoalMetric,
    goal: goal.goal,
    description: goal.description ?? "",
    startDate: goal.startDate,
    endDate: goal.endDate,
    conditions: (goal.conditions ?? {}) as GoalConditionInput,
    privacy: goal.privacySettingId as PrivacySetting | null,
    archived: goal.archived,
  };
}

/**
 * Progress and target in the goal's own unit. Hour goals store their target
 * in hours but the API reports progress in seconds; this lines them up.
 */
export function goalProgress(goal: Pick<Goal, "metric" | "goal" | "progress">): GoalProgress {
  const current = goal.metric === GoalMetric.Hour ? goal.progress / 3600 : goal.progress;
  const percent = goal.goal > 0 ? (current / goal.goal) * 100 : 0;

  return { current, target: goal.goal, percent };
}

/** Reading goals. The server calculates progress; apps never set it. */
export class GoalsResource {
  private readonly client: HardcoverClient;

  constructor(client: HardcoverClient) {
    this.client = client;
  }

  /** The signed-in user's goals, newest end date first. Scopes: `read:me:content`, `read:goals`. */
  async list({ includeArchived = false }: { includeArchived?: boolean } = {}): Promise<Goal[]> {
    const userId = await this.client.me.id();
    const { goals } = await this.client.request(operations.GetGoals, { userId, includeArchived });

    return goals;
  }

  /**
   * Scopes: `read:goals`.
   */
  async get(id: number): Promise<Goal | null> {
    const { goals_by_pk } = await this.client.request(operations.GetGoal, { id });

    return goals_by_pk ?? null;
  }

  /**
   * Progress is calculated on creation.
   * The API currently ignores privacy on create and uses the account default
   * (spec/06); when you ask for a different privacy, the SDK applies it with
   * one follow-up update.
   * Scopes: `write:goals`.
   */
  async create(fields: GoalFields): Promise<Goal> {
    const { insert_goal } = await this.client.request(operations.CreateGoal, { object: toWire(fields) });
    const created = required(insert_goal?.goal, "insert_goal", "goal");

    const privacyApplied = fields.privacy === undefined || created.privacySettingId === fields.privacy;
    if (privacyApplied) return created;

    return this.#put(created.id, { ...fromGoal(created), privacy: fields.privacy });
  }

  /**
   * Changes only what you pass. Two requests: the API's update takes the whole
   * goal, so the current goal is read and merged first.
   * Scopes: `read:goals`, `write:goals`.
   */
  async update(id: number, patch: Partial<GoalFields>): Promise<Goal> {
    const current = await this.get(id);
    if (!current) throw new NotFoundError("goal", id);

    return this.#put(id, { ...fromGoal(current), ...patch });
  }

  // update_goal replaces the whole goal.
  async #put(id: number, fields: GoalFields): Promise<Goal> {
    const { update_goal } = await this.client.request(operations.UpdateGoal, { id, object: toWire(fields) });

    return required(update_goal?.goal, "update_goal", "goal");
  }

  /** Scopes: `read:goals`, `write:goals`. */
  archive(id: number): Promise<Goal> {
    return this.update(id, { archived: true });
  }

  /** Scopes: `read:goals`, `write:goals`. */
  unarchive(id: number): Promise<Goal> {
    return this.update(id, { archived: false });
  }

  /** Asks the server to recalculate progress now. Scopes: `write:goals`. */
  async refreshProgress(id: number): Promise<Goal> {
    const { update_goal_progress } = await this.client.request(operations.RefreshGoalProgress, { id });

    return required(update_goal_progress?.goal, "update_goal_progress", "goal");
  }

  /**
   * Scopes: `write:goals`.
   */
  async delete(id: number): Promise<void> {
    await this.client.request(operations.DeleteGoal, { id });
  }
}
