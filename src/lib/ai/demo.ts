import type { Plan } from "../domain/types";
import { createDefaultAi } from "../domain/engine/plan";
import { getBudgetTotals } from "../domain/engine/budget";
import { formatMoney } from "@/lib/utils/format";

export function demoPlanEnrichment(plan: Plan) {
  const ai = createDefaultAi(plan.brief);
  return {
    headline: ai.headline,
    insights: ai.insights,
    ideas: plan.ideas.map(({ kind, title, description, cost, tags }) => ({ kind, title, description, cost, tags })),
  };
}

/** Contextual offline responses keep the complete product usable without a key. */
export function demoAssistantReply(plan: Plan, question: string): string {
  const lower = question.toLowerCase();
  const totals = getBudgetTotals(plan.budget);
  const sorted = [...plan.budget].sort((a, b) => b.planned - a.planned);
  const next = plan.timeline.filter((task) => task.status !== "done").slice(0, 3);
  if (lower.includes("budget") || lower.includes("spend") || lower.includes("save") || lower.includes("cost")) {
    return `Your plan allocates **${formatMoney(totals.planned)}** of the **${formatMoney(plan.brief.budget)}** budget. The three largest categories are ${sorted.slice(0, 3).map((item) => `${item.name} (${formatMoney(item.planned)})`).join(", ")}.\n\nI would protect your stated priorities first, then review decor, favors, and upgrades. Use **Rebalance with AI** on the Budget view for a specific before-and-after proposal—you stay in control of applying it.`;
  }
  if (lower.includes("vendor") || lower.includes("book") || lower.includes("contract")) {
    const open = plan.vendors.filter((vendor) => vendor.status !== "booked");
    return `You have **${open.length} vendor categories still open**. Start with ${open.slice(0, 3).map((vendor) => vendor.category).join(", ") || "your remaining categories"}.\n\nFor each one, get the full fee, cancellation terms, setup requirements, and backup plan in writing. The **Vendors** view includes category-specific questions and red flags to bring to the call.`;
  }
  if (lower.includes("idea") || lower.includes("theme") || lower.includes("personal")) {
    const ideas = plan.ideas.slice(0, 3);
    return `Given your **${plan.brief.vibe}** direction, I would start with:\n\n${ideas.map((idea) => `- **${idea.title}** — ${idea.description}`).join("\n")}\n\nSave the ones that feel right in the Ideas view; the assistant will use them as context.`;
  }
  return `Here are the next three moves I would focus on:\n\n${next.map((task, index) => `${index + 1}. **${task.title}** — ${task.description}`).join("\n")}\n\nYour budget currently has **${formatMoney(totals.remaining)} unspent** against planned amounts. I can also help with budget trade-offs, vendor questions, or personalized ideas.`;
}
