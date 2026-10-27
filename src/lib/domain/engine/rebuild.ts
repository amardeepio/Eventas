import type { Brief, BudgetCategory, Guest, Plan, RunSheetEntry, Task, Vendor, WeddingFunction } from "../types";
import { getPack } from "../packs";
import { allocateBudget } from "./budget";
import { generateTimeline } from "./timeline";
import { buildVendorChecklist } from "./vendors";
import { buildIdeas, createDefaultAi } from "./plan";
import { resolveFunctions, toFunctionDraft } from "../functions";
import { generateRunSheet } from "../run-sheet";

/**
 * Applies a new brief without discarding the host's work. Generated items are
 * refreshed from the engine; edited records, custom records, actuals, guests,
 * and run-sheet rows are preserved.
 */
export function rebuildPlan(plan: Plan, brief: Brief, now = new Date()): Plan {
  const pack = getPack(brief.eventType);
  const functions = resolveFunctionsForEdit(plan.functions, brief);
  const nextBrief: Brief = { ...brief, functions: functions.map(toFunctionDraft) };
  const validFunctionIds = new Set(functions.map((item) => item.id));

  return {
    ...plan,
    brief: nextBrief,
    functions,
    muhurat: brief.muhurat ?? null,
    budget: mergeBudget(plan.budget, allocateBudget(pack, nextBrief), nextBrief.budget),
    timeline: mergeTimeline(plan.timeline, generateTimeline(pack, nextBrief, now, functions), plan.dismissedTaskIds, validFunctionIds),
    vendors: mergeVendors(plan.vendors, buildVendorChecklist(pack), plan.dismissedVendorIds),
    guests: mergeGuests(plan.guests, functions),
    runSheet: mergeRunSheet(plan.runSheet, functions, nextBrief.location),
    ideas: mergeIdeas(plan.ideas, buildIdeas(nextBrief)),
    ai: createDefaultAi(nextBrief, now, functions),
    // Keep the host key so an edited plan can republish or revoke existing links.
    rsvpShare: plan.rsvpShare,
    dismissedTaskIds: plan.dismissedTaskIds.filter((id) => !plan.timeline.some((task) => task.id === id && task.source === "custom")),
    dismissedVendorIds: plan.dismissedVendorIds.filter((id) => !plan.vendors.some((vendor) => vendor.id === id && vendor.source === "custom")),
  };
}

function resolveFunctionsForEdit(oldFunctions: WeddingFunction[], brief: Brief): WeddingFunction[] {
  const used = new Set<string>();
  const drafts = brief.functions.map((draft, index) => {
    if (draft.id) {
      used.add(draft.id);
      return draft;
    }
    const match = oldFunctions.find((item) => item.id === draft.id)
      ?? oldFunctions.find((item) => item.kind === draft.kind && !used.has(item.id))
      ?? oldFunctions[index];
    if (match && !used.has(match.id)) {
      used.add(match.id);
      return { ...draft, id: match.id };
    }
    return draft;
  });
  return resolveFunctions({ ...brief, functions: drafts });
}

function mergeBudget(oldBudget: BudgetCategory[], nextBudget: BudgetCategory[], total: number): BudgetCategory[] {
  const oldGenerated = new Map(oldBudget.filter((item) => item.source !== "custom").map((item) => [item.id, item]));
  const custom = oldBudget.filter((item) => item.source === "custom");

  const merged = nextBudget.map((category) => {
    const old = oldGenerated.get(category.id);
    return {
      ...category,
      actual: old?.actual ?? 0,
      planned: old?.plannedEdited ? old.planned : category.planned,
      plannedEdited: old?.plannedEdited ?? false,
      source: "generated" as const,
    };
  });

  const flexible = merged.filter((item) => !item.plannedEdited);
  const locked = merged.filter((item) => item.plannedEdited);
  const targetFlexible = Math.max(0, total - custom.reduce((sum, item) => sum + item.planned, 0) - locked.reduce((sum, item) => sum + item.planned, 0));
  const currentFlexible = flexible.reduce((sum, item) => sum + item.planned, 0);

  if (flexible.length > 0 && currentFlexible > 0 && targetFlexible !== currentFlexible) {
    const raw = flexible.map((item) => {
      const exact = (item.planned / currentFlexible) * targetFlexible;
      return { item, amount: Math.floor(exact), fraction: exact - Math.floor(exact) };
    });
    let remainder = Math.round(targetFlexible - raw.reduce((sum, item) => sum + item.amount, 0));
    for (const row of [...raw].sort((a, b) => b.fraction - a.fraction)) {
      if (remainder <= 0) break;
      row.amount += 1;
      remainder -= 1;
    }
    const amounts = new Map(raw.map((row) => [row.item.id, row.amount]));
    for (const item of flexible) item.planned = amounts.get(item.id) ?? item.planned;
  }

  return [...merged, ...custom];
}

