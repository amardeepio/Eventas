import { describe, expect, it } from "vitest";
import { packList, getSampleBrief } from "../packs";
import { allocateBudget, getBudgetTotals } from "./budget";
import { generateTimeline } from "./timeline";
import { buildVendorChecklist } from "./vendors";
import { buildIdeas, buildPlan, getNextTasks } from "./plan";
import { parseISODate } from "@/lib/utils/format";

const now = new Date("2026-10-24T12:00:00Z");

describe.each(packList)("$label pack", (pack) => {
  const brief = getSampleBrief(pack.id, now);

  it("has weights that total 100 and unique categories", () => {
    expect(pack.budget.reduce((sum, item) => sum + item.weight, 0)).toBe(100);
    expect(new Set(pack.budget.map((item) => item.id)).size).toBe(pack.budget.length);
  });

  it("references real budget categories from vendors", () => {
    const ids = new Set(pack.budget.map((item) => item.id));
    for (const vendor of pack.vendors) expect(ids.has(vendor.budgetCategoryId)).toBe(true);
  });

  it("orders timeline phases from earliest to latest", () => {
    const weeks = pack.timeline.map((phase) => phase.weeksBefore);
    expect(weeks).toEqual([...weeks].sort((a, b) => b - a));
  });

  it("allocates exactly the full budget", () => {
    const budget = allocateBudget(pack, brief);
    const totals = getBudgetTotals(budget);
    expect(totals.planned).toBe(brief.budget);
    expect(budget.every((item) => item.planned >= 0)).toBe(true);
    expect(budget.every((item) => Number.isInteger(item.planned))).toBe(true);
  });

  it("keeps contingency at or above five percent", () => {
    const contingency = allocateBudget(pack, brief).find((item) => item.id === "contingency");
    expect(contingency?.planned ?? 0).toBeGreaterThanOrEqual(brief.budget * 0.05 - 1);
  });

  it("generates ordered, dated tasks", () => {
    const timeline = generateTimeline(pack, brief, now);
    const dates = timeline.map((task) => task.dueDate);
    expect(dates).toEqual([...dates].sort());
    expect(timeline.every((task) => /^\d{4}-\d{2}-\d{2}$/.test(task.dueDate))).toBe(true);
    expect(timeline.length).toBeGreaterThan(5);
  });

  it("builds six ideas and a complete vendor checklist", () => {
    expect(buildIdeas(brief)).toHaveLength(6);
    const vendors = buildVendorChecklist(pack);
    expect(vendors.length).toBe(pack.vendors.length);
    expect(vendors.every((vendor) => vendor.questions.length >= 3)).toBe(true);
  });
});

describe("budget decisions", () => {
  const wedding = packList[0];
  if (!wedding) throw new Error("wedding pack missing");
  const brief = getSampleBrief("wedding", now);

  it("moves money toward selected priorities", () => {
    const base = allocateBudget(wedding, { ...brief, priorities: ["photo"], costLevel: "average" });
    const focused = allocateBudget(wedding, { ...brief, priorities: ["rings"], costLevel: "average" });
    expect(focused.find((item) => item.id === "rings")?.planned ?? 0)
      .toBeGreaterThan(base.find((item) => item.id === "rings")?.planned ?? 0);
  });

  it("scales per-guest categories with larger guest counts", () => {
    const small = allocateBudget(wedding, { ...brief, guests: 30, priorities: ["photo"] });
    const large = allocateBudget(wedding, { ...brief, guests: 300, priorities: ["photo"] });
    expect((large.find((item) => item.id === "catering")?.planned ?? 0)).toBeGreaterThan(small.find((item) => item.id === "catering")?.planned ?? 0);
  });

  it("never exceeds a very small budget", () => {
    const budget = allocateBudget(wedding, { ...brief, budget: 1000 });
    expect(getBudgetTotals(budget).planned).toBe(1000);
  });
});

describe("timeline behavior", () => {
  const pack = packList[1];
  if (!pack) throw new Error("birthday pack missing");
  const brief = getSampleBrief("birthday", now);

  it("clamps past due dates to today and flags them as priority", () => {
    const tasks = generateTimeline(pack, { ...brief, date: "2026-10-30" }, now);
    const overdue = tasks.filter((task) => task.dueDate === "2026-10-24");
    expect(overdue.length).toBeGreaterThan(0);
    expect(overdue.every((task) => task.priority === "high")).toBe(true);
  });

  it("handles leap day without timezone drift", () => {
    const tasks = generateTimeline(pack, { ...brief, date: "2028-02-29" }, now);
    expect(tasks.some((task) => task.dueDate === "2028-02-29")).toBe(true);
    expect(parseISODate("2028-02-29").getUTCDate()).toBe(29);
  });

  it("orders the next actions with overdue tasks first", () => {
    const plan = buildPlan({ ...brief, date: "2026-11-10" }, now);
    const next = getNextTasks(plan, now);
    expect(next).toHaveLength(3);
    expect(next[0]?.dueDate).toBe("2026-10-24");
  });
});
