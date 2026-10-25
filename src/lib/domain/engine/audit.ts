import type { Plan } from "../types";
import { daysUntil, formatDate, formatMoney } from "@/lib/utils/format";
import { getBudgetTotals } from "./budget";
import { getTradition } from "../traditions";
import { traditionUsesMuhurat } from "../muhurat";

export interface AuditItem {
  title: string;
  detail: string;
}

export interface PlanAudit {
  gaps: AuditItem[];
  warnings: AuditItem[];
}

const DESTINATION_CITIES = [
  "udaipur", "jaipur", "jodhpur", "jaisalmer", "goa", "panaji", "calangute",
  "munnar", "shimla", "manali", "rishikesh", "nainital", "lonavala",
  "mahabaleshwar", "puri", "hampi",
];

/**
 * Deterministic gap analysis. The assistant may phrase these findings, but it
 * never invents them: this function is the source of truth for "what am I
 * forgetting?".
 */
export function auditPlan(plan: Plan, now = new Date()): PlanAudit {
  const gaps: AuditItem[] = [];
  const warnings: AuditItem[] = [];
  const totals = getBudgetTotals(plan.budget);
  const isWedding = plan.brief.eventType === "wedding";
  const unallocated = plan.brief.budget - totals.planned;

  if (unallocated > 1) {
    gaps.push({
      title: `${formatMoney(unallocated)} is still unallocated`,
      detail: "Assign it to a category or protect it in contingency so the plan adds up before you spend.",
    });
  }
  if (unallocated < -1) {
    warnings.push({
      title: `Planned spend is ${formatMoney(Math.abs(unallocated))} over budget`,
      detail: "Rebalance or raise the budget before signing new vendor contracts.",
    });
  }
  const contingency = plan.budget.find((item) => item.id === "contingency");
  if ((contingency?.planned ?? 0) < plan.brief.budget * 0.05 - 1) {
    warnings.push({
      title: "Contingency is below 5%",
      detail: "GST differences, extra guests, and last-minute changes usually need a buffer.",
    });
  }

  if (isWedding) {
    if (plan.functions.length === 0) {
      gaps.push({
        title: "No functions are defined",
        detail: "Add mehndi, sangeet, ceremony, and reception so each has its own date, guests, and budget target.",
      });
    }
    if (traditionUsesMuhurat(plan.brief.tradition) && !plan.muhurat) {
      gaps.push({
        title: "No muhurat selected",
        detail: "Get 3–4 dates from your pandit, then confirm venue availability before paying a deposit.",
      });
    }
    if (!plan.functions.some((item) => item.kind === "ceremony")) {
      gaps.push({
        title: "No ceremony function",
        detail: "Add the wedding ceremony or muhurtham so the timeline can anchor to it.",
      });
    }
    const missingTimes = plan.functions.filter((item) => !item.startTime || !item.endTime);
    if (missingTimes.length > 0) {
      gaps.push({
        title: "Some functions have no start or end time",
        detail: `Add times for ${missingTimes.map((item) => item.name).join(", ")} so vendor arrivals and the run sheet are realistic.`,
      });
    }
    const venue = plan.vendors.find((item) => item.id === "venue");
    const caterer = plan.vendors.find((item) => item.id === "caterer");
    const photographer = plan.vendors.find((item) => item.id === "photographer");
    if (venue && venue.status !== "booked") {
      gaps.push({
        title: "Venue not confirmed",
        detail: "Check baraat space, havan/fire permission, outside-caterer rules, and the noise curfew before booking.",
      });
    }
    if (caterer && caterer.status !== "booked") {
      gaps.push({
        title: "Caterer not confirmed",
        detail: "Get per-plate rates for veg, Jain/satvik, and non-veg, with staff, service charge, and GST in writing.",
      });
    }
    if (photographer && photographer.status !== "booked") {
      gaps.push({
        title: "Photographer not confirmed",
        detail: "Ask for full galleries across multiple functions, a backup shooter, and a delivery date in the contract.",
      });
    }
    if (!plan.timeline.some((task) => /marriage registration/i.test(task.title))) {
      gaps.push({
        title: "Marriage registration not planned",
        detail: "Check documents, witnesses, and whether the Hindu Marriage Act or Special Marriage Act applies.",
      });
    }
    if (!plan.brief.constraints.some((item) => /veg|jain|halal|beef|pork|alcohol|allerg/i.test(item))) {
      gaps.push({
        title: "Dietary needs are not recorded",
        detail: "Note veg/Jain/satvik/halal, allergies, and alcohol preferences before the menu tasting.",
      });
    }
    const destination = DESTINATION_CITIES.some((city) => plan.brief.location.toLowerCase().includes(city));
    if (destination && !plan.functions.some((item) => item.kind === "reception")) {
      gaps.push({
        title: "Destination stay and reception not planned",
        detail: "Add a reception and a hotel/guest-travel line; destination weddings usually carry 10–15% extra logistics.",
      });
    }
    if (plan.brief.guests >= 300 && plan.vendors.find((item) => item.id === "permits")?.status !== "booked") {
      gaps.push({
        title: "Permits and crowd plan not confirmed",
        detail: "For 300+ guests, confirm police/loudspeaker NOC, fire safety, security, valet, and parking.",
      });
    }
    const expectedFunctions = getTradition(plan.brief.tradition).functions.filter((kind) => kind !== "custom");
    const missingFunctions = expectedFunctions.filter((kind) => !plan.functions.some((item) => item.kind === kind));
    if (missingFunctions.length > 0) {
      gaps.push({
        title: `Consider adding ${missingFunctions.join(", ")}`,
        detail: "These are common for this tradition, but skip them if your families have chosen a smaller format.",
      });
    }
    const pastFunction = plan.functions.find((item) => daysUntil(item.date, now) < 0);
    if (pastFunction) {
      warnings.push({
        title: `${pastFunction.name} is dated in the past`,
        detail: "Update the function date or mark it complete so the timeline stops treating it as upcoming.",
      });
    }
    const oversized = plan.functions.find((item) => item.guestCount > plan.brief.guests * 1.3);
    if (oversized) {
      warnings.push({
        title: `${oversized.name} has more guests than the main count`,
        detail: "Check per-function guest lists; catering and favors are priced per plate.",
      });
    }
    const overQuotes = plan.vendors.filter((vendor) => {
      const category = plan.budget.find((item) => item.id === vendor.budgetCategoryId);
      return category && vendor.quote > category.planned;
    });
    if (overQuotes.length > 0) {
      warnings.push({
        title: `${overQuotes.length} vendor quote${overQuotes.length > 1 ? "s" : ""} above the plan`,
        detail: `Review ${overQuotes.slice(0, 3).map((vendor) => vendor.category).join(", ")} before signing.`,
      });
    }
  }

  const overdue = plan.timeline.filter((task) => task.status !== "done" && daysUntil(task.dueDate, now) < 0);
  if (overdue.length > 0) {
    warnings.push({
      title: `${overdue.length} overdue task${overdue.length > 1 ? "s" : ""}`,
      detail: `Start with “${overdue[0]?.title}” — due ${formatDate(overdue[0]?.dueDate ?? plan.brief.date)}.`,
    });
  }

  return {
    gaps: gaps.slice(0, 8),
    warnings: warnings.slice(0, 5),
  };
}
