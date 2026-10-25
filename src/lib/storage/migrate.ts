import { EVENT_TYPES, type Brief, type EventType, type Plan } from "../domain/types";
import { getPack } from "../domain/packs";
import { resolveFunctions } from "../domain/functions";
import { briefSchema, planSchema } from "../validation/schemas";

/**
 * Reads a stored plan without ever discarding a valid older plan.
 * v1 was a single-event schema with Western wedding categories. v2 adds
 * traditions, multi-day functions, muhurat, and explicit guest scaling.
 */
export function parseStoredPlan(raw: unknown): Plan | null {
  const direct = planSchema.safeParse(raw);
  if (direct.success) return direct.data;
  const migrated = migratePlanV1(raw);
  if (!migrated) return null;
  const parsed = planSchema.safeParse(migrated);
  return parsed.success ? parsed.data : null;
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
    brief.functions = functions.map((item) => {
      const draft = { ...(item as Record<string, unknown>) };
      delete draft.id;
      delete draft.budget;
      delete draft.status;
      return draft as unknown as Brief["functions"][number];
    });
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
