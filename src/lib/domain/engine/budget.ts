import type { Brief, BudgetCategory, DomainPack } from "../types";
import { clamp } from "@/lib/utils/format";

const COST_INDEX = { low: 0.9, average: 1, high: 1.15 } as const;

/**
 * Allocates a budget from domain weights and brief context.
 * Floors are reserved first; the remainder follows adjusted weights. Largest-
 * remainder rounding guarantees that the category amounts equal the budget.
 */
export function allocateBudget(pack: DomainPack, brief: Brief): BudgetCategory[] {
  const guestRatio = clamp(Math.pow(brief.guests / pack.defaultGuests, 0.55), 0.55, 1.8);
  const priorities = new Set(brief.priorities);

  const adjusted = pack.budget.map((category) => {
    let weight = category.weight;
    if (category.perGuest) weight *= guestRatio;
    if (priorities.has(category.id)) weight *= 1.35;
    if (["venue", "catering", "food", "decor", "permits"].includes(category.id)) {
      weight *= COST_INDEX[brief.costLevel];
    }
    if (brief.vibe === "celebration" || brief.vibe === "dance") {
      if (["music", "entertainment", "av"].includes(category.id)) weight *= 1.25;
    }
    if (["garden", "modern", "playful"].includes(brief.vibe) && category.id === "decor") {
      weight *= 1.15;
    }
    return { category, weight: Math.max(weight, category.floor) };
  });

  const weightTotal = adjusted.reduce((sum, item) => sum + item.weight, 0);
  const reserved = adjusted.reduce(
    (sum, { category }) => sum + (brief.budget * category.floor) / 100,
    0,
  );
  const distributable = Math.max(0, brief.budget - reserved);
  const raw = adjusted.map(({ category, weight }) => {
    const base = (brief.budget * category.floor) / 100;
    const exact = base + (distributable * weight) / weightTotal;
    return { category, amount: Math.floor(exact), fraction: exact - Math.floor(exact) };
  });

  let remainder = Math.round(brief.budget - raw.reduce((sum, item) => sum + item.amount, 0));
  const byFraction = [...raw].sort((a, b) => b.fraction - a.fraction);
  for (let index = 0; index < byFraction.length && remainder > 0; index += 1) {
    const item = byFraction[index];
    if (item) {
      item.amount += 1;
      remainder -= 1;
    }
  }

  return raw.map(({ category, amount }) => ({
    id: category.id,
    name: category.label,
    recommended: amount,
    planned: amount,
    actual: 0,
    color: category.color,
    description: category.description,
    perGuest: Boolean(category.perGuest),
  }));
}

export function getBudgetTotals(categories: BudgetCategory[]) {
  const recommended = categories.reduce((sum, category) => sum + category.recommended, 0);
  const planned = categories.reduce((sum, category) => sum + category.planned, 0);
  const actual = categories.reduce((sum, category) => sum + category.actual, 0);
  return { recommended, planned, actual, remaining: planned - actual };
}
