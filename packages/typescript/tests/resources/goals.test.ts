// goals: full read and write. The server calculates progress; the SDK handles
// the chores: update merges with the current goal (the API wants the whole
// thing), and goalProgress() compares progress in the goal's own units.
import { describe, expect, it } from "vitest";
import { ActionError, GoalMetric, goalProgress, NotFoundError, PrivacySetting } from "../../src/index.ts";
import { me, ok, setup } from "../helpers.ts";

const ME = me();
const goal = (over: Record<string, unknown> = {}) => ({
  id: 9, metric: "book", goal: 50, progress: 10, description: "50 books in 2026", conditions: { readingFormatId: 1 },
  archived: false, state: "active", startDate: "2026-01-01", endDate: "2026-12-31", completedAt: null, privacySettingId: 1, ...over,
});
const envelope = (field: string, g: unknown) => ok({ [field]: { id: 9, errors: [], goal: g } });


describe("goals", () => {
  it("create maps idiomatic input and defaults conditions", async () => {
    const { client, sent } = setup(envelope("insert_goal", goal()));
    await client.goals.create({
      metric: GoalMetric.Book, goal: 50, description: "50 books in 2026",
      startDate: "2026-01-01", endDate: "2026-12-31", privacy: PrivacySetting.Public,
    });
    expect(sent()[0]).toMatchObject({
      operationName: "CreateGoal",
      variables: { object: { metric: "book", goal: 50, description: "50 books in 2026", start_date: "2026-01-01", end_date: "2026-12-31", privacy_setting_id: 1, conditions: {} } },
    });
  });

  it("create applies the requested privacy even though the API ignores it on create", async () => {
    // app/rails/app/controllers/hasura/goals_controller.rb#new_goal overwrites
    // privacy_setting_id with the account default (spec/06). Update respects it.
    const { client, sent } = setup(
      envelope("insert_goal", goal({ privacySettingId: 1 })),
      envelope("update_goal", goal({ privacySettingId: 3 })),
    );
    const created = await client.goals.create({
      metric: GoalMetric.Book, goal: 50, description: "50 books in 2026",
      startDate: "2026-01-01", endDate: "2026-12-31", privacy: PrivacySetting.Private,
    });
    expect(created.privacySettingId).toBe(3);
    expect(sent().map((r) => r.operationName)).toEqual(["CreateGoal", "UpdateGoal"]);
    expect((sent()[1]!.variables.object as { privacy_setting_id: number }).privacy_setting_id).toBe(3);
  });

  it("create makes one request when the privacy already matches", async () => {
    const { client, sent } = setup(envelope("insert_goal", goal({ privacySettingId: 1 })));
    await client.goals.create({
      metric: GoalMetric.Book, goal: 50, description: "x", startDate: "2026-01-01", endDate: "2026-12-31", privacy: PrivacySetting.Public,
    });
    expect(sent()).toHaveLength(1);
  });

  it("update merges the change into the current goal, because the API wants all of it", async () => {
    const { client, sent } = setup(ok({ goals_by_pk: goal() }), envelope("update_goal", goal({ goal: 60 })));
    const updated = await client.goals.update(9, { goal: 60 });

    expect(updated.goal).toBe(60);
    expect(sent().map((r) => r.operationName)).toEqual(["GetGoal", "UpdateGoal"]);
    expect(sent()[1]!.variables).toEqual({
      id: 9,
      object: {
        metric: "book", goal: 60, description: "50 books in 2026", start_date: "2026-01-01", end_date: "2026-12-31",
        conditions: { readingFormatId: 1 }, privacy_setting_id: 1, archived: false,
      },
    });
  });

  it("archive and unarchive are updates", async () => {
    const { client, sent } = setup(ok({ goals_by_pk: goal() }), envelope("update_goal", goal({ archived: true })));
    await client.goals.archive(9);
    expect((sent()[1]!.variables.object as { archived: boolean }).archived).toBe(true);
  });

  it("update of a missing goal fails clearly without writing", async () => {
    const { client, sent } = setup(ok({ goals_by_pk: null }));
    const error = await client.goals.update(9, { goal: 60 }).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(NotFoundError);
    expect(error).toMatchObject({ resource: "goal", id: 9 });
    expect(sent()).toHaveLength(1);
  });

  it("refreshProgress asks the server to recalculate", async () => {
    const { client, sent } = setup(envelope("update_goal_progress", goal({ progress: 12 })));
    expect((await client.goals.refreshProgress(9)).progress).toBe(12);
    expect(sent()[0]).toMatchObject({ operationName: "RefreshGoalProgress", variables: { id: 9 } });
  });

  it("delete, surfacing API errors", async () => {
    const { client } = setup(ok({ delete_goal: { id: 9, errors: [] } }), ok({ delete_goal: { id: null, errors: ["Not yours"] } }));
    await expect(client.goals.delete(9)).resolves.toBeUndefined();
    await expect(client.goals.delete(9)).rejects.toThrow(ActionError);
  });

  it("list and get", async () => {
    const { client, sent } = setup(ME, ok({ goals: [goal()] }), ok({ goals_by_pk: null }));
    expect(await client.goals.list({ includeArchived: true })).toHaveLength(1);
    expect(await client.goals.get(1)).toBeNull();
    expect(sent()[1]).toMatchObject({ operationName: "GetGoals", variables: { userId: 42, includeArchived: true } });
  });
});

describe("goalProgress", () => {
  it("compares progress in the goal's units", () => {
    expect(goalProgress(goal({ metric: "book", goal: 50, progress: 10 }))).toEqual({ current: 10, target: 50, percent: 20 });
    expect(goalProgress(goal({ metric: "page", goal: 5000, progress: 1250 }))).toEqual({ current: 1250, target: 5000, percent: 25 });
  });

  it("converts hour goals' seconds of progress into hours", () => {
    // Real local data: a 14-hour goal with 73,837 seconds of progress.
    const p = goalProgress(goal({ metric: "hour", goal: 14, progress: 73_837 }));
    expect(p.current).toBeCloseTo(20.51, 2);
    expect(p.target).toBe(14);
    expect(p.percent).toBeCloseTo(146.5, 1);
  });

  it("handles a zero target", () => {
    expect(goalProgress(goal({ goal: 0, progress: 3 })).percent).toBe(0);
  });
});
