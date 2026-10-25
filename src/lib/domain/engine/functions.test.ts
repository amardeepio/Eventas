import { describe, expect, it } from "vitest";
import { getPack, getSampleBrief } from "../packs";
import { defaultFunctionDrafts, resolveFunctions, toFunctionDraft } from "../functions";
import { generateTimeline } from "./timeline";
import { auditPlan } from "./audit";
import { buildPlan } from "./plan";
import { findMuhuratSuggestion, traditionUsesMuhurat } from "../muhurat";

const now = new Date("2026-10-24T12:00:00Z");
const brief = getSampleBrief("wedding", now);

describe("multi-event functions", () => {
  it("creates tradition-aware default functions", () => {
    expect(brief.tradition).toBe("north-hindu");
    expect(brief.functions.map((item) => item.kind)).toEqual(["mehndi", "sangeet", "ceremony", "reception"]);
  });

  it("splits the total budget exactly across functions", () => {
    const functions = resolveFunctions(brief);
    expect(functions.reduce((sum, item) => sum + item.budget, 0)).toBe(brief.budget);
    expect(functions.every((item) => item.budget >= 0)).toBe(true);
    expect(functions.every((item) => Number.isInteger(item.budget))).toBe(true);
  });

  it("anchors tasks to the date of their function", () => {
    const functions = resolveFunctions(brief);
    const timeline = generateTimeline(getPack("wedding"), brief, now, functions);
    const sangeet = functions.find((item) => item.kind === "sangeet");
    if (!sangeet) throw new Error("sangeet missing");
    const sangeetTask = timeline.find((task) => task.functionId === sangeet.id);
    expect(sangeetTask).toBeDefined();
    expect((sangeetTask?.dueDate ?? "9999-99-99") <= sangeet.date).toBe(true);
  });

  it("uses different typical functions for a South Indian wedding", () => {
    const south = { ...brief, tradition: "south-indian" as const, functions: [] };
    expect(defaultFunctionDrafts(south).map((item) => item.kind)).toEqual(["mehndi", "ceremony", "reception"]);
  });

  it("round-trips plan functions back to brief drafts", () => {
    const drafts = resolveFunctions(brief).map(toFunctionDraft);
    expect(drafts[0]).not.toHaveProperty("id");
    expect(drafts[0]).not.toHaveProperty("budget");
    expect(drafts[0]).not.toHaveProperty("status");
  });

  it("keeps the plan's function budgets in sync after a rebuild", () => {
    const plan = buildPlan(brief, now);
    expect(plan.functions.reduce((sum, item) => sum + item.budget, 0)).toBe(brief.budget);
    expect(plan.brief.functions).toHaveLength(brief.functions.length);
  });
});

describe("muhurat content", () => {
  it("only suggests curated dates", () => {
    expect(findMuhuratSuggestion("2026-11-21")?.date).toBe("2026-11-21");
    expect(findMuhuratSuggestion("2026-11-22")).toBeNull();
  });

  it("applies muhurat defaults only to traditions that use them", () => {
    expect(traditionUsesMuhurat("north-hindu")).toBe(true);
    expect(traditionUsesMuhurat("south-indian")).toBe(true);
    expect(traditionUsesMuhurat("christian")).toBe(false);
    expect(traditionUsesMuhurat("punjabi-sikh")).toBe(false);
  });
});

describe("plan audit", () => {
  it("flags the missing wedding pillars", () => {
    const plan = buildPlan(brief, now);
    const audit = auditPlan(plan, now);
    const titles = audit.gaps.map((item) => item.title).join(" ");
    expect(titles).toMatch(/muhurat/i);
    expect(titles).toMatch(/venue/i);
    expect(titles).toMatch(/caterer/i);
  });

  it("flags unallocated budget and vendor quotes above plan", () => {
    const plan = buildPlan(brief, now);
    const adjusted = {
      ...plan,
      budget: plan.budget.map((item) => item.id === "decor" ? { ...item, planned: item.planned - 50_000 } : item),
      vendors: plan.vendors.map((item) => item.id === "venue" ? { ...item, quote: 9_000_000 } : item),
    };
    const audit = auditPlan(adjusted, now);
    expect(audit.gaps.some((item) => /unallocated/i.test(item.title))).toBe(true);
    expect(audit.warnings.some((item) => /above the plan/i.test(item.title))).toBe(true);
  });

  it("returns a clean result for a complete, paid-up plan", () => {
    const plan = buildPlan({ ...brief, muhurat: findMuhuratSuggestion("2026-11-21") ?? undefined }, now);
    const complete = {
      ...plan,
      vendors: plan.vendors.map((item) => ({ ...item, status: "booked" as const })),
      timeline: plan.timeline.map((item) => ({ ...item, status: "done" as const })),
      brief: { ...plan.brief, constraints: ["Vegetarian-only", "No alcohol"] },
    };
    const audit = auditPlan(complete, now);
    expect(audit.gaps.some((item) => /muhurat/i.test(item.title))).toBe(false);
    expect(audit.warnings.some((item) => /overdue/i.test(item.title))).toBe(false);
  });
});
