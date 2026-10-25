import type { MuhuratWindow, Tradition } from "./types";

/**
 * Curated, source-labelled muhurat dates. This is deliberately small and
 * conservative: the assistant may suggest only dates that exist here, and the
 * UI always asks families to confirm timing with their own pandit.
 *
 * Dates and windows vary by panchang, region, and family tradition. Do not
 * expand this table from model output; update it from a named source.
 */
export const MUHURAT_SOURCE =
  "Panchang references for Nov–Dec 2026 (Economic Times, Purohit); confirm with your family pandit.";

export const MUHURAT_2026: readonly MuhuratWindow[] = [
  { date: "2026-11-21", start: "06:48", end: "23:59", label: "Vivah muhurat", source: MUHURAT_SOURCE },
  { date: "2026-11-24", start: "", end: "", label: "Vivah muhurat (timing TBC)", source: MUHURAT_SOURCE },
  { date: "2026-11-25", start: "", end: "", label: "Vivah muhurat (timing TBC)", source: MUHURAT_SOURCE },
  { date: "2026-11-26", start: "", end: "", label: "Vivah muhurat (timing TBC)", source: MUHURAT_SOURCE },
  { date: "2026-12-01", start: "", end: "", label: "Vivah muhurat (timing TBC)", source: MUHURAT_SOURCE },
  { date: "2026-12-02", start: "", end: "", label: "Vivah muhurat (timing TBC)", source: MUHURAT_SOURCE },
  { date: "2026-12-03", start: "", end: "", label: "Vivah muhurat (timing TBC)", source: MUHURAT_SOURCE },
];

export const MUHURAT_CAVEAT =
  "Muhurat dates vary by panchang, region, and family tradition. Confirm the date and timing with your pandit before paying a deposit.";

export const MUHURAT_TRADITIONS = new Set<Tradition>([
  "north-hindu", "gujarati", "rajasthani", "south-indian", "bengali", "marathi",
]);

export function traditionUsesMuhurat(tradition: Tradition): boolean {
  return MUHURAT_TRADITIONS.has(tradition);
}

export function findMuhuratSuggestion(date: string): MuhuratWindow | null {
  const match = MUHURAT_2026.find((item) => item.date === date);
  return match ? { ...match } : null;
}

export function muhuratInMonth(year: number, month: number): MuhuratWindow[] {
  const prefix = `${year}-${String(month).padStart(2, "0")}`;
  return MUHURAT_2026.filter((item) => item.date.startsWith(prefix));
}

export function formatMuhuratTime(window: MuhuratWindow): string {
  if (!window.start && !window.end) return "Timing to be confirmed with your pandit";
  if (window.start && window.end) return `${window.start} – ${window.end}`;
  return window.start || window.end;
}

/** Dates used by the prompt so the model never has to invent a muhurat. */
export function muhuratPromptTable(): string {
  return MUHURAT_2026.map((item) => `${item.date}${item.start ? ` ${item.start}–${item.end}` : ""} (${item.label})`).join("\n");
}
