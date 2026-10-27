import { describe, expect, it } from "vitest";
import { buildPlan } from "./engine/plan";
import { getSampleBrief } from "./packs";
import { generateRunSheet, runSheetFor } from "./run-sheet";

const plan = buildPlan(getSampleBrief("wedding"));

describe("run sheet", () => {
  it("generates four editable rows per function", () => {
    const rows = generateRunSheet(plan.functions, plan.brief.location);
    expect(rows).toHaveLength(plan.functions.length * 4);
    expect(rows.every((row) => row.source === "generated")).toBe(true);
    expect(rows[0]?.id).toBe(`${plan.functions[0]!.id}-setup`);
    expect(rows[0]?.startTime).toBe("09:00");
  });

  it("clamps and wraps clock arithmetic", () => {
    const rows = generateRunSheet([{ ...plan.functions[0]!, startTime: "00:30", endTime: "01:00" }], "Goa");
    expect(rows[0]?.startTime).toBe("22:30");
    expect(rows[0]?.endTime).toBe("00:15");
    expect(rows[2]?.title).toBe(plan.functions[0]!.name);
  });

  it("filters rows for one function in time order", () => {
    const functionId = plan.functions[1]!.id;
    const rows = runSheetFor(plan, functionId);
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((row) => row.functionId === functionId)).toBe(true);
    expect([...rows].sort((a, b) => a.startTime.localeCompare(b.startTime))).toEqual(rows);
  });
});
