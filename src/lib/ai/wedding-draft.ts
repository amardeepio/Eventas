import type { Brief, FunctionDraft, MuhuratWindow, Tradition } from "../domain/types";
import type { WeddingDraft } from "../validation/schemas";
import { briefSchema } from "../validation/schemas";
import { getPack } from "../domain/packs";
import { getTradition } from "../domain/traditions";
import { defaultFunctionDrafts, functionKindLabel, functionKindMeta } from "../domain/functions";
import { findMuhuratSuggestion, traditionUsesMuhurat } from "../domain/muhurat";
import { inferCostLevel } from "../domain/city-tiers";
import { normalizeConstraints } from "../domain/constraints";
import { addDays, clamp, formatMoney, parseISODate, toISODate } from "@/lib/utils/format";

export interface WeddingDraftResult {
  brief: Brief;
  assumptions: string[];
  questions: string[];
}

/**
 * Turns model output into a complete, validated brief. The model may suggest
 * fields; this function owns defaults, bounds, function dates, and muhurat
 * safety. A bad draft is rejected instead of being rendered as truth.
 */
export function normalizeWeddingDraft(
  draft: WeddingDraft,
  now = new Date(),
  current?: Partial<Brief>,
): WeddingDraftResult {
  const pack = getPack("wedding");
  const tradition = normalizeTradition(draft.tradition ?? current?.tradition);
  const hostNames = (draft.hostNames ?? current?.hostNames ?? "The couple").trim() || "The couple";
  const title = (draft.title ?? current?.title ?? (hostNames === "The couple" ? "Our wedding" : `${hostNames}'s wedding`)).trim() || "Our wedding";
  const date = validDate(draft.date ?? current?.date) ?? toISODate(addDays(now, 180));
  const guests = Math.round(clamp(draft.guests ?? current?.guests ?? 300, 1, 100_000));
  const budget = Math.round(clamp(draft.budget ?? current?.budget ?? pack.defaultBudget, 100, 100_000_000));
  const location = (draft.location ?? current?.location ?? "New Delhi, Delhi").trim() || "New Delhi, Delhi";
  const costLevel = draft.costLevel ?? current?.costLevel ?? inferCostLevel(location);
  const priorities = normalizePriorities(draft.priorities, current?.priorities, pack.priorities.map((item) => item.id));
  const vibe = pack.vibes.find((item) => item.id === (draft.vibe ?? current?.vibe))?.id ?? pack.vibes[0]?.id ?? "traditional";
  const notes = (draft.notes ?? current?.notes ?? "").slice(0, 1200);
  const constraints = normalizeConstraints([...(draft.constraints ?? []), ...(current?.constraints ?? [])]);

  const base: Brief = {
    eventType: "wedding",
    title,
    hostNames,
    date,
    guests,
    budget,
    location,
    costLevel,
    priorities,
    vibe,
    notes,
    constraints,
    tradition,
    functions: [],
  };

  const fallbackFunctions = defaultFunctionDrafts(base);
  const incoming = draft.functions.length
    ? draft.functions.map((item) => normalizeFunction(item, base, fallbackFunctions))
    : (current?.functions?.length ? current.functions : fallbackFunctions);
  const functions = (incoming.length ? incoming : fallbackFunctions).slice(0, 8);

  const muhurat = resolveMuhurat(draft.muhurat, current?.muhurat, date, tradition);
  if (muhurat) {
    const ceremony = functions.find((item) => item.kind === "ceremony");
    if (ceremony) {
      ceremony.date = muhurat.date;
      if (muhurat.start) ceremony.startTime = muhurat.start;
      if (muhurat.end) ceremony.endTime = muhurat.end;
    }
  }
  const assumptions = dedupe([
    ...draft.assumptions,
    !draft.guests && !current?.guests ? `We assumed ${guests} guests and a working budget of ${formatMoney(budget)}.` : "",
    !draft.budget && !current?.budget ? `We assumed a total budget of ${formatMoney(budget)}.` : "",
    !draft.date && !current?.date ? `We assumed a date about six months out (${date}).` : "",
    !draft.location && !current?.location ? `We used ${location} as the planning city.` : "",
    !draft.functions.length && !current?.functions?.length ? `We planned the typical functions for ${getTradition(tradition).label}: ${functions.map((item) => item.name).join(", ")}.` : "",
    muhurat ? "The muhurat comes from the curated table; confirm the window with your family pandit." : "",
  ].filter(Boolean)).filter((item) => muhurat || !/muhurat|auspicious/i.test(item)).slice(0, 6);
  if (!muhurat) assumptions.push("No muhurat window was applied; confirm the ceremony date with your family.");
  const questions = dedupe(draft.questions).slice(0, 3);

  const parsed = briefSchema.safeParse({ ...base, functions, muhurat });
  if (!parsed.success) throw new Error("INVALID_WEDDING_DRAFT");
  return { brief: parsed.data, assumptions, questions };
}

