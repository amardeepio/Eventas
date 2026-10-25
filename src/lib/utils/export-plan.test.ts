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
    expect(markdown).toContain("No saved ideas yet.");
  });

  it("includes wedding functions, muhurat, vendor notes, and saved ideas", () => {
    const plan = buildPlan(getSampleBrief("wedding", new Date("2026-10-24")));
    const enriched = {
      ...plan,
      muhurat: { date: "2026-11-21", start: "06:48", end: "23:59", label: "Vivah", source: "Test source" },
      ideas: plan.ideas.map((idea, index) => index === 0 ? { ...idea, saved: true } : idea),
      vendors: plan.vendors.map((vendor, index) => index === 0 ? { ...vendor, quote: 500_000, notes: "Call the venue manager." } : vendor),
    };
    const markdown = planToMarkdown(enriched);
    expect(markdown).toContain("## Functions");
    expect(markdown).toContain("## Muhurat");
    expect(markdown).toContain("Test source");
    expect(markdown).toContain("Call the venue manager.");
    expect(markdown).toContain("quoted");
    expect(markdown).not.toContain("No saved ideas yet.");
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
