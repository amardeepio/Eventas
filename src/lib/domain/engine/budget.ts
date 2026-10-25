import type { Brief, BudgetCategory, BudgetScaling, DomainPack } from "../types";
import { clamp } from "@/lib/utils/format";

const COST_INDEX = { low: 0.85, average: 1, high: 1.2 } as const;
const COST_SENSITIVE = new Set([
  "venue", "catering", "food", "decor", "photo", "attire", "jewelry",
  "mehndi", "music", "hotel", "transport", "permits", "planner",
  "stationery", "gifts",
]);

function scalingOf(category: DomainPack["budget"][number]): BudgetScaling {
  if (category.scaling) return category.scaling;
  return category.perGuest ? "linear" : "fixed";
}

/**
 * Allocates a budget from domain weights and brief context.
 * Floors are reserved first; the remainder follows adjusted weights. Largest-
 * remainder rounding guarantees that the category amounts equal the budget.
 *
 * Guest scaling is explicit: per-plate categories (catering, invites, travel)
 * grow close to linearly, venue grows sublinearly, and fixed costs do not move
 * with the guest count. This matters for 300–500 guest Indian weddings.
 */
export function allocateBudget(pack: DomainPack, brief: Brief): BudgetCategory[] {
  const guestRatio = Math.max(0.1, brief.guests / pack.defaultGuests);
  const linearRatio = clamp(guestRatio, 0.4, 4);
  const sublinearRatio = clamp(Math.pow(guestRatio, 0.55), 0.55, 1.8);
  const priorities = new Set(brief.priorities);

  const adjusted = pack.budget.map((category) => {
    let weight = category.weight;
    const scaling = scalingOf(category);
    if (scaling === "linear") weight *= linearRatio;
    else if (scaling === "sublinear") weight *= sublinearRatio;

    if (priorities.has(category.id)) weight *= 1.35;
    if (COST_SENSITIVE.has(category.id)) weight *= COST_INDEX[brief.costLevel];

    if (brief.vibe === "celebration" || brief.vibe === "dance") {
      if (["music", "entertainment", "av"].includes(category.id)) weight *= 1.25;
    }
    if (brief.vibe === "royal") {
      if (["decor", "venue", "hotel"].includes(category.id)) weight *= 1.15;
    }
    if (["traditional", "cultural"].includes(brief.vibe) && category.id === "decor") {
      weight *= 1.1;
    }
    if (["garden", "modern", "playful", "intimate"].includes(brief.vibe) && category.id === "decor") {
      weight *= 1.1;
    }
    return { category, weight: Math.max(weight, category.floor), scaling };
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

  return raw.map(({ category, amount }) => {
    const scaling = scalingOf(category);
    return {
      id: category.id,
      name: category.label,
      recommended: amount,
      planned: amount,
      actual: 0,
      color: category.color,
      description: category.description,
      perGuest: scaling !== "fixed",
      scaling,
    };
  });
}

export function getBudgetTotals(categories: BudgetCategory[]) {
  const recommended = categories.reduce((sum, category) => sum + category.recommended, 0);
  const planned = categories.reduce((sum, category) => sum + category.planned, 0);
  const actual = categories.reduce((sum, category) => sum + category.actual, 0);
  return { recommended, planned, actual, remaining: planned - actual };
}
