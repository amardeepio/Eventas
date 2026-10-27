import { EVENT_TYPES, type Brief, type EventType, type Plan, type WeddingFunction } from "../domain/types";
import { getPack } from "../domain/packs";
import { resolveFunctions, toFunctionDraft } from "../domain/functions";
import { briefSchema, planSchema } from "../validation/schemas";

/**
 * Reads a stored plan without ever discarding a valid older plan.
 * v1 was a single-event schema with Western wedding categories. v2 added
 * traditions, multi-day functions, muhurat, and guest scaling. v3 adds custom
 * items, guests, a run sheet, and multi-plan metadata.
 */
export function parseStoredPlan(raw: unknown): Plan | null {
  const direct = planSchema.safeParse(raw);
  if (direct.success) return direct.data;

  const version = raw && typeof raw === "object" ? (raw as Record<string, unknown>).version : null;
  let migrated: unknown | null = null;
  if (version === 2) migrated = migratePlanV2(raw);
  else if (version === 1) {
    const v2 = migratePlanV1(raw);
    migrated = v2 ? migratePlanV2(v2) : null;
  }
  if (!migrated) return null;
  const parsed = planSchema.safeParse(migrated);
  return parsed.success ? parsed.data : null;
}

function withStableFunctionIds(functions: WeddingFunction[]): WeddingFunction[] {
  const seen = new Set<string>();
  return functions.map((item, index) => {
    let id = item.id || `${item.kind}-${index + 1}`;
    while (seen.has(id)) id = `${id}-${index + 1}`;
    seen.add(id);
    return { ...item, id };
  });
}

export function migratePlanV2(raw: unknown): unknown | null {
  if (!raw || typeof raw !== "object") return null;
  const candidate = raw as Record<string, unknown>;
  if (candidate.version !== 2) return null;
  if (!candidate.brief || typeof candidate.brief !== "object") return null;

  const briefRaw = candidate.brief as Record<string, unknown>;
  const eventType = briefRaw.eventType;
  if (typeof eventType !== "string" || !EVENT_TYPES.includes(eventType as EventType)) return null;
  const pack = getPack(eventType as EventType);

  const briefWithDefaults = {
    ...briefRaw,
    tradition: briefRaw.tradition ?? (eventType === "wedding" ? pack.defaultTradition : "none"),
    functions: Array.isArray(briefRaw.functions) ? briefRaw.functions : [],
  };
  const parsedBrief = briefSchema.safeParse(briefWithDefaults);
  if (!parsedBrief.success) return null;
  const brief: Brief = parsedBrief.data;

  const rawFunctions = Array.isArray(candidate.functions) ? candidate.functions : [];
  const functions = withStableFunctionIds(rawFunctions.length ? rawFunctions as WeddingFunction[] : resolveFunctions(brief));

  // Persist IDs into the brief so guest invites and run-sheet rows survive an
  // edit that rebuilds the plan.
  brief.functions = functions.map(toFunctionDraft);

  const budget = (Array.isArray(candidate.budget) ? candidate.budget : []).map((item) => {
    const category = item as Record<string, unknown>;
    return {
      ...category,
      scaling: category.scaling ?? (category.perGuest ? "linear" : "fixed"),
      source: category.source ?? "generated",
      plannedEdited: category.plannedEdited ?? false,
    };
  });

  const timeline = (Array.isArray(candidate.timeline) ? candidate.timeline : []).map((item) => ({
    ...(item as Record<string, unknown>),
    source: (item as Record<string, unknown>).source ?? "generated",
    edited: (item as Record<string, unknown>).edited ?? false,
  }));

  const vendors = (Array.isArray(candidate.vendors) ? candidate.vendors : []).map((item) => ({
    ...(item as Record<string, unknown>),
    source: (item as Record<string, unknown>).source ?? "generated",
    edited: (item as Record<string, unknown>).edited ?? false,
  }));

  return {
    ...candidate,
    version: 3,
    brief,
    functions,
    muhurat: candidate.muhurat ?? brief.muhurat ?? null,
    budget,
    timeline,
    vendors,
    guests: Array.isArray(candidate.guests) ? candidate.guests : [],
    runSheet: Array.isArray(candidate.runSheet) ? candidate.runSheet : [],
    dismissedTaskIds: Array.isArray(candidate.dismissedTaskIds) ? candidate.dismissedTaskIds : [],
    dismissedVendorIds: Array.isArray(candidate.dismissedVendorIds) ? candidate.dismissedVendorIds : [],
    archivedAt: candidate.archivedAt ?? null,
    rsvpShare: candidate.rsvpShare ?? null,
  };
}

export function migratePlanV1(raw: unknown): unknown | null {
  if (!raw || typeof raw !== "object") return null;
  const candidate = raw as Record<string, unknown>;
  if (candidate.version !== 1) return null;
  if (!candidate.brief || typeof candidate.brief !== "object") return null;

  const briefRaw = candidate.brief as Record<string, unknown>;
  const eventType = briefRaw.eventType;
  if (typeof eventType !== "string" || !EVENT_TYPES.includes(eventType as EventType)) return null;
  const pack = getPack(eventType as EventType);

  const briefWithDefaults = {
    ...briefRaw,
    tradition: briefRaw.tradition ?? (eventType === "wedding" ? pack.defaultTradition : "none"),
    functions: Array.isArray(briefRaw.functions) ? briefRaw.functions : [],
  };
  const parsedBrief = briefSchema.safeParse(briefWithDefaults);
  if (!parsedBrief.success) return null;
  const brief: Brief = parsedBrief.data;

  const rawFunctions = Array.isArray(candidate.functions) ? candidate.functions : [];
  const functions = rawFunctions.length ? rawFunctions : resolveFunctions(brief);
  if (brief.functions.length === 0) {
    brief.functions = functions.map(toFunctionDraft);
  }

  const rawBudget = Array.isArray(candidate.budget) ? candidate.budget : [];
  const budget = rawBudget.map((item) => {
    const category = item as Record<string, unknown>;
    return {
      ...category,
      scaling: category.scaling ?? (category.perGuest ? "linear" : "fixed"),
    };
  });

  return {
    ...candidate,
    version: 2,
    brief,
    functions,
    muhurat: candidate.muhurat ?? brief.muhurat ?? null,
    budget,
  };
}
