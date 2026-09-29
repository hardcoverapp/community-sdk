// A real user's reading challenge: set it, raise the target, refresh, archive,
// delete. Runs only under `pnpm test:live:writes`; always deletes the goal.
import { expect, it } from "vitest";
import { GoalMetric, goalProgress, PrivacySetting } from "../../src/index.ts";
import { describeLiveWrites, liveClient, target } from "./setup.ts";

describeLiveWrites(`goals (${target})`, () => {
  const client = liveClient();

  it("create → update target → refresh → archive → delete", async () => {
    const created = await client.goals.create({
      metric: GoalMetric.Page,
      goal: 5000,
      description: `sdk-test ${Date.now()}`,
      startDate: "2026-01-01",
      endDate: "2026-12-31",
      privacy: PrivacySetting.Private,
    });
    try {
      expect(created).toMatchObject({ metric: "page", goal: 5000, privacySettingId: PrivacySetting.Private, archived: false });
      expect(created.progress).toBeGreaterThanOrEqual(0); // calculated by the server

      // Only the target changes; the SDK merged the rest.
      const raised = await client.goals.update(created.id, { goal: 6000 });
      expect(raised).toMatchObject({ goal: 6000, description: created.description, startDate: "2026-01-01", privacySettingId: PrivacySetting.Private });

      const refreshed = await client.goals.refreshProgress(created.id);
      expect(goalProgress(refreshed).target).toBe(6000);

      expect((await client.goals.archive(created.id)).archived).toBe(true);
      expect((await client.goals.list()).map((g) => g.id)).not.toContain(created.id);
      expect((await client.goals.list({ includeArchived: true })).map((g) => g.id)).toContain(created.id);
    } finally {
      await client.goals.delete(created.id);
    }
    expect(await client.goals.get(created.id)).toBeNull();
  });
});
