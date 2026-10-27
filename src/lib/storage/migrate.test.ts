import { describe, expect, it } from "vitest";
import { buildPlan } from "../domain/engine/plan";
import { getSampleBrief } from "../domain/packs";
import { migratePlanV1, migratePlanV2, parseStoredPlan } from "./migrate";

const plan = buildPlan(getSampleBrief("wedding"));

function v2() {
  const { guests, runSheet, dismissedTaskIds, dismissedVendorIds, rsvpShare, archivedAt, ...rest } = plan;
  void guests; void runSheet; void dismissedTaskIds; void dismissedVendorIds; void rsvpShare; void archivedAt;
  return {
    ...rest,
    version: 2,
    brief: { ...plan.brief, functions: plan.functions.map(({ id, kind, name, date, startTime, endTime, venue, guestCount, dressCode, hostSide }) => ({ id, kind, name, date, startTime, endTime, venue, guestCount, dressCode, hostSide })) },
    budget: plan.budget.map(({ source, plannedEdited, ...rest }) => { void source; void plannedEdited; return rest; }),
    timeline: plan.timeline.map(({ source, edited, ...rest }) => { void source; void edited; return rest; }),
    vendors: plan.vendors.map(({ source, edited, ...rest }) => { void source; void edited; return rest; }),
  };
}

describe("plan migration", () => {
  it("accepts the current v3 schema directly", () => {
    expect(parseStoredPlan(plan)).toEqual(plan);
  });

  it("upgrades v2 with guests, run sheet, source flags, and stable function ids", () => {
    const result = parseStoredPlan(v2());
    expect(result?.version).toBe(3);
    expect(result?.guests).toEqual([]);
    expect(result?.runSheet).toEqual([]);
    expect(result?.timeline[0]?.source).toBe("generated");
    expect(result?.budget[0]?.source).toBe("generated");
    expect(result?.functions[0]?.id).toBe(`mehndi-1`);
    expect(migratePlanV2(v2())).toBeTruthy();
  });

  it("upgrades v1 through v2 without losing the brief", () => {
    const legacy = migratePlanV1({
      ...v2(),
      version: 1,
      brief: { ...plan.brief, tradition: undefined, functions: undefined, muhurat: undefined },
      functions: undefined,
      muhurat: undefined,
      budget: plan.budget.map(({ scaling, source, plannedEdited, ...rest }) => { void scaling; void source; void plannedEdited; return rest; }),
    });
    expect(legacy).toBeTruthy();
    const result = parseStoredPlan({
      ...v2(),
      version: 1,
      brief: { ...plan.brief, tradition: undefined, functions: undefined, muhurat: undefined },
      functions: undefined,
      muhurat: undefined,
      budget: plan.budget.map(({ scaling, source, plannedEdited, ...rest }) => { void scaling; void source; void plannedEdited; return rest; }),
    });
    expect(result?.version).toBe(3);
    expect(result?.functions.length).toBeGreaterThan(0);
    expect(result?.budget[0]?.scaling).toBeDefined();
  });

  it("rejects invalid versions, event types, and corrupt data", () => {
    expect(parseStoredPlan(null)).toBeNull();
    expect(parseStoredPlan({ version: 9 })).toBeNull();
    expect(parseStoredPlan({ ...v2(), version: 2, brief: { ...plan.brief, eventType: "conference" } })).toBeNull();
    expect(parseStoredPlan({ ...plan, brief: { ...plan.brief, guests: -1 } })).toBeNull();
    expect(migratePlanV2({ version: 2 })).toBeNull();
    expect(migratePlanV1({ version: 1 })).toBeNull();
  });
});
