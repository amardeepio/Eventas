import { describe, expect, it } from "vitest";
import { buildPlan } from "./plan";
import { rebuildPlan } from "./rebuild";
import { getSampleBrief } from "../packs";
import { makeGuest } from "../guests";
import type { Plan } from "../types";

function fixture(): Plan {
  const plan = buildPlan(getSampleBrief("wedding"));
  const task = plan.timeline[0]!;
  return {
    ...plan,
    timeline: plan.timeline.map((item) => item.id === task.id ? { ...item, title: "Edited milestone", edited: true } : item),
    vendors: [
      ...plan.vendors.map((vendor, index) => index === 0 ? { ...vendor, status: "booked" as const, quote: 200_000, notes: "Signed", edited: true } : vendor),
      { id: "custom-vendor", category: "Horse handler", budgetCategoryId: "transport", status: "idea" as const, quote: 0, notes: "", questions: [], redFlags: [], source: "custom" as const, edited: true },
    ],
    budget: [
      ...plan.budget.map((category) => category.id === "catering" ? { ...category, planned: 1_234, actual: 500, plannedEdited: true } : category),
      { id: "custom-line", name: "NRI paperwork", recommended: 10_000, planned: 10_000, actual: 2_000, color: "#123456", description: "Custom", perGuest: false, scaling: "fixed", source: "custom", plannedEdited: true },
    ],
    guests: [{ ...makeGuest("Asha", plan.functions.map((item) => item.id)), dietary: ["Jain"] }],
    runSheet: [...plan.runSheet, { id: "custom-run", functionId: plan.functions[0]!.id, startTime: "10:00", endTime: "10:30", title: "Family photo", owner: "You", location: "", contact: "", notes: "", source: "custom" }],
    dismissedTaskIds: [plan.timeline[1]!.id],
    dismissedVendorIds: [plan.vendors[1]!.id],
    rsvpShare: { hostKey: "host-key", publishedAt: "2026-10-01T00:00:00.000Z", expiresAt: "2027-12-01" },
  };
}

describe("rebuildPlan", () => {
  it("keeps edited, custom, and financial records while refreshing generated ones", () => {
    const plan = fixture();
    const next = rebuildPlan(plan, { ...plan.brief, guests: 120, location: "Jaipur" });
    expect(next.brief.guests).toBe(120);
    expect(next.brief.location).toBe("Jaipur");
    expect(next.timeline.find((task) => task.title === "Edited milestone")).toBeDefined();
    expect(next.timeline.some((task) => task.id === plan.timeline[1]!.id)).toBe(false);
    expect(next.vendors.find((vendor) => vendor.id === "venue")?.status).toBe("booked");
    expect(next.vendors.find((vendor) => vendor.id === "custom-vendor")?.category).toBe("Horse handler");
    expect(next.vendors.some((vendor) => vendor.id === plan.vendors[1]!.id)).toBe(false);
    expect(next.budget.find((category) => category.id === "catering")?.planned).toBe(1_234);
    expect(next.budget.find((category) => category.id === "catering")?.actual).toBe(500);
    expect(next.budget.find((category) => category.id === "custom-line")?.actual).toBe(2_000);
    expect(next.guests[0]?.name).toBe("Asha");
    expect(next.runSheet.some((row) => row.id === "custom-run")).toBe(true);
    expect(next.rsvpShare).toBe(plan.rsvpShare);
  });

  it("handles a function removal and adds pending invites for a new function", () => {
    const plan = fixture();
    const removed = plan.functions[0]!;
    const shortened = rebuildPlan(plan, { ...plan.brief, functions: plan.brief.functions.filter((item) => item.id !== removed.id) });
    expect(shortened.functions.some((item) => item.id === removed.id)).toBe(false);
    expect(shortened.guests[0]?.invites.some((invite) => invite.functionId === removed.id)).toBe(false);
    expect(shortened.runSheet.some((row) => row.functionId === removed.id)).toBe(false);

    const added = rebuildPlan(shortened, {
      ...shortened.brief,
      functions: [...shortened.brief.functions, { ...shortened.brief.functions[0]!, id: "new-function", name: "Brunch", kind: "custom" }],
    });
    expect(added.functions.some((item) => item.id === "new-function")).toBe(true);
    expect(added.guests[0]?.invites.some((invite) => invite.functionId === "new-function")).toBe(true);
    expect(added.runSheet.some((row) => row.functionId === "new-function")).toBe(true);
  });
});