function normalizeTradition(value: Tradition | undefined): Tradition {
  if (!value || value === "none") return "north-hindu";
  return value;
}

function validDate(value: string | undefined): string | null {
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;
}

function normalizePriorities(incoming: unknown, current: unknown, allowed: string[]): string[] {
  const allowedSet = new Set(allowed);
  const raw = Array.isArray(incoming) ? incoming : Array.isArray(current) ? current : [];
  const valid = raw.filter((item): item is string => typeof item === "string" && allowedSet.has(item));
  const unique = dedupe(valid).slice(0, 3);
  return unique.length ? unique : ["catering", "photo", "decor"];
}

function normalizeFunction(
  item: WeddingDraft["functions"][number],
  brief: Brief,
  fallbacks: FunctionDraft[],
): FunctionDraft {
  const profile = getTradition(brief.tradition);
  const meta = functionKindMeta(item.kind);
  const fallback = fallbacks.find((candidate) => candidate.kind === item.kind);
  const date = validDate(item.date) ?? fallback?.date ?? toISODate(addDays(parseISODate(brief.date), meta.dayOffset));
  return {
    kind: item.kind,
    name: (item.name ?? (item.kind === "ceremony" ? profile.ceremonyLabel : functionKindLabel(item.kind))).trim() || functionKindLabel(item.kind),
    date,
    startTime: normalizeClock(item.startTime) ?? fallback?.startTime ?? meta.start,
    endTime: normalizeClock(item.endTime) ?? fallback?.endTime ?? meta.end,
    venue: (item.venue ?? fallback?.venue ?? brief.location).trim() || brief.location,
    guestCount: Math.round(clamp(item.guestCount ?? fallback?.guestCount ?? brief.guests, 1, 100_000)),
    dressCode: (item.dressCode ?? fallback?.dressCode ?? meta.dress).trim() || meta.dress,
    hostSide: normalizeHostSide(item.hostSide) ?? fallback?.hostSide ?? "both",
  };
}

function normalizeHostSide(value: string | undefined): "bride" | "groom" | "both" | null {
  const normalized = (value ?? "").toLowerCase();
  if (normalized.includes("bride")) return "bride";
  if (normalized.includes("groom")) return "groom";
  if (normalized.includes("both") || normalized.includes("family") || normalized.includes("joint")) return "both";
  return null;
}

function normalizeClock(value: string | undefined): string | null {
  if (!value) return null;
  const match = value.trim().match(/^(\d{1,2}):(\d{2})\s*(am|pm)?$/i);
  if (!match) return null;
  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  const meridiem = match[3]?.toLowerCase();
  if (hours > 23 || minutes > 59) return null;
  if (meridiem === "pm" && hours < 12) hours += 12;
  if (meridiem === "am" && hours === 12) hours = 0;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function normalizeMuhurat(value: MuhuratWindow): MuhuratWindow {
  return {
    ...value,
    start: normalizeClock(value.start) ?? "",
    end: normalizeClock(value.end) ?? "",
    label: value.label.trim() || "Muhurat",
    source: value.source.trim() || "Entered by you",
  };
}

function resolveMuhurat(
  incoming: MuhuratWindow | null,
  current: MuhuratWindow | undefined,
  date: string,
  tradition: Tradition,
): MuhuratWindow | undefined {
  if (incoming && traditionUsesMuhurat(tradition) && incoming.date === date && findMuhuratSuggestion(incoming.date)) return normalizeMuhurat(incoming);
  if (current && current.date === date && findMuhuratSuggestion(current.date)) return normalizeMuhurat(current);
  if (traditionUsesMuhurat(tradition)) {
    const suggestion = findMuhuratSuggestion(date);
    return suggestion ? normalizeMuhurat(suggestion) : undefined;
  }
  return undefined;
}

function dedupe(values: string[]): string[] {
  const seen = new Set<string>();
  return values.filter((value) => {
    const key = value.toLowerCase().replace(/\s+/g, " ").trim();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
