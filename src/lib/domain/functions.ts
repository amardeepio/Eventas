import type {
  Brief,
  FunctionDraft,
  FunctionKind,
  Tradition,
  WeddingFunction,
} from "./types";
import { getTradition } from "./traditions";
import { addDays, parseISODate, toISODate } from "@/lib/utils/format";

const META: Record<FunctionKind, {
  name: string;
  start: string;
  end: string;
  dress: string;
  budgetWeight: number;
  guestShare: number;
  dayOffset: number;
}> = {
  roka: { name: "Roka", start: "11:00", end: "14:00", dress: "Festive Indian", budgetWeight: 0.1, guestShare: 0.3, dayOffset: -180 },
  engagement: { name: "Engagement", start: "18:00", end: "22:00", dress: "Cocktail / Indian formal", budgetWeight: 0.25, guestShare: 0.6, dayOffset: -120 },
  haldi: { name: "Haldi", start: "10:00", end: "13:00", dress: "Yellow / casual", budgetWeight: 0.15, guestShare: 0.3, dayOffset: -1 },
  mehndi: { name: "Mehndi", start: "11:00", end: "17:00", dress: "Green / yellow / pastel", budgetWeight: 0.3, guestShare: 0.5, dayOffset: -2 },
  sangeet: { name: "Sangeet", start: "19:00", end: "23:00", dress: "Indian formal / sparkle", budgetWeight: 0.5, guestShare: 0.7, dayOffset: -1 },
  baraat: { name: "Baraat", start: "16:00", end: "18:00", dress: "Festive Indian", budgetWeight: 0.1, guestShare: 1, dayOffset: 0 },
  ceremony: { name: "Wedding ceremony", start: "08:00", end: "13:00", dress: "Traditional", budgetWeight: 1, guestShare: 1, dayOffset: 0 },
  reception: { name: "Reception", start: "19:00", end: "23:00", dress: "Formal / cocktail", budgetWeight: 0.85, guestShare: 1, dayOffset: 0 },
  vidaai: { name: "Vidaai", start: "13:00", end: "14:00", dress: "Traditional", budgetWeight: 0.05, guestShare: 0.2, dayOffset: 0 },
  "griha-pravesh": { name: "Griha Pravesh", start: "17:00", end: "18:00", dress: "Traditional", budgetWeight: 0.1, guestShare: 0.3, dayOffset: 1 },
  custom: { name: "Main event", start: "10:00", end: "14:00", dress: "Festive", budgetWeight: 0.4, guestShare: 0.6, dayOffset: 0 },
};

const CEREMONY_TIMES: Partial<Record<Tradition, { start: string; end: string }>> = {
  "south-indian": { start: "06:00", end: "10:00" },
  muslim: { start: "17:00", end: "21:00" },
  christian: { start: "10:00", end: "12:30" },
};

export function functionKindLabel(kind: FunctionKind): string {
  return META[kind].name;
}

export function functionKindMeta(kind: FunctionKind) {
  return META[kind];
}

export function defaultFunctionDrafts(brief: Brief): FunctionDraft[] {
  const profile = getTradition(brief.tradition);
  let kinds: FunctionKind[] = profile.functions.filter((kind) => kind !== "custom");
  if (brief.eventType === "wedding" && kinds.length === 0) kinds = ["ceremony", "reception"];
  if (brief.eventType !== "wedding") kinds = ["custom"];

  return kinds.map((kind) => {
    const meta = META[kind];
    const times = kind === "ceremony" ? CEREMONY_TIMES[brief.tradition] ?? meta : meta;
    return {
      kind,
      name: kind === "ceremony" ? profile.ceremonyLabel : meta.name,
      date: toISODate(addDays(parseISODate(brief.date), meta.dayOffset)),
      startTime: times.start,
      endTime: times.end,
      venue: brief.location,
      guestCount: brief.eventType === "wedding"
        ? Math.max(1, Math.round(brief.guests * meta.guestShare))
        : brief.guests,
      dressCode: meta.dress,
      hostSide: "both",
    };
  });
}

/**
 * Turns the brief's function list into plan functions with stable ids and an
 * exact per-function budget split. Per-function budgets are planning targets;
 * the master category budget remains the source of truth for every rupee.
 */
export function resolveFunctions(brief: Brief): WeddingFunction[] {
  const drafts = brief.functions.length ? brief.functions : defaultFunctionDrafts(brief);
  const usedIds = new Set<string>();
  const safe = drafts.slice(0, 12).map((draft, index) => {
    let id = draft.id?.trim() || `${draft.kind}-${index + 1}`;
    while (usedIds.has(id)) id = `${id}-${index + 1}`;
    usedIds.add(id);
    return {
      ...draft,
      id,
      name: draft.name.trim() || functionKindLabel(draft.kind),
      date: /^\d{4}-\d{2}-\d{2}$/.test(draft.date) ? draft.date : brief.date,
      startTime: draft.startTime || META[draft.kind].start,
      endTime: draft.endTime || META[draft.kind].end,
      venue: draft.venue || brief.location,
      guestCount: Math.max(1, Math.round(draft.guestCount || brief.guests * META[draft.kind].guestShare)),
      status: "planned" as const,
      budget: 0,
    };
  });

  if (safe.length === 0) {
    return [{
      id: "main-1",
      kind: "custom",
      name: brief.title,
      date: brief.date,
      startTime: "10:00",
      endTime: "14:00",
      venue: brief.location,
      guestCount: brief.guests,
      dressCode: "Festive",
      hostSide: "both",
      status: "planned",
      budget: brief.budget,
    }];
  }

  const weights = safe.map((item) => META[item.kind].budgetWeight);
  const weightTotal = weights.reduce((sum, value) => sum + value, 0) || 1;
  const raw = safe.map((item, index) => {
    const exact = brief.budget * (weights[index] ?? 0) / weightTotal;
    return { index, amount: Math.floor(exact), fraction: exact - Math.floor(exact) };
  });
  let remainder = Math.round(brief.budget - raw.reduce((sum, item) => sum + item.amount, 0));
  const byFraction = [...raw].sort((a, b) => b.fraction - a.fraction);
  for (const item of byFraction) {
    if (remainder <= 0) break;
    item.amount += 1;
    remainder -= 1;
  }
  const amounts = new Map(raw.map((item) => [item.index, item.amount]));

  return safe.map((item, index) => ({ ...item, budget: amounts.get(index) ?? 0 }));
}

export function functionKindDate(functions: WeddingFunction[], kind: FunctionKind): string | null {
  return functions.find((item) => item.kind === kind)?.date ?? null;
}

export function findFunction(functions: WeddingFunction[], id: string | undefined): WeddingFunction | undefined {
  return id ? functions.find((item) => item.id === id) : undefined;
}

export function toFunctionDraft(item: WeddingFunction): FunctionDraft {
  const draft: Partial<WeddingFunction> = { ...item };
  delete draft.budget;
  delete draft.status;
  return draft as FunctionDraft;
}

/** The ceremony is the anchor for every wedding-day task. */
export function ceremonyFunction(functions: WeddingFunction[]): WeddingFunction | undefined {
  return functions.find((item) => item.kind === "ceremony") ?? functions[0];
}
