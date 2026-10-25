import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { axe } from "jest-axe";
import { Landing } from "@/features/landing/landing";
import { ProgressRing } from "./progress-ring";
import { BudgetDonut } from "@/features/budget/budget-donut";
import { allocateBudget } from "@/lib/domain/engine/budget";
import { getPack, getSampleBrief } from "@/lib/domain/packs";
import { PlanProvider } from "@/lib/storage/plan-store";

describe("core presentation", () => {
  it("renders the landing page without critical axe violations", async () => {
    const { container } = render(<PlanProvider><Landing /></PlanProvider>);
    const results = await axe(container);
    expect(results.violations).toEqual([]);
  });

  it("gives charts a text alternative", () => {
    const { getByRole } = render(<ProgressRing value={62} label="62 percent of budget allocated"><span>62%</span></ProgressRing>);
    expect(getByRole("img", { name: "62 percent of budget allocated" })).toBeInTheDocument();
  });

  it("summarizes every budget segment for screen readers", () => {
    const pack = getPack("wedding");
    const categories = allocateBudget(pack, getSampleBrief("wedding", new Date("2026-10-24")));
    const { getByRole } = render(<BudgetDonut categories={categories} total={categories.reduce((sum, item) => sum + item.planned, 0)} />);
    expect(getByRole("img").getAttribute("aria-label")).toContain("Catering & food");
  });
});
