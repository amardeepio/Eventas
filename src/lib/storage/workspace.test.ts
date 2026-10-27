import { afterEach, describe, expect, it } from "vitest";
import { buildPlan } from "../domain/engine/plan";
import { getSampleBrief } from "../domain/packs";
import { resetStorageForTests } from "./db";
import {
  addRevision,
  emptyWorkspace,
  loadRevisions,
  loadWorkspace,
  parseWorkspace,
  saveRevisions,
  saveWorkspace,
  upsertPlan,
} from "./workspace";

const plan = buildPlan(getSampleBrief("birthday"));

describe("workspace storage", () => {
  afterEach(async () => { await resetStorageForTests(); });

  it("saves and loads a workspace through IndexedDB", async () => {
    const workspace = { version: 1 as const, activePlanId: plan.id, plans: [plan] };
    await saveWorkspace(workspace);
    expect(await loadWorkspace()).toEqual(workspace);
  });

  it("migrates the old single-plan localStorage key", async () => {
    localStorage.setItem("eventas.plan.v2", JSON.stringify({ ...plan, version: 2 }));
    const loaded = await loadWorkspace();
    expect(loaded.plans).toHaveLength(1);
    expect(loaded.activePlanId).toBe(plan.id);
    expect(localStorage.getItem("eventas.plan.v2")).toBeNull();
  });

  it("falls back to an empty workspace and rejects bad data", async () => {
    expect(await loadWorkspace()).toEqual(emptyWorkspace());
    expect(parseWorkspace({ version: 1, activePlanId: null, plans: [] })).toEqual(emptyWorkspace());
    expect(parseWorkspace({ version: 2 })).toBeNull();
    expect(parseWorkspace(null)).toBeNull();
    const recovered = parseWorkspace({ version: 1, activePlanId: plan.id, plans: [plan, { bad: true }] });
    expect(recovered?.plans).toHaveLength(1);
    expect(recovered?.activePlanId).toBe(plan.id);
  });

  it("adds revisions up to ten and prunes the oldest", async () => {
    let revisions: Record<string, typeof plan[]> = {};
    for (let index = 0; index < 12; index += 1) revisions = addRevision(revisions, { ...plan, createdAt: `${index}` });
    expect(revisions[plan.id]).toHaveLength(10);
    await saveRevisions(revisions);
    expect((await loadRevisions())[plan.id]).toHaveLength(10);
    expect(await loadRevisions()).toEqual(revisions);
  });

  it("upserts plans without losing the active plan", () => {
    const first = upsertPlan(emptyWorkspace(), plan);
    expect(first.activePlanId).toBe(plan.id);
    const updated = { ...plan, brief: { ...plan.brief, title: "Updated" } };
    const second = upsertPlan(first, updated);
    expect(second.plans).toHaveLength(1);
    expect(second.plans[0]?.brief.title).toBe("Updated");
    expect(second.activePlanId).toBe(plan.id);
  });
});
