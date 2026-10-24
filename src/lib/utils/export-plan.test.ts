import { describe, expect, it } from "vitest";
import { planToMarkdown } from "./export-plan";
import { buildPlan } from "../domain/engine/plan";
import { getSampleBrief } from "../domain/packs";
import { formatDate, formatMoney, daysUntil, clamp } from "./format";

describe("plan export", () => {
  it("includes the brief, budget, timeline, vendors, and a safety note", () => {
    const plan = buildPlan(getSampleBrief("community", new Date("2026-10-24")));
    const markdown = planToMarkdown(plan);
    expect(markdown).toContain("# Indiranagar Spring Festival");
    expect(markdown).toContain("## Budget");
    expect(markdown).toContain("## Timeline");
    expect(markdown).toContain("## Vendor checklist");
    expect(markdown).toContain("not quotes");
  });
});

describe("formatting", () => {
  it("formats money, dates, and countdowns deterministically", () => {
    expect(formatMoney(1234)).toBe("₹1,234");
    expect(formatDate("2027-01-02")).toContain("2027");
    expect(daysUntil("2026-10-30", new Date("2026-10-24T18:00:00Z"))).toBe(6);
    expect(clamp(12, 0, 10)).toBe(10);
  });
});
