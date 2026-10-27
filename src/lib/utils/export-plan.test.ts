import { describe, expect, it, vi } from "vitest";
import { downloadPlan, planToBudgetCsv, planToCalendar, planToGuestCsv, planToMarkdown, planToRunSheetCsv, planToTimelineCsv } from "./export-plan";
import { makeGuest } from "../domain/guests";
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

  it("exports a calendar with functions, the muhurat, and open milestones", () => {
    const plan = buildPlan(getSampleBrief("wedding", new Date("2026-10-24")));
    const calendar = planToCalendar({
      ...plan,
      muhurat: { date: "2026-11-21", start: "06:48", end: "23:59", label: "Vivah", source: "Test source" },
    });
    expect(calendar).toContain("BEGIN:VCALENDAR");
    expect(calendar).toContain("SUMMARY:Mehndi");
    expect(calendar).toContain("SUMMARY:Muhurat · Vivah");
    expect(calendar).toContain("DTSTART:20261121T064800");
    expect(calendar).toContain("BEGIN:VALARM");
    expect(calendar).toContain("TRIGGER:-P7D");
    expect(calendar).toContain("END:VCALENDAR");
  });

  it("exports the budget and timeline as spreadsheet-ready CSV", () => {
    const plan = buildPlan(getSampleBrief("community", new Date("2026-10-24")));
    const budget = planToBudgetCsv(plan);
    expect(budget.split("\r\n")[0]).toBe("Category,Suggested,Planned,Actual");
    expect(budget).toContain("Food & water");
    const timeline = planToTimelineCsv(plan);
    expect(timeline.split("\r\n")[0]).toBe("Task,Phase,Due date,Status,Priority,Function");
    expect(timeline).toContain("Define purpose, audience, and success");
  });

  it("exports the guest list and run sheet", () => {
    const plan = buildPlan(getSampleBrief("wedding", new Date("2026-10-24")));
    const guest = makeGuest("Asha, Rao", plan.functions.map((item) => item.id));
    guest.invites[0] = { ...guest.invites[0]!, status: "yes", seats: 2 };
    const withGuest = { ...plan, guests: [guest] };
    const guests = planToGuestCsv(withGuest);
    expect(guests.split("\r\n")[0]).toContain("Name,Side");
    expect(guests).toContain('"Asha, Rao"');
    expect(guests).toContain("Attending (2)");
    const runSheet = planToRunSheetCsv(plan);
    expect(runSheet.split("\r\n")[0]).toBe("Function,Start,End,Item,Owner,Location,Contact,Notes");
    expect(runSheet).toContain("Vendor setup and final walkthrough");
  });

  it("opens the print-ready view for PDF export", () => {
    let href = "";
    let target = "";
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) {
      href = this.href;
      target = this.target;
    });
    downloadPlan();
    expect(href).toContain("/plan/print?auto=1");
    expect(target).toBe("_blank");
    click.mockRestore();
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
