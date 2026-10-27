import type { Plan, RunSheetEntry, WeddingFunction } from "./types";

function shiftClock(time: string, minutes: number): string {
  const match = /^(\d{2}):(\d{2})$/.exec(time);
  if (!match) return time;
  const total = (Number(match[1]) * 60 + Number(match[2]) + minutes + 24 * 60) % (24 * 60);
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

function entry(functionItem: WeddingFunction, suffix: string, values: Omit<RunSheetEntry, "id" | "functionId" | "source">): RunSheetEntry {
  return {
    id: `${functionItem.id}-${suffix}`,
    functionId: functionItem.id,
    source: "generated",
    ...values,
  };
}

/**
 * Builds a practical first draft of the day-of run sheet from each function.
 * Every row is editable; this is a starting point, not a claim about the ritual.
 */
export function generateRunSheet(functions: WeddingFunction[], venueFallback = ""): RunSheetEntry[] {
  const rows: RunSheetEntry[] = [];
  for (const item of functions) {
    const start = item.startTime || "10:00";
    const end = item.endTime || shiftClock(start, 240);
    rows.push(
      entry(item, "setup", {
        startTime: shiftClock(start, -120),
        endTime: shiftClock(start, -15),
        title: "Vendor setup and final walkthrough",
        owner: "Venue lead",
        location: item.venue || venueFallback,
        contact: "",
        notes: "Confirm decor, sound, catering access, and the family contact on site.",
      }),
      entry(item, "arrival", {
        startTime: shiftClock(start, -30),
        endTime: start,
        title: "Family and guest arrival",
        owner: "Welcome team",
        location: item.venue || venueFallback,
        contact: "",
        notes: `${item.guestCount} guests expected. Keep the seating and RSVP list at the door.`,
      }),
      entry(item, "programme", {
        startTime: start,
        endTime: end,
        title: item.name,
        owner: "Host family",
        location: item.venue || venueFallback,
        contact: "",
        notes: item.dressCode ? `Dress code: ${item.dressCode}.` : "Confirm the ritual sequence with the family and officiant.",
      }),
      entry(item, "wrap", {
        startTime: end,
        endTime: shiftClock(end, 45),
        title: "Photos, farewells, and vendor wrap",
        owner: "Host family",
        location: item.venue || venueFallback,
        contact: "",
        notes: "Settle vendor balances, collect leftovers, and confirm transport for elders.",
      }),
    );
  }
  return rows;
}

export function runSheetFor(plan: Plan, functionId: string): RunSheetEntry[] {
  return plan.runSheet
    .filter((item) => item.functionId === functionId)
    .sort((a, b) => `${a.startTime}${a.title}`.localeCompare(`${b.startTime}${b.title}`));
}