function mergeTimeline(oldTimeline: Task[], nextTimeline: Task[], dismissed: string[], validFunctionIds: Set<string>): Task[] {
  const old = new Map(oldTimeline.map((task) => [task.id, task]));
  const dismissedSet = new Set(dismissed);
  const generated = nextTimeline
    .filter((task) => !dismissedSet.has(task.id))
    .map((task) => {
      const previous = old.get(task.id);
      if (!previous) return task;
      if (previous.edited) {
        return {
          ...previous,
          functionId: previous.functionId && validFunctionIds.has(previous.functionId) ? previous.functionId : undefined,
          source: "generated" as const,
        };
      }
      return { ...task, status: previous.status, source: "generated" as const };
    });
  const custom = oldTimeline
    .filter((task) => task.source === "custom" && !dismissedSet.has(task.id))
    .map((task) => ({
      ...task,
      functionId: task.functionId && validFunctionIds.has(task.functionId) ? task.functionId : undefined,
    }));
  return [...generated, ...custom].sort((a, b) => a.dueDate.localeCompare(b.dueDate));
}

function mergeVendors(oldVendors: Vendor[], nextVendors: Vendor[], dismissed: string[]): Vendor[] {
  const old = new Map(oldVendors.map((vendor) => [vendor.id, vendor]));
  const dismissedSet = new Set(dismissed);
  const generated = nextVendors
    .filter((vendor) => !dismissedSet.has(vendor.id))
    .map((vendor) => {
      const previous = old.get(vendor.id);
      if (!previous) return vendor;
      return {
        ...vendor,
        status: previous.status,
        quote: previous.quote,
        notes: previous.notes,
        edited: previous.edited ?? false,
        ...(previous.edited ? { category: previous.category, budgetCategoryId: previous.budgetCategoryId, questions: previous.questions, redFlags: previous.redFlags } : {}),
        source: "generated" as const,
      };
    });
  const custom = oldVendors.filter((vendor) => vendor.source === "custom" && !dismissedSet.has(vendor.id));
  return [...generated, ...custom];
}

function mergeGuests(guests: Guest[], functions: WeddingFunction[]): Guest[] {
  const validIds = new Set(functions.map((item) => item.id));
  return guests.map((guest) => {
    const invites = guest.invites.filter((invite) => validIds.has(invite.functionId));
    const defaultSeats = Math.max(1, ...guest.invites.map((invite) => invite.seats), 1);
    for (const functionItem of functions) {
      if (!invites.some((invite) => invite.functionId === functionItem.id)) {
        invites.push({ functionId: functionItem.id, status: "pending", seats: defaultSeats });
      }
    }
    return { ...guest, invites };
  });
}

function mergeRunSheet(old: RunSheetEntry[], functions: WeddingFunction[], venue: string): RunSheetEntry[] {
  if (old.length === 0) return generateRunSheet(functions, venue);
  const validIds = new Set(functions.map((item) => item.id));
  const kept = old
    .filter((item) => !item.functionId || validIds.has(item.functionId))
    .map((item) => ({ ...item, functionId: item.functionId && validIds.has(item.functionId) ? item.functionId : undefined }));
  const keptIds = new Set(kept.map((item) => item.id));
  const additions = generateRunSheet(functions, venue).filter((item) => !keptIds.has(item.id));
  return [...kept, ...additions];
}

function mergeIdeas(oldIdeas: Plan["ideas"], nextIdeas: Plan["ideas"]): Plan["ideas"] {
  return nextIdeas.map((idea, index) => ({
    ...idea,
    id: oldIdeas[index]?.id ?? idea.id,
    saved: oldIdeas.find((saved) => saved.title === idea.title)?.saved ?? false,
  }));
}
