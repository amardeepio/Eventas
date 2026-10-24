import type { Plan } from "../domain/types";
import type { RebalanceResponse } from "../validation/schemas";

/** Deterministic fallback and safety net for model-generated allocation proposals. */
export function proposeRebalance(plan: Plan, goal: string): RebalanceResponse {
  const total = plan.budget.reduce((sum, category) => sum + category.planned, 0);
  const percent = goal.match(/(\d+(?:\.\d+)?)\s*%/)?.[1];
  const dollar = goal.match(/(?:\$|save\s+)(\d[\d,]*)/i)?.[1]?.replaceAll(",", "");
  const requested = percent ? total * Number(percent) / 100 : dollar ? Number(dollar) : total * 0.05;
  const savings = Math.max(0, Math.min(requested, total * 0.2));
  const priority = new Set(plan.brief.priorities);
  const candidates = plan.budget.filter((category) => category.id !== "contingency" && !priority.has(category.id) && category.planned > 0);
  const candidateTotal = candidates.reduce((sum, category) => sum + category.planned, 0);
  const allocation = Object.fromEntries(plan.budget.map((category) => [category.id, category.planned]));
  let moved = 0;
  for (const category of candidates) {
    const share = candidateTotal ? savings * category.planned / candidateTotal : 0;
    const cut = Math.min(share, category.planned * 0.3);
    allocation[category.id] = Math.max(0, Math.round(category.planned - cut));
    moved += category.planned - (allocation[category.id] ?? 0);
  }
  return {
    rationale: `I would reduce ${candidates.slice(0, 3).map((category) => category.name.toLowerCase()).join(", ")} while protecting your stated priorities and contingency. This releases about $${Math.round(moved).toLocaleString()} without cutting guest-critical basics.`,
    allocation,
  };
}

export function isSafeAllocation(plan: Plan, allocation: Record<string, number>): boolean {
  const ids = new Set(plan.budget.map((category) => category.id));
  const entries = Object.entries(allocation);
  if (entries.length !== ids.size || entries.some(([id, amount]) => !ids.has(id) || !Number.isFinite(amount) || amount < 0)) return false;
  const total = entries.reduce((sum, [, amount]) => sum + amount, 0);
  const contingency = allocation.contingency ?? plan.brief.budget * 0.05;
  return total <= plan.brief.budget + 1 && contingency >= plan.brief.budget * 0.05 - 1;
}
