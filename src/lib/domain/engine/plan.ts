import type { Brief, Idea, Plan } from "../types";
import { getPack } from "../packs";
import { allocateBudget } from "./budget";
import { generateTimeline } from "./timeline";
import { buildVendorChecklist } from "./vendors";
import { daysUntil, formatMoney } from "@/lib/utils/format";

export function buildIdeas(brief: Brief): Idea[] {
  const pack = getPack(brief.eventType);
  return pack.ideas.map((idea, index) => ({
    ...idea,
    id: `${brief.eventType}-${index + 1}`,
    saved: false,
    cost: idea.kind === "Favors" ? Math.round(brief.guests * 2.5)
      : idea.kind === "Signature moment" ? Math.round(brief.budget * 0.005)
      : idea.kind === "Decor" ? Math.round(brief.budget * 0.01) : 0,
  }));
}

export function createDefaultAi(brief: Brief, now = new Date()) {
  const pack = getPack(brief.eventType);
  const days = daysUntil(brief.date, now);
  const budget = allocateBudget(pack, brief);
  const largest = [...budget].sort((a, b) => b.recommended - a.recommended)[0];
  const next = generateTimeline(pack, brief, now).find((task) => task.status !== "done");
  return {
    headline: `${days > 0 ? `${days} days` : "The final stretch"} to make ${brief.title} feel like you.`,
    insights: [
      `${largest?.name ?? "Your largest category"} is the biggest investment at ${formatMoney(largest?.recommended ?? 0)}. Protect your top priorities before adding extras.`,
      next ? `Start with “${next.title}”. It is the next milestone in your ${next.phase.toLowerCase()} phase.` : "Your foundation is in place. Review the next phase when you are ready.",
      `You have ${formatMoney(brief.budget / Math.max(1, brief.guests))} per ${pack.terminology.guest} across the whole event—not just food.`,
    ],
    mode: "demo" as const,
  };
}

export function buildPlan(brief: Brief, now = new Date()): Plan {
  const pack = getPack(brief.eventType);
  return {
    version: 1,
    id: globalThis.crypto?.randomUUID?.() ?? `plan-${Date.now()}`,
    createdAt: now.toISOString(),
    brief,
    budget: allocateBudget(pack, brief),
    timeline: generateTimeline(pack, brief, now),
    vendors: buildVendorChecklist(pack),
    ideas: buildIdeas(brief),
    ai: createDefaultAi(brief, now),
  };
}

export function getNextTasks(plan: Plan, now = new Date()): Plan["timeline"] {
  const today = now.toISOString().slice(0, 10);
  return plan.timeline
    .filter((task) => task.status !== "done")
    .sort((a, b) => {
      const aOverdue = a.dueDate < today ? 0 : 1;
      const bOverdue = b.dueDate < today ? 0 : 1;
      return aOverdue - bOverdue || a.dueDate.localeCompare(b.dueDate);
    })
    .slice(0, 3);
}
